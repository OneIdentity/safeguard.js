import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../../../src/storage/memory.js';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('returns null for unset keys', () => {
    expect(storage.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves values', () => {
    storage.set('token', 'abc123');
    expect(storage.get('token')).toBe('abc123');
  });

  it('overwrites existing values', () => {
    storage.set('token', 'first');
    storage.set('token', 'second');
    expect(storage.get('token')).toBe('second');
  });

  it('removes a specific key', () => {
    storage.set('token', 'abc');
    storage.set('state', 'xyz');
    storage.remove('token');
    expect(storage.get('token')).toBeNull();
    expect(storage.get('state')).toBe('xyz');
  });

  it('remove on nonexistent key does nothing', () => {
    expect(() => storage.remove('ghost')).not.toThrow();
  });

  it('clear removes all keys', () => {
    storage.set('a', '1');
    storage.set('b', '2');
    storage.clear();
    expect(storage.get('a')).toBeNull();
    expect(storage.get('b')).toBeNull();
  });

  it('handles empty string values', () => {
    storage.set('empty', '');
    expect(storage.get('empty')).toBe('');
  });
});
