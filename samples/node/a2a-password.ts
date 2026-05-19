/**
 * A2A Password Retrieval Example
 *
 * Demonstrates using the A2A client to retrieve a managed password.
 */
import { A2AClient, CertificateAuth } from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const apiKey = 'your-a2a-api-key';
const certFile = './ssl/a2a-cert.pem';
const keyFile = './ssl/a2a-cert.key';

async function main() {
  const a2a = new A2AClient(host, {
    auth: new CertificateAuth({ certFile, keyFile }),
    verify: false,
  });

  // Retrieve a password
  const password = await a2a.retrievePassword(apiKey);
  console.log('Retrieved password:', password.substring(0, 4) + '****');

  // List retrievable accounts
  const accounts = await a2a.getRetrievableAccounts();
  console.log('Retrievable accounts:', accounts.length);

  await a2a.disconnect();
}

main().catch(console.error);
