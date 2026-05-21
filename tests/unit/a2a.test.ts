import { beforeEach, describe, expect, it, vi } from 'vitest';
import { A2AClient, BrokeredAccessRequestType, SshKeyFormat } from '../../src/a2a/index.js';
import { CertificateAuth } from '../../src/auth/certificate.js';
import type { HttpClient, HttpResponse } from '../../src/http/types.js';

function createAuth(): CertificateAuth {
  return new CertificateAuth({ cert: 'cert-pem', key: 'key-pem' });
}

function createMockHttpClient(responseBody = 'secret', status = 200): HttpClient {
  return {
    request: vi.fn(async (): Promise<HttpResponse> => ({
      status,
      headers: { 'content-type': 'application/json' },
      body: responseBody,
    })),
  };
}

describe('A2AClient', () => {
  let client: A2AClient;
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = createMockHttpClient();
    client = new A2AClient('appliance.example.com', { auth: createAuth() });
    client.setHttpClient(httpClient);
  });

  it('retrieves passwords via query parameters', async () => {
    const secret = await client.retrievePassword('api-key');
    const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(secret.expose()).toBe('secret');
    expect(call.url).toBe(
      'https://appliance.example.com/service/a2a/v4/Credentials?type=Password',
    );
    expect(call.method).toBe('GET');
    expect(call.headers.Authorization).toBe('A2A api-key');
  });

  it('retrieves SSH keys via query parameters', async () => {
    await client.retrievePrivateKey('api-key');
    const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe(
      'https://appliance.example.com/service/a2a/v4/Credentials?type=SshKey&keyFormat=OpenSsh',
    );
  });

  it('retrieves API key secrets via query parameters', async () => {
    await client.retrieveApiKeySecret('api-key');
    const call = (httpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe(
      'https://appliance.example.com/service/a2a/v4/Credentials?type=ApiKey',
    );
  });

  it('uses the configured api version for discovery', async () => {
    const versionedClient = new A2AClient('appliance.example.com', {
      auth: createAuth(),
      apiVersion: 'v3',
    });
    const versionedHttpClient = createMockHttpClient(
      JSON.stringify([{ AccountId: 1, ApiKey: 'api-key' }]),
    );
    versionedClient.setHttpClient(versionedHttpClient);

    await versionedClient.getRetrievableAccounts();
    const call = (versionedHttpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe('https://appliance.example.com/service/a2a/v3/A2ARegistrations');
    expect(call.method).toBe('GET');
  });

  it('sets passwords with the credential type in the query string', async () => {
    const updateClient = createMockHttpClient('', 204);
    client.setHttpClient(updateClient);

    await client.setPassword('api-key', 'NewPassword123');
    const call = (updateClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe(
      'https://appliance.example.com/service/a2a/v4/Credentials?type=Password',
    );
    expect(call.method).toBe('PUT');
    expect(call.body).toBe('"NewPassword123"');
  });

  it('sets private keys with the credential type in the query string', async () => {
    const updateClient = createMockHttpClient('', 204);
    client.setHttpClient(updateClient);

    await client.setPrivateKey('api-key', 'PRIVATE KEY', 'passphrase', SshKeyFormat.Putty);
    const call = (updateClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe('https://appliance.example.com/service/a2a/v4/Credentials?type=SshKey');
    expect(call.method).toBe('PUT');
    expect(JSON.parse(call.body as string)).toEqual({
      PrivateKey: 'PRIVATE KEY',
      KeyFormat: 'Putty',
      Passphrase: 'passphrase',
    });
  });

  it('uses the configured api version for brokered access requests', async () => {
    const versionedClient = new A2AClient('appliance.example.com', {
      auth: createAuth(),
      apiVersion: 'v3',
    });
    const brokerHttpClient = createMockHttpClient(JSON.stringify({ RequestId: 'req-1' }), 201);
    versionedClient.setHttpClient(brokerHttpClient);

    await versionedClient.brokerAccessRequest('api-key', {
      AccessType: BrokeredAccessRequestType.Password,
      AccountId: 1,
    });
    const call = (brokerHttpClient.request as ReturnType<typeof vi.fn>).mock.calls[0]![0];

    expect(call.url).toBe('https://appliance.example.com/service/a2a/v3/AccessRequests');
    expect(call.method).toBe('POST');
  });
});
