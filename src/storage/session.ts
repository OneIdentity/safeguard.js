import type { StorageProvider } from './types.js';

/**
 * Browser sessionStorage adapter. Data persists for the browser tab lifetime.
 * Requires a DOM environment (browser or jsdom).
 */
export class BrowserSessionStorage implements StorageProvider {
  get(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  set(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}
