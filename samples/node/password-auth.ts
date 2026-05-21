/**
 * Password Authentication Example
 *
 * Demonstrates connecting to Safeguard with username/password,
 * fetching the current user, and disconnecting.
 */
import { SafeguardClient, PasswordAuth, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const username = 'MyUser';
const password = 'MyPassword';
const provider = 'Local';

async function main() {
  const client = new SafeguardClient(host, {
    auth: new PasswordAuth({ username, password, provider }),
    // To disable TLS verification for self-signed certs (dev only):
    // verify: false,
  });

  await client.connect();
  console.log('Connected!');

  const me = await client.get<{ DisplayName: string }>(Service.CORE, 'Me');
  console.log('Current user:', me.DisplayName);

  const remaining = client.getAccessTokenLifetimeRemaining();
  console.log(`Token lifetime remaining: ${remaining}s`);

  await client.disconnect();
}

main().catch(console.error);
