---
name: a2a-workflow
description: Use when wiring certificate-based A2A retrieval, brokering, or related Safeguard event listeners in Node.js.
---

# A2A Workflow

## What A2A is

Application-to-Application (A2A) in safeguard.js is the certificate-authenticated, Node-only path for non-interactive secret retrieval and brokering. The main entry point exports `A2AClient` from `src/a2a/index.ts`; the browser entry (`src/browser.ts`) does not. Internally, the client calls Safeguard A2A endpoints under `https://{host}/service/a2a/v4/...`, sends `Authorization: A2A ${apiKey}` for credential and broker calls, and returns secrets as `SecretValue` so callers must opt in to raw material with `.expose()`.

## SDK surface

Relevant implementation files are `src/a2a/index.ts`, `src/a2a/types.ts`, `src/auth/certificate.ts`, `src/http/node.ts`, and `samples/node/a2a-password.ts`. Across those files, `A2AClient` supports password retrieval, SSH key retrieval, API key secret retrieval, account discovery, password write-back, private-key write-back, and brokered access requests.

This SDK does **not** provision A2A registrations or generate API keys. Appliance setup happens first; the SDK starts once you already have a registered certificate and at least one account API key.

## Setup flow

### 1. Register the client certificate in Safeguard

On the appliance, create or update the A2A registration that trusts the client certificate your process will present over mTLS. That registration is what authorizes `GET /service/a2a/v4/A2ARegistrations` and the credential endpoints.

### 2. Create the per-account API key

For each retrievable account, generate the A2A API key in Safeguard. In SDK terms that key becomes the `apiKey` parameter passed to `retrievePassword`, `retrievePrivateKey`, `retrieveApiKeySecret`, `setPassword`, `setPrivateKey`, and `brokerAccessRequest`.

### 3. Build the Node-side objects

Use the root package entry, not `@oneidentity/safeguard/browser`:

```typescript
import { readFileSync } from 'node:fs';
import {
  A2AClient,
  CertificateAuth,
  NodeHttpClient,
} from '@oneidentity/safeguard';

const host = 'safeguard.sample.corp';
const cert = readFileSync('ssl/a2a-cert.pem', 'utf8');
const key = readFileSync('ssl/a2a-cert.key', 'utf8');
const ca = readFileSync('ssl/ca.pem', 'utf8');

const auth = new CertificateAuth({
  cert,
  key,
  passphrase: process.env.SPP_KEY_PASSPHRASE,
});

const a2a = new A2AClient(host, {
  auth,
  ca,
  verify: true,
});

const httpClient = new NodeHttpClient({
  ...auth.getTlsOptions(),
  ca: a2a.ca,
  rejectUnauthorized: a2a.verify,
});

a2a.setHttpClient(httpClient);
```

### 4. Keep `verify` enabled unless you are in a lab

`A2AClientOptions.verify` defaults to `true`. The Node HTTP layer expects `rejectUnauthorized`, so the common pattern is:

```typescript
const httpClient = new NodeHttpClient({
  ...auth.getTlsOptions(),
  rejectUnauthorized: a2a.verify,
});
```

Only use `verify: false` for development against self-signed appliances.

### 5. Understand the file-content boundary

`CertificateAuth` accepts `cert`, `key`, `pfx`, `certFile`, `keyFile`, and `pfxFile` options, but `A2AClient` itself does not load files and does not auto-create a `NodeHttpClient`. In practice, the safest A2A pattern is to load PEM content yourself, construct `CertificateAuth`, then inject a preconfigured `NodeHttpClient` with `setHttpClient()` before making any A2A call.

## Credential retrieval

### Discover what the certificate can access

`getRetrievableAccounts()` issues `GET https://{host}/service/a2a/v4/A2ARegistrations` and returns `RetrievableAccount[]`:

```typescript
const accounts = await a2a.getRetrievableAccounts();
for (const account of accounts) {
  console.log(account.AssetName, account.AccountName, account.ApiKey);
}
```

Important fields from `src/a2a/types.ts`:

- `AccountId`
- `AssetId`
- `AssetName`
- `AccountName`
- `DomainName`
- `AccountType`
- `ApiKey`

Use discovery when you want the appliance to tell you which API keys are valid for the presented certificate.

### Retrieve a password

```typescript
const password = await a2a.retrievePassword(apiKey);
const rawPassword = password.expose();
```

Implementation detail: `retrievePassword()` calls `#a2aRequest(apiKey, 'Credentials', 'Password')` and wraps the response body in `SecretValue`.

### Retrieve an SSH private key

```typescript
import { SshKeyFormat } from '@oneidentity/safeguard';

const sshKey = await a2a.retrievePrivateKey(apiKey, SshKeyFormat.OpenSsh);
const rawKey = sshKey.expose();
```

Available formats from `SshKeyFormat`:

- `OpenSsh`
- `Ssh2`
- `Putty`

Internally the SDK requests `GET /service/a2a/v4/Credentials/SshKey?keyFormat=${format}`.

### Retrieve an API key secret

```typescript
const apiSecret = await a2a.retrieveApiKeySecret(apiKey);
const rawSecret = apiSecret.expose();
```

This maps to `GET /service/a2a/v4/Credentials/ApiKey`.

### Write credentials back

Use these only when the appliance registration is allowed to update the managed account:

```typescript
await a2a.setPassword(apiKey, 'NewPassword123!');

await a2a.setPrivateKey(
  apiKey,
  privateKeyPem,
  optionalPassphrase,
  SshKeyFormat.OpenSsh,
);
```

`setPrivateKey()` sends a JSON payload with `PrivateKey`, `KeyFormat`, and optional `Passphrase` to `PUT /service/a2a/v4/Credentials/SshKey`.

## Brokering

A2A brokering is supported through `brokerAccessRequest(apiKey, request)`, which posts to `POST /service/a2a/v4/AccessRequests` and accepts HTTP `200` or `201`.

Relevant enums and types live in `src/a2a/types.ts`:

- `BrokeredAccessRequestType.Password`
- `BrokeredAccessRequestType.SshKey`
- `BrokeredAccessRequestType.ApiKey`
- `BrokeredAccessRequestType.Token`
- `BrokeredAccessRequestType.RdpFile`
- `BrokeredAccessRequestType.RemoteDesktop`
- `BrokeredAccessRequestType.SshSession`

Example:

```typescript
import {
  BrokeredAccessRequestType,
  type BrokeredAccessResponse,
} from '@oneidentity/safeguard';

const response: BrokeredAccessResponse = await a2a.brokerAccessRequest(apiKey, {
  AccessType: BrokeredAccessRequestType.Password,
  AssetId: 123,
  AccountId: 456,
  ForUserName: 'svc-automation',
});

console.log(response.RequestId);
if (response.AccessToken) {
  console.log('Broker token acquired');
}
```

The response is parsed JSON and always includes `RequestId`; `AccessToken` is optional.

## Event listeners / SignalR

There is no A2A-specific SignalR wrapper in this repo. Real-time events are a separate feature exposed from `@oneidentity/safeguard/events`:

- `SafeguardEventListener` in `src/events/listener.ts`
- `PersistentSafeguardEventListener` in `src/events/persistent.ts`

Both subscribe to the Safeguard hub method `NotifyEventAsync` on `https://{host}/service/event/signalr`.

Use this pattern when an automation process needs both A2A secret retrieval **and** general Safeguard event monitoring:

1. Use `A2AClient` for A2A retrieval or brokering.
2. Separately authenticate for a Safeguard access token using `PasswordAuth`, `TokenAuth`, or a certificate-based Safeguard login flow.
3. Build a SignalR `HubConnection` with `accessTokenFactory`.
4. Wrap the connection in `SafeguardEventListener` or `PersistentSafeguardEventListener`.

Minimal example:

```typescript
import { PasswordAuth, NodeHttpClient, MemoryStorage } from '@oneidentity/safeguard';
import { SafeguardEventListener } from '@oneidentity/safeguard/events';
import * as signalR from '@microsoft/signalr';

const auth = new PasswordAuth({ username, password, provider: 'Local' });
const httpClient = new NodeHttpClient();
const storage = new MemoryStorage();
const tokenSet = await auth.authenticate(host, httpClient, storage);

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`https://${host}/service/event/signalr`, {
    accessTokenFactory: () => tokenSet.accessToken.expose(),
  })
  .withAutomaticReconnect()
  .build();

const listener = new SafeguardEventListener(connection);
listener.on('NotifyEventAsync', (event) => console.log(event.EventName));
await listener.start();
```

If you need reconnect behavior plus token refresh, use `PersistentSafeguardEventListener`. It tracks listener state (`starting`, `connected`, `disconnected`, `reconnecting`, `stopped`) and refreshes tokens when they are expired or within the built-in 60-second margin.

## Error scenarios and troubleshooting

### `ConfigurationError: A2AClient requires a host`

You passed an empty host to the constructor. The class validates this immediately in `src/a2a/index.ts`.

### `ConfigurationError: A2AClient requires a CertificateAuth`

A2A in this SDK is certificate-only. Password auth and token auth are not accepted by `A2AClientOptions.auth`.

### `ConfigurationError: HttpClient not set`

Every A2A call eventually reaches `#ensureHttpClient()`. Call `a2a.setHttpClient(...)` before `retrievePassword()`, `getRetrievableAccounts()`, or any other A2A method.

### TLS handshake or certificate problems

Typical causes:

- client cert/key do not match the registered Safeguard certificate
- custom CA bundle is missing
- `rejectUnauthorized` is still `true` against a self-signed lab appliance
- the process loaded file paths but never loaded the PEM contents it intended to send

Start by validating the `NodeHttpClient` TLS options and the appliance-side certificate registration.

### `ApiError` on retrieve, write-back, or brokering

`A2AClient` converts non-success HTTP responses with `ApiError.fromResponse(...)`:

- retrieval/discovery expect `200`
- `setPassword()` and `setPrivateKey()` accept `200` or `204`
- `brokerAccessRequest()` accepts `200` or `201`

Treat these like appliance or authorization failures and inspect the JSON body for the server message.

### Secret shows up as `[redacted]`

That is expected. `retrievePassword()`, `retrievePrivateKey()`, and `retrieveApiKeySecret()` return `SecretValue`, which redacts `toString()` and `toJSON()`. Call `.expose()` only at the point where you truly need the raw secret.

### Browser import failures

A2A is not exported from `src/browser.ts`. Use the root package entry in Node.js. If you also need events, install the optional peer dependency first:

```bash
npm install @microsoft/signalr
```

### Long-running processes

Dispose shared HTTP clients when you shut the process down:

```typescript
httpClient.dispose?.();
```

This matches the cleanup pattern used in `samples/node/signalr-events.ts` and `samples/node/persistent-events.ts`.
