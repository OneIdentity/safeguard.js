/**
 * Integration tests — Concurrent requests.
 *
 * Verifies that the HTTP client handles multiple simultaneous requests
 * correctly (connection pooling, no cross-request interference).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

describe('Concurrent Requests', () => {
  let client: SafeguardClient;

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('handles 5 parallel GET requests', async () => {
    const requests = Array.from({ length: 5 }, () =>
      client.get<{ Id: number; Name: string }>(Service.CORE, 'Me'),
    );
    const results = await Promise.all(requests);
    expect(results).toHaveLength(5);
    for (const me of results) {
      expect(me.Id).toBeDefined();
      expect(me.Name).toBeTruthy();
    }
  });

  it('handles mixed endpoint parallel requests', async () => {
    const [me, users, status, providers, settings] = await Promise.all([
      client.get<{ Id: number }>(Service.CORE, 'Me'),
      client.get<Array<{ Id: number }>>(Service.CORE, 'Users'),
      client.get<{ ApplianceCurrentState: string }>(Service.NOTIFICATION, 'Status'),
      client.get<Array<{ Id: number }>>(Service.CORE, 'AuthenticationProviders'),
      client.get<Array<{ Name: string }>>(Service.CORE, 'Settings'),
    ]);
    expect(me.Id).toBeDefined();
    expect(users.length).toBeGreaterThan(0);
    expect(status.ApplianceCurrentState).toBe('Online');
    expect(providers.length).toBeGreaterThan(0);
    expect(settings.length).toBeGreaterThan(0);
  });

  it('handles 10 rapid sequential requests without error', async () => {
    for (let i = 0; i < 10; i++) {
      const me = await client.get<{ Id: number }>(Service.CORE, 'Me');
      expect(me.Id).toBeDefined();
    }
  });
});
