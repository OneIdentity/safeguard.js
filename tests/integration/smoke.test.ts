/**
 * Smoke test — validates the integration test framework against a live appliance.
 *
 * This test:
 * 1. Connects with password auth
 * 2. Verifies appliance is online
 * 3. Confirms token lifetime is positive
 * 4. Disconnects cleanly
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getIntegrationEnv, type IntegrationEnv } from './setup.js';
import { createAdminClient, ensureResourceOwnerGrant } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';

describe('Integration Smoke Test', () => {
  let env: IntegrationEnv;
  let client: SafeguardClient;

  beforeAll(async () => {
    const e = getIntegrationEnv();
    if (!e) {
      console.log('⏭️  Skipping: SPP_HOST not set');
      process.exit(0);
    }
    env = e;
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('connects to the appliance', () => {
    expect(client.isConnected).toBe(true);
  });

  it('appliance is online', async () => {
    await ensureResourceOwnerGrant(client);
  });

  it('has positive token lifetime', () => {
    const remaining = client.getAccessTokenLifetimeRemaining();
    expect(remaining).toBeGreaterThan(0);
  });

  it('can read appliance status anonymously', async () => {
    // The Notification/v4/Status endpoint doesn't require auth
    const { NodeHttpClient: NHC } = await import('../../src/http/node.js');
    const httpClient = new NHC({ rejectUnauthorized: false });
    const resp = await httpClient.request({
      url: `https://${env.host}/service/notification/v4/Status`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    expect(resp.status).toBe(200);
    const status = JSON.parse(resp.body) as { ApplianceCurrentState?: string };
    expect(status.ApplianceCurrentState).toBe('Online');
    httpClient.dispose?.();
  });
});
