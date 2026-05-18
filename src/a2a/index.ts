import type { HttpClient } from '../http/types.js';
import type { CertificateAuth } from '../auth/certificate.js';
import { SecretValue } from '../secret.js';
import { ConfigurationError, ApiError } from '../errors.js';
import { SshKeyFormat } from './types.js';
import type {
  RetrievableAccount,
  BrokeredAccessRequest,
  BrokeredAccessResponse,
} from './types.js';

export interface A2AClientOptions {
  /** Certificate-based auth (A2A always uses client certificates). */
  auth: CertificateAuth;
  /** Custom CA certificate (PEM). */
  ca?: string | Buffer;
  /** Whether to verify TLS. Default: true. */
  verify?: boolean;
}

/**
 * Application-to-Application client for programmatic credential retrieval.
 * Uses client certificate authentication exclusively.
 *
 * Full parity with PySafeguard and SafeguardDotNet A2A clients.
 */
export class A2AClient {
  readonly #host: string;
  readonly #auth: CertificateAuth;
  readonly #ca: string | Buffer | undefined;
  readonly #verify: boolean;
  #httpClient: HttpClient | undefined;

  constructor(host: string, options: A2AClientOptions) {
    if (!host) throw new ConfigurationError('A2AClient requires a host');
    if (!options.auth) throw new ConfigurationError('A2AClient requires a CertificateAuth');
    this.#host = host;
    this.#auth = options.auth;
    this.#ca = options.ca;
    this.#verify = options.verify !== false;
  }

  /** The appliance hostname. */
  get host(): string {
    return this.#host;
  }

  /** Custom CA, if set. */
  get ca(): string | Buffer | undefined {
    return this.#ca;
  }

  /** Whether TLS verification is enabled. */
  get verify(): boolean {
    return this.#verify;
  }

  /** The CertificateAuth providing TLS client cert configuration. */
  get auth(): CertificateAuth {
    return this.#auth;
  }

  /**
   * Sets the HttpClient (must be configured with client cert TLS).
   */
  setHttpClient(httpClient: HttpClient): this {
    this.#httpClient = httpClient;
    return this;
  }

  /**
   * Retrieve a password credential via A2A.
   * @param apiKey - The API key for the retrievable account
   */
  async retrievePassword(apiKey: string): Promise<SecretValue> {
    const body = await this.#a2aRequest(apiKey, 'Credentials', 'Password');
    return new SecretValue(body);
  }

  /**
   * Retrieve an SSH private key credential via A2A.
   * @param apiKey - The API key for the retrievable account
   * @param format - SSH key format (default: OpenSsh)
   */
  async retrievePrivateKey(apiKey: string, format?: SshKeyFormat): Promise<SecretValue> {
    const keyType = format ?? SshKeyFormat.OpenSsh;
    const body = await this.#a2aRequest(apiKey, 'Credentials', `SshKey?keyFormat=${keyType}`);
    return new SecretValue(body);
  }

  /**
   * Retrieve an API key secret credential via A2A.
   * @param apiKey - The API key for the retrievable account
   */
  async retrieveApiKeySecret(apiKey: string): Promise<SecretValue> {
    const body = await this.#a2aRequest(apiKey, 'Credentials', 'ApiKey');
    return new SecretValue(body);
  }

  /**
   * Get the list of retrievable accounts available to this certificate.
   */
  async getRetrievableAccounts(): Promise<RetrievableAccount[]> {
    this.#ensureHttpClient();
    const response = await this.#httpClient!.request({
      url: `https://${this.#host}/service/a2a/v4/A2ARegistrations`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status !== 200) {
      throw ApiError.fromResponse(response.status, response.body);
    }

    return JSON.parse(response.body) as RetrievableAccount[];
  }

  /**
   * Set a password on a managed account via A2A.
   * @param apiKey - The API key for the account
   * @param password - The new password value
   */
  async setPassword(apiKey: string, password: string): Promise<void> {
    this.#ensureHttpClient();
    const response = await this.#httpClient!.request({
      url: `https://${this.#host}/service/a2a/v4/Credentials/Password`,
      method: 'PUT',
      headers: {
        Authorization: `A2A ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(password),
    });

    if (response.status !== 200 && response.status !== 204) {
      throw ApiError.fromResponse(response.status, response.body);
    }
  }

  /**
   * Set a private key on a managed account via A2A.
   * @param apiKey - The API key for the account
   * @param key - The private key content
   * @param passphrase - Optional passphrase for the key
   * @param format - SSH key format (default: OpenSsh)
   */
  async setPrivateKey(
    apiKey: string,
    key: string,
    passphrase?: string,
    format?: SshKeyFormat,
  ): Promise<void> {
    this.#ensureHttpClient();
    const keyFormat = format ?? SshKeyFormat.OpenSsh;
    const payload: Record<string, string> = { PrivateKey: key, KeyFormat: keyFormat };
    if (passphrase) payload['Passphrase'] = passphrase;

    const response = await this.#httpClient!.request({
      url: `https://${this.#host}/service/a2a/v4/Credentials/SshKey`,
      method: 'PUT',
      headers: {
        Authorization: `A2A ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 200 && response.status !== 204) {
      throw ApiError.fromResponse(response.status, response.body);
    }
  }

  /**
   * Submit a brokered access request via A2A.
   * @param apiKey - The API key for the access request
   * @param request - The access request details
   */
  async brokerAccessRequest(
    apiKey: string,
    request: BrokeredAccessRequest,
  ): Promise<BrokeredAccessResponse> {
    this.#ensureHttpClient();
    const response = await this.#httpClient!.request({
      url: `https://${this.#host}/service/a2a/v4/AccessRequests`,
      method: 'POST',
      headers: {
        Authorization: `A2A ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (response.status !== 200 && response.status !== 201) {
      throw ApiError.fromResponse(response.status, response.body);
    }

    return JSON.parse(response.body) as BrokeredAccessResponse;
  }

  // ─── Private helpers ────────────────────────────────────────────────

  async #a2aRequest(apiKey: string, ...pathSegments: string[]): Promise<string> {
    this.#ensureHttpClient();
    const path = pathSegments.join('/');
    const response = await this.#httpClient!.request({
      url: `https://${this.#host}/service/a2a/v4/${path}`,
      method: 'GET',
      headers: {
        Authorization: `A2A ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (response.status !== 200) {
      throw ApiError.fromResponse(response.status, response.body);
    }

    return response.body;
  }

  #ensureHttpClient(): void {
    if (!this.#httpClient) {
      throw new ConfigurationError(
        'HttpClient not set. Call setHttpClient() with a client configured for mTLS.',
      );
    }
  }
}

export { SshKeyFormat, BrokeredAccessRequestType } from './types.js';
export type { RetrievableAccount, BrokeredAccessRequest, BrokeredAccessResponse } from './types.js';
