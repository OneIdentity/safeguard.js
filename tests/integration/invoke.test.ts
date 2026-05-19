/**
 * Integration tests — API invocation (CRUD operations).
 *
 * Tests the invoke method and convenience HTTP verbs against the live
 * Safeguard Core API using real resources.
 *
 * NOTE: Asset management requires a license. These tests use Users and
 * Settings which are always available with the bootstrap admin.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient, uniqueName, CleanupRegistry } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service, HttpMethod } from '../../src/types.js';
import { ApiError } from '../../src/errors.js';

const env = requireAppliance();

describe('API Invocation', () => {
  let client: SafeguardClient;
  const cleanup = new CleanupRegistry();

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await cleanup.runAll();
    await client?.disconnect();
  });

  describe('GET operations', () => {
    it('reads current user (Me)', async () => {
      const me = await client.get<{ Id: number; Name: string; AdminRoles: string[] }>(
        Service.CORE,
        'v4/Me',
      );
      // Bootstrap admin has Id -2
      expect(me.Id).toBeDefined();
      expect(me.Name).toBeTruthy();
      expect(me.AdminRoles).toContain('GlobalAdmin');
    });

    it('lists users with query parameters', async () => {
      const users = await client.get<Array<{ Id: number; Name: string }>>(
        Service.CORE,
        'v4/Users',
        { query: { filter: `Name eq '${env.username.toLowerCase()}'` } },
      );
      expect(users.length).toBeGreaterThanOrEqual(1);
    });

    it('reads appliance status', async () => {
      const status = await client.get<{ ApplianceCurrentState: string }>(
        Service.NOTIFICATION,
        'v4/Status',
      );
      expect(status.ApplianceCurrentState).toBe('Online');
    });

    it('lists authentication providers', async () => {
      const providers = await client.get<Array<{ Id: number; Name: string }>>(
        Service.CORE,
        'v4/AuthenticationProviders',
      );
      expect(providers.length).toBeGreaterThanOrEqual(1);
      const local = providers.find((p) => p.Name === 'Local');
      expect(local).toBeDefined();
    });

    it('reads settings', async () => {
      const settings = await client.get<Array<{ Name: string; Value: string }>>(
        Service.CORE,
        'v4/Settings',
      );
      expect(settings.length).toBeGreaterThan(0);
      expect(settings[0]!.Name).toBeTruthy();
    });
  });

  describe('POST/PUT/DELETE lifecycle (Users)', () => {
    let userId: number | undefined;
    const userName = uniqueName('User');

    it('creates a user (POST)', async () => {
      const user = await client.post<{ Id: number; Name: string }>(
        Service.CORE,
        'v4/Users',
        {
          json: {
            Name: userName,
            PrimaryAuthenticationProvider: { Id: -1 },
            AdminRoles: [],
          },
        },
      );
      expect(user.Id).toBeGreaterThan(0);
      expect(user.Name).toBe(userName);
      userId = user.Id;
      cleanup.register(async () => {
        if (userId) {
          try {
            await client.delete(Service.CORE, `v4/Users/${userId}`);
          } catch { /* best effort */ }
        }
      });
    });

    it('reads the created user (GET by ID)', async () => {
      expect(userId).toBeDefined();
      const user = await client.get<{ Id: number; Name: string }>(
        Service.CORE,
        `v4/Users/${userId}`,
      );
      expect(user.Id).toBe(userId);
      expect(user.Name).toBe(userName);
    });

    it('updates the user (PUT)', async () => {
      expect(userId).toBeDefined();
      const updated = await client.put<{ Id: number; Description: string }>(
        Service.CORE,
        `v4/Users/${userId}`,
        {
          json: {
            Id: userId,
            Name: userName,
            PrimaryAuthenticationProvider: { Id: -1 },
            Description: 'Updated by integration test',
          },
        },
      );
      expect(updated.Description).toBe('Updated by integration test');
    });

    it('deletes the user (DELETE)', async () => {
      expect(userId).toBeDefined();
      await client.delete(Service.CORE, `v4/Users/${userId}`);
      // Verify it's gone
      await expect(
        client.get(Service.CORE, `v4/Users/${userId}`),
      ).rejects.toThrow(ApiError);
      userId = undefined; // prevent double-delete in cleanup
    });
  });

  describe('invoke with fullResponse', () => {
    it('returns status and headers', async () => {
      const result = await client.invoke<{
        data: { Id: number };
        status: number;
        headers: Record<string, string>;
      }>(Service.CORE, HttpMethod.GET, 'v4/Me', { fullResponse: true });
      expect(result.status).toBe(200);
      expect(result.headers).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws ApiError for 404', async () => {
      await expect(
        client.get(Service.CORE, 'v4/Users/999999999'),
      ).rejects.toThrow(ApiError);
    });

    it('error has status property', async () => {
      try {
        await client.get(Service.CORE, 'v4/Users/999999999');
        expect.fail('Expected ApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
