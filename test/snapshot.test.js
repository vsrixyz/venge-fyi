// Building glou-glou must match test/snapshots/. UPDATE=1 npm test rewrites them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {build} from '../lib/build.js';
import {root} from '../lib/dist.js';

const snapshots = path.join(root, 'test/snapshots');

function check(name, actual) {
  const file = path.join(snapshots, name);
  if (process.env.UPDATE) {
    fs.mkdirSync(snapshots, {recursive: true});
    fs.writeFileSync(file, actual);
  }
  assert.equal(actual, fs.readFileSync(file, 'utf8'), `differs from test/snapshots/${name}`);
}

test('glou-glou builds to its snapshot', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-'));
  const warnings = [];
  const {html} = build(path.join(root, 'examples/glou-glou/glou-glou.md'), out, w => warnings.push(w));

  const files = fs.readdirSync(out, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => path.relative(out, path.join(entry.parentPath, entry.name)))
    .sort();

  check('glou-glou.html', html);
  check('glou-glou.files.txt', [...files, ...warnings.map(w => `warning: ${w}`)].join('\n') + '\n');
  fs.rmSync(out, {recursive: true});
});
