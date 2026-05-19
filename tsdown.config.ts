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
  {
    entry: { events: 'src/events/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
    platform: 'neutral',
    external: ['@microsoft/signalr'],
  },
]);
