---
name: testing-guide
description: Vitest configuration, environment variables, integration test patterns, fixtures, and appliance setup
trigger: Working on tests, test failures, appliance setup, debugging test output
---

# Testing Guide

## Framework

- **Unit tests:** Vitest 4.x, `tests/unit/` — pure logic only, minimal mocking
- **Integration tests:** Vitest 4.x, `tests/integration/` — live appliance validation
- **Config:** `vitest.config.ts` (unit), `vitest.integration.config.ts` (integration)

## Running Tests

```bash
npm run test              # Unit tests only
npm run test:watch        # Unit tests in watch mode
npm run test:integration  # Integration tests (requires env vars)
```

## Integration Test Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SPP_HOST` | **Yes** | — | Appliance hostname. Tests auto-skip when unset. |
| `SPP_USERNAME` | No | `Admin` | Safeguard user |
| `SPP_PASSWORD` | **Yes** | — | Password |
| `SPP_CA_FILE` | No | — | CA cert path (omit → verify: false) |
| `SPP_CERT_FILE` | No | — | Client cert for cert auth tests |
| `SPP_KEY_FILE` | No | — | Client key |
| `SPP_KEY_PASSPHRASE` | No | — | Key passphrase |
| `SPP_A2A_API_KEY` | No | — | Pre-configured A2A API key |
| `SPP_EXTERNAL_PROVIDER` | No | — | External auth provider name |

## Testing Philosophy

- **Unit test pure logic only** — errors, SecretValue, URL assembly, PKCE crypto, storage, state machines
- **Don't mock HTTP to test HTTP** — integration tests validate real network behavior
- **No coverage thresholds** — coverage numbers don't matter; correct behavior does
- **Auto-skip gracefully** — integration tests exit 0 when `SPP_HOST` is unset

## Test Resource Naming

Use `SgJs_<8hex>` prefix for test resources created on the appliance (matches PySafeguard's `PySg_` pattern).

## Fixtures

- **ROG Preflight:** Ensures Resource Owner Grant is enabled before password auth tests
- **A2A Fixture:** Creates cert → user → asset → account → registration, returns API key, tears down after
- **Authenticated client factories:** `getPasswordClient()`, `getCertClient()`, `getAnonymousClient()`

## HTTP Mocking (Unit Tests Only)

For the rare case where unit testing needs HTTP mocking, use undici's built-in `MockAgent`:

```typescript
import { MockAgent, setGlobalDispatcher } from 'undici';

const agent = new MockAgent();
setGlobalDispatcher(agent);
const pool = agent.get('https://appliance.example.com');
pool.intercept({ path: '/RSTS/oauth2/token', method: 'POST' })
  .reply(200, { access_token: 'test-token' });
```
