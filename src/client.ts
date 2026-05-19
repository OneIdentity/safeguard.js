import { Service, HttpMethod } from './types.js';
import type { RequestOptions, SafeguardClientOptions } from './types.js';
import type { Auth, TokenSet } from './auth/types.js';
import type { HttpClient } from './http/types.js';
import type { StorageProvider } from './storage/types.js';
import { MemoryStorage } from './storage/memory.js';
import { buildRequestUrl, validateHost } from './utils.js';
import { AuthenticationError, ConfigurationError, ApiError } from './errors.js';

const DEFAULT_TIMEOUT = 300_000;
const DEFAULT_API_VERSION = 'v4';
const TOKEN_REFRESH_MARGIN_MS = 60_000; // refresh 60s before expiry

/**
 * Main entry point for the Safeguard SDK.
 * Instance-based — no global state. Multiple clients to different appliances are supported.
 */
export class SafeguardClient {
  readonly #host: string;
  readonly #auth: Auth;
  readonly #apiVersion: string;
  readonly #timeout: number;
  readonly #autoRefresh: boolean;
  readonly #ca: string | Buffer | undefined;
  readonly #verify: boolean;

  #httpClient: HttpClient | undefined;
  #storage: StorageProvider;
  #tokenSet: TokenSet | undefined;
  #connected = false;

  constructor(host: string, options: SafeguardClientOptions) {
    if (!host) throw new ConfigurationError('SafeguardClient requires a host');
    if (!options.auth) throw new ConfigurationError('SafeguardClient requires an auth strategy');
    this.#host = validateHost(host);
    this.#auth = options.auth;
    this.#apiVersion = options.apiVersion ?? DEFAULT_API_VERSION;
    this.#timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.#autoRefresh = options.autoRefresh !== false;
    this.#ca = options.ca;
    this.#verify = options.verify !== false;
    this.#storage = new MemoryStorage();
  }

  /** The appliance hostname this client connects to. */
  get host(): string {
    return this.#host;
  }

  /** The API version prefix (e.g. 'v4'). */
  get apiVersion(): string {
    return this.#apiVersion;
  }

  /** Custom CA certificate, if provided. */
  get ca(): string | Buffer | undefined {
    return this.#ca;
  }

  /** Whether TLS verification is enabled. */
  get verify(): boolean {
    return this.#verify;
  }

  /** Whether the client has an active authenticated session. */
  get isConnected(): boolean {
    return this.#connected;
  }

  /**
   * Sets a custom StorageProvider (e.g., BrowserSessionStorage).
   * Must be called before connect().
   */
  setStorage(storage: StorageProvider): this {
    this.#storage = storage;
    return this;
  }

  /**
   * Sets the HttpClient implementation. If not called, must be set before connect().
   * The factory pattern allows platform-specific client injection:
   *   - Node: `new NodeHttpClient({ ca, rejectUnauthorized })`
   *   - Browser: `new BrowserHttpClient()`
   */
  setHttpClient(httpClient: HttpClient): this {
    this.#httpClient = httpClient;
    return this;
  }

  /**
   * Authenticate and establish a session.
   * @throws {AuthenticationError} if authentication fails
   * @throws {ConfigurationError} if httpClient not set
   */
  async connect(): Promise<void> {
    if (!this.#httpClient) {
      throw new ConfigurationError(
        'HttpClient not set. Call setHttpClient() before connect(), or use SafeguardClient.createNode() / SafeguardClient.createBrowser().',
      );
    }

    this.#tokenSet = await this.#auth.authenticate(this.#host, this.#httpClient, this.#storage);
    if (!this.#tokenSet.accessToken.expose()) {
      throw new AuthenticationError('Authentication returned empty access token');
    }
    this.#connected = true;
  }

  /**
   * Disconnect — dispose HTTP client and clear token.
   */
  async disconnect(): Promise<void> {
    this.#tokenSet = undefined;
    this.#connected = false;
    this.#httpClient?.dispose?.();
  }

  /**
   * Returns seconds until the current access token expires, or -1 if unknown.
   */
  getAccessTokenLifetimeRemaining(): number {
    if (!this.#tokenSet?.expiresIn) return -1;
    const elapsed = (Date.now() - this.#tokenSet.acquiredAt) / 1000;
    return Math.max(0, this.#tokenSet.expiresIn - elapsed);
  }

  // ─── Convenience HTTP verbs ─────────────────────────────────────────

  async get<T = unknown>(service: Service, relativeUrl: string, options?: RequestOptions): Promise<T> {
    return this.invoke<T>(service, HttpMethod.GET, relativeUrl, options);
  }

  async post<T = unknown>(service: Service, relativeUrl: string, options?: RequestOptions): Promise<T> {
    return this.invoke<T>(service, HttpMethod.POST, relativeUrl, options);
  }

  async put<T = unknown>(service: Service, relativeUrl: string, options?: RequestOptions): Promise<T> {
    return this.invoke<T>(service, HttpMethod.PUT, relativeUrl, options);
  }

  async delete<T = unknown>(service: Service, relativeUrl: string, options?: RequestOptions): Promise<T> {
    return this.invoke<T>(service, HttpMethod.DELETE, relativeUrl, options);
  }

  async patch<T = unknown>(service: Service, relativeUrl: string, options?: RequestOptions): Promise<T> {
    return this.invoke<T>(service, HttpMethod.PATCH, relativeUrl, options);
  }

  // ─── Core invoke ────────────────────────────────────────────────────

  /**
   * Low-level request method. Convenience verbs delegate here.
   *
   * When `options.fullResponse` is true, returns SafeguardResponse<T> with status + headers.
   * Otherwise returns just the parsed response body as T.
   */
  async invoke<T = unknown>(
    service: Service,
    method: HttpMethod,
    relativeUrl: string,
    options?: RequestOptions,
  ): Promise<T> {
    if (!this.#connected || !this.#httpClient) {
      throw new ConfigurationError('Client not connected. Call connect() first.');
    }

    // Auto-refresh token if needed
    if (this.#autoRefresh) {
      await this.#ensureValidToken();
    }

    const url = buildRequestUrl(this.#host, service, relativeUrl, options?.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#tokenSet!.accessToken.expose()}`,
      Accept: 'application/json',
      ...options?.headers,
    };

    let body: string | null = null;
    if (options?.json != null) {
      body = JSON.stringify(options.json);
      headers['Content-Type'] = 'application/json';
    } else if (options?.body != null) {
      body = options.body as string;
    }

    const requestOpts: import('./http/types.js').HttpRequestOptions = {
      url,
      method,
      headers,
      body,
      timeout: options?.timeout ?? this.#timeout,
    };
    if (options?.signal) requestOpts.signal = options.signal;

    const response = await this.#httpClient.request(requestOpts);

    if (response.status >= 400) {
      throw ApiError.fromResponse(response.status, response.body);
    }

    const data = response.body ? (JSON.parse(response.body) as T) : (undefined as T);

    if (options?.fullResponse) {
      return { data, status: response.status, headers: response.headers } as unknown as T;
    }

    return data;
  }

  // ─── Private helpers ────────────────────────────────────────────────

  async #ensureValidToken(): Promise<void> {
    if (!this.#tokenSet) return;
    if (!this.#tokenSet.expiresIn) return; // can't determine expiry

    const elapsed = Date.now() - this.#tokenSet.acquiredAt;
    const expiresInMs = this.#tokenSet.expiresIn * 1000;

    if (elapsed + TOKEN_REFRESH_MARGIN_MS >= expiresInMs) {
      // Token is expired or about to expire — refresh
      if (this.#auth.refreshToken) {
        const refreshed = await this.#auth.refreshToken(this.#host, this.#httpClient!, this.#storage);
        if (refreshed) {
          this.#tokenSet = refreshed;
          return;
        }
      }
      // No refresh support or refresh failed — re-authenticate
      this.#tokenSet = await this.#auth.authenticate(this.#host, this.#httpClient!, this.#storage);
    }
  }
}
