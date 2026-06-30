/**
 * Browser Device Code Login Example
 *
 * Demonstrates the OAuth 2.0 Device Authorization Grant (RFC 8628) in the
 * browser. The SDK requests a device code and polls; this sample renders the
 * verification URL + user code in the DOM. The user authenticates in their own
 * browser tab/device. The library never opens a browser programmatically.
 *
 * Use a bundler (e.g. Vite) to build this for the browser.
 */
import {
  SafeguardClient,
  DeviceCodeAuth,
  BrowserHttpClient,
  Service,
} from '@oneidentity/safeguard/browser';

const host = 'safeguard.sample.corp';

document.getElementById('login')?.addEventListener('click', async () => {
  const prompt = document.getElementById('prompt')!;
  const output = document.getElementById('output')!;

  const client = new SafeguardClient(host, {
    auth: new DeviceCodeAuth({
      provider: 'local',
      onDeviceCode: ({
        verificationUriComplete,
        verificationUri,
        userCode,
        expiresIn,
        interval,
      }) => {
        // Caller owns display I/O — render the URL + code into the page.
        const url = verificationUriComplete || verificationUri;
        prompt.innerHTML =
          `<p>Open <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>` +
          `<p>Enter code: <strong>${userCode}</strong></p>` +
          `<p>Expires in ${String(expiresIn)}s; polling every ${String(interval)}s…</p>`;
      },
    }),
  });
  client.setHttpClient(new BrowserHttpClient());

  await client.connect();

  const me = await client.get(Service.CORE, 'Me');
  output.textContent = JSON.stringify(me, null, 2);
});
