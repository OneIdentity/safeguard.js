/**
 * Browser PKCE Login Example
 *
 * This page handles both the login initiation and the OAuth callback.
 * Use a bundler (e.g. Vite) to build this for the browser.
 */
import { SafeguardClient, PkceAuth, handlePkceCallback, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const redirectUri = window.location.href.split('?')[0];

// Handle OAuth callback (if returning from login)
handlePkceCallback();

// Setup login button
document.getElementById('login')?.addEventListener('click', async () => {
  const client = new SafeguardClient(host, {
    auth: new PkceAuth({ redirectUri }),
  });

  await client.connect();

  const me = await client.get(Service.CORE, 'v4/Me');
  document.getElementById('output')!.textContent = JSON.stringify(me, null, 2);
});
