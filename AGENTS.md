# AGENTS.md — @oneidentity/safeguard

TypeScript SDK for the One Identity Safeguard Web API. The repo targets Node.js (server automation, A2A, certificate auth, SignalR) and browsers (PKCE, session-backed auth, ESM bundle).

## Project Structure

- `src/index.ts` — Node entry point with A2A, cert auth, HTTP, and events exports
- `src/browser.ts` — browser-safe entry point without Node-only modules
- `src/client.ts` — `SafeguardClient`
- `src/auth/` — auth strategies (`PasswordAuth`, `CertificateAuth`, PKCE, token, anonymous)
- `src/a2a/` — `A2AClient`, broker types, SSH key formats
- `src/events/` — `SafeguardEventListener` and `PersistentSafeguardEventListener`
- `src/http/` — `NodeHttpClient` and `BrowserHttpClient`
- `src/storage/` — memory and browser session storage providers
- `tests/unit/` — pure logic tests
- `tests/integration/` — live appliance tests
- `samples/` — Node and browser usage examples
- `pipeline-templates/` and `azure-pipelines.yml` — build/release automation
- `.agents/skills/` — on-demand repo skills

## Setup and Build

```bash
npm ci
npm run typecheck
npm run build
```

Use Node.js 20+ locally; CI runs on Node 22.

## Linting

```bash
npm run lint
npm run format:check
```

## Testing

```bash
npm run test
npm run test:integration
```

Integration tests use a live appliance and expect `SPP_HOST` plus related `SPP_*` credentials.

## Code Conventions

- Keep TypeScript strict; avoid `any` unless justified
- Treat auth as pluggable strategy objects with no global state
- Use async/await and Promise-based APIs only
- Throw typed SDK errors (`ApiError`, `TransportError`, `ConfigurationError`, etc.)
- Wrap secrets in `SecretValue`; only call `.expose()` at the point of use
- Preserve platform separation: Node-only code stays out of `src/browser.ts`
- Avoid side effects at import time; constructors should not perform I/O

## CI/CD

For pipeline flow, version stamping, npm publish, and release details, load [build-and-release](.agents/skills/build-and-release/SKILL.md).

## Security

- Never commit secrets, tokens, certificates, or private keys
- Keep TLS verification enabled in production; `verify: false` is lab-only
- Prefer in-memory tokens and avoid browser persistence unless the caller explicitly accepts the XSS tradeoff
- Validate host handling and optional peer dependencies when changing auth, HTTP, or SignalR code

### TLS 1.3 (SPP 9.0)

SPP 9.0 enables TLS 1.3, which moves client-certificate auth to a
**post-handshake** exchange (RFC 8446 §4.6.2). **Node has no client-side
post-handshake authentication** ([nodejs/node#46120](https://github.com/nodejs/node/issues/46120),
closed NOT_PLANNED), so over TLS 1.3 the client never presents its cert and
cert/A2A auth fails with `60094 Authorization is denied`. This is a Node
limitation, not the server's — unlike PySafeguard, we cannot just enable PHA.

`TlsOptions` (on `NodeHttpClient`) exposes opt-in `minVersion` / `maxVersion`
(`TlsVersion`, default unset = negotiate). The version logic lives in
`resolveTlsConnectOptions()` in `src/http/node.ts`:

- **Cert connections auto-cap at TLS 1.2** when `cert`/`key`/`pfx` is present and
  neither bound is pinned, so cert/A2A auth works by default on the appliance's
  Standard binding (cert requested in-handshake). Do not remove this or cert
  auth breaks on 9.0.
- **Password/token connections** carry no cert and keep negotiating TLS 1.3.
- **TLS 1.3 cert-auth** is only reachable via the appliance's **Cert SNI**
  hostname (in-handshake cert request); target it and pin
  `minVersion: 'TLSv1.3'`. Pinning either bound disables the auto-cap.
- Keep undici on HTTP/1.1 (its default); never enable `allowH2` — HTTP/2
  disallows the post-handshake `CertificateRequest`.

## Versioning

The `package.json` version is the **prerelease base**: `main`/branch builds publish `X.Y.Z-pre{buildId}` derived from that field, so bump it (minor for new features, patch for fixes) when the target release changes. Stable releases come from `v*` tags — the tag, not the file, sets the stable number, so never hand-edit the file to force a stable version.

## On-demand skills

| Skill | Use when |
|-------|----------|
| [a2a-workflow](.agents/skills/a2a-workflow/SKILL.md) | Wiring certificate-based A2A retrieval, brokering, or adjacent event-listener flows |
| [testing-guide](.agents/skills/testing-guide/SKILL.md) | Writing or debugging unit/integration tests and appliance-backed test setup |
| [api-patterns](.agents/skills/api-patterns/SKILL.md) | Making Safeguard API calls, choosing auth strategies, or following SDK usage patterns |
| [architecture](.agents/skills/architecture/SKILL.md) | Changing module boundaries, HTTP/auth/storage internals, or platform-specific exports |
| [build-and-release](.agents/skills/build-and-release/SKILL.md) | Working on pipelines, builds, publishing, or version derivation |

## Keeping this file current

- Keep this file short, broadly applicable, and always-on
- Move detailed workflows into `.agents/skills/`
- Update the skills table when adding, removing, or renaming a skill
- Prefer one-line pointers here for deep CI/CD or operational detail
