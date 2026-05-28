/**
 * Error hierarchy for the Safeguard SDK.
 *
 * SafeguardError
 * ├── ApiError              (HTTP errors from Safeguard API)
 * │   ├── AuthenticationError  (401)
 * │   ├── AuthorizationError   (403)
 * │   └── NotFoundError        (404)
 * ├── TransportError        (Network/connection failures)
 * └── ConfigurationError    (Invalid client options)
 */

export class SafeguardError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SafeguardError';
  }
}

export interface ApiErrorBody {
  Code?: string;
  Message?: string;
  InnerError?: { Message?: string };
  [key: string]: unknown;
}

export class ApiError extends SafeguardError {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null = null, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /**
   * Creates an appropriate ApiError subclass based on HTTP status code.
   */
  static fromResponse(status: number, body: string | ApiErrorBody | null): ApiError {
    const parsed = ApiError.parseBody(body);
    const message = ApiError.buildMessage(status, parsed);

    switch (status) {
      case 401:
        return new AuthenticationError(message, parsed);
      case 403:
        return new AuthorizationError(message, parsed);
      case 404:
        return new NotFoundError(message, parsed);
      default:
        return new ApiError(message, status, parsed);
    }
  }

  private static parseBody(body: string | ApiErrorBody | null): ApiErrorBody | null {
    if (body === null || body === undefined) return null;
    if (typeof body === 'object') return body;
    try {
      return JSON.parse(body) as ApiErrorBody;
    } catch {
      return { Message: body };
    }
  }

  private static buildMessage(status: number, body: ApiErrorBody | null): string {
    const apiMessage = body?.Message ?? body?.InnerError?.Message;
    if (apiMessage) {
      return `HTTP ${String(status)}: ${apiMessage}`;
    }
    return `HTTP ${String(status)}`;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string, body: ApiErrorBody | null = null, options?: ErrorOptions) {
    super(message, 401, body, options);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string, body: ApiErrorBody | null = null, options?: ErrorOptions) {
    super(message, 403, body, options);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, body: ApiErrorBody | null = null, options?: ErrorOptions) {
    super(message, 404, body, options);
    this.name = 'NotFoundError';
  }
}

export class TransportError extends SafeguardError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TransportError';
  }
}

export class ConfigurationError extends SafeguardError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}
