/**
 * Integration tests — live certificate authentication.
 *
 * Bootstraps a certificate user on the appliance (trusting the bundled test CA
 * chain), then authenticates with the matching client certificate over mTLS and
 * verifies the resulting identity.
 *
 * Note on TLS: client-certificate connections auto-cap at TLS 1.2 because Node
 * has no client-side TLS 1.3 post-handshake authentication. This is exercised
 * implicitly here — the connection succeeds and presents the certificate in the
 * handshake on both TLS 1.2 (8.x) and TLS 1.3-capable (9.0) appliances.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { requireAppliance } from './setup.js';
import { createAdminClient, uniqueName, CleanupRegistry } from './fixtures.js';
import { certPaths, CERT_PASSWORD, uploadTrustedCas, createCertUser } from './certFixtures.js';
import { SafeguardClient } from '../../src/client.js';
import { CertificateAuth } from '../../src/auth/certificate.js';
import { NodeHttpClient } from '../../src/http/node.js';
import { Service } from '../../src/types.js';

const env = requireAppliance();

describe('Certificate Authentication', () => {
  let admin: SafeguardClient;
  const cleanup = new CleanupRegistry();
  let certUserName: string;
  let certUserId: number;

  beforeAll(async () => {
    admin = await createAdminClient(env);
    await uploadTrustedCas(admin, cleanup);
    certUserName = uniqueName('CertUser');
    const user = await createCertUser(admin, cleanup, certUserName);
    certUserId = user.Id;
  });

  afterAll(async () => {
    await cleanup.runAll();
    await admin?.disconnect();
  });

  /** Connect a fresh client authenticated by the bundled user certificate. */
  async function connectWithCert(): Promise<SafeguardClient> {
    const pfx = readFileSync(certPaths().userPfx);
    const auth = new CertificateAuth({ pfx, passphrase: CERT_PASSWORD });
    const client = new SafeguardClient(env.host, { auth, verify: env.verify });
    const httpClient = new NodeHttpClient({
      pfx,
      passphrase: CERT_PASSWORD,
      rejectUnauthorized: env.verify,
    });
    client.setHttpClient(httpClient);
    await client.connect();
    return client;
  }

  it('authenticates with a client certificate (PFX)', async () => {
    const client = await connectWithCert();
    try {
      const me = await client.get<{ Id: number; Name: string }>(Service.CORE, 'Me');
      expect(me.Name).toBe(certUserName);
      expect(me.Id).toBe(certUserId);
    } finally {
      await client.disconnect();
    }
  });

  it('returns a usable token for API calls', async () => {
    const client = await connectWithCert();
    try {
      expect(client.isConnected).toBe(true);
      const status = await client.get<{ ApplianceCurrentState?: string }>(
        Service.NOTIFICATION,
        'Status',
      );
      expect(status.ApplianceCurrentState).toBe('Online');
    } finally {
      await client.disconnect();
    }
  });
});
