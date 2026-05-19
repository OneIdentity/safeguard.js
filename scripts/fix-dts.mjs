/**
 * Post-build script to create stable .d.ts filenames and fix cross-bundle type compatibility.
 *
 * tsdown generates hashed declaration filenames (index-XXXX.d.ts).
 * This script copies them to the stable names referenced by package.json exports.
 *
 * It also patches events.d.ts/events.d.cts to import shared types (SecretValue, Auth, etc.)
 * from the main entry rather than re-declaring them. This prevents TypeScript's nominal
 * private-field incompatibility when consumers use both '@oneidentity/safeguard' and
 * '@oneidentity/safeguard/events' in the same project.
 */
import { readdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const files = readdirSync(dist);

const mappings = [
  { pattern: /^index-[^.]+\.d\.ts$/, target: 'index.d.ts' },
  { pattern: /^index-[^.]+\.d\.cts$/, target: 'index.d.cts' },
  { pattern: /^browser-[^.]+\.d\.ts$/, target: 'browser.d.ts' },
  { pattern: /^events-[^.]+\.d\.ts$/, target: 'events.d.ts' },
  { pattern: /^events-[^.]+\.d\.cts$/, target: 'events.d.cts' },
];

for (const { pattern, target } of mappings) {
  const match = files.find((f) => pattern.test(f));
  if (match) {
    copyFileSync(join(dist, match), join(dist, target));
    console.log(`  ${match} → ${target}`);
  }
}

/**
 * Patch events DTS files to import SecretValue from the main entry
 * instead of re-declaring it (avoids #private nominal incompatibility).
 */
function patchEventsDts(filename) {
  const filepath = join(dist, filename);
  let content;
  try {
    content = readFileSync(filepath, 'utf8');
  } catch {
    return; // File not found, skip
  }

  // Target the exact region: //#region src/secret.d.ts ... //#endregion
  // This contains the SecretValue class declaration we need to replace with an import
  const secretRegionPattern = /\/\/#region src\/secret\.d\.ts[\s\S]*?\/\/#endregion\n/;
  if (!secretRegionPattern.test(content)) return;

  // Determine the correct import source based on file extension
  const importSource = filename.endsWith('.cts') ? './index.d.cts' : './index.js';
  const importStatement = `import { SecretValue } from '${importSource}';\n`;

  // Remove the secret region
  content = content.replace(secretRegionPattern, '');

  // Insert the import after the first existing import line
  const firstImportEnd = content.indexOf('\n') + 1;
  content = content.slice(0, firstImportEnd) + importStatement + content.slice(firstImportEnd);

  writeFileSync(filepath, content);
  console.log(`  ${filename} patched (SecretValue → import from main)`);
}

patchEventsDts('events.d.ts');
patchEventsDts('events.d.cts');
