import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';

/**
 * Token set returned by authentication.
 */
export interface TokenSet {
  /** The Safeguard user access token. */
  accessToken: string;
  /** Token lifetime in seconds from when it was issued. */
  expiresIn?: number;
  /** Timestamp (ms since epoch) when the token was acquired. */
  acquiredAt: number;
}

/**
 * Auth strategy interface. All authentication methods implement this.
 */
export interface Auth {
  /**
   * Authenticate against the Safeguard RSTS and return a token set.
   * @param host - Appliance hostname
   * @param httpClient - HTTP client to use for requests
   * @param storage - Storage provider for persisting tokens/state
   */
  authenticate(host: string, httpClient: HttpClient, storage: StorageProvider): Promise<TokenSet>;

  /**
   * Refresh the token if possible. Returns new token set or null if refresh not supported.
   */
  refreshToken?(host: string, httpClient: HttpClient, storage: StorageProvider): Promise<TokenSet | null>;

  /** Human-readable description of this auth strategy (for logging). */
  readonly description: string;
}
