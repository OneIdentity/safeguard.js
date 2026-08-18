import { describe, it, expect } from 'vitest';
import { resolveTlsConnectOptions } from '../../src/http/node.js';

describe('resolveTlsConnectOptions — TLS version handling', () => {
  it('defaults rejectUnauthorized to true and sets no version pins without a cert', () => {
    const connect = resolveTlsConnectOptions();
    expect(connect.rejectUnauthorized).toBe(true);
    expect(connect.minVersion).toBeUndefined();
    expect(connect.maxVersion).toBeUndefined();
  });

  it('honours an explicit rejectUnauthorized: false', () => {
    const connect = resolveTlsConnectOptions({ rejectUnauthorized: false });
    expect(connect.rejectUnauthorized).toBe(false);
  });

  it('passes through explicit minVersion / maxVersion pins', () => {
    const connect = resolveTlsConnectOptions({ minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' });
    expect(connect.minVersion).toBe('TLSv1.3');
    expect(connect.maxVersion).toBe('TLSv1.3');
  });

  it('does NOT cap a password/token connection (no client cert) at TLS 1.2', () => {
    const connect = resolveTlsConnectOptions({ ca: 'ca-pem' });
    expect(connect.maxVersion).toBeUndefined();
  });

  it('auto-caps a cert (cert/key) connection at TLS 1.2 when no pins are set', () => {
    const connect = resolveTlsConnectOptions({ cert: 'cert-pem', key: 'key-pem' });
    expect(connect.maxVersion).toBe('TLSv1.2');
    expect(connect.minVersion).toBeUndefined();
  });

  it('auto-caps a pfx connection at TLS 1.2 when no pins are set', () => {
    const connect = resolveTlsConnectOptions({ pfx: 'pfx-bytes' });
    expect(connect.maxVersion).toBe('TLSv1.2');
  });

  it('does not auto-cap when the caller pins minVersion (Cert SNI TLS 1.3 route)', () => {
    const connect = resolveTlsConnectOptions({ cert: 'cert-pem', key: 'key-pem', minVersion: 'TLSv1.3' });
    expect(connect.minVersion).toBe('TLSv1.3');
    expect(connect.maxVersion).toBeUndefined();
  });

  it('respects an explicit maxVersion over the cert auto-cap', () => {
    const connect = resolveTlsConnectOptions({ cert: 'cert-pem', key: 'key-pem', maxVersion: 'TLSv1.3' });
    expect(connect.maxVersion).toBe('TLSv1.3');
  });

  it('forwards mTLS material (cert/key/pfx/passphrase) to the connect options', () => {
    const connect = resolveTlsConnectOptions({
      cert: 'cert-pem',
      key: 'key-pem',
      pfx: 'pfx-bytes',
      passphrase: 'secret',
    });
    expect(connect.cert).toBe('cert-pem');
    expect(connect.key).toBe('key-pem');
    expect(connect.pfx).toBe('pfx-bytes');
    expect(connect.passphrase).toBe('secret');
  });
});
