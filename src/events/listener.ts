import type { HubConnection } from '@microsoft/signalr';
import type { EventHandler, EventListenerState, SafeguardEvent } from './types.js';

/**
 * One-shot event listener wrapping a SignalR HubConnection.
 * For persistent auto-reconnect behavior, use PersistentSafeguardEventListener.
 */
export class SafeguardEventListener {
  readonly #connection: HubConnection;
  readonly #handlers: EventHandler[] = [];
  #state: EventListenerState = 'stopped';

  constructor(connection: HubConnection) {
    this.#connection = connection;

    this.#connection.onclose(() => {
      this.#setState('disconnected');
    });

    this.#connection.onreconnecting(() => {
      this.#setState('reconnecting');
    });

    this.#connection.onreconnected(() => {
      this.#setState('connected');
    });

    // Register for the Safeguard event method
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
   * Start the SignalR connection.
   */
  async start(): Promise<void> {
    this.#setState('starting');
    await this.#connection.start();
    this.#setState('connected');
  }

  /**
   * Stop the SignalR connection.
   */
  async stop(): Promise<void> {
    await this.#connection.stop();
    this.#setState('stopped');
  }

  #setState(state: EventListenerState): void {
    this.#state = state;
  }
}
