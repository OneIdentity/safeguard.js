import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { SecretValue } from '../secret.js';

/**
 * Anonymous authentication — no credentials.
 * Used for accessing public Safeguard endpoints (e.g., appliance status).
 */
export class AnonymousAuth implements Auth {
  get description(): string {
    return 'AnonymousAuth';
  }

  async authenticate(_host: string, _httpClient: HttpClient, _storage: StorageProvider): Promise<TokenSet> {
    return {
      accessToken: new SecretValue(''),
      acquiredAt: Date.now(),
    };
  }
}
