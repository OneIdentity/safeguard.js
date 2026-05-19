import type { HttpClient, HttpRequestOptions, HttpResponse } from './types.js';

/**
 * Browser HTTP client using native fetch API.
 * No TLS configuration needed — browser handles certificates.
 */
export class BrowserHttpClient implements HttpClient {
  readonly #credentials: RequestCredentials;

  constructor(options?: { credentials?: RequestCredentials }) {
    this.#credentials = options?.credentials ?? 'include';
  }

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const { url, method, headers, body, signal, timeout } = options;

    const requestInit: RequestInit = {
      method,
      credentials: this.#credentials,
    };

    if (headers) requestInit.headers = headers;
    if (body != null) requestInit.body = body as BodyInit;
    if (signal || timeout) {
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (timeout) {
        timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeout);
      }

      requestInit.signal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      try {
        return await this.#doFetch(url, requestInit);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    }

    return this.#doFetch(url, requestInit);
  }

  async #doFetch(url: string, init: RequestInit): Promise<HttpResponse> {
    const response = await fetch(url, init);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = await response.text();

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }
}
