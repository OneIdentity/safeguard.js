import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ConfigurationError } from '../errors.js';
import { StorageKeys } from '../storage/types.js';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils.js';

export interface PkceAuthOptions {
  /** OAuth redirect URI (must match RSTS configuration). */
  redirectUri: string;
  /** Identity provider name. Default: 'local'. */
  provider?: string;
}

/**
 * Authenticates using PKCE (Proof Key for Code Exchange) with browser redirect.
 * For browser environments where the user is redirected to RSTS login.
 */
export class PkceAuth implements Auth {
  readonly #redirectUri: string;
  readonly #provider: string;

  constructor(options: PkceAuthOptions) {
    if (!options.redirectUri) throw new ConfigurationError('PkceAuth requires redirectUri');
    if (!options.provider) throw new ConfigurationError('PkceAuth requires provider');
    this.#redirectUri = options.redirectUri;
    this.#provider = options.provider;
  }

  get description(): string {
    return `PKCE(redirect=${this.#redirectUri})`;
  }

  /**
   * Initiates the PKCE flow. If a stored authorization code exists (from callback),
   * exchanges it for a token. Otherwise, redirects to RSTS login.
   */
  async authenticate(host: string, httpClient: HttpClient, storage: StorageProvider): Promise<TokenSet> {
    // Check if we have a stored access token from a previous callback
    const storedToken = storage.get(StorageKeys.ACCESS_TOKEN);
    if (storedToken) {
      return {
        accessToken: storedToken,
        acquiredAt: Date.now(),
      };
    }

    // Check for authorization code (set by handlePkceCallback)
    const code = storage.get('safeguard_auth_code');
    if (code) {
      const verifier = storage.get(StorageKeys.CODE_VERIFIER);
      if (!verifier) {
        throw new ConfigurationError('PKCE code verifier not found in storage');
      }
      storage.remove('safeguard_auth_code');
      storage.remove(StorageKeys.CODE_VERIFIER);
      storage.remove(StorageKeys.STATE);
      return this.#exchangeCode(host, httpClient, code, verifier, storage);
    }

    // No code — initiate redirect
    await this.#initiateRedirect(host, storage);

    // This point is never reached in a browser (redirect happens).
    // For testability, throw rather than hang.
    throw new ConfigurationError(
      'PKCE redirect initiated. Call handlePkceCallback() on the callback page.',
    );
  }

  async #initiateRedirect(host: string, storage: StorageProvider): Promise<void> {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();

    storage.set(StorageKeys.CODE_VERIFIER, verifier);
    storage.set(StorageKeys.STATE, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'safeguard.js',
      redirect_uri: this.#redirectUri,
      scope: 'rsts:sts:primaryproviderid:' + this.#provider,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });

    const authUrl = `https://${host}/RSTS/Login?${params.toString()}`;

    // In browser environment, redirect
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = authUrl;
    }
  }

  async #exchangeCode(
    host: string,
    httpClient: HttpClient,
    code: string,
    verifier: string,
    storage: StorageProvider,
  ): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.#redirectUri,
      client_id: 'safeguard.js',
      code_verifier: verifier,
    });

    const response = await httpClient.request({
      url: `https://${host}/RSTS/oauth2/token`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (response.status !== 200) {
      const { ApiError } = await import('../errors.js');
      throw ApiError.fromResponse(response.status, response.body);
    }

    const data = JSON.parse(response.body) as { access_token: string; expires_in?: number };

    // Exchange RSTS token for Safeguard user token
    const userTokenResponse = await httpClient.request({
      url: `https://${host}/service/core/v4/Token/LoginResponse`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.access_token}`,
      },
      body: JSON.stringify({ StsAccessToken: data.access_token }),
    });

    if (userTokenResponse.status !== 200) {
      const { ApiError } = await import('../errors.js');
      throw ApiError.fromResponse(userTokenResponse.status, userTokenResponse.body);
    }

    const userData = JSON.parse(userTokenResponse.body) as { UserToken: string; ExpiresIn?: number };
    const tokenSet: TokenSet = {
      accessToken: userData.UserToken,
      acquiredAt: Date.now(),
    };
    if (userData.ExpiresIn != null) tokenSet.expiresIn = userData.ExpiresIn;

    storage.set(StorageKeys.ACCESS_TOKEN, tokenSet.accessToken);
    return tokenSet;
  }
}
