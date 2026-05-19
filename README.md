[![npm](https://img.shields.io/npm/v/@oneidentity/safeguard.svg)](https://www.npmjs.com/package/@oneidentity/safeguard)
[![license](https://img.shields.io/github/license/OneIdentity/safeguard.js.svg)](https://github.com/OneIdentity/safeguard.js/blob/main/LICENSE)

# safeguard.js

One Identity Safeguard JavaScript/TypeScript SDK

-----------

<p align="center">
<i>Check out our <a href="samples">sample projects</a> to get started with your own custom integration to Safeguard!</i>
</p>

-----------

## Support

One Identity open source projects are supported through [One Identity GitHub issues](https://github.com/OneIdentity/safeguard.js/issues) and the [One Identity Community](https://www.oneidentity.com/community/). This includes all scripts, plugins, SDKs, modules, code snippets or other solutions. For assistance with any One Identity GitHub project, please raise a new Issue on the [One Identity GitHub project](https://github.com/OneIdentity/safeguard.js/issues) page. You may also visit the [One Identity Community](https://www.oneidentity.com/community/) to ask questions. Requests for assistance made through official One Identity Support will be referred back to GitHub and the One Identity Community forums where those requests can benefit all users.

## Introduction

All functionality in Safeguard is available via the Safeguard API. There is
nothing that can be done in the Safeguard UI that cannot also be performed
using the Safeguard API programmatically.

safeguard.js is provided to facilitate calling the Safeguard API from
JavaScript and TypeScript. It is meant to remove the complexity of dealing
with authentication via Safeguard's embedded secure token service (STS). The
basic usage is to create a `SafeguardClient` with your chosen authentication
strategy, call `connect()`, then call API methods using the same authenticated
client.

safeguard.js also provides an easy way to call Safeguard A2A from JavaScript.
The A2A service requires client certificate authentication for retrieving
passwords for application integration. When Safeguard A2A is properly
configured, specified passwords can be retrieved with a single method call
without requiring access request workflow approvals.

safeguard.js includes an SDK for listening to Safeguard's powerful, real-time
event notification system. Safeguard provides role-based event notifications
via SignalR to subscribed clients. The `PersistentSafeguardEventListener`
provides automatic reconnection with token refresh for long-running listeners.

### Features

- **TypeScript-first** with full type declarations
- **Dual ESM/CJS** — works with `import` and `require()`
- **Node.js and Browser** support
- **Multiple auth strategies** — Password, Certificate, PKCE (browser), PKCE Non-Interactive (headless), Token, Anonymous
- **A2A client** — retrieve/set passwords, SSH keys, API key secrets, broker access requests
- **SignalR events** — one-shot and persistent event listeners with auto-reconnect
- **Secure by default** — TLS verification enabled, no secrets in memory longer than needed

## Installation

```bash
npm install @oneidentity/safeguard
```

Requires Node.js 20 or later.

## Getting Started

### Password Authentication (Node.js)

```typescript
import { SafeguardClient, PasswordAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new PasswordAuth({
    username: 'Admin',
    password: 'Admin123',
    provider: 'Local',
  }),
});

await client.connect();

const me = await client.get(Service.CORE, 'v4/Me');
console.log(me);

await client.disconnect();
```

### PKCE Authentication (Browser)

```typescript
import { SafeguardClient, PkceAuth, handlePkceCallback, Service } from '@oneidentity/safeguard';

// On your callback page, call this first:
handlePkceCallback();

// On your main page:
const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new PkceAuth({ redirectUri: window.location.href }),
});

await client.connect(); // Redirects to Safeguard login if no stored tokens

const me = await client.get(Service.CORE, 'v4/Me');
console.log(me);
```

### PKCE Non-Interactive (Headless Automation)

For automated scenarios where no browser is available (CI/CD, scripts):

```typescript
import { SafeguardClient, PkceNonInteractiveAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new PkceNonInteractiveAuth({
    username: 'Admin',
    password: 'Admin123',
    provider: 'Local',
  }),
});

await client.connect();
const me = await client.get(Service.CORE, 'v4/Me');
await client.disconnect();
```

### Client Certificate Authentication

```typescript
import { SafeguardClient, CertificateAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new CertificateAuth({
    certFile: '/path/to/client.pem',
    keyFile: '/path/to/client.key',
    passphrase: 'optional-key-passphrase',
  }),
});

await client.connect();
const me = await client.get(Service.CORE, 'v4/Me');
await client.disconnect();
```

### Anonymous Access

```typescript
import { SafeguardClient, AnonymousAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new AnonymousAuth(),
});

await client.connect();
const status = await client.get(Service.NOTIFICATION, 'v4/Status');
console.log(status);
```

### Pre-existing API Token

```typescript
import { SafeguardClient, TokenAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new TokenAuth({ accessToken: 'your-token-here' }),
});

await client.connect();
const me = await client.get(Service.CORE, 'v4/Me');
```

## Calling the API

The client provides typed HTTP methods:

```typescript
// GET
const users = await client.get(Service.CORE, 'v4/Users');

// GET with query parameters
const filtered = await client.get(Service.CORE, 'v4/Users', {
  query: { filter: "Name eq 'Admin'", fields: 'Id,Name' },
});

// POST (create)
const newUser = await client.post(Service.CORE, 'v4/Users', {
  json: { Name: 'newuser', PrimaryAuthenticationProvider: { Id: -1 } },
});

// PUT (update)
await client.put(Service.CORE, `v4/Users/${newUser.Id}/Password`, {
  json: 'NewPassword123',
});

// DELETE
await client.delete(Service.CORE, `v4/Users/${newUser.Id}`);
```

### Services

| Service | Description |
|---------|-------------|
| `Service.CORE` | Most product functionality — access requests, asset management, policy, users |
| `Service.APPLIANCE` | Appliance-specific operations — IP address, maintenance, backups |
| `Service.NOTIFICATION` | Anonymous/unauthenticated — status, availability |
| `Service.A2A` | Application integration — credential retrieval, access request brokering |

## A2A (Application to Application)

```typescript
import { A2AClient, CertificateAuth } from '@oneidentity/safeguard';

const a2a = new A2AClient('safeguard.sample.corp', {
  auth: new CertificateAuth({
    certFile: 'client.pem',
    keyFile: 'client.key',
  }),
});

// Retrieve a password
const password = await a2a.retrievePassword(apiKey);

// Retrieve an SSH private key
const sshKey = await a2a.retrievePrivateKey(apiKey);

// Set a password (write-back)
await a2a.setPassword(apiKey, 'NewPassword123');

// Discover retrievable accounts
const accounts = await a2a.getRetrievableAccounts();
```

## Event Listeners (SignalR)

### One-Shot Listener

```typescript
const listener = await client.getEventListener();

listener.on('NotifyEventAsync', (event) => {
  console.log('Event received:', event);
});

await listener.start();

// Later...
await listener.stop();
```

### Persistent Listener (Auto-Reconnect)

For long-running processes that need to survive network interruptions and
token expiration:

```typescript
import { PersistentSafeguardEventListener, PasswordAuth, NodeHttpClient, MemoryStorage } from '@oneidentity/safeguard';

const listener = new PersistentSafeguardEventListener('safeguard.sample.corp', {
  auth: new PasswordAuth({ username: 'Admin', password: 'Admin123', provider: 'Local' }),
  httpClient: new NodeHttpClient(),
  storage: new MemoryStorage(),
  retryIntervalMs: 5000,
});

listener.on('NotifyEventAsync', (event) => {
  console.log('Event:', event);
});

listener.onStateChange((from, to) => {
  console.log(`Listener state: ${from} → ${to}`);
});

await listener.start();
```

The persistent listener automatically checks token lifetime and refreshes
credentials before they expire (with a 60-second safety margin).

## TLS Configuration

By default, the SDK verifies TLS certificates. For development with
self-signed certificates:

```typescript
const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new PasswordAuth({ username: 'Admin', password: 'Admin123', provider: 'Local' }),
  verify: false, // Disable TLS verification (development only!)
});
```

For production with a custom CA:

```typescript
import { NodeHttpClient } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new PasswordAuth({ username: 'Admin', password: 'Admin123', provider: 'Local' }),
});

client.setHttpClient(new NodeHttpClient({ ca: '/path/to/ca.pem' }));
```

## About the Safeguard API

The Safeguard API is a REST-based Web API. Safeguard API endpoints are called
using HTTP operators and JSON requests and responses. The Safeguard API is
documented using Swagger. You may use Swagger UI to call the API directly or
to read the documentation about URLs, parameters, and payloads.

To access the Swagger UI use a browser to navigate to:
`https://<address>/service/<service>/swagger`

- `<address>` = Safeguard network address
- `<service>` = Safeguard service to use

To access the Swagger OpenAPI specification:
`https://<address>/service/<service>/swagger/v4/swagger.json`

### Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `filter` | `filter=Name eq 'Admin'` | Filter results |
| `fields` | `fields=Id,Name` | Select specific properties |
| `orderby` | `orderby=Name` or `orderby=-Name` | Sort ascending/descending |
| `page` | `page=0` | Page number (0-based) |
| `limit` | `limit=100` | Results per page |
| `count` | `count=true` | Include total count |
| `q` | `q=admin` | Full-text search |

## Migration from v7.x

See [MIGRATION.md](MIGRATION.md) for a complete guide to upgrading from the
legacy JavaScript API to the v8.0 TypeScript SDK.

## Related Projects

| Project | Language | Description |
|---------|----------|-------------|
| [SafeguardDotNet](https://github.com/OneIdentity/SafeguardDotNet) | C# | .NET SDK |
| [PySafeguard](https://github.com/OneIdentity/PySafeguard) | Python | Python SDK |
| [SafeguardJava](https://github.com/OneIdentity/SafeguardJava) | Java | Java SDK |
| [safeguard-ps](https://github.com/OneIdentity/safeguard-ps) | PowerShell | PowerShell module |
| [safeguard-bash](https://github.com/OneIdentity/safeguard-bash) | Bash | Bash utilities |
