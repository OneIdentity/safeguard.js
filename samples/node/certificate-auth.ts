/**
 * Certificate Authentication Example
 *
 * Demonstrates connecting to Safeguard using a client certificate.
 */
import { SafeguardClient, CertificateAuth, NodeHttpClient, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const certFile = './ssl/client.pem';
const keyFile = './ssl/client.key';

async function main() {
  const auth = new CertificateAuth({ certFile, keyFile });
  const client = new SafeguardClient(host, {
    auth,
    // To disable TLS verification for self-signed certs (dev only):
    // verify: false,
  });

  // The HTTP client must carry the client certificate for mTLS.
  //
  // TLS 1.3 / SPP 9.0: because a client cert is present and no TLS version is
  // pinned, NodeHttpClient automatically caps this connection at TLS 1.2 so the
  // certificate is requested in-handshake (Node cannot present a cert via TLS
  // 1.3 post-handshake auth). To do cert-auth over TLS 1.3, connect to the
  // appliance's Cert SNI hostname and pass `minVersion: 'TLSv1.3'`.
  client.setHttpClient(new NodeHttpClient(auth.getTlsOptions()));

  await client.connect();
  console.log('Connected via certificate!');

  const me = await client.get<{ DisplayName: string }>(Service.CORE, 'Me');
  console.log('Authenticated as:', me.DisplayName);

  await client.disconnect();
}

main().catch(console.error);
