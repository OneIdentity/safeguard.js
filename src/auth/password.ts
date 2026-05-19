import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ConfigurationError } from '../errors.js';
import { SecretValue } from '../secret.js';
import { getTokenExpiresIn } from '../utils.js';

export interface PasswordAuthOptions {
  username: string;
  password: string;
  /** Identity provider name. Default: 'local'. */
  provider?: string;
}

/**
 * Authenticates using username/password via RSTS Resource Owner grant.
 */
export class PasswordAuth implements Auth {
  readonly #username: string;
  readonly #password: SecretValue;
  readonly #provider: string;

  constructor(options: PasswordAuthOptions) {
    if (!options.username) throw new ConfigurationError('PasswordAuth requires username');
    if (!options.password) throw new ConfigurationError('PasswordAuth requires password');
    if (!options.provider) throw new ConfigurationError('PasswordAuth requires provider');
    this.#username = options.username;
    this.#password = new SecretValue(options.password);
    this.#provider = options.provider;
  }

  get description(): string {
    return `PasswordAuth(${this.#username}@${this.#provider})`;
  }

  async authenticate(host: string, httpClient: HttpClient, _storage: StorageProvider): Promise<TokenSet> {
    // Step 1: Get RSTS token
    const rstsToken = await this.#getRstsToken(host, httpClient);

    // Step 2: Exchange RSTS token for Safeguard user token
    const userToken = await this.#exchangeForUserToken(host, httpClient, rstsToken);

    return userToken;
  }

  async refreshToken(host: string, httpClient: HttpClient, storage: StorageProvider): Promise<TokenSet | null> {
    // Password auth can always re-authenticate
    return this.authenticate(host, httpClient, storage);
  }

  async #getRstsToken(host: string, httpClient: HttpClient): Promise<string> {
    const body = JSON.stringify({
      grant_type: 'password',
      username: this.#username,
      password: this.#password.expose(),
      scope: 'rsts:sts:primaryproviderid:' + this.#provider.toLowerCase(),
    });

    const response = await httpClient.request({
      url: `https://${host}/RSTS/oauth2/token`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.status !== 200) {
      const { ApiError } = await import('../errors.js');
      throw ApiError.fromResponse(response.status, response.body);
    }

    const data = JSON.parse(response.body) as { access_token: string };
    return data.access_token;
  }

  async #exchangeForUserToken(host: string, httpClient: HttpClient, rstsToken: string): Promise<TokenSet> {
    const response = await httpClient.request({
      url: `https://${host}/service/core/v4/Token/LoginResponse`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rstsToken}`,
      },
      body: JSON.stringify({ StsAccessToken: rstsToken }),
    });

    if (response.status !== 200) {
      const { ApiError } = await import('../errors.js');
      throw ApiError.fromResponse(response.status, response.body);
    }

    const data = JSON.parse(response.body) as { UserToken: string; ExpiresIn?: number };
    const tokenSet: TokenSet = {
      accessToken: new SecretValue(data.UserToken),
      acquiredAt: Date.now(),
    };
    if (data.ExpiresIn != null) {
      tokenSet.expiresIn = data.ExpiresIn;
    } else {
      const expiresIn = getTokenExpiresIn(data.UserToken);
      if (expiresIn != null) tokenSet.expiresIn = expiresIn;
    }
    return tokenSet;
  }
}
