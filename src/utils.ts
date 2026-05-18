import { Service } from './types.js';

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
