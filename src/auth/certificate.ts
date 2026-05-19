import type { HttpClient } from '../http/types.js';
import type { StorageProvider } from '../storage/types.js';
import type { Auth, TokenSet } from './types.js';
import { ConfigurationError } from '../errors.js';
import { SecretValue } from '../secret.js';
import { getTokenExpiresIn } from '../utils.js';

export interface CertificateAuthOptions {
  /** Path to PEM certificate file, or PEM string. */
  certFile?: string;
  /** Path to PEM private key file, or PEM string. */
  keyFile?: string;
  /** PEM certificate content (alternative to certFile). */
  cert?: string | Buffer;
  /** PEM key content (alternative to keyFile). */
  key?: string | Buffer;
  /** Path to PFX/PKCS12 file (alternative to cert+key). */
  pfxFile?: string;
  /** PFX/PKCS12 content (alternative to cert+key). */
  pfx?: string | Buffer;
  /** Passphrase for encrypted private key or PFX. */
  passphrase?: string;
  /** Identity provider name. Default: 'certificate'. */
  provider?: string;
}

/**
 * Authenticates using a client certificate (mTLS) against RSTS.
 * Node.js only — requires TLS client cert support in HttpClient.
 */
export class CertificateAuth implements Auth {
  readonly #certFile: string | undefined;
  readonly #keyFile: string | undefined;
  readonly #cert: string | Buffer | undefined;
  readonly #key: string | Buffer | undefined;
  readonly #pfxFile: string | undefined;
  readonly #pfx: string | Buffer | undefined;
  readonly #passphrase: SecretValue | undefined;
  readonly #provider: string;

  constructor(options: CertificateAuthOptions) {
    const hasPfx = options.pfx ?? options.pfxFile;
    const hasCert = options.cert ?? options.certFile;
    const hasKey = options.key ?? options.keyFile;
    if (!hasPfx && !hasCert) throw new ConfigurationError('CertificateAuth requires cert/certFile or pfxFile/pfx');
    if (!hasPfx && !hasKey) throw new ConfigurationError('CertificateAuth requires key or keyFile');
    this.#certFile = options.certFile;
    this.#keyFile = options.keyFile;
    this.#cert = options.cert;
    this.#key = options.key;
    this.#pfxFile = options.pfxFile;
    this.#pfx = options.pfx;
    this.#passphrase = options.passphrase ? new SecretValue(options.passphrase) : undefined;
    this.#provider = options.provider ?? 'certificate';
  }

  get description(): string {
    return `CertificateAuth(${this.#provider})`;
  }

  /** Returns the TLS options needed to create an mTLS HttpClient. */
  getTlsOptions(): { cert?: string | Buffer; key?: string | Buffer; pfx?: string | Buffer; passphrase?: string } {
    const opts: { cert?: string | Buffer; key?: string | Buffer; pfx?: string | Buffer; passphrase?: string } = {};
    if (this.#pfx ?? this.#pfxFile) {
      opts.pfx = this.#pfx ?? this.#pfxFile!;
    } else {
      opts.cert = this.#cert ?? this.#certFile!;
      opts.key = this.#key ?? this.#keyFile!;
    }
    if (this.#passphrase) opts.passphrase = this.#passphrase.expose();
    return opts;
  }

  async authenticate(host: string, httpClient: HttpClient, _storage: StorageProvider): Promise<TokenSet> {
    // Step 1: Get RSTS token using client cert (mTLS)
    const rstsToken = await this.#getRstsToken(host, httpClient);

    // Step 2: Exchange RSTS token for Safeguard user token
    return this.#exchangeForUserToken(host, httpClient, rstsToken);
  }

  async refreshToken(host: string, httpClient: HttpClient, storage: StorageProvider): Promise<TokenSet | null> {
    return this.authenticate(host, httpClient, storage);
  }

  async #getRstsToken(host: string, httpClient: HttpClient): Promise<string> {
    const body = JSON.stringify({
      grant_type: 'client_credentials',
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
