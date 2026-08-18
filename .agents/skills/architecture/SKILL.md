---
name: architecture
description: Use when changing module structure, auth internals, conditional exports, or the HTTP and storage layers.
trigger: Working on internals, auth strategies, HTTP layer, module structure, platform-specific code
---

# Architecture

## Dual-Platform Design

safeguard.js serves Node.js AND Browser from a single codebase:

- **Node entry:** `src/index.ts` — exports everything including Node-only modules
- **Browser entry:** `src/browser.ts` — excludes CertificateAuth, PkceNonInteractive, NodeHttpClient, fs/tls

Resolution is automatic via `package.json` conditional exports:

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "browser": "./dist/browser.js",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./browser": {
      "types": "./dist/browser.d.ts",
      "default": "./dist/browser.js"
    },
    "./events": {
      "import": { "types": "./dist/events.d.ts", "default": "./dist/events.js" },
      "require": { "types": "./dist/events.d.cts", "default": "./dist/events.cjs" }
    }
  }
}
```

The `./events` subpath is opt-in — consumers who don't use SignalR never install `@microsoft/signalr`.

## Module Layers (Dependency Graph)

```
Layer 0 (no internal deps):  types.ts, errors.ts, secret.ts, utils.ts
Layer 1 (depends on L0):     storage/, http/
Layer 2 (depends on L0-1):   auth/
Layer 3 (depends on all):    client.ts, a2a/, events/
Layer 4 (barrel exports):    index.ts, browser.ts
```

Build from leaves to root. Never introduce upward dependencies.

## Key Design Rules

1. **No global state** — every client is independent (own Agent, own tokens)
2. **No side effects at import** — constructors do no I/O
3. **Auth as strategy objects** — implement `Auth` interface, plug into client
4. **HttpClient is an interface** — Node uses undici (TLS control), Browser uses native fetch
5. **StorageProvider is an interface** — MemoryStorage (Node), BrowserSessionStorage (Browser)
6. **sideEffects: false** — tree-shakeable, bundlers can eliminate dead code

## HTTP Layer

### Node (undici)

```typescript
const agent = new Agent({
  connect: {
    ca: options.ca,           // Custom CA cert
    cert: options.cert,       // Client certificate (mTLS)
    key: options.key,         // Client key
    pfx: options.pfx,         // Client cert as PFX/PKCS12 (alt to cert+key)
    rejectUnauthorized: options.verify !== false,
    // minVersion/maxVersion (opt-in). See resolveTlsConnectOptions().
  },
});
```

Per-instance Agent — no global HTTPS agent mutation.

### TLS 1.3 (SPP 9.0) — `resolveTlsConnectOptions()`

`TlsOptions` exposes opt-in `minVersion`/`maxVersion` (`TlsVersion`). The version
logic in `src/http/node.ts` auto-caps a connection at `'TLSv1.2'` when a client
cert (`cert`/`key`/`pfx`) is present and neither bound is pinned, because **Node
has no client-side TLS 1.3 post-handshake auth**
([nodejs/node#46120](https://github.com/nodejs/node/issues/46120), NOT_PLANNED)
— otherwise cert/A2A auth fails on 9.0 with `60094`. Password/token connections
(no cert) still negotiate TLS 1.3. TLS 1.3 cert-auth is only reachable via the
appliance's **Cert SNI** hostname with `minVersion: 'TLSv1.3'`. Keep HTTP/1.1
(never enable undici `allowH2`).

### Browser (native fetch)

```typescript
const response = await fetch(url, {
  method, headers, body,
  signal,                     // AbortController support
  credentials: 'include',    // For cookie-based auth if needed
});
```

## SignalR (v10.x)

- Use `withAutomaticReconnect()` — built into SignalR 10
- `accessTokenFactory: () => Promise<string>` wired to auth token
- For Node custom CA: pass custom `httpClient` option using undici
- PersistentSafeguardEventListener adds token refresh on reconnect + state tracking

## Error Hierarchy

```
SafeguardError (base)
├── ApiError (HTTP errors from Safeguard API)
│   ├── AuthenticationError (401)
│   ├── AuthorizationError (403)
│   └── NotFoundError (404)
├── TransportError (network/connection failures)
└── ConfigurationError (invalid client options)
```

`ApiError.fromResponse(status, body)` factory parses Safeguard error JSON.
