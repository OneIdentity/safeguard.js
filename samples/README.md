# Samples

TypeScript examples demonstrating the `@oneidentity/safeguard` SDK.

## Node.js

| File | Description |
|------|-------------|
| [password-auth.ts](node/password-auth.ts) | Username/password authentication |
| [device-code-auth.ts](node/device-code-auth.ts) | Device Code (RFC 8628) headless login |
| [certificate-auth.ts](node/certificate-auth.ts) | Client certificate authentication |
| [a2a-password.ts](node/a2a-password.ts) | A2A credential retrieval |
| [signalr-events.ts](node/signalr-events.ts) | Real-time event subscription |
| [persistent-events.ts](node/persistent-events.ts) | Auto-reconnect event listener |
| [anonymous-status.ts](node/anonymous-status.ts) | Unauthenticated status check |

## Browser

| Directory | Description |
|-----------|-------------|
| [pkce-login/](Browser/pkce-login/) | PKCE OAuth login flow |
| [device-code/](Browser/device-code/) | Device Code (RFC 8628) login flow |

## Running Node.js Samples

```bash
npx tsx samples/node/password-auth.ts
```

## Running Browser Samples

Use a bundler like Vite:

```bash
cd samples/browser/pkce-login
npx vite
```

## Legacy Samples

The `Node.JS/` and `Browser/` directories contain legacy v7.x samples using the
old callback/promise API. They are preserved for reference but will be removed in
a future release.
