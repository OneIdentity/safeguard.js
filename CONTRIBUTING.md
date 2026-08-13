# Contributing to safeguard.js

Thanks for your interest in improving safeguard.js, the TypeScript/
JavaScript SDK for the One Identity Safeguard Web API.

## Reporting issues

- **Bugs and feature requests:** open a GitHub Issue.
- **Security vulnerabilities:** do **not** open a public issue — follow
  [SECURITY.md](SECURITY.md).

## Prerequisites

- [Node.js 20](https://nodejs.org/en/download) or later.
- npm (bundled with Node.js).
- (Optional) access to a Safeguard for Privileged Passwords appliance to
  run the integration tests.

## Building

    npm ci
    npm run typecheck
    npm run build

## Testing

Hermetic unit tests require no appliance:

    npm run test

Integration tests **skip cleanly** when `SPP_HOST` is unset. To run them
against a lab appliance, set `SPP_HOST` (plus `SPP_USERNAME` /
`SPP_PASSWORD`):

    npm run test:integration

## Coding conventions

    npm run lint
    npm run format:check

TypeScript is `strict` and `any` is disallowed. See [AGENTS.md](AGENTS.md)
for the full conventions.

## Submitting changes

1. Fork the repository and create a feature branch.
2. Keep commits focused with clear messages.
3. Ensure `npm run lint`, `npm run typecheck`, `npm run test`, and
   `npm run build` pass.
4. Open a pull request describing the behavior you changed and the tests
   that prove it.