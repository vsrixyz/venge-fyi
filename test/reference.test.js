// Tokens and slide classes are public API, so docs/reference.md must list each one.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {root} from '../lib/dist.js';

const readme = fs.readFileSync(path.join(root, 'docs/reference.md'), 'utf8');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('reference documents every token', () => {
  const tokens = new Set([...read('src/deck-tokens.css').matchAll(/(--deck-[\w-]+)\s*:/g)].map(m => m[1]));
  assert.ok(tokens.size > 50);
  const missing = [...tokens].filter(token => !readme.includes('`' + token + '`'));
  assert.deepEqual(missing, []);
});

test('reference documents every slide type and modifier', () => {
  const chrome = read('src/deck-chrome.js');
  const list = name => chrome.match(new RegExp(`const ${name} = \\[([^\\]]+)\\]`))[1].match(/'[\w-]+'/g).map(s => s.slice(1, -1));
  const missing = [...list('LAYOUTS'), ...list('MODIFIERS')].filter(name => !readme.includes('`' + name + '`'));
  assert.deepEqual(missing, []);
});
