/**
 * Persistent Event Listener Example
 *
 * Demonstrates the persistent listener that automatically reconnects
 * and refreshes tokens when they expire.
 */
import {
  PersistentSafeguardEventListener,
  PasswordAuth,
  NodeHttpClient,
  MemoryStorage,
} from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const username = 'MyUser';
const password = 'MyPassword';
const provider = 'Local';

async function main() {
  const listener = new PersistentSafeguardEventListener(host, {
    auth: new PasswordAuth({ username, password, provider }),
    httpClient: new NodeHttpClient({ rejectUnauthorized: false }),
    storage: new MemoryStorage(),
  });

  listener.on('NotifyEventAsync', (event) => {
    console.log('Event:', event);
  });

  listener.on('reconnecting', () => {
    console.log('Connection lost, reconnecting...');
  });

  listener.on('reconnected', () => {
    console.log('Reconnected!');
  });

  await listener.start();
  console.log('Persistent listener running... (Ctrl+C to stop)');

  process.on('SIGINT', async () => {
    await listener.stop();
    process.exit(0);
  });
}

main().catch(console.error);
