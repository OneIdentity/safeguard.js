import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserSessionStorage } from '../../../src/storage/session.js';

// Vitest's default 'node' environment doesn't have sessionStorage,
// so we provide a minimal mock for unit testing the adapter logic.
const mockStore = new Map<string, string>();

Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStore.set(key, value),
    removeItem: (key: string) => mockStore.delete(key),
    clear: () => mockStore.clear(),
  },
  writable: true,
});

describe('BrowserSessionStorage', () => {
  let storage: BrowserSessionStorage;

  beforeEach(() => {
    mockStore.clear();
    storage = new BrowserSessionStorage();
  });

  it('returns null for unset keys', () => {
    expect(storage.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves values', () => {
    storage.set('token', 'browser-token');
    expect(storage.get('token')).toBe('browser-token');
  });

  it('overwrites existing values', () => {
    storage.set('token', 'first');
    storage.set('token', 'second');
    expect(storage.get('token')).toBe('second');
  });

  it('removes a specific key', () => {
    storage.set('token', 'val');
    storage.set('state', 'xyz');
    storage.remove('token');
    expect(storage.get('token')).toBeNull();
    expect(storage.get('state')).toBe('xyz');
  });

  it('clear removes all keys', () => {
    storage.set('a', '1');
    storage.set('b', '2');
    storage.clear();
    expect(storage.get('a')).toBeNull();
    expect(storage.get('b')).toBeNull();
  });
});
