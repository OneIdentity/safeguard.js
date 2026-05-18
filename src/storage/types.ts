/**
 * Interface for token/state storage backends.
 */
export interface StorageProvider {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

/** Well-known storage keys used by the SDK. */
export const StorageKeys = {
  ACCESS_TOKEN: 'safeguard_access_token',
  USER_TOKEN: 'safeguard_user_token',
  STATE: 'safeguard_state',
  CODE_VERIFIER: 'safeguard_code_verifier',
} as const;
