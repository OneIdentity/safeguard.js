---
name: build-and-release
description: tsdown configuration, ADO pipeline-templates, npm publish workflow, version derivation
trigger: Pipeline changes, publishing, versioning, build issues, tsdown config, npm pack
---

# Build & Release

## Build Tool: tsdown

tsdown (Rolldown/Rust, Vite team) — successor to tsup (deprecated May 2026).

```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    outDir: 'dist',
    platform: 'neutral',
  },
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
    platform: 'browser',
  },
]);
```

## Output Structure

```
dist/
├── index.js          # ESM (Node)
├── index.d.ts        # Types (ESM)
├── index.cjs         # CJS (Node)
├── index.d.cts       # Types (CJS)
├── browser.js        # ESM (Browser)
├── browser.d.ts      # Types (Browser)
├── events.js         # ESM (Events — opt-in subpath)
├── events.d.ts       # Types (Events ESM)
├── events.cjs        # CJS (Events)
└── events.d.cts      # Types (Events CJS)
```

**Note:** `events.d.ts` is patched by `scripts/fix-dts.mjs` post-build to import `SecretValue`
from the main entry (avoids #private nominal type incompatibility between bundles).

## Pipeline Architecture

```
azure-pipelines.yml              # Root entry point
pipeline-templates/
├── global-variables.yml         # isTagBuild detection
├── build-steps.yml              # npm ci → lint → typecheck → test → audit → build
└── versionnumber.ps1            # Version stamping from git tag
```

## Version Derivation

- **Tag build** (`v8.0.0`): → `PackageVersion = "8.0.0"`, `ReleaseTag = "v8.0.0"`
- **Branch push**: → `PackageVersion = "8.0.0-pre{buildId}"`, `ReleaseTag = "dev/v8.0.0-pre{buildId}"`

The `versionnumber.ps1` script stamps `package.json` version via `npm pkg set version=X`.

## Release Flow

1. Merge feature → `main` → pipeline builds, creates dev GitHub Release
2. When ready: push tag `v8.0.0` → pipeline detects tag → npm publish → stable GitHub Release
3. npm publish uses `safeguard.js service connection`
4. GitHub Release uses `PangaeaBuild-GitHub` connection

## npm Scripts

```json
{
  "build": "tsdown",
  "lint": "eslint src/ tests/",
  "lint:fix": "eslint src/ tests/ --fix",
  "format": "prettier --write src/ tests/",
  "format:check": "prettier --check src/ tests/",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "prepublishOnly": "npm run lint && npm run typecheck && npm run test && npm run build"
}
```

## Verifying a Build

```bash
npm run build                    # Produces dist/
npm pack                         # Creates tarball
tar -tzf *.tgz                   # Inspect: should contain dist/, README, LICENSE, package.json only
node -e "const sg = require('./dist/index.cjs'); console.log(Object.keys(sg))"  # CJS check
node --input-type=module -e "import('./dist/index.js').then(m => console.log(Object.keys(m)))"  # ESM check
```

## CI Service Connections

| Connection | Purpose | Used By |
|-----------|---------|---------|
| `safeguard.js service connection` | npm publish | Npm@1 task |
| `PangaeaBuild-GitHub` | GitHub Releases | GitHubRelease@1 task |
