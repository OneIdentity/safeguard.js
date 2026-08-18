/**
 * Certificate + A2A integration fixtures.
 *
 * Shared helpers for the live certificate-auth and A2A tests: locating the
 * bundled PKI test certificates, computing thumbprints, and bootstrapping the
 * appliance objects (trusted CAs, certificate user) those flows depend on.
 *
 * The certificates under `certs/` are the shared, non-secret PKI test chain
 * (RootCA -> IntermediateCA -> UserCert) also used by the other Safeguard SDK
 * test suites. The password for every key/PFX is the single letter `a`.
 */
import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SafeguardClient } from '../../src/client.js';
import { PasswordAuth } from '../../src/auth/password.js';
import { NodeHttpClient } from '../../src/http/node.js';
import { Service } from '../../src/types.js';
import type { IntegrationEnv } from './setup.js';
import { CleanupRegistry, uniqueName } from './fixtures.js';

const CERTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'certs');

/** Password protecting every bundled test key/PFX. */
export const CERT_PASSWORD = 'a';

export interface CertPaths {
  userPfx: string;
  userPem: string;
  rootCa: string;
  intermediateCa: string;
}

/** Absolute paths to the bundled PKI test certificates. */
export function certPaths(): CertPaths {
  return {
    userPfx: join(CERTS_DIR, 'UserCert.pfx'),
    userPem: join(CERTS_DIR, 'UserCert.pem'),
    rootCa: join(CERTS_DIR, 'RootCA.pem'),
    intermediateCa: join(CERTS_DIR, 'IntermediateCA.pem'),
  };
}

/** SHA-1 thumbprint (uppercase hex, no separators) of a PEM certificate. */
export function thumbprint(pemPath: string): string {
  return new X509Certificate(readFileSync(pemPath)).fingerprint.replace(/:/g, '');
}

/**
 * Upload the Root and Intermediate CAs as trusted certificates so the appliance
 * accepts the user certificate for cert-auth and A2A. Registers cleanup to
 * remove them afterward.
 */
export async function uploadTrustedCas(
  client: SafeguardClient,
  cleanup: CleanupRegistry,
): Promise<void> {
  const paths = certPaths();
  for (const certPath of [paths.rootCa, paths.intermediateCa]) {
    const pem = readFileSync(certPath, 'utf8');
    const created = await client.post<{ Id: number }>(
      Service.CORE,
      'TrustedCertificates',
      { json: { Base64CertificateData: pem } },
    );
    const id = created.Id;
    cleanup.register(async () => {
      try {
        await client.delete(Service.CORE, `TrustedCertificates/${id}`);
      } catch { /* best effort */ }
    });
  }
}

/**
 * Create a certificate user (primary auth provider -2) mapped to the bundled
 * user certificate thumbprint. Registers cleanup to delete the user.
 */
export async function createCertUser(
  client: SafeguardClient,
  cleanup: CleanupRegistry,
  name: string,
): Promise<{ Id: number; Name: string }> {
  const identity = thumbprint(certPaths().userPem);
  const user = await client.post<{ Id: number; Name: string }>(
    Service.CORE,
    'Users',
    {
      json: {
        Name: name,
        PrimaryAuthenticationProvider: { Id: -2, Identity: identity },
      },
    },
  );
  cleanup.register(async () => {
    try {
      await client.delete(Service.CORE, `Users/${user.Id}`);
    } catch { /* best effort */ }
  });
  return user;
}

/**
 * Create a fully-privileged admin user (local provider) and return a client
 * connected as that user.
 *
 * The bootstrap `Admin` account holds `GlobalAdmin`/`UserAdmin` but not the
 * delegated `AssetAdmin`/`PolicyAdmin` roles, so it cannot create the assets,
 * accounts, or A2A registrations these tests need (the appliance returns 403).
 * Mirroring the Java suite, this mints a local user with the full admin-role set
 * and authenticates as it. The `admin` client (which must retain `UserAdmin`)
 * is used to create and later delete the user.
 */
export async function createOpsAdminClient(
  admin: SafeguardClient,
  env: IntegrationEnv,
  cleanup: CleanupRegistry,
): Promise<SafeguardClient> {
  const name = uniqueName('OpsAdmin');
  const password = 'OpsAdminPass123!';

  const user = await admin.post<{ Id: number }>(Service.CORE, 'Users', {
    json: {
      Name: name,
      PrimaryAuthenticationProvider: { Id: -1 },
      AdminRoles: [
        'GlobalAdmin', 'Auditor', 'AssetAdmin', 'ApplianceAdmin',
        'PolicyAdmin', 'UserAdmin', 'HelpdeskAdmin', 'OperationsAdmin',
      ],
    },
  });
  cleanup.register(async () => {
    try {
      await admin.delete(Service.CORE, `Users/${user.Id}`);
    } catch { /* best effort */ }
  });

  await admin.put(Service.CORE, `Users/${user.Id}/Password`, { json: password });

  const client = new SafeguardClient(env.host, {
    auth: new PasswordAuth({ username: name, password, provider: env.provider }),
    verify: env.verify,
  });
  client.setHttpClient(new NodeHttpClient({ rejectUnauthorized: env.verify }));
  await client.connect();
  return client;
}
