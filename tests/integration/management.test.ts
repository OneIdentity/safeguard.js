/**
 * Integration tests — User and resource management (convenience verbs).
 *
 * Tests real CRUD workflows using the convenience methods.
 * Uses Users API which is always available (Assets require a license).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { requireAppliance } from './setup.js';
import { createAdminClient, uniqueName, CleanupRegistry } from './fixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

describe('User Management', () => {
  let client: SafeguardClient;
  const cleanup = new CleanupRegistry();

  beforeAll(async () => {
    client = await createAdminClient(env);
  });

  afterAll(async () => {
    await cleanup.runAll();
    await client?.disconnect();
  });

  describe('User CRUD', () => {
    let userId: number | undefined;
    const userName = uniqueName('User');

    it('creates a local user', async () => {
      const user = await client.post<{ Id: number; Name: string }>(
        Service.CORE,
        'Users',
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
            await client.delete(Service.CORE, `Users/${userId}`);
          } catch { /* best effort */ }
        }
      });
    });

    it('finds the user by filter', async () => {
      expect(userId).toBeDefined();
      const users = await client.get<Array<{ Id: number; Name: string }>>(
        Service.CORE,
        'Users',
        { query: { filter: `Name eq '${userName}'` } },
      );
      expect(users.length).toBe(1);
      expect(users[0]!.Id).toBe(userId);
    });

    it('updates the user description', async () => {
      expect(userId).toBeDefined();
      const updated = await client.put<{ Id: number; Description: string }>(
        Service.CORE,
        `Users/${userId}`,
        {
          json: {
            Id: userId,
            Name: userName,
            PrimaryAuthenticationProvider: { Id: -1 },
            Description: 'Updated by SgJs integration test',
          },
        },
      );
      expect(updated.Description).toBe('Updated by SgJs integration test');
    });

    it('deletes the user', async () => {
      expect(userId).toBeDefined();
      await client.delete(Service.CORE, `Users/${userId}`);
      // Verify gone
      const users = await client.get<Array<{ Id: number }>>(
        Service.CORE,
        'Users',
        { query: { filter: `Name eq '${userName}'` } },
      );
      expect(users.length).toBe(0);
      userId = undefined;
    });
  });

  describe('Batch operations', () => {
    const userNames: string[] = [];
    const userIds: number[] = [];

    it('creates multiple users', async () => {
      for (let i = 0; i < 3; i++) {
        const name = uniqueName(`Batch${i}`);
        const user = await client.post<{ Id: number; Name: string }>(
          Service.CORE,
          'Users',
          {
            json: {
              Name: name,
              PrimaryAuthenticationProvider: { Id: -1 },
              AdminRoles: [],
            },
          },
        );
        userNames.push(name);
        userIds.push(user.Id);
      }
      expect(userIds.length).toBe(3);
    });

    it('lists all created users', async () => {
      const allUsers = await client.get<Array<{ Id: number; Name: string }>>(
        Service.CORE,
        'Users',
      );
      for (const id of userIds) {
        expect(allUsers.find((u) => u.Id === id)).toBeDefined();
      }
    });

    it('cleans up batch users', async () => {
      for (const id of userIds) {
        await client.delete(Service.CORE, `Users/${id}`);
      }
      // Verify all gone
      for (const name of userNames) {
        const remaining = await client.get<Array<{ Id: number }>>(
          Service.CORE,
          'Users',
          { query: { filter: `Name eq '${name}'` } },
        );
        expect(remaining.length).toBe(0);
      }
    });
  });
});
