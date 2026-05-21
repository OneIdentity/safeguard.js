/**
 * Integration test fixtures — shared helpers for all integration tests.
 *
 * Provides:
 * - Authenticated SafeguardClient factory
 * - Unique test resource naming
 * - Resource Owner Grant (ROG) preflight
 * - Cleanup registry for test-created resources
 */
import { randomBytes } from 'node:crypto';
import { SafeguardClient } from '../../src/client.js';
import { PasswordAuth } from '../../src/auth/password.js';
import { NodeHttpClient } from '../../src/http/node.js';
import { Service } from '../../src/types.js';
import type { IntegrationEnv } from './setup.js';

/**
 * Generate a unique test resource name with prefix.
 * Pattern: `SgJs_<8 hex chars>` — easy to identify and clean up.
 */
export function uniqueName(suffix?: string): string {
  const hex = randomBytes(4).toString('hex');
  return suffix ? `SgJs_${hex}_${suffix}` : `SgJs_${hex}`;
}

/**
 * Create a connected SafeguardClient with password auth.
 * Uses the bootstrap admin credentials from the integration env.
 */
export async function createAdminClient(env: IntegrationEnv): Promise<SafeguardClient> {
  const client = new SafeguardClient(env.host, {
    auth: new PasswordAuth({
      username: env.username,
      password: env.password,
      provider: env.provider,
    }),
    verify: env.verify,
  });

  const httpClient = new NodeHttpClient({
    rejectUnauthorized: env.verify,
  });
  client.setHttpClient(httpClient);
  await client.connect();
  return client;
}

/**
 * Ensure Resource Owner Grant is enabled on the appliance.
 * This is required for password-based auth to work.
 *
 * Strategy (mirroring PySafeguard):
 * 1. Try to read cluster settings — if we got this far with password auth, ROG is already enabled
 * 2. If it wasn't, we'd need PKCE to enable it first (out of scope for bootstrap)
 *
 * Since we authenticate with password auth to call this, ROG must already be enabled.
 * This function validates that assumption and logs a clear message if it fails.
 */
export async function ensureResourceOwnerGrant(client: SafeguardClient): Promise<void> {
  // If we authenticated with password, ROG is already enabled.
  // Just do a quick health check to confirm the appliance is responsive.
  const response = await client.get<{ ApplianceCurrentState?: string }>(
    Service.NOTIFICATION,
    'Status',
  );
  if (response.ApplianceCurrentState !== 'Online') {
    throw new Error(
      `Appliance is not online (state: ${response.ApplianceCurrentState ?? 'unknown'}). ` +
      'Integration tests require a fully operational appliance.',
    );
  }
}

/**
 * Registry for tracking resources created during tests for teardown.
 */
export class CleanupRegistry {
  readonly #actions: Array<() => Promise<void>> = [];

  /**
   * Register a cleanup action to run during teardown.
   * Actions run in reverse order (LIFO) so dependencies are removed first.
   */
  register(action: () => Promise<void>): void {
    this.#actions.push(action);
  }

  /**
   * Run all registered cleanup actions. Logs failures but does not throw.
   */
  async runAll(): Promise<void> {
    const reversed = [...this.#actions].reverse();
    for (const action of reversed) {
      try {
        await action();
      } catch (err) {
        console.warn('⚠️  Cleanup action failed:', err instanceof Error ? err.message : err);
      }
    }
    this.#actions.length = 0;
  }
}
