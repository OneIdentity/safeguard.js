/**
 * Device Code Authentication Example (Node.js)
 *
 * Demonstrates the headless OAuth 2.0 Device Authorization Grant (RFC 8628).
 * The SDK requests a device code and polls; this sample (the caller) prints the
 * verification URL + user code. The user authenticates in their own browser on
 * any device. The library never opens or spawns a browser.
 *
 * Requires the Device Code grant to be enabled on the appliance
 * (Settings -> OAuth 2.0 Grant Types). If disabled, DeviceCodeAuth throws a
 * ConfigurationError.
 */
import { SafeguardClient, DeviceCodeAuth, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';

async function main() {
  const abort = new AbortController();
  // Optional: stop polling after 5 minutes if the user never finishes.
  setTimeout(() => abort.abort(), 5 * 60 * 1000).unref();

  const client = new SafeguardClient(host, {
    auth: new DeviceCodeAuth({
      provider: 'local',
      signal: abort.signal,
      onDeviceCode: ({
        verificationUriComplete,
        verificationUri,
        userCode,
        expiresIn,
        interval,
      }) => {
        // Caller owns display I/O — print, render to a DOM node, or log.
        console.log(`Open: ${verificationUriComplete || verificationUri}`);
        console.log(`Code: ${userCode} (expires in ${expiresIn}s; polling every ${interval}s)`);
      },
    }),
    // To disable TLS verification for self-signed certs (dev only):
    // verify: false,
  });

  await client.connect();
  console.log('Connected!');

  const me = await client.get<{ DisplayName: string }>(Service.CORE, 'Me');
  console.log('Current user:', me.DisplayName);

  await client.disconnect();
}

main().catch(console.error);
