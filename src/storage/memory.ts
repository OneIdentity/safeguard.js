import type { StorageProvider } from './types.js';

/**
 * In-memory storage provider. Default for Node.js environments.
 * Data does not persist across process restarts.
 */
export class MemoryStorage implements StorageProvider {
  readonly #store = new Map<string, string>();

  get(key: string): string | null {
    return this.#store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.#store.set(key, value);
  }

  remove(key: string): void {
    this.#store.delete(key);
  }

  clear(): void {
    this.#store.clear();
  }
}
