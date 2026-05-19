import { describe, it, expect, beforeEach } from 'vitest';
import { handlePkceCallback } from '../../../src/auth/pkce-callback.js';
import { MemoryStorage } from '../../../src/storage/memory.js';
import { StorageKeys } from '../../../src/storage/types.js';

describe('handlePkceCallback', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('parses code and state from callback URL', () => {
    storage.set(StorageKeys.STATE, 'expected-state');
    const result = handlePkceCallback(
      storage,
      'https://myapp.com/callback?code=auth-code-123&state=expected-state',
    );
    expect(result).toEqual({ code: 'auth-code-123', state: 'expected-state' });
  });

  it('stores authorization code for PkceAuth to consume', () => {
    storage.set(StorageKeys.STATE, 'my-state');
    handlePkceCallback(storage, 'https://myapp.com/callback?code=the-code&state=my-state');
    expect(storage.get('safeguard_auth_code')).toBe('the-code');
  });

  it('returns null when no code in URL', () => {
    const result = handlePkceCallback(storage, 'https://myapp.com/callback?state=abc');
    expect(result).toBeNull();
  });

  it('returns null when no state in URL', () => {
    const result = handlePkceCallback(storage, 'https://myapp.com/callback?code=abc');
    expect(result).toBeNull();
  });

  it('returns null for empty URL', () => {
    const result = handlePkceCallback(storage, '');
    expect(result).toBeNull();
  });

  it('throws on state mismatch', () => {
    storage.set(StorageKeys.STATE, 'original-state');
    expect(() =>
      handlePkceCallback(storage, 'https://myapp.com/callback?code=abc&state=wrong-state'),
    ).toThrow('state mismatch');
  });

  it('allows callback when no stored state (first-time use)', () => {
    const result = handlePkceCallback(
      storage,
      'https://myapp.com/callback?code=abc&state=any-state',
    );
    expect(result).toEqual({ code: 'abc', state: 'any-state' });
  });

  it('handles URL with hash fragment', () => {
    storage.set(StorageKeys.STATE, 'st');
    const result = handlePkceCallback(
      storage,
      'https://myapp.com/callback?code=c1&state=st#fragment',
    );
    expect(result).toEqual({ code: 'c1', state: 'st' });
  });
});
