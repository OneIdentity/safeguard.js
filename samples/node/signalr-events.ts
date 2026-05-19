/**
 * SignalR Events Example
 *
 * Demonstrates subscribing to real-time Safeguard events.
 */
import { SafeguardClient, PasswordAuth } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const username = 'MyUser';
const password = 'MyPassword';
const provider = 'Local';

async function main() {
  const client = new SafeguardClient(host, {
    auth: new PasswordAuth({ username, password, provider }),
    verify: false,
  });

  await client.connect();

  const listener = await client.getEventListener();

  listener.on('NotifyEventAsync', (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
  });

  await listener.start();
  console.log('Listening for events... (Ctrl+C to stop)');

  // Keep alive
  process.on('SIGINT', async () => {
    await listener.stop();
    await client.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
