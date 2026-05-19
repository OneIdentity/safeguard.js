/**
 * Anonymous Status Check Example
 *
 * Demonstrates checking appliance status without authentication.
 */
import { SafeguardClient, AnonymousAuth, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';

async function main() {
  const client = new SafeguardClient(host, {
    auth: new AnonymousAuth(),
    // To disable TLS verification for self-signed certs (dev only):
    // verify: false,
  });

  await client.connect();

  const status = await client.get(Service.NOTIFICATION, 'v4/Status');
  console.log('Appliance status:', JSON.stringify(status, null, 2));

  await client.disconnect();
}

main().catch(console.error);
