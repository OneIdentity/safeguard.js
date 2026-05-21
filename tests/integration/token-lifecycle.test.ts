/**
 * Integration tests — Token lifecycle management.
 *
 * Tests token lifetime reporting, disconnect behavior, and reconnection.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';
import { ConfigurationError } from '../../src/errors.js';

const env = requireAppliance();

describe('Token Lifecycle', () => {
  const clients: SafeguardClient[] = [];

  afterAll(async () => {
    for (const c of clients) {
      try { await c.disconnect(); } catch { /* ignore already-disposed */ }
    }
  });

  it('reports positive lifetime after connect', async () => {
    const client = await createAdminClient(env);
    clients.push(client);
    const remaining = client.getAccessTokenLifetimeRemaining();
    // Bootstrap tokens are typically 10+ minutes
    expect(remaining).toBeGreaterThan(60);
  });

  it('reports decreasing lifetime over time', async () => {
    const client = await createAdminClient(env);
    clients.push(client);
    const first = client.getAccessTokenLifetimeRemaining();
    // Wait a moment
    await new Promise((r) => setTimeout(r, 1100));
    const second = client.getAccessTokenLifetimeRemaining();
    expect(second).toBeLessThan(first);
  });

  it('can disconnect and reconnect', async () => {
    const client = await createAdminClient(env);
    clients.push(client);
    expect(client.isConnected).toBe(true);

    await client.disconnect();
    expect(client.isConnected).toBe(false);

    // After disconnect, API calls should fail
    await expect(
      client.get(Service.CORE, 'Me'),
    ).rejects.toThrow(ConfigurationError);

    // Reconnect with a fresh client
    const client2 = await createAdminClient(env);
    clients.push(client2);
    expect(client2.isConnected).toBe(true);
    const me = await client2.get<{ Id: number }>(Service.CORE, 'Me');
    expect(me.Id).toBeDefined();
  });
});
