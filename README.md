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
- **Multiple auth strategies** — Password, Certificate, PKCE (browser), PKCE Non-Interactive (headless), Device Code (Node + browser), Token, Anonymous
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

const me = await client.get(Service.CORE, 'Me');
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

const me = await client.get(Service.CORE, 'Me');
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
const me = await client.get(Service.CORE, 'Me');
await client.disconnect();
```

### Device Code Login (Node.js and Browser)

For headless and shared environments — containers, SSH sessions, CI/operator
consoles — where the SDK cannot open a browser. The SDK requests a device code
and polls; the user authenticates in their own browser on any device. Your code
owns all display I/O via the required `onDeviceCode` callback.

This strategy is platform-agnostic and works in both Node.js and the browser.

**Appliance prerequisite:** the Device Code grant must be enabled in Safeguard
settings (`Settings -> OAuth 2.0 Grant Types`; API Settings/Allowed OAuth2 Grant
Types must include `DeviceCode`). If disabled, `DeviceCodeAuth` throws a
`ConfigurationError`.

```typescript
import { SafeguardClient, DeviceCodeAuth, Service } from '@oneidentity/safeguard';

const abort = new AbortController();
const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new DeviceCodeAuth({
    signal: abort.signal,
    onDeviceCode: ({ verificationUriComplete, verificationUri, userCode, expiresIn, interval }) => {
      console.log(`Open: ${verificationUriComplete ?? verificationUri}`);
      console.log(`Code: ${userCode} (expires in ${expiresIn}s; poll ${interval}s)`);
    },
  }),
});

await client.connect();
const me = await client.get(Service.CORE, 'Me');
console.log(me);
```

In the browser, import from `@oneidentity/safeguard/browser` and render the URL
and code into the DOM instead of the console. Cancel with `abort.abort()`.

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
const me = await client.get(Service.CORE, 'Me');
await client.disconnect();
```

### Anonymous Access

```typescript
import { SafeguardClient, AnonymousAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new AnonymousAuth(),
});

await client.connect();
const status = await client.get(Service.NOTIFICATION, 'Status');
console.log(status);
```

### Pre-existing API Token

```typescript
import { SafeguardClient, TokenAuth, Service } from '@oneidentity/safeguard';

const client = new SafeguardClient('safeguard.sample.corp', {
  auth: new TokenAuth({ accessToken: 'your-token-here' }),
});

await client.connect();
const me = await client.get(Service.CORE, 'Me');
```

## Calling the API

The client provides typed HTTP methods. Pass relative paths only — the SDK prepends the configured API version automatically (`v4` by default):

```typescript
// GET
const users = await client.get(Service.CORE, 'Users');

// GET with query parameters
const filtered = await client.get(Service.CORE, 'Users', {
  query: { filter: "Name eq 'Admin'", fields: 'Id,Name' },
});

// POST (create)
const newUser = await client.post(Service.CORE, 'Users', {
  json: { Name: 'newuser', PrimaryAuthenticationProvider: { Id: -1 } },
});

// PUT (update)
await client.put(Service.CORE, `Users/${newUser.Id}/Password`, {
  json: 'NewPassword123',
});

// DELETE
await client.delete(Service.CORE, `Users/${newUser.Id}`);
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

Real-time event support requires the optional `@microsoft/signalr` peer dependency:

```bash
npm install @microsoft/signalr
```

Event classes are imported from the `@oneidentity/safeguard/events` subpath:

```typescript
import { SafeguardEventListener } from '@oneidentity/safeguard/events';
import { PasswordAuth, NodeHttpClient, MemoryStorage } from '@oneidentity/safeguard';
import * as signalR from '@microsoft/signalr';
```

### One-Shot Listener

```typescript
// Authenticate and build SignalR connection
const auth = new PasswordAuth({ username: 'Admin', password: 'Admin123', provider: 'Local' });
const httpClient = new NodeHttpClient();
const storage = new MemoryStorage();
const tokenSet = await auth.authenticate('safeguard.sample.corp', httpClient, storage);

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`https://safeguard.sample.corp/service/event/signalr`, {
    accessTokenFactory: () => tokenSet.accessToken.expose(),
  })
  .withAutomaticReconnect()
  .build();

const listener = new SafeguardEventListener(connection);

listener.on('NotifyEventAsync', (event) => {
  console.log('Event received:', event);
});

await listener.start();
```

### Persistent Listener (Auto-Reconnect)

For long-running processes that need to survive network interruptions and
token expiration:

```typescript
import { PersistentSafeguardEventListener } from '@oneidentity/safeguard/events';

const listener = new PersistentSafeguardEventListener(
  connection, auth, 'safeguard.sample.corp', httpClient, storage,
);

listener.onStateChange((state) => {
  console.log('State:', state);
});

listener.on('NotifyEventAsync', (event) => {
  console.log('Event:', event);
});

await listener.start();
```

The persistent listener automatically checks token lifetime and refreshes
credentials before they expire (with a 60-second safety margin).

## Security

### Token Storage (Browser)

The SDK stores access tokens **in memory only**. Tokens do not survive a page
refresh, which is the secure default for single-page applications without a
backend-for-frontend (BFF).

If your application requires persistence across page reloads, you may
explicitly store the token yourself — but be aware this exposes the token to
cross-site scripting (XSS) attacks:

```typescript
await client.connect();
// ⚠️ Customer explicitly accepts the XSS risk:
sessionStorage.setItem('my_token', client.accessToken.expose());
```

For high-security environments, prefer in-memory tokens with re-authentication
on refresh, or implement a BFF pattern where tokens never reach the browser.

### SecretValue

Credentials and access tokens are wrapped in `SecretValue`, a class that
redacts content from `toString()`, `toJSON()`, and `console.log()` output.
This prevents accidental logging of secrets.

To retrieve the raw string value (e.g., for HTTP headers or storage), call
`.expose()`:

```typescript
const tokenSet = await auth.authenticate(host, httpClient, storage);
const raw: string = tokenSet.accessToken.expose(); // explicit opt-in
```

### TLS Verification

TLS certificate verification is **enabled by default** in this SDK. The
Node-side `NodeHttpClient` constructs an `undici.Agent` with
`rejectUnauthorized: true`, so connections to an appliance whose certificate
chain does not validate are refused at the TLS layer.

#### Production: provide a custom CA bundle

The correct way to talk to an appliance whose certificate is issued by a
private / corporate CA is to provide the CA bundle to the SDK — not to
disable verification:

```typescript
import { readFileSync } from 'node:fs';
import { SafeguardClient, NodeHttpClient, PasswordAuth } from '@oneidentity/safeguard';

const ca = readFileSync('/etc/ssl/corp-root-ca.pem');

const client = new SafeguardClient('safeguard.corp.example', {
  auth: new PasswordAuth({ /* ... */ }),
});
client.setHttpClient(new NodeHttpClient({ ca, rejectUnauthorized: true }));
await client.connect();
```

`NodeHttpClient` accepts a PEM string or `Buffer` (single cert or
concatenated bundle). Verification stays on; only the trust anchor changes.

#### Development / lab appliances (self-signed)

For local appliances with self-signed certificates the supported opt-out is
the per-instance `rejectUnauthorized: false` flag on the HTTP client:

```typescript
// Development only — never use in production
client.setHttpClient(new NodeHttpClient({ rejectUnauthorized: false }));
```

This affects only this `SafeguardClient` instance.

#### The `NODE_TLS_REJECT_UNAUTHORIZED` environment variable

Node.js honours the process-wide
[`NODE_TLS_REJECT_UNAUTHORIZED=0`](https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue)
environment variable at the TLS layer below `undici`. If that variable is
set when your program starts, **all TLS verification in the entire Node
process is disabled** — including this SDK's connections, and any other
HTTPS calls your application makes (telemetry, package mirrors, third-party
APIs, etc.). Node itself prints a one-time warning when the variable is
honoured.

This SDK deliberately does **not** override or unset this variable: it is a
documented Node.js mechanism that operators sometimes set intentionally in
CI or dev shells, and silently re-enabling verification from the library
would be surprising. But you should be aware that:

- It is **process-wide**, not SDK-specific. Setting it to bypass a lab
  appliance also exposes every other outbound HTTPS call in the same
  process.
- It cannot be re-enabled per-connection from JavaScript once set — even
  `new NodeHttpClient({ rejectUnauthorized: true })` is overridden by the
  env var.
- It must not be set in production. Prefer the custom-CA approach above.

If you find `NODE_TLS_REJECT_UNAUTHORIZED=0` in a deployment environment,
treat it as a finding to remediate, not as a working configuration.

### Host Validation

The `SafeguardClient` constructor validates the `host` parameter to prevent
injection attacks. Only bare hostnames or IP addresses are accepted — URLs,
paths, ports, query strings, and whitespace are rejected with a
`ConfigurationError`.

### Token Lifetime

`client.getAccessTokenLifetimeRemaining()` decodes the JWT `exp` claim
client-side. This is a convenience for scheduling token refresh — never use it
as an authorization decision. The server is the sole authority on token
validity.

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
