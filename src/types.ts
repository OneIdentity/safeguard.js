/**
 * Safeguard appliance service endpoints.
 */
export enum Service {
  CORE = 'core',
  APPLIANCE = 'appliance',
  NOTIFICATION = 'notification',
  A2A = 'a2a',
  EVENT = 'event',
  RSTS = 'RSTS',
}

/**
 * HTTP methods supported by the Safeguard API.
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

/**
 * Full response from a Safeguard API call (returned when fullResponse: true).
 */
export interface SafeguardResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Options for individual API requests.
 */
export interface RequestOptions {
  /** Request body as JSON-serializable object. */
  json?: unknown;
  /** Raw request body. */
  body?: BodyInit | null;
  /** Additional HTTP headers. */
  headers?: Record<string, string>;
  /** URL query parameters. */
  query?: Record<string, string | number | boolean>;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds (overrides client default). */
  timeout?: number;
  /** If true, returns full response with status and headers. */
  fullResponse?: boolean;
}

/**
 * Options for constructing a SafeguardClient.
 */
export interface SafeguardClientOptions {
  /** Authentication strategy. */
  auth: unknown; // Typed as Auth in auth module
  /** Custom CA certificate (PEM string or Buffer). Node.js only. */
  ca?: string | Buffer;
  /** Whether to verify TLS certificates. Default: true. */
  verify?: boolean;
  /** Safeguard API version prefix. Default: 'v4'. */
  apiVersion?: string;
  /** Request timeout in milliseconds. Default: 300_000 (5 min). */
  timeout?: number;
  /** Auto-refresh tokens before expiry. Default: true. */
  autoRefresh?: boolean;
}
