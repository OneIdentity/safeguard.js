import { StorageKeys } from '../storage/types.js';
import type { StorageProvider } from '../storage/types.js';
import { ConfigurationError } from '../errors.js';

export interface PkceCallbackResult {
  code: string;
  state: string;
}

/**
 * Parses the PKCE callback URL and stores the authorization code.
 * Call this on the callback/redirect page to complete the PKCE flow.
 *
 * This is the explicit replacement for the legacy `safeguardJsAccessTokenChecker.js`
 * script that ran as a side-effect on import.
 *
 * @param storage - StorageProvider to persist the code
 * @param url - The callback URL to parse (defaults to window.location.href)
 * @returns The parsed code and state, or null if not a valid callback
 */
export function handlePkceCallback(
  storage: StorageProvider,
  url?: string,
): PkceCallbackResult | null {
  const callbackUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!callbackUrl) return null;

  const parsed = new URL(callbackUrl);
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');

  if (!code || !state) return null;

  // Validate state matches what we stored
  const storedState = storage.get(StorageKeys.STATE);
  if (storedState && storedState !== state) {
    throw new ConfigurationError('PKCE state mismatch — possible CSRF attack');
  }

  // Store the code for the PkceAuth strategy to pick up
  storage.set('safeguard_auth_code', code);

  return { code, state };
}
