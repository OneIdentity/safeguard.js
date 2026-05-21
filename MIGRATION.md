# Migration Guide: safeguard.js v7.x → v8.0

This guide covers all breaking changes when upgrading from the legacy JavaScript
API (v7.x and earlier) to the new TypeScript SDK (v8.0).

## Overview

v8.0 is a complete rewrite:

| Aspect | v7.x | v8.0 |
|--------|------|------|
| Language | JavaScript (ES5) | TypeScript (ES2022) |
| Module format | CommonJS only | Dual ESM + CJS |
| Node.js | 14+ | 20+ |
| Browser | Global `SafeguardJs` | ESM import |
| Auth | `connectPassword()`, `connectCertificate()`, etc. | Strategy objects |
| API calls | `connection.invoke(service, method, path)` | `client.get()`, `client.post()`, etc. |
| Events | `connection.registerSignalR(callback)` | `SafeguardEventListener` class |
| A2A | `a2aGetCredentialFromFiles()` | `A2AClient` class |
| TLS | `SafeguardJs.addCAFromFile()` | `NodeHttpClient({ ca })` or `verify: false` |

## Installation

```bash
# Remove old package (if using unscoped name)
npm uninstall safeguard.js

# Install new scoped package
npm install @oneidentity/safeguard
```

## Import Changes

### ESM (recommended)

```typescript
// v7.x
const SafeguardJs = require('@oneidentity/safeguard');

// v8.0
import { SafeguardClient, PasswordAuth, Service } from '@oneidentity/safeguard';
```

### CommonJS (still supported)

```javascript
// v7.x
const SafeguardJs = require('@oneidentity/safeguard');

// v8.0
const { SafeguardClient, PasswordAuth, Service } = require('@oneidentity/safeguard');
```

## Authentication

### Password Auth

```javascript
// v7.x
SafeguardJs.addCAFromFile('ca.pem');
let connection = await SafeguardJs.connectPassword('host', 'user', 'pass', 'provider');
```

```typescript
// v8.0
import { SafeguardClient, PasswordAuth } from '@oneidentity/safeguard';

const client = new SafeguardClient('host', {
  auth: new PasswordAuth({ username: 'user', password: 'pass', provider: 'provider' }),
});
await client.connect();
```

### Certificate Auth

```javascript
// v7.x
SafeguardJs.addCAFromFile('ca.pem');
let connection = await SafeguardJs.connectCertificateFromFiles('host', 'cert.pem', 'key.pem', null, 'keypass');
```

```typescript
// v8.0
import { SafeguardClient, CertificateAuth } from '@oneidentity/safeguard';

const client = new SafeguardClient('host', {
  auth: new CertificateAuth({ certFile: 'cert.pem', keyFile: 'key.pem', passphrase: 'keypass' }),
});
await client.connect();
```

### Browser PKCE (was `connectRsts`)

```javascript
// v7.x
SafeguardJs.connectRsts('host', redirectUri)
  .then((connection) => { /* use connection */ });
```

```typescript
// v8.0
import { SafeguardClient, PkceAuth, handlePkceCallback } from '@oneidentity/safeguard';

// On callback page:
handlePkceCallback();

// On main page:
const client = new SafeguardClient('host', {
  auth: new PkceAuth({ redirectUri: window.location.href }),
});
await client.connect();
```

### Anonymous

```javascript
// v7.x
let connection = SafeguardJs.connectAnonymous('host');
```

```typescript
// v8.0
import { SafeguardClient, AnonymousAuth } from '@oneidentity/safeguard';

const client = new SafeguardClient('host', { auth: new AnonymousAuth() });
await client.connect();
```

### Existing Token

```javascript
// v7.x
let connection = SafeguardJs.connectAnonymous('host');
SafeguardJs.Storage.setUserToken(token);
```

```typescript
// v8.0
import { SafeguardClient, TokenAuth } from '@oneidentity/safeguard';

const client = new SafeguardClient('host', {
  auth: new TokenAuth({ accessToken: token }),
});
await client.connect();
```

## API Calls

### invoke → typed HTTP methods

```javascript
// v7.x
let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v4/Users');
let parsed = JSON.parse(result);
```

```typescript
// v8.0 — response is already parsed
// Pass relative paths only — the SDK prepends the API version automatically.
const users = await client.get(Service.CORE, 'Users');

// POST
const newUser = await client.post(Service.CORE, 'Users', {
  json: { Name: 'myuser', PrimaryAuthenticationProvider: { Id: -1 } },
});

// PUT
await client.put(Service.CORE, `Users/${id}/Password`, { json: 'NewPass123' });

// DELETE
await client.delete(Service.CORE, `Users/${id}`);
```

### Service Enum

```javascript
// v7.x
SafeguardJs.Services.CORE
SafeguardJs.Services.APPLIANCE
SafeguardJs.Services.NOTIFICATION
SafeguardJs.Services.A2A

// v8.0
import { Service } from '@oneidentity/safeguard';
Service.CORE
Service.APPLIANCE
Service.NOTIFICATION
Service.A2A
```

### Query Parameters

```javascript
// v7.x — manually appended to URL
let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET,
  'v4/Users?filter=Name eq \'Admin\'&fields=Id,Name');
```

```typescript
// v8.0 — structured query object
const users = await client.get(Service.CORE, 'Users', {
  query: { filter: "Name eq 'Admin'", fields: 'Id,Name' },
});
```

## A2A

```javascript
// v7.x
SafeguardJs.addCAFromFile('ca.pem');
let password = await SafeguardJs.a2aGetCredentialFromFiles(
  'host', 'apikey', SafeguardJs.A2ATypes.PASSWORD, null,
  'cert.pem', 'key.pem', 'keypass'
);
```

```typescript
// v8.0
import { A2AClient, CertificateAuth } from '@oneidentity/safeguard';

const a2a = new A2AClient('host', {
  auth: new CertificateAuth({ certFile: 'cert.pem', keyFile: 'key.pem', passphrase: 'keypass' }),
});

const password = await a2a.retrievePassword('apikey');
const sshKey = await a2a.retrievePrivateKey('apikey');

// New in v8.0:
await a2a.setPassword('apikey', 'NewPassword');
const accounts = await a2a.getRetrievableAccounts();
```

## Events (SignalR)

```javascript
// v7.x
function callback(ev) {
  console.log(ev.Message);
}
await connection.registerSignalR(callback);
```

```typescript
// v8.0 — SignalR is now an optional peer dependency
// Install it explicitly: npm install @microsoft/signalr
import { SafeguardEventListener } from '@oneidentity/safeguard/events';
import * as signalR from '@microsoft/signalr';

// Build SignalR connection with access token
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`https://${host}/service/event/signalr`, {
    accessTokenFactory: () => tokenSet.accessToken.expose(),
  })
  .withAutomaticReconnect()
  .build();

const listener = new SafeguardEventListener(connection);
listener.on('NotifyEventAsync', (event) => {
  console.log(event);
});
await listener.start();

// Persistent listener with auto-reconnect (new in v8.0)
import { PersistentSafeguardEventListener } from '@oneidentity/safeguard/events';

const persistent = new PersistentSafeguardEventListener(
  connection, auth, host, httpClient, storage,
);
persistent.on('NotifyEventAsync', handler);
await persistent.start();
```

## TLS / Certificate Verification

```javascript
// v7.x — global CA file
SafeguardJs.addCAFromFile('ca.pem');
```

```typescript
// v8.0 — per-client configuration
import { SafeguardClient, NodeHttpClient } from '@oneidentity/safeguard';

// Option A: Disable verification (development only)
const client = new SafeguardClient('host', { auth, verify: false });

// Option B: Custom CA
const client = new SafeguardClient('host', { auth });
client.setHttpClient(new NodeHttpClient({ ca: '/path/to/ca.pem' }));
```

## Token Lifetime

```javascript
// v7.x
let seconds = await connection.getAccessTokenLifetimeRemaining();
```

```typescript
// v8.0
const seconds = client.getAccessTokenLifetimeRemaining();
```

Note: In v8.0 this is a synchronous method (token expiration is tracked locally
from the JWT `exp` claim — no server round-trip needed).

## Error Handling

```javascript
// v7.x — errors were strings or generic Error
try {
  await connection.invoke(...);
} catch (e) {
  console.log(e); // string message
}
```

```typescript
// v8.0 — typed error hierarchy
import { ApiError, AuthenticationError, NotFoundError } from '@oneidentity/safeguard';

try {
  await client.get(Service.CORE, 'Users/999999');
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log('User not found');
  } else if (e instanceof AuthenticationError) {
    console.log('Auth failed — re-authenticate');
  } else if (e instanceof ApiError) {
    console.log(`API error ${e.status}: ${e.message}`);
  }
}
```

## Cleanup / Disconnect

```javascript
// v7.x — no explicit cleanup needed
```

```typescript
// v8.0 — call disconnect to close HTTP agent
await client.disconnect();
```

## Removed APIs

| v7.x API | v8.0 Replacement |
|----------|-----------------|
| `SafeguardJs.addCAFromFile()` | `NodeHttpClient({ ca })` |
| `SafeguardJs.Storage` | `MemoryStorage` / `BrowserSessionStorage` |
| `SafeguardJs.connectPassword()` | `new SafeguardClient(host, { auth: new PasswordAuth(...) })` |
| `SafeguardJs.connectCertificateFromFiles()` | `new SafeguardClient(host, { auth: new CertificateAuth(...) })` |
| `SafeguardJs.connectRsts()` | `new SafeguardClient(host, { auth: new PkceAuth(...) })` |
| `SafeguardJs.connectAnonymous()` | `new SafeguardClient(host, { auth: new AnonymousAuth() })` |
| `SafeguardJs.a2aGetCredentialFromFiles()` | `new A2AClient(host, { auth }).retrievePassword(key)` |
| `connection.invoke(service, method, path, body)` | `client.get()` / `client.post()` / `client.put()` / `client.delete()` |
| `connection.registerSignalR(callback)` | `SafeguardEventListener` from `@oneidentity/safeguard/events` |
| `connection.getAccessTokenLifetimeRemaining()` | `client.getAccessTokenLifetimeRemaining()` |
| `src/LocalStorage.js` | `MemoryStorage` (Node.js) |
| `src/SessionStorage.js` | `BrowserSessionStorage` (Browser) |

## Security Changes in v8.0

### Access Token is Now `SecretValue`

In v8.0, `tokenSet.accessToken` returns a `SecretValue` instance rather than a
plain string. This prevents accidental logging of tokens via `console.log()`,
`JSON.stringify()`, or template literals.

To get the raw token string, call `.expose()`:

```typescript
// v7.x
const raw = connection.getAccessToken(); // string

// v8.0
const tokenSet = await auth.authenticate(host, httpClient, storage);
const raw = tokenSet.accessToken.expose(); // explicit opt-in
```

### No Automatic Token Persistence

The SDK no longer writes access tokens to `sessionStorage`. Tokens are held in
memory only. If you need persistence across page reloads, store the token
explicitly (see README Security section for tradeoffs).

### SignalR is an Optional Peer Dependency

`@microsoft/signalr` is no longer installed automatically. If you use
real-time events, install it as a direct dependency:

```bash
npm install @microsoft/signalr
```

Then import event classes from the subpath:

```typescript
import { SafeguardEventListener } from '@oneidentity/safeguard/events';
```

### Host Validation

`SafeguardClient` and `A2AClient` now validate that the `host` parameter is a
bare hostname or IP address. Passing a URL (e.g., `https://host`) or a host
with a path/port/query will throw a `ConfigurationError`.
