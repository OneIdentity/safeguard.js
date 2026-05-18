import { describe, it, expect } from 'vitest';
import { PasswordAuth } from '../../../src/auth/password.js';
import { CertificateAuth } from '../../../src/auth/certificate.js';
import { PkceAuth } from '../../../src/auth/pkce.js';
import { TokenAuth } from '../../../src/auth/token.js';
import { ConfigurationError } from '../../../src/errors.js';

describe('Auth constructor validation', () => {
  describe('PasswordAuth', () => {
    it('requires username', () => {
      expect(
        () => new PasswordAuth({ username: '', password: 'p', provider: 'local' }),
      ).toThrow(ConfigurationError);
    });

    it('requires password', () => {
      expect(
        () => new PasswordAuth({ username: 'u', password: '', provider: 'local' }),
      ).toThrow(ConfigurationError);
    });

    it('requires provider', () => {
      expect(
        () => new PasswordAuth({ username: 'u', password: 'p', provider: '' }),
      ).toThrow(ConfigurationError);
    });

    it('accepts valid options', () => {
      const auth = new PasswordAuth({ username: 'admin', password: 'secret', provider: 'local' });
      expect(auth.description).toContain('admin');
    });
  });

  describe('CertificateAuth', () => {
    it('requires certFile or pfxFile', () => {
      expect(
        () => new CertificateAuth({ certFile: '', keyFile: 'k.pem' }),
      ).toThrow(ConfigurationError);
    });

    it('requires keyFile when using cert (not pfx)', () => {
      expect(
        () => new CertificateAuth({ certFile: 'c.pem', keyFile: '' }),
      ).toThrow(ConfigurationError);
    });

    it('accepts PFX without keyFile', () => {
      const auth = new CertificateAuth({ pfxFile: 'cert.pfx' });
      expect(auth.description).toContain('Certificate');
    });

    it('accepts cert+key pair', () => {
      const auth = new CertificateAuth({ certFile: 'c.pem', keyFile: 'k.pem' });
      expect(auth.description).toContain('Certificate');
    });
  });

  describe('PkceAuth', () => {
    it('requires redirectUri', () => {
      expect(
        () => new PkceAuth({ redirectUri: '', provider: 'local' }),
      ).toThrow(ConfigurationError);
    });

    it('requires provider', () => {
      expect(
        () => new PkceAuth({ redirectUri: 'https://app/callback', provider: '' }),
      ).toThrow(ConfigurationError);
    });

    it('accepts valid options', () => {
      const auth = new PkceAuth({ redirectUri: 'https://app/callback', provider: 'local' });
      expect(auth.description).toContain('PKCE');
    });
  });

  describe('TokenAuth', () => {
    it('requires accessToken', () => {
      expect(
        () => new TokenAuth({ accessToken: '' }),
      ).toThrow(ConfigurationError);
    });

    it('accepts valid token', () => {
      const auth = new TokenAuth({ accessToken: 'my-token' });
      expect(auth.description).toContain('Token');
    });
  });
});
