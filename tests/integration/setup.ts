/**
 * Global integration test setup.
 *
 * This file is loaded by vitest.integration.config.ts `setupFiles`.
 * It checks for the required SPP_HOST environment variable and skips
 * the entire test suite gracefully if no appliance is configured.
 */
import { beforeAll } from 'vitest';

export interface IntegrationEnv {
  host: string;
  username: string;
  password: string;
  provider: string;
  caFile?: string;
  certFile?: string;
  keyFile?: string;
  keyPassphrase?: string;
  a2aApiKey?: string;
  externalProvider?: string;
  verify: boolean;
}

/**
 * Read integration test environment from env vars.
 * Returns undefined if SPP_HOST is not set (tests should skip).
 */
export function getIntegrationEnv(): IntegrationEnv | undefined {
  const host = process.env.SPP_HOST;
  if (!host) return undefined;

  const env: IntegrationEnv = {
    host,
    username: process.env.SPP_USERNAME ?? 'Admin',
    password: process.env.SPP_PASSWORD ?? 'Admin123',
    provider: process.env.SPP_PROVIDER ?? 'Local',
    verify: process.env.SPP_VERIFY !== 'false',
  };

  if (process.env.SPP_CA_FILE) env.caFile = process.env.SPP_CA_FILE;
  if (process.env.SPP_CERT_FILE) env.certFile = process.env.SPP_CERT_FILE;
  if (process.env.SPP_KEY_FILE) env.keyFile = process.env.SPP_KEY_FILE;
  if (process.env.SPP_KEY_PASSPHRASE) env.keyPassphrase = process.env.SPP_KEY_PASSPHRASE;
  if (process.env.SPP_A2A_API_KEY) env.a2aApiKey = process.env.SPP_A2A_API_KEY;
  if (process.env.SPP_EXTERNAL_PROVIDER) env.externalProvider = process.env.SPP_EXTERNAL_PROVIDER;

  return env;
}

/**
 * Call inside a describe block to auto-skip when no appliance is available.
 * Usage:
 *   import { requireAppliance } from './setup.js';
 *   const env = requireAppliance();
 */
export function requireAppliance(): IntegrationEnv {
  const env = getIntegrationEnv();
  beforeAll(() => {
    if (!env) {
      console.log('⏭️  Skipping integration tests: SPP_HOST not set');
      process.exit(0);
    }
  });
  // Return env (callers guard with their own checks too)
  return env!;
}
