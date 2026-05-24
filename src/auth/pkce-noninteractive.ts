import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ConfigurationError } from '../errors.js';
import { SecretValue } from '../secret.js';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../utils.js';

export interface PkceNonInteractiveAuthOptions {
  /** Identity provider name. Default: 'local'. */
  provider?: string;
  /** Port for the local callback server. Default: 8400. */
  callbackPort?: number;
}

/**
 * Non-interactive PKCE authentication for Node.js automation.
 * Starts a local HTTP server to receive the callback, opens the system browser
 * for login, and waits for the redirect.
 *
 * Matches PySafeguard's PkceAuth behavior (local server pattern).
 */
export class PkceNonInteractiveAuth implements Auth {
  readonly #provider: string;
  readonly #callbackPort: number;

  constructor(options?: PkceNonInteractiveAuthOptions) {
    this.#provider = options?.provider ?? 'local';
    this.#callbackPort = options?.callbackPort ?? 8400;
  }

  get description(): string {
    return `PkceNonInteractiveAuth(port=${String(this.#callbackPort)})`;
  }

  async authenticate(host: string, httpClient: HttpClient, _storage: StorageProvider): Promise<TokenSet> {
    const { createServer } = await import('node:http');
    const { once } = await import('node:events');

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();
    const redirectUri = `http://localhost:${String(this.#callbackPort)}/callback`;

    // Start local server to receive callback.
    // Bind explicitly to the loopback interface (127.0.0.1) so a co-resident
    // process on a shared host cannot intercept the authorization code by
    // racing the legitimate browser callback on the ephemeral port. (FP-js-004)
    const server = createServer();
    server.listen(this.#callbackPort, '127.0.0.1');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'safeguard.js',
      redirect_uri: redirectUri,
      scope: 'rsts:sts:primaryproviderid:' + this.#provider,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });

    const authUrl = `https://${host}/RSTS/Login?${params.toString()}`;

    // Open browser
    await this.#openBrowser(authUrl);

    // Wait for callback
    const code = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.close();
        reject(new ConfigurationError('PKCE callback timed out after 120 seconds'));
      }, 120_000);

      server.on('request', (req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${String(this.#callbackPort)}`);
        if (url.pathname === '/callback') {
          const receivedCode = url.searchParams.get('code');
          const receivedState = url.searchParams.get('state');

          if (receivedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('State mismatch');
            clearTimeout(timeout);
            server.close();
            reject(new ConfigurationError('PKCE state mismatch'));
            return;
          }

          if (!receivedCode) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('No authorization code received');
            clearTimeout(timeout);
            server.close();
            reject(new ConfigurationError('No authorization code in callback'));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication successful!</h1><p>You may close this window.</p></body></html>');
          clearTimeout(timeout);
          server.close();
          resolve(receivedCode);
        }
      });

      once(server, 'error').then(([err]) => {
        clearTimeout(timeout);
        reject(err as Error);
      }).catch(reject);
    });

    // Exchange code for token
    return this.#exchangeCode(host, httpClient, code, verifier, redirectUri);
  }

  async #exchangeCode(
    host: string,
    httpClient: HttpClient,
    code: string,
    verifier: string,
    redirectUri: string,
  ): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
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

    const data = JSON.parse(response.body) as { access_token: string };

    // Exchange for user token
    const userResponse = await httpClient.request({
      url: `https://${host}/service/core/v4/Token/LoginResponse`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.access_token}`,
      },
      body: JSON.stringify({ StsAccessToken: data.access_token }),
    });

    if (userResponse.status !== 200) {
      const { ApiError } = await import('../errors.js');
      throw ApiError.fromResponse(userResponse.status, userResponse.body);
    }

    const userData = JSON.parse(userResponse.body) as { UserToken: string; ExpiresIn?: number };
    const tokenSet: TokenSet = {
      accessToken: new SecretValue(userData.UserToken),
      acquiredAt: Date.now(),
    };
    if (userData.ExpiresIn != null) tokenSet.expiresIn = userData.ExpiresIn;
    return tokenSet;
  }

  async #openBrowser(url: string): Promise<void> {
    const { platform } = await import('node:os');
    const { execFile } = await import('node:child_process');

    // Use execFile with argument arrays to prevent shell injection via host parameter
    if (platform() === 'win32') {
      execFile('cmd', ['/c', 'start', '', url]);
    } else if (platform() === 'darwin') {
      execFile('open', [url]);
    } else {
      execFile('xdg-open', [url]);
    }
  }
}
