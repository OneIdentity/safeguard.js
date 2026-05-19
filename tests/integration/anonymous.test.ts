/**
 * Integration tests — Anonymous (unauthenticated) operations.
 *
 * Tests endpoints that don't require authentication, verifying
 * the NodeHttpClient works without auth headers.
 */
import { describe, it, expect } from 'vitest';
import { requireAppliance } from './setup.js';
import { NodeHttpClient } from '../../src/http/node.js';

const env = requireAppliance();

describe('Anonymous Operations', () => {
  it('reads notification status without auth', async () => {
    const http = new NodeHttpClient({ rejectUnauthorized: env.verify });
    const response = await http.request({
      url: `https://${env.host}/service/notification/v4/Status`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ApplianceCurrentState).toBe('Online');
    http.dispose?.();
  });

  it('reads authentication providers without auth', async () => {
    const http = new NodeHttpClient({ rejectUnauthorized: env.verify });
    const response = await http.request({
      url: `https://${env.host}/service/core/v4/AuthenticationProviders`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(response.status).toBe(200);
    const providers = JSON.parse(response.body);
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(1);
    http.dispose?.();
  });

  it('reads RSTS login page without auth', async () => {
    const http = new NodeHttpClient({ rejectUnauthorized: env.verify });
    const response = await http.request({
      url: `https://${env.host}/RSTS/Login`,
      method: 'GET',
      headers: { Accept: 'text/html' },
    });
    // Should return 200 (login page) or 302/307 (redirect)
    expect([200, 302, 307]).toContain(response.status);
    http.dispose?.();
  });

  it('gets 401 from authenticated endpoint without token', async () => {
    const http = new NodeHttpClient({ rejectUnauthorized: env.verify });
    const response = await http.request({
      url: `https://${env.host}/service/core/v4/Me`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(response.status).toBe(401);
    http.dispose?.();
  });
});
