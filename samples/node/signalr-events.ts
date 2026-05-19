/**
 * SignalR Events Example
 *
 * Demonstrates subscribing to real-time Safeguard events using the
 * events subpath. Requires: npm install @microsoft/signalr
 */
import { PasswordAuth, NodeHttpClient, MemoryStorage } from '@oneidentity/safeguard';
import { SafeguardEventListener } from '@oneidentity/safeguard/events';
import * as signalR from '@microsoft/signalr';

const host = 'safeguard.sample.corp';
const username = 'MyUser';
const password = 'MyPassword';
const provider = 'Local';

async function main() {
  // Authenticate to get an access token
  const auth = new PasswordAuth({ username, password, provider });
  const httpClient = new NodeHttpClient();
  // To disable TLS verification for self-signed certs (dev only):
  // const httpClient = new NodeHttpClient({ rejectUnauthorized: false });
  const storage = new MemoryStorage();
  const tokenSet = await auth.authenticate(host, httpClient, storage);

  // Build SignalR connection with the access token
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`https://${host}/service/event/signalr`, {
      accessTokenFactory: () => tokenSet.accessToken.expose(),
    })
    .withAutomaticReconnect()
    .build();

  // Wrap it in the SDK event listener
  const listener = new SafeguardEventListener(connection);

  listener.on('NotifyEventAsync', (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
  });

  await listener.start();
  console.log('Listening for events... (Ctrl+C to stop)');

  process.on('SIGINT', async () => {
    await listener.stop();
    httpClient.dispose?.();
    process.exit(0);
  });
}

main().catch(console.error);
