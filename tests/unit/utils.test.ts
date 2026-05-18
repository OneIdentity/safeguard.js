import { describe, it, expect } from 'vitest';
import { Service } from '../../src/types.js';
import {
  buildServiceUrl,
  buildRequestUrl,
  base64UrlEncode,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from '../../src/utils.js';

describe('buildServiceUrl', () => {
  it('builds core service URL', () => {
    expect(buildServiceUrl('sg.example.com', Service.CORE)).toBe(
      'https://sg.example.com/service/core',
    );
  });

  it('builds appliance service URL', () => {
    expect(buildServiceUrl('sg.example.com', Service.APPLIANCE)).toBe(
      'https://sg.example.com/service/appliance',
    );
  });

  it('builds RSTS URL (special case)', () => {
    expect(buildServiceUrl('sg.example.com', Service.RSTS)).toBe(
      'https://sg.example.com/RSTS',
    );
  });

  it('builds notification service URL', () => {
    expect(buildServiceUrl('sg.example.com', Service.NOTIFICATION)).toBe(
      'https://sg.example.com/service/notification',
    );
  });
});

describe('buildRequestUrl', () => {
  it('builds full URL with relative path', () => {
    const url = buildRequestUrl('sg.example.com', Service.CORE, 'v4/Users');
    expect(url).toBe('https://sg.example.com/service/core/v4/Users');
  });

  it('handles leading slash in relative URL', () => {
    const url = buildRequestUrl('sg.example.com', Service.CORE, '/v4/Users');
    expect(url).toBe('https://sg.example.com/service/core/v4/Users');
  });

  it('includes query parameters', () => {
    const url = buildRequestUrl('sg.example.com', Service.CORE, 'v4/Users', {
      filter: 'Name eq "admin"',
      count: 10,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('filter')).toBe('Name eq "admin"');
    expect(parsed.searchParams.get('count')).toBe('10');
  });

  it('handles boolean query parameter', () => {
    const url = buildRequestUrl('sg.example.com', Service.CORE, 'v4/Users', {
      includeDeleted: true,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('includeDeleted')).toBe('true');
  });

  it('works with RSTS service', () => {
    const url = buildRequestUrl('sg.example.com', Service.RSTS, 'oauth2/token');
    expect(url).toBe('https://sg.example.com/RSTS/oauth2/token');
  });
});

describe('base64UrlEncode', () => {
  it('encodes bytes to URL-safe base64 without padding', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = base64UrlEncode(bytes);
    expect(encoded).toBe('SGVsbG8');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('replaces + with - and / with _', () => {
    // Bytes that produce + and / in standard base64
    const bytes = new Uint8Array([251, 255, 254]);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
  });
});

describe('generateCodeVerifier', () => {
  it('returns a 43-character base64url string', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique values', () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });
});

describe('generateCodeChallenge', () => {
  it('produces a valid S256 challenge from a verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await generateCodeChallenge(verifier);
    // Known S256 of this verifier (RFC 7636 Appendix B)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('returns a base64url string without padding', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('generateState', () => {
  it('returns a 22-character base64url string', () => {
    const state = generateState();
    expect(state).toHaveLength(22);
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique values', () => {
    const s1 = generateState();
    const s2 = generateState();
    expect(s1).not.toBe(s2);
  });
});
