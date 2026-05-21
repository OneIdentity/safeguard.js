/**
 * Integration tests — Query parameters and URL building.
 *
 * Tests that query string parameters (orderby, page, limit, fields, filter)
 * are correctly serialized and handled by the Safeguard API.
 *
 * SPP query param reference (from swagger tutorial):
 *   - Paging: page (0-based) + limit
 *   - Ordering: orderby=Name (asc) or orderby=-Name (desc)
 *   - Field selection: fields=Id,Name
 *   - Filtering: filter=Name eq 'value'
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

describe('Query Parameters', () => {
  let client: SafeguardClient;

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('supports limit to restrict results', async () => {
    const allUsers = await client.get<Array<{ Id: number }>>(
      Service.CORE,
      'Users',
    );
    const limited = await client.get<Array<{ Id: number }>>(
      Service.CORE,
      'Users',
      { query: { limit: 2 } },
    );
    expect(limited.length).toBe(2);
    expect(allUsers.length).toBeGreaterThan(2);
  });

  it('supports page + limit for pagination', async () => {
    const page0 = await client.get<Array<{ Id: number; Name: string }>>(
      Service.CORE,
      'Users',
      { query: { page: 0, limit: 2 } },
    );
    const page1 = await client.get<Array<{ Id: number; Name: string }>>(
      Service.CORE,
      'Users',
      { query: { page: 1, limit: 2 } },
    );
    expect(page0.length).toBe(2);
    expect(page1.length).toBeGreaterThanOrEqual(1);
    // Pages should not overlap
    const page0Ids = page0.map((u) => u.Id);
    const page1Ids = page1.map((u) => u.Id);
    for (const id of page1Ids) {
      expect(page0Ids).not.toContain(id);
    }
  });

  it('supports orderby ascending', async () => {
    const ascending = await client.get<Array<{ Name: string }>>(
      Service.CORE,
      'Users',
      { query: { orderby: 'Name' } },
    );
    // Verify sorted ascending (case-insensitive)
    for (let i = 1; i < ascending.length; i++) {
      const cmp = ascending[i - 1]!.Name.localeCompare(ascending[i]!.Name, undefined, { sensitivity: 'base' });
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it('supports orderby descending with minus prefix', async () => {
    const descending = await client.get<Array<{ Name: string }>>(
      Service.CORE,
      'Users',
      { query: { orderby: '-Name' } },
    );
    // Verify sorted descending (case-insensitive)
    for (let i = 1; i < descending.length; i++) {
      const cmp = descending[i - 1]!.Name.localeCompare(descending[i]!.Name, undefined, { sensitivity: 'base' });
      expect(cmp).toBeGreaterThanOrEqual(0);
    }
  });

  it('supports fields to select specific properties', async () => {
    const sparse = await client.get<Array<Record<string, unknown>>>(
      Service.CORE,
      'Users',
      { query: { limit: 1, fields: 'Id,Name' } },
    );
    const keys = Object.keys(sparse[0]!);
    expect(keys).toContain('Id');
    expect(keys).toContain('Name');
    // Should have significantly fewer keys than a full response
    expect(keys.length).toBeLessThanOrEqual(3);
  });

  it('combines limit + orderby', async () => {
    const topDesc = await client.get<Array<{ Name: string }>>(
      Service.CORE,
      'Users',
      { query: { limit: 2, orderby: '-Name' } },
    );
    expect(topDesc.length).toBe(2);
    // Should be in descending order
    const cmp = topDesc[0]!.Name.localeCompare(topDesc[1]!.Name, undefined, { sensitivity: 'base' });
    expect(cmp).toBeGreaterThanOrEqual(0);
  });
});
