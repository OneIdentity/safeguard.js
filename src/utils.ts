import { Service } from './types.js';
import { ConfigurationError } from './errors.js';

/**
 * Validates that a host string is a bare hostname or IP address.
 * Rejects URLs, paths, query strings, userinfo, and embedded ports.
 *
 * @throws {ConfigurationError} if the host contains disallowed characters
 */
export function validateHost(host: string): string {
  if (!host) throw new ConfigurationError('Host must not be empty');

  const trimmed = host.trim();
  if (trimmed !== host) {
    throw new ConfigurationError('Host must not contain leading or trailing whitespace');
  }

  // Reject protocol prefixes
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(host)) {
    throw new ConfigurationError(
      `Host must be a bare hostname or IP, not a URL. Remove the protocol prefix (e.g., use "${host.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')}")`,
    );
  }

  // Reject path, query, fragment, userinfo characters
  if (/[/?#@]/.test(host)) {
    throw new ConfigurationError(
      'Host must be a bare hostname or IP address — must not contain /, ?, #, or @',
    );
  }

  // Reject port suffix (e.g. "host:8443") — SDK always uses HTTPS/443
  if (/:\d+$/.test(host) && !host.startsWith('[')) {
    throw new ConfigurationError(
      'Host must not include a port number. The SDK always connects over HTTPS (port 443).',
    );
  }

  return host;
}

/**
 * Builds the base URL for a Safeguard service endpoint.
 *
 * @example
 * buildServiceUrl('appliance.example.com', Service.CORE)
 * // => 'https://appliance.example.com/service/core'
 */
export function buildServiceUrl(host: string, service: Service): string {
  if (service === Service.RSTS) {
    return `https://${host}/RSTS`;
  }
  return `https://${host}/service/${service}`;
}

/**
 * Builds a full API URL including path and optional query parameters.
 *
 * @example
 * buildRequestUrl('appliance.example.com', Service.CORE, 'v4/Users', { filter: 'Name eq "admin"' })
 * // => 'https://appliance.example.com/service/core/v4/Users?filter=Name+eq+%22admin%22'
 */
export function buildRequestUrl(
  host: string,
  service: Service,
  relativeUrl: string,
  query?: Record<string, string | number | boolean>,
): string {
  const base = buildServiceUrl(host, service);
  const path = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
  const url = new URL(`${base}/${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Encodes bytes to a URL-safe base64 string (no padding).
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a cryptographically random code verifier for PKCE.
 * Returns a 43-character base64url string (32 random bytes).
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Computes the S256 code challenge from a code verifier.
 * Uses Web Crypto API (available in Node 20+ and all modern browsers).
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Generates a random state parameter for OAuth flows.
 */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/**
 * Extracts the `exp` claim from a JWT and returns expiresIn (seconds from now).
 * Returns undefined if the token is not a valid JWT or has no `exp` claim.
 */
export function getTokenExpiresIn(jwt: string): number | undefined {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return undefined;
    // Base64url decode the payload
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    const claims = JSON.parse(json) as { exp?: number };
    if (typeof claims.exp !== 'number') return undefined;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, claims.exp - now);
  } catch {
    return undefined;
  }
}
