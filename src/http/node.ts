import { Agent, request as undiciRequest } from 'undici';
import type { HttpClient, HttpRequestOptions, HttpResponse, TlsOptions } from './types.js';
import { TransportError } from '../errors.js';

/** Default cap on response body size (10 MB). Per FP-js-002. */
export const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
/** Hard upper bound on the configurable cap (100 MB). Per FP-js-002. */
export const MAX_RESPONSE_SIZE_CEILING = 100 * 1024 * 1024;

export interface NodeHttpClientOptions {
  /**
   * Maximum allowed response body size, in bytes. Defaults to 10 MB. Values
   * above 100 MB are clamped to 100 MB. Individual requests can override
   * this via `HttpRequestOptions.maxResponseSize` (subject to the same
   * upper bound).
   */
  maxResponseSize?: number;
}

function clampLimit(raw: number | undefined): number {
  const v = raw ?? DEFAULT_MAX_RESPONSE_SIZE;
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_MAX_RESPONSE_SIZE;
  return Math.min(v, MAX_RESPONSE_SIZE_CEILING);
}

/**
 * Node.js HTTP client using undici for full TLS control.
 * Creates a per-instance Agent — no global state mutation.
 */
export class NodeHttpClient implements HttpClient {
  readonly #agent: Agent;
  readonly #maxResponseSize: number;

  constructor(tlsOptions?: TlsOptions, options?: NodeHttpClientOptions) {
    this.#agent = new Agent({
      connect: {
        ca: tlsOptions?.ca,
        cert: tlsOptions?.cert,
        key: tlsOptions?.key,
        passphrase: tlsOptions?.passphrase,
        rejectUnauthorized: tlsOptions?.rejectUnauthorized ?? true,
      },
    });
    this.#maxResponseSize = clampLimit(options?.maxResponseSize);
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const { url, method, headers, body, signal, timeout } = options;
    const sizeLimit = clampLimit(options.maxResponseSize ?? this.#maxResponseSize);

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

    // FP-js-002: Content-Length pre-check. If the server advertises a body
    // larger than our cap, reject before reading even one byte. We must still
    // drain the body so the keep-alive connection can be returned to the pool
    // (or destroyed cleanly).
    const advertisedRaw = responseHeaders['content-length'];
    if (advertisedRaw !== undefined) {
      const advertised = Number.parseInt(advertisedRaw, 10);
      if (Number.isFinite(advertised) && advertised > sizeLimit) {
        response.body.destroy();
        throw new TransportError(
          `Response body Content-Length ${String(advertised)} bytes exceeds maximum allowed size ${String(sizeLimit)} bytes`,
        );
      }
    }

    // FP-js-002: Bounded streaming read. Even when Content-Length is absent
    // or lies, abort as soon as cumulative bytes cross the cap.
    let total = 0;
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of response.body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        total += buf.length;
        if (total > sizeLimit) {
          response.body.destroy();
          throw new TransportError(
            `Response body exceeds maximum allowed size ${String(sizeLimit)} bytes`,
          );
        }
        chunks.push(buf);
      }
    } catch (err) {
      if (err instanceof TransportError) throw err;
      throw new TransportError(`Failed to read response body: ${String((err as Error).message)}`, {
        cause: err as Error,
      });
    }

    const responseBody = Buffer.concat(chunks).toString('utf8');

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
