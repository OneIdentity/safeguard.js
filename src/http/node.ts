import { Agent, request as undiciRequest } from 'undici';
import type { HttpClient, HttpRequestOptions, HttpResponse, TlsOptions } from './types.js';

/** Connect options passed to the undici Agent's TLS layer. */
type TlsConnectOptions = {
  ca?: string | Buffer | undefined;
  cert?: string | Buffer | undefined;
  key?: string | Buffer | undefined;
  pfx?: string | Buffer | undefined;
  passphrase?: string | undefined;
  rejectUnauthorized: boolean;
  minVersion?: TlsOptions['minVersion'];
  maxVersion?: TlsOptions['maxVersion'];
};

/**
 * Resolve the undici Agent `connect` (TLS) options from {@link TlsOptions}.
 *
 * Applies the opt-in `minVersion`/`maxVersion` pins. When a client certificate
 * is present and the caller has pinned neither bound, the connection is capped
 * at TLS 1.2: Node has no client-side TLS 1.3 post-handshake authentication
 * (see https://github.com/nodejs/node/issues/46120), so on TLS 1.3 the client
 * never presents its certificate and cert/A2A auth fails (error 60094) on the
 * appliance's Standard binding. Capping at TLS 1.2 keeps the cert request
 * in-handshake so it works by default. Setting either bound explicitly (for
 * example `minVersion: 'TLSv1.3'` when targeting a Cert SNI hostname) disables
 * the auto-cap. Password/token connections carry no certificate and keep
 * negotiating up to TLS 1.3.
 */
export function resolveTlsConnectOptions(tlsOptions?: TlsOptions): TlsConnectOptions {
  const connect: TlsConnectOptions = {
    ca: tlsOptions?.ca,
    cert: tlsOptions?.cert,
    key: tlsOptions?.key,
    pfx: tlsOptions?.pfx,
    passphrase: tlsOptions?.passphrase,
    rejectUnauthorized: tlsOptions?.rejectUnauthorized ?? true,
  };

  const hasClientCert = Boolean(tlsOptions?.cert ?? tlsOptions?.key ?? tlsOptions?.pfx);

  if (tlsOptions?.minVersion) connect.minVersion = tlsOptions.minVersion;
  if (tlsOptions?.maxVersion) {
    connect.maxVersion = tlsOptions.maxVersion;
  } else if (hasClientCert && !tlsOptions?.minVersion) {
    connect.maxVersion = 'TLSv1.2';
  }

  return connect;
}

/**
 * Node.js HTTP client using undici for full TLS control.
 * Creates a per-instance Agent — no global state mutation.
 */
export class NodeHttpClient implements HttpClient {
  readonly #agent: Agent;

  constructor(tlsOptions?: TlsOptions) {
    this.#agent = new Agent({
      connect: resolveTlsConnectOptions(tlsOptions),
    });
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const { url, method, headers, body, signal, timeout } = options;

    const requestOptions: Parameters<typeof undiciRequest>[1] = {
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      dispatcher: this.#agent,
    };

    if (headers) requestOptions.headers = headers;
    if (body != null) requestOptions.body = body;
    if (signal) requestOptions.signal = signal;
    if (timeout) {
      requestOptions.bodyTimeout = timeout;
      requestOptions.headersTimeout = timeout;
    }

    const response = await undiciRequest(url, requestOptions);

    const responseHeaders: Record<string, string> = {};
    const rawHeaders = response.headers;
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value !== undefined) {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }

    const responseBody = await response.body.text();

    return {
      status: response.statusCode,
      headers: responseHeaders,
      body: responseBody,
    };
  }

  dispose(): void {
    this.#agent.close().catch(() => { /* already closed or destroyed */ });
  }
}
