const REDACTED = '[REDACTED]';

/**
 * A wrapper that prevents accidental logging of sensitive values.
 *
 * - `toString()` returns "[REDACTED]"
 * - `toJSON()` returns "[REDACTED]"
 * - `console.log(secretValue)` prints "[REDACTED]"
 * - `.expose()` returns the raw value when intentionally needed
 */
export class SecretValue {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** Returns the raw secret. Use only when you intentionally need the plaintext. */
  expose(): string {
    return this.#value;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  /** Node.js custom inspect (prevents leaking in console.log / util.inspect). */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED;
  }

  get [Symbol.toStringTag](): string {
    return 'SecretValue';
  }
}
