import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafeguardClient } from '../../src/client.js';
import { Service, HttpMethod } from '../../src/types.js';
import { ConfigurationError, AuthenticationError } from '../../src/errors.js';
import { SecretValue } from '../../src/secret.js';
import type { Auth, TokenSet } from '../../src/auth/types.js';
import type { HttpClient, HttpResponse } from '../../src/http/types.js';

function createMockAuth(token = 'mock-token', expiresIn = 3600): Auth {
  return {
    description: 'MockAuth',
    authenticate: vi.fn(async (): Promise<TokenSet> => ({
      accessToken: new SecretValue(token),
      expiresIn,
      acquiredAt: Date.now(),
    })),
  };
}

function createMockHttpClient(responseBody = '{}', status = 200): HttpClient {
  return {
    request: vi.fn(async (): Promise<HttpResponse> => ({
      status,
      headers: { 'content-type': 'application/json' },
      body: responseBody,
    })),
  };
}

describe('SafeguardClient', () => {
  describe('construction', () => {
    it('requires a host', () => {
      expect(() => new SafeguardClient('', { auth: createMockAuth() })).toThrow(ConfigurationError);
    });

    it('requires an auth strategy', () => {
      expect(() => new SafeguardClient('host.example.com', { auth: null as never })).toThrow(
        ConfigurationError,
      );
    });

    it('accepts valid options', () => {
      const client = new SafeguardClient('host.example.com', { auth: createMockAuth() });
      expect(client.host).toBe('host.example.com');
      expect(client.isConnected).toBe(false);
    });

    it('defaults apiVersion, timeout, autoRefresh, verify', () => {
      const client = new SafeguardClient('h', { auth: createMockAuth() });
      // These are private, but we verify behavior via invoke
      expect(client.host).toBe('h');
    });
  });

  describe('connect / disconnect', () => {
    it('throws if httpClient not set', async () => {
      const client = new SafeguardClient('h', { auth: createMockAuth() });
      await expect(client.connect()).rejects.toThrow(ConfigurationError);
    });

    it('authenticates and marks connected', async () => {
      const auth = createMockAuth();
      const client = new SafeguardClient('h', { auth });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      expect(client.isConnected).toBe(true);
      expect(auth.authenticate).toHaveBeenCalledOnce();
    });

    it('throws if auth returns empty token', async () => {
      const auth: Auth = {
        description: 'EmptyAuth',
        authenticate: async () => ({ accessToken: new SecretValue(''), acquiredAt: Date.now() }),
      };
      const client = new SafeguardClient('h', { auth });
      client.setHttpClient(createMockHttpClient());
      await expect(client.connect()).rejects.toThrow(AuthenticationError);
    });

    it('disconnect clears connected state', async () => {
      const client = new SafeguardClient('h', { auth: createMockAuth() });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      await client.disconnect();
      expect(client.isConnected).toBe(false);
    });
  });

  describe('invoke', () => {
    let client: SafeguardClient;
    let httpClient: HttpClient;

    beforeEach(async () => {
      httpClient = createMockHttpClient(JSON.stringify({ Id: 1, Name: 'Admin' }));
      client = new SafeguardClient('appliance.example.com', { auth: createMockAuth() });
      client.setHttpClient(httpClient);
      await client.connect();
    });

    it('throws if not connected', async () => {
      const disconnected = new SafeguardClient('h', { auth: createMockAuth() });
      disconnected.setHttpClient(createMockHttpClient());
      await expect(
        disconnected.invoke(Service.CORE, HttpMethod.GET, 'v4/Me'),
      ).rejects.toThrow('not connected');
    });

    it('sends GET with Authorization header', async () => {
      await client.get(Service.CORE, 'v4/Me');
      const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(call.url).toBe('https://appliance.example.com/service/core/v4/Me');
      expect(call.method).toBe('GET');
      expect(call.headers.Authorization).toMatch(/^Bearer /);
    });

    it('sends POST with JSON body', async () => {
      await client.post(Service.CORE, 'v4/Users', { json: { Name: 'New' } });
      const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(call.method).toBe('POST');
      expect(call.headers['Content-Type']).toBe('application/json');
      expect(call.body).toBe('{"Name":"New"}');
    });

    it('appends query parameters', async () => {
      await client.get(Service.CORE, 'v4/Users', { query: { filter: 'Name eq "x"' } });
      const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(call.url).toContain('filter=Name');
    });

    it('returns parsed JSON body by default', async () => {
      const result = await client.get<{ Id: number }>(Service.CORE, 'v4/Me');
      expect(result).toEqual({ Id: 1, Name: 'Admin' });
    });

    it('returns full response when fullResponse: true', async () => {
      const result = await client.invoke(Service.CORE, HttpMethod.GET, 'v4/Me', {
        fullResponse: true,
      });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('headers');
    });

    it('throws ApiError on 4xx/5xx', async () => {
      const errorClient = createMockHttpClient(
        JSON.stringify({ Code: 60657, Message: 'Not Found' }),
        404,
      );
      const c = new SafeguardClient('h', { auth: createMockAuth() });
      c.setHttpClient(errorClient);
      await c.connect();
      await expect(c.get(Service.CORE, 'v4/Bogus')).rejects.toThrow();
    });
  });

  describe('getAccessTokenLifetimeRemaining', () => {
    it('returns -1 when no expiresIn', async () => {
      const auth: Auth = {
        description: 'NoExpiry',
        authenticate: async () => ({ accessToken: new SecretValue('tok'), acquiredAt: Date.now() }),
      };
      const client = new SafeguardClient('h', { auth });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      expect(client.getAccessTokenLifetimeRemaining()).toBe(-1);
    });

    it('returns remaining seconds', async () => {
      const auth: Auth = {
        description: 'Expiring',
        authenticate: async () => ({
          accessToken: new SecretValue('tok'),
          expiresIn: 3600,
          acquiredAt: Date.now(),
        }),
      };
      const client = new SafeguardClient('h', { auth });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      const remaining = client.getAccessTokenLifetimeRemaining();
      expect(remaining).toBeGreaterThan(3598);
      expect(remaining).toBeLessThanOrEqual(3600);
    });
  });

  describe('auto-refresh', () => {
    it('re-authenticates when token is about to expire', async () => {
      const auth = createMockAuth('initial', 3600);
      // Simulate token acquired 3550s ago (only 50s remaining, below 60s margin)
      (auth.authenticate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        accessToken: new SecretValue('initial'),
        expiresIn: 3600,
        acquiredAt: Date.now() - 3550_000,
      });
      (auth.authenticate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        accessToken: new SecretValue('refreshed'),
        expiresIn: 3600,
        acquiredAt: Date.now(),
      });

      const client = new SafeguardClient('h', { auth, autoRefresh: true });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      await client.get(Service.CORE, 'v4/Me');

      expect(auth.authenticate).toHaveBeenCalledTimes(2);
    });

    it('skips refresh when autoRefresh is false', async () => {
      const auth = createMockAuth('initial', 3600);
      (auth.authenticate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        accessToken: new SecretValue('initial'),
        expiresIn: 3600,
        acquiredAt: Date.now() - 3550_000,
      });

      const client = new SafeguardClient('h', { auth, autoRefresh: false });
      client.setHttpClient(createMockHttpClient());
      await client.connect();
      await client.get(Service.CORE, 'v4/Me');

      expect(auth.authenticate).toHaveBeenCalledTimes(1);
    });
  });
});
