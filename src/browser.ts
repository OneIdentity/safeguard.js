// Browser entry point — excludes Node-only modules (CertificateAuth, fs, tls, undici)
export { Service, HttpMethod } from './types.js';
export type { SafeguardResponse, RequestOptions, SafeguardClientOptions } from './types.js';

export {
  SafeguardError,
  ApiError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  TransportError,
  ConfigurationError,
} from './errors.js';
export type { ApiErrorBody } from './errors.js';

export { SecretValue } from './secret.js';

export {
  buildServiceUrl,
  buildRequestUrl,
  base64UrlEncode,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from './utils.js';

export { MemoryStorage, BrowserSessionStorage, StorageKeys } from './storage/index.js';
export type { StorageProvider } from './storage/index.js';
