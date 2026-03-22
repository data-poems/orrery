/**
 * Master prebake runner — processes all celestial data sources
 * into optimized JSON files in public/data/.
 *
 * Usage: pnpm prebake
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const scripts = [
  'prebake-comets.ts',
  'prebake-meteors.ts',
  'prebake-stars.ts',
  'prebake-asteroids.ts',
  'prebake-deepsky.ts',
];

const dir = import.meta.dirname;

console.log('=== Orrery Prebake Pipeline ===\n');

for (const script of scripts) {
  const path = resolve(dir, script);
  console.log(`--- Running ${script} ---`);
  try {
    execSync(`npx tsx ${path}`, { stdio: 'inherit', cwd: resolve(dir, '..') });
    console.log('');
  } catch {
    console.error(`FAILED: ${script}`);
    process.exit(1);
  }
}

console.log('=== All prebake scripts completed ===');
