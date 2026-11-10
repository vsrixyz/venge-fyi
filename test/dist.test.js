// dist/ must match what `npm run dist` would write from src/ and vendor/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {distDir, distFiles} from '../lib/dist.js';

test('dist/ is up to date (run npm run dist)', () => {
  const expected = distFiles();
  for (const [name, content] of Object.entries(expected)) {
    const file = path.join(distDir, name);
    assert.ok(fs.existsSync(file), `missing dist/${name}`);
    assert.ok(Buffer.from(content).equals(fs.readFileSync(file)), `stale dist/${name}`);
  }
  const actual = fs.readdirSync(distDir, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => path.relative(distDir, path.join(entry.parentPath, entry.name)));
  assert.deepEqual(actual.sort(), Object.keys(expected).sort());
});
