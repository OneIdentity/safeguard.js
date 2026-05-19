/**
 * Integration tests — Request timeout handling.
 *
 * Verifies that the timeout plumbing works correctly by setting
 * an impossibly short timeout and expecting a transport error.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

describe('Request Timeout', () => {
  let client: SafeguardClient;

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('throws on impossibly short timeout (1ms)', async () => {
    await expect(
      client.get(Service.CORE, 'v4/Me', { timeout: 1 }),
    ).rejects.toThrow();
  });

  it('succeeds with generous timeout', async () => {
    const me = await client.get<{ Id: number }>(
      Service.CORE,
      'v4/Me',
      { timeout: 30_000 },
    );
    expect(me.Id).toBeDefined();
  });

  it('per-request timeout does not affect subsequent requests', async () => {
    // First request with very short timeout should fail
    await expect(
      client.get(Service.CORE, 'v4/Me', { timeout: 1 }),
    ).rejects.toThrow();

    // Subsequent request with default timeout should succeed
    const me = await client.get<{ Id: number }>(Service.CORE, 'v4/Me');
    expect(me.Id).toBeDefined();
  });
});
