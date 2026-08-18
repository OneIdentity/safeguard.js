import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    retry: 0,
    // Live tests share one appliance and a single fixed client certificate
    // (only one Safeguard user can own a given thumbprint), so run test files
    // one at a time rather than in parallel workers.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
