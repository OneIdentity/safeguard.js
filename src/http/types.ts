/**
 * Platform-agnostic HTTP client interface for the Safeguard SDK.
 */

export interface HttpRequestOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | Buffer | null;
  signal?: AbortSignal;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Supported TLS protocol versions for {@link TlsOptions.minVersion} /
 * {@link TlsOptions.maxVersion}. Matches Node's `tls` `SecureVersion` strings.
 */
export type TlsVersion = 'TLSv1.3' | 'TLSv1.2' | 'TLSv1.1' | 'TLSv1';

export interface TlsOptions {
  /** Custom CA certificate (PEM). */
  ca?: string | Buffer;
  /** Client certificate (PEM) for mTLS. */
  cert?: string | Buffer;
  /** Client private key (PEM) for mTLS. */
  key?: string | Buffer;
  /** Client certificate in PFX/PKCS12 format for mTLS (alternative to cert+key). */
  pfx?: string | Buffer;
  /** Passphrase for encrypted private key or PFX. */
  passphrase?: string;
  /** Whether to verify server certificate. Default: true. */
  rejectUnauthorized?: boolean;
  /**
   * Minimum TLS version to negotiate (opt-in). Default: unset — Node negotiates
   * from its default floor (TLS 1.2). Pin to `'TLSv1.3'` to require TLS 1.3,
   * e.g. for certificate auth against a Safeguard Cert SNI hostname on SPP 9.0.
   */
  minVersion?: TlsVersion;
  /**
   * Maximum TLS version to negotiate (opt-in). Default: unset — Node negotiates
   * up to its default ceiling (TLS 1.3).
   *
   * Special case: when a client certificate (`cert`/`key`/`pfx`) is present and
   * **neither** `minVersion` nor `maxVersion` is set, the connection is capped
   * at `'TLSv1.2'`. Node cannot present a client certificate via TLS 1.3
   * post-handshake authentication, so capping at TLS 1.2 lets the certificate be
   * requested in-handshake and keeps certificate/A2A auth working by default on
   * SPP 9.0's Standard binding. Setting either bound explicitly disables this
   * auto-cap.
   */
  maxVersion?: TlsVersion;
}

/**
 * Abstract HTTP client interface.
 * Implementations: NodeHttpClient (undici), BrowserHttpClient (fetch).
 */
export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  dispose?(): void;
}
