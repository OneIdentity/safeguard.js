/**
 * Persistent Event Listener Example
 *
 * Demonstrates the persistent listener that automatically reconnects
 * and refreshes tokens when they expire.
 * Requires: npm install @microsoft/signalr
 */
import { PasswordAuth, NodeHttpClient, MemoryStorage } from '@oneidentity/safeguard';
import { PersistentSafeguardEventListener } from '@oneidentity/safeguard/events';
import * as signalR from '@microsoft/signalr';

const host = 'safeguard.sample.corp';
const username = 'MyUser';
const password = 'MyPassword';
const provider = 'Local';

async function main() {
  const auth = new PasswordAuth({ username, password, provider });
  const httpClient = new NodeHttpClient();
  // To disable TLS verification for self-signed certs (dev only):
  // const httpClient = new NodeHttpClient({ rejectUnauthorized: false });
  const storage = new MemoryStorage();

  // Authenticate to get initial token
  const tokenSet = await auth.authenticate(host, httpClient, storage);

  // Build SignalR connection
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`https://${host}/service/event/signalr`, {
      accessTokenFactory: () => tokenSet.accessToken.expose(),
    })
    .withAutomaticReconnect()
    .build();

  // Wrap in persistent listener (handles token refresh on reconnect)
  const listener = new PersistentSafeguardEventListener(
    connection, auth, host, httpClient, storage,
  );

  listener.onStateChange((state) => {
    console.log('State:', state);
  });

  listener.on('NotifyEventAsync', (event) => {
    console.log('Event:', event);
  });

  await listener.start();
  console.log('Persistent listener running... (Ctrl+C to stop)');

  process.on('SIGINT', async () => {
    await listener.stop();
    httpClient.dispose?.();
    process.exit(0);
  });
}

main().catch(console.error);
