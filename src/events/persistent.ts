import type { HubConnection } from '@microsoft/signalr';
import type { Auth, TokenSet } from '../auth/types.js';
import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type {
  EventHandler,
  EventListenerState,
  PersistentListenerOptions,
  SafeguardEvent,
  StateChangeHandler,
} from './types.js';

const DEFAULT_RETRY_INTERVAL_MS = 5_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000; // refresh 60s before expiry

/**
 * Persistent event listener with automatic reconnection and token refresh.
 *
 * Wraps SignalR's built-in `withAutomaticReconnect()` AND adds:
 * - Token refresh on reconnect (re-authenticates if needed)
 * - State change event notifications
 * - Manual `stop()` that prevents further auto-reconnect
 */
export class PersistentSafeguardEventListener {
  readonly #connection: HubConnection;
  readonly #auth: Auth;
  readonly #host: string;
  readonly #httpClient: HttpClient;
  readonly #storage: StorageProvider;
  readonly #retryIntervalMs: number;
  readonly #maxRetries: number | undefined;
  readonly #handlers: EventHandler[] = [];
  readonly #stateChangeHandlers: StateChangeHandler[] = [];

  #state: EventListenerState = 'stopped';
  #tokenSet: TokenSet | undefined;
  #manualStop = false;
  #retryCount = 0;
  #retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** Single-flight token refresh promise (FP-js-003). */
  #tokenRefreshPromise: Promise<void> | undefined;

  constructor(
    connection: HubConnection,
    auth: Auth,
    host: string,
    httpClient: HttpClient,
    storage: StorageProvider,
    options?: PersistentListenerOptions,
    tokenSet?: TokenSet,
  ) {
    this.#connection = connection;
    this.#auth = auth;
    this.#host = host;
    this.#httpClient = httpClient;
    this.#storage = storage;
    this.#retryIntervalMs = options?.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
    this.#maxRetries = options?.maxRetries;
    this.#tokenSet = tokenSet;

    this.#connection.onclose(() => {
      this.#setState('disconnected');
      if (!this.#manualStop) {
        void this.#scheduleReconnect();
      }
    });

    this.#connection.onreconnecting(() => {
      this.#setState('reconnecting');
    });

    this.#connection.onreconnected(() => {
      this.#retryCount = 0;
      this.#setState('connected');
    });

    this.#connection.on('NotifyEventAsync', (event: SafeguardEvent) => {
      for (const handler of this.#handlers) {
        handler(event);
      }
    });
  }

  /** Current connection state. */
  get state(): EventListenerState {
    return this.#state;
  }

  /**
   * Register an event handler for Safeguard notifications.
   */
  on(_method: 'NotifyEventAsync', handler: EventHandler): this {
    this.#handlers.push(handler);
    return this;
  }

  /**
   * Register a state change handler.
   */
  onStateChange(handler: StateChangeHandler): this {
    this.#stateChangeHandlers.push(handler);
    return this;
  }

  /**
   * Start the persistent connection.
   */
  async start(): Promise<void> {
    this.#manualStop = false;
    this.#retryCount = 0;
    this.#setState('starting');
    await this.#connection.start();
    this.#setState('connected');
  }

  /**
   * Stop the connection. Prevents auto-reconnect.
   */
  async stop(): Promise<void> {
    this.#manualStop = true;
    if (this.#retryTimer != null) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = undefined;
    }
    await this.#connection.stop();
    this.#setState('stopped');
  }

  // ─── Private ────────────────────────────────────────────────────────

  #setState(state: EventListenerState): void {
    this.#state = state;
    for (const handler of this.#stateChangeHandlers) {
      handler(state);
    }
  }

  async #scheduleReconnect(): Promise<void> {
    if (this.#manualStop) return;
    if (this.#maxRetries != null && this.#retryCount >= this.#maxRetries) {
      this.#setState('stopped');
      return;
    }

    this.#setState('reconnecting');
    this.#retryTimer = setTimeout(() => {
      void this.#reconnect();
    }, this.#retryIntervalMs);
  }

  async #reconnect(): Promise<void> {
    if (this.#manualStop) return;
    this.#retryCount++;

    try {
      // Only refresh the token if it's expired or near-expiry. Single-flight
      // (FP-js-003) so overlapping reconnect attempts don't double-call
      // refreshToken or trample the storage provider.
      if (this.#isTokenExpired()) {
        await this.#refreshTokenSingleFlight();
      }

      await this.#connection.start();
      this.#retryCount = 0;
      this.#setState('connected');
    } catch {
      // Reconnect failed — try again
      void this.#scheduleReconnect();
    }
  }

  async #refreshTokenSingleFlight(): Promise<void> {
    if (this.#tokenRefreshPromise) {
      await this.#tokenRefreshPromise;
      return;
    }
    this.#tokenRefreshPromise = (async (): Promise<void> => {
      if (this.#auth.refreshToken) {
        const refreshed = await this.#auth.refreshToken(this.#host, this.#httpClient, this.#storage);
        if (refreshed) {
          this.#tokenSet = refreshed;
          return;
        }
      }
      this.#tokenSet = await this.#auth.authenticate(this.#host, this.#httpClient, this.#storage);
    })();
    try {
      await this.#tokenRefreshPromise;
    } finally {
      this.#tokenRefreshPromise = undefined;
    }
  }

  #isTokenExpired(): boolean {
    if (!this.#tokenSet) return true; // no token at all — must authenticate
    if (!this.#tokenSet.expiresIn) return true; // can't determine lifetime — refresh to be safe

    const elapsed = Date.now() - this.#tokenSet.acquiredAt;
    const expiresInMs = this.#tokenSet.expiresIn * 1000;
    return elapsed + TOKEN_REFRESH_MARGIN_MS >= expiresInMs;
  }
}
