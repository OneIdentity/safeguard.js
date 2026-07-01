/**
 * Integration tests — Device Code authentication (RFC 8628).
 *
 * Guaranteed baseline (mirrors SafeguardDotNet's
 * Suite-DeviceCodeAuthentication.ps1): save/restore the appliance's
 * `Allowed OAuth2 Grant Types`, assert the disabled-grant `ConfigurationError`,
 * and assert that the enabled path delivers a verification URL + user code to
 * `onDeviceCode`. The baseline does NOT complete approval — it cancels via
 * AbortSignal once the device code is received.
 *
 * Auto-skips when SPP_HOST is not configured.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { DeviceCodeAuth, type DeviceCodeInfo } from '../../src/auth/device-code.js';
import { NodeHttpClient } from '../../src/http/node.js';
import { ConfigurationError } from '../../src/errors.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

const GRANT_SETTING = 'Allowed OAuth2 Grant Types';
const DEVICE_CODE_GRANT = 'DeviceCode';

interface Setting {
  Name: string;
  Value: string;
}

async function readGrantTypes(client: SafeguardClient): Promise<Setting> {
  const settings = await client.get<Setting[]>(Service.CORE, 'Settings', {
    query: { filter: `Name eq '${GRANT_SETTING}'` },
  });
  const setting = settings[0];
  if (!setting) throw new Error(`Setting '${GRANT_SETTING}' not found on appliance`);
  return setting;
}

async function writeGrantTypes(client: SafeguardClient, value: string): Promise<void> {
  await client.put<Setting>(Service.CORE, `Settings/${encodeURIComponent(GRANT_SETTING)}`, {
    json: { Name: GRANT_SETTING, Value: value },
  });
}

function withDeviceCode(value: string): string {
  const parts = value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.includes(DEVICE_CODE_GRANT)) parts.push(DEVICE_CODE_GRANT);
  return parts.join(',');
}

function withoutDeviceCode(value: string): string {
  return value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== DEVICE_CODE_GRANT)
    .join(',');
}

function newDeviceCodeClient(auth: DeviceCodeAuth): SafeguardClient {
  const client = new SafeguardClient(env.host, { auth, verify: env.verify });
  client.setHttpClient(new NodeHttpClient({ rejectUnauthorized: env.verify }));
  return client;
}

describe('Device Code Authentication', () => {
  let admin: SafeguardClient;
  let originalValue: string;

  beforeAll(async () => {
    admin = await createAdminClient(env);
    originalValue = (await readGrantTypes(admin)).Value;
  });

  afterAll(async () => {
    if (admin?.isConnected) {
      await writeGrantTypes(admin, originalValue);
      await admin.disconnect();
    }
  });

  it('throws ConfigurationError when the Device Code grant is disabled', async () => {
    await writeGrantTypes(admin, withoutDeviceCode(originalValue));

    const client = newDeviceCodeClient(
      new DeviceCodeAuth({
        provider: env.provider.toLowerCase(),
        onDeviceCode: () => {
          throw new Error('onDeviceCode must not be called when the grant is disabled');
        },
      }),
    );

    await expect(client.connect()).rejects.toBeInstanceOf(ConfigurationError);
  });

  it('delivers a verification URL and user code when the grant is enabled', async () => {
    await writeGrantTypes(admin, withDeviceCode(originalValue));

    const controller = new AbortController();
    const received = new Promise<DeviceCodeInfo>((resolve) => {
      const auth = new DeviceCodeAuth({
        provider: env.provider.toLowerCase(),
        signal: controller.signal,
        onDeviceCode: (info) => {
          resolve(info);
          // Baseline does not complete approval; stop polling immediately.
          controller.abort();
        },
      });
      const client = newDeviceCodeClient(auth);
      // connect() will reject with AbortError after onDeviceCode aborts; ignore.
      void client.connect().catch(() => undefined);
    });

    const info = await received;
    expect(info.userCode).toBeTruthy();
    expect(info.verificationUri || info.verificationUriComplete).toBeTruthy();
    expect(info.expiresIn).toBeGreaterThan(0);
  });
});
