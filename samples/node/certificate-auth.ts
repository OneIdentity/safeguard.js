/**
 * Certificate Authentication Example
 *
 * Demonstrates connecting to Safeguard using a client certificate.
 */
import { SafeguardClient, CertificateAuth, Service } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const certFile = './ssl/client.pem';
const keyFile = './ssl/client.key';

async function main() {
  const client = new SafeguardClient(host, {
    auth: new CertificateAuth({ certFile, keyFile }),
    verify: false,
  });

  await client.connect();
  console.log('Connected via certificate!');

  const me = await client.get(Service.CORE, 'v4/Me');
  console.log('Authenticated as:', me.DisplayName);

  await client.disconnect();
}

main().catch(console.error);
