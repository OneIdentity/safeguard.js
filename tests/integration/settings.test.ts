/**
 * Integration tests — Settings read/write.
 *
 * Tests PUT operations on a non-user entity. Reads a setting,
 * writes it back to the same value (safe idempotent operation),
 * and verifies the round-trip.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';

interface Setting {
  Name: string;
  Category: string;
  Value: string;
  DefaultValue: string;
  MinValue: number;
  MaxValue: number;
}

const env = requireAppliance();

describe('Settings Read/Write', () => {
  let client: SafeguardClient;

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('reads all settings', async () => {
    const settings = await client.get<Setting[]>(Service.CORE, 'v4/Settings');
    expect(settings.length).toBeGreaterThan(0);
    for (const s of settings) {
      expect(s.Name).toBeTruthy();
      expect(s.Category).toBeTruthy();
    }
  });

  it('reads a specific setting by name', async () => {
    const settings = await client.get<Setting[]>(
      Service.CORE,
      'v4/Settings',
      { query: { filter: "Name eq 'Inform User of Bad Password'" } },
    );
    expect(settings.length).toBe(1);
    expect(settings[0]!.Name).toBe('Inform User of Bad Password');
    expect(['0', '1']).toContain(settings[0]!.Value);
  });

  it('writes a setting back to its current value (idempotent PUT)', async () => {
    const settingName = 'Inform User of Bad Password';
    // Read current value
    const settings = await client.get<Setting[]>(
      Service.CORE,
      'v4/Settings',
      { query: { filter: `Name eq '${settingName}'` } },
    );
    const original = settings[0]!;

    // PUT targets the specific setting by name in the path
    const updated = await client.put<Setting>(
      Service.CORE,
      `v4/Settings/${encodeURIComponent(settingName)}`,
      {
        json: {
          Name: original.Name,
          Value: original.Value,
        },
      },
    );
    expect(updated.Name).toBe(original.Name);
    expect(updated.Value).toBe(original.Value);
  });

  it('settings categories include Authentication', async () => {
    const settings = await client.get<Setting[]>(Service.CORE, 'v4/Settings');
    const categories = [...new Set(settings.map((s) => s.Category))];
    expect(categories).toContain('Authentication');
  });
});
