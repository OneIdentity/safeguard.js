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
    verify: false, // Set true or omit for production
  });

  await client.connect();
  console.log('Connected!');

  const me = await client.get(Service.CORE, 'v4/Me');
  console.log('Current user:', me.DisplayName);

  const remaining = client.getAccessTokenLifetimeRemaining();
  console.log(`Token lifetime remaining: ${remaining}s`);

  await client.disconnect();
}

main().catch(console.error);
