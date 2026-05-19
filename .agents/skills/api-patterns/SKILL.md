---
name: api-patterns
description: Service enum, URL construction, auth strategies, error handling, SDK usage patterns
trigger: Making Safeguard API calls, SDK usage, understanding request/response patterns
---

# API Patterns

## Service Enum

```typescript
enum Service {
  CORE = 'service/core',
  APPLIANCE = 'service/appliance',
  NOTIFICATION = 'service/notification',
  A2A = 'service/a2a',
  EVENT = 'service/event',
  RSTS = 'RSTS',
}
```

## URL Construction

```
https://{host}/{service}/v{apiVersion}/{relativeUrl}
```

- Default apiVersion: `4`
- RSTS paths don't use apiVersion: `https://{host}/RSTS/oauth2/token`

## Auth Strategies

All implement the `Auth` interface:

```typescript
interface Auth {
  authenticate(host: string, httpClient: HttpClient): Promise<TokenSet>;
  refreshToken?(host: string, httpClient: HttpClient): Promise<TokenSet>;
}
```

| Strategy | Environment | Use Case |
|----------|-------------|----------|
| `PasswordAuth` | Node | Username/password → RSTS token |
| `CertificateAuth` | Node only | Client cert mTLS → RSTS token |
| `PkceAuth` | Browser | RSTS PKCE redirect flow |
| `PkceNonInteractiveAuth` | Node | Local HTTP server + browser auto-open |
| `TokenAuth` | Both | Pre-existing access token |
| `AnonymousAuth` | Both | No credentials (limited API access) |

## Client Usage

```typescript
import { SafeguardClient, PasswordAuth, NodeHttpClient, Service, HttpMethod } from '@oneidentity/safeguard';

// 1. Create auth — `provider` is REQUIRED (e.g. 'Local', 'ad.example.com')
const auth = new PasswordAuth({ username: 'admin', password: 'secret', provider: 'Local' });

// 2. Create client
const client = new SafeguardClient('appliance.example.com', {
  auth,
  verify: false,       // Only for lab/dev! Default: true
  timeout: 300_000,
  autoRefresh: true,
});

// 3. MUST set HttpClient before connect — platform-specific
client.setHttpClient(new NodeHttpClient({ rejectUnauthorized: false }));

// 4. Connect (authenticates)
await client.connect();

// Convenience verbs (typed)
const users = await client.get<User[]>(Service.CORE, 'v4/Users');
const user = await client.post<User>(Service.CORE, 'v4/Users', { json: body });

// Low-level invoke (full control)
const response = await client.invoke(Service.CORE, HttpMethod.GET, 'v4/Me', {
  fullResponse: true,
  signal: controller.signal,
});

await client.disconnect();
```

**Critical notes:**
- `PasswordAuth` requires `provider` — throws `ConfigurationError` if omitted
- `client.setHttpClient(...)` MUST be called before `connect()` — throws otherwise
- Node uses `NodeHttpClient`, browser uses `BrowserHttpClient`
- `NodeHttpClient({ rejectUnauthorized: false })` disables TLS cert validation
- `verify: false` on the client is NOT sufficient to skip TLS; the HttpClient controls it

## Query Parameters

The SPP API uses its own query parameter names — NOT OData `$`-prefixed params.
Pass them as a flat `Record<string, string | number | boolean>`:

```typescript
// filter, fields, orderby, page, count — no $ prefix
const users = await client.get<User[]>(Service.CORE, 'v4/Users', {
  query: { filter: 'Disabled eq false', fields: 'UserName,Name', orderby: 'UserName' }
});
```

- `filter` — SPP filter expressions (e.g. `Name contains "admin"`)
- `fields` — comma-separated field names to include
- `orderby` — field name with optional `asc`/`desc`
- `page` / `limit` — pagination
- `count` — include `X-Total-Count` header (boolean)

The SDK passes these verbatim as URL query params. It does NOT transform them.

```typescript
try {
  await client.get(Service.CORE, 'v4/Users/999999');
} catch (err) {
  if (err instanceof NotFoundError) { /* 404 */ }
  if (err instanceof AuthenticationError) { /* 401 — token expired? */ }
  if (err instanceof TransportError) { /* network failure */ }
}
```

## A2A Usage

```typescript
const a2a = new A2AClient('appliance.example.com', {
  auth: new CertificateAuth({ certFile: 'cert.pem', keyFile: 'key.pem' }),
});

const password = await a2a.retrievePassword(apiKey);
await a2a.setPassword(apiKey, newPassword);
const accounts = await a2a.getRetrievableAccounts();
```

## Token Lifecycle

- `autoRefresh: true` (default) → transparent re-authentication before expired requests
- `client.getAccessTokenLifetimeRemaining()` → seconds remaining
- `client.disconnect()` → logout + clear stored tokens
