// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const url = process.argv[2] || 'https://deathcharge.github.io/samsarix-page-lens/';
const expected = await readFile(new URL('../site/privacy/index.html', import.meta.url));
let lastError = new Error('No verification attempt completed.');
let verified = false;

for (let attempt = 1; attempt <= 6; attempt += 1) {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}verify=${Date.now()}`, { cache: 'no-store', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const actual = Buffer.from(await response.arrayBuffer());
    if (!actual.equals(expected)) throw new Error('public bytes do not match site/privacy/index.html');
    const hash = createHash('sha256').update(actual).digest('hex').toUpperCase();
    console.log(`Verified live privacy disclosure: ${url} (SHA-256 ${hash})`);
    verified = true;
    break;
  } catch (error) {
    lastError = error;
    if (attempt < 6) await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

if (!verified) throw new Error(`Live privacy verification failed for ${url}: ${lastError.message}`);
