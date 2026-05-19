# AGENTS.md — @oneidentity/safeguard

TypeScript SDK for the One Identity Safeguard Web API.
Dual-target: Node.js (server automation, A2A, cert auth, SignalR) and Browser (PKCE login, sessionStorage, ESM bundle).

## Project Structure

```
src/
├── index.ts              # Node barrel (all exports)
├── browser.ts            # Browser barrel (no Node-only imports)
├── client.ts             # SafeguardClient (main class)
├── auth/                 # Auth strategy objects (password, cert, PKCE, token, anonymous)
├── a2a/                  # A2AClient (retrieve, set, discover, broker)
├── events/               # SafeguardEventListener + PersistentSafeguardEventListener
│                         # Separate subpath: @oneidentity/safeguard/events (opt-in)
├── http/                 # HttpClient abstraction (undici Node, native fetch browser)
├── storage/              # StorageProvider (MemoryStorage, BrowserSessionStorage)
├── errors.ts             # Error hierarchy (SafeguardError → ApiError → Auth/NotFound/etc)
├── secret.ts             # SecretValue (masks toString/toJSON, .expose() for raw value)
├── types.ts              # Service, HttpMethod, SafeguardResponse enums/interfaces
└── utils.ts              # URL assembly, crypto helpers, host validation
tests/
├── unit/                 # Pure logic tests (no heavy mocking)
└── integration/          # Live appliance tests (auto-skip when SPP_HOST unset)
pipeline-templates/       # ADO pipeline YAML (build-steps, global-variables, versionnumber)
scripts/                  # Post-build helpers (fix-dts.mjs)
.agents/skills/           # Modular agent context
samples/                  # Node + Browser TypeScript examples
```

## Setup & Build

```bash
npm ci                    # Install deps (requires Node >=20, CI uses 22)
npm run build             # tsdown → dist/ (ESM + CJS + .d.ts)
npm run lint              # ESLint 9 + @typescript-eslint
npm run typecheck         # tsc --noEmit (strict)
npm run test              # Vitest unit tests
npm run test:integration  # Vitest integration (requires SPP_HOST env var)
```

## Code Conventions

- **TypeScript strict mode** — no `any` without justification
- **Auth as strategy objects** — pluggable, instance-based, no global state
- **Async/await only** — no callbacks, all methods return Promises
- **Error hierarchy** — throw typed errors (ApiError, TransportError, ConfigurationError)
- **SecretValue for credentials** — never log raw secrets
- **Instance-based clients** — multiple concurrent SafeguardClient instances supported
- **Platform separation** — Node-only code stays in Node entry; browser barrel excludes fs/tls/undici
- **No side effects at import** — constructors do no I/O

## Versioning

Do NOT manually edit `version` in package.json. CI stamps version from git tags:
- Tag `v8.0.0` → publishes `8.0.0` to npm (latest)
- Push to `main` → publishes `8.0.0-pre{buildId}` prerelease (npm tag: pre)

## CI/CD

- **Azure Pipelines** — unified `azure-pipelines.yml` with `pipeline-templates/`
- **Trigger:** PR to `main` → validation; merge to `main` → dev prerelease; tag `v*` → stable release
- **npm publish:** via `AzureKeyVault@2` → `SafeguardBuildSecrets` → `NpmOrgApiKey` (90-day rotation)
- **GitHub Release:** `PangaeaBuild-GitHub` connection

## Security

- Never commit secrets, tokens, or credentials
- Never set `verify: false` in production code or samples (tests may use it against lab appliances)
- Use `SecretValue` for any credential field — call `.expose()` only when intentionally needed
- All auth constructors and `SafeguardClient` validate `host` — reject URLs and path-traversal
- Tokens live in-memory only (no sessionStorage persistence) — XSS-safe by default
- `@microsoft/signalr` is an optional peer dependency to reduce supply chain exposure

## Skill Routing

| Skill | When to Load |
|-------|-------------|
| [testing-guide](.agents/skills/testing-guide/SKILL.md) | Writing/debugging tests, appliance setup, test failures |
| [api-patterns](.agents/skills/api-patterns/SKILL.md) | Making Safeguard API calls, SDK usage patterns |
| [architecture](.agents/skills/architecture/SKILL.md) | Working on internals, auth strategies, HTTP layer, module structure |
| [build-and-release](.agents/skills/build-and-release/SKILL.md) | Pipeline changes, publishing, versioning, tsdown config |
