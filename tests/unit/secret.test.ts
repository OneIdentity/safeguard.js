import { describe, it, expect } from 'vitest';
import { SecretValue } from '../../src/secret.js';

describe('SecretValue', () => {
  const raw = 'super-secret-password-123';
  const secret = new SecretValue(raw);

  it('expose() returns the raw value', () => {
    expect(secret.expose()).toBe(raw);
  });

  it('toString() returns [REDACTED]', () => {
    expect(secret.toString()).toBe('[REDACTED]');
    expect(`${secret}`).toBe('[REDACTED]');
  });

  it('toJSON() returns [REDACTED]', () => {
    expect(secret.toJSON()).toBe('[REDACTED]');
  });

  it('JSON.stringify masks the value', () => {
    const obj = { password: secret };
    expect(JSON.stringify(obj)).toBe('{"password":"[REDACTED]"}');
  });

  it('string concatenation masks the value', () => {
    expect('Password: ' + String(secret)).toBe('Password: [REDACTED]');
  });

  it('has correct Symbol.toStringTag', () => {
    expect(Object.prototype.toString.call(secret)).toBe('[object SecretValue]');
  });

  it('Node.js inspect symbol returns [REDACTED]', () => {
    const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inspectFn = (secret as any)[inspectSymbol] as () => string;
    expect(inspectFn()).toBe('[REDACTED]');
  });

  it('different instances with same value are independent', () => {
    const s1 = new SecretValue('abc');
    const s2 = new SecretValue('abc');
    expect(s1.expose()).toBe(s2.expose());
    expect(s1).not.toBe(s2);
  });

  it('handles empty string', () => {
    const empty = new SecretValue('');
    expect(empty.expose()).toBe('');
    expect(empty.toString()).toBe('[REDACTED]');
  });
});
