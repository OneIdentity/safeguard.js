import { Agent, request as undiciRequest } from 'undici';
import type { HttpClient, HttpRequestOptions, HttpResponse, TlsOptions } from './types.js';

/**
 * Node.js HTTP client using undici for full TLS control.
 * Creates a per-instance Agent — no global state mutation.
 */
export class NodeHttpClient implements HttpClient {
  readonly #agent: Agent;

  constructor(tlsOptions?: TlsOptions) {
    this.#agent = new Agent({
      connect: {
        ca: tlsOptions?.ca,
        cert: tlsOptions?.cert,
        key: tlsOptions?.key,
        passphrase: tlsOptions?.passphrase,
        rejectUnauthorized: tlsOptions?.rejectUnauthorized ?? true,
      },
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
    void this.#agent.close();
  }
}
