/**
 * Post-build script to create stable .d.ts filenames.
 * tsdown generates hashed declaration filenames (index-XXXX.d.ts).
 * This script copies them to the stable names referenced by package.json exports.
 */
import { readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const files = readdirSync(dist);

const mappings = [
  { pattern: /^index-[^.]+\.d\.ts$/, target: 'index.d.ts' },
  { pattern: /^index-[^.]+\.d\.cts$/, target: 'index.d.cts' },
  { pattern: /^browser-[^.]+\.d\.ts$/, target: 'browser.d.ts' },
];

for (const { pattern, target } of mappings) {
  const match = files.find((f) => pattern.test(f));
  if (match) {
    copyFileSync(join(dist, match), join(dist, target));
    console.log(`  ${match} → ${target}`);
  }
}
