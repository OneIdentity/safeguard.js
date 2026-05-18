import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ConfigurationError } from '../errors.js';

export interface TokenAuthOptions {
  /** Pre-existing Safeguard access token. */
  accessToken: string;
}

/**
 * Uses a pre-existing access token. No authentication flow — the token is assumed valid.
 * Useful when tokens are obtained externally or for service-to-service scenarios.
 */
export class TokenAuth implements Auth {
  readonly #accessToken: string;

  constructor(options: TokenAuthOptions) {
    if (!options.accessToken) throw new ConfigurationError('TokenAuth requires accessToken');
    this.#accessToken = options.accessToken;
  }

  get description(): string {
    return 'TokenAuth(pre-existing)';
  }

  async authenticate(_host: string, _httpClient: HttpClient, _storage: StorageProvider): Promise<TokenSet> {
    return {
      accessToken: this.#accessToken,
      acquiredAt: Date.now(),
    };
  }

  // No refresh possible with a pre-existing token
}
