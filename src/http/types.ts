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
  /**
   * Maximum allowed size of the response body, in bytes. When omitted the
   * HTTP client's own default is used (see `NodeHttpClient`). Responses
   * whose `Content-Length` exceeds this value are rejected before reading
   * the body; chunked responses are aborted once the streamed byte count
   * crosses the limit. Added in FP-js-002 to bound memory consumption when
   * talking to a hostile or misbehaving appliance.
   */
  maxResponseSize?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface TlsOptions {
  /** Custom CA certificate (PEM). */
  ca?: string | Buffer;
  /** Client certificate (PEM) for mTLS. */
  cert?: string | Buffer;
  /** Client private key (PEM) for mTLS. */
  key?: string | Buffer;
  /** Passphrase for encrypted private key. */
  passphrase?: string;
  /** Whether to verify server certificate. Default: true. */
  rejectUnauthorized?: boolean;
}

/**
 * Abstract HTTP client interface.
 * Implementations: NodeHttpClient (undici), BrowserHttpClient (fetch).
 */
export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  dispose?(): void;
}
