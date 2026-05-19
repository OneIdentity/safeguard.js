/**
 * Browser PKCE Login Example
 *
 * This page handles both the login initiation and the OAuth callback.
 * Use a bundler (e.g. Vite) to build this for the browser.
 */
import {
  SafeguardClient,
  PkceAuth,
  handlePkceCallback,
  BrowserSessionStorage,
  BrowserHttpClient,
  Service,
} from '@oneidentity/safeguard/browser';

const host = 'safeguard.sample.corp';
const redirectUri = window.location.href.split('?')[0];
const storage = new BrowserSessionStorage();

// Handle OAuth callback (if returning from login).
// Storage is needed to validate PKCE state and retrieve the code verifier.
handlePkceCallback(storage);

// Setup login button
document.getElementById('login')?.addEventListener('click', async () => {
  const client = new SafeguardClient(host, {
    auth: new PkceAuth({ redirectUri, provider: 'local' }),
  });
  client.setStorage(storage);
  client.setHttpClient(new BrowserHttpClient());

  await client.connect();

  const me = await client.get(Service.CORE, 'v4/Me');
  document.getElementById('output')!.textContent = JSON.stringify(me, null, 2);
});
