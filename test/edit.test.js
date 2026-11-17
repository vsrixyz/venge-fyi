// The editor's server: reading, saving and what it refuses.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {editServer} from '../lib/edit.js';
import {root} from '../lib/dist.js';

// fetch() tidies ".." away, so send the path as written.
function statusOf(url, rawPath) {
  return new Promise((resolve, reject) => {
    http.get(url + rawPath, {path: rawPath}, res => {
      res.resume();
      resolve(res.statusCode);
    }).on('error', reject);
  });
}

async function withServer(text, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'venge-edit-'));
  const file = path.join(dir, 'deck', 'talk.md');
  fs.mkdirSync(path.join(dir, 'deck'));
  fs.writeFileSync(file, text);
  fs.writeFileSync(path.join(dir, 'outside.txt'), 'secret');
  const server = editServer(file);
  await new Promise(resolve => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  try {
    await run({url, file});
  } finally {
    server.close();
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

test('reading and saving round-trips the file', () => withServer('# One\n', async ({url, file}) => {
  const read = await fetch(`${url}/_/source`);
  assert.equal(await read.text(), '# One\n');
  const saved = await fetch(`${url}/_/source`, {method: 'PUT', headers: {'If-Match': read.headers.get('ETag')}, body: '# Two\n'});
  assert.equal(saved.status, 204);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Two\n');
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ['talk.md']);
}));

test('a file changed on disk is not overwritten', () => withServer('# One\n', async ({url, file}) => {
  const read = await fetch(`${url}/_/source`);
  fs.writeFileSync(file, '# Changed elsewhere\n');
  const saved = await fetch(`${url}/_/source`, {method: 'PUT', headers: {'If-Match': read.headers.get('ETag')}, body: '# Two\n'});
  assert.equal(saved.status, 409);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Changed elsewhere\n');
}));

test('paths outside the deck folder are refused', () => withServer('# One\n', async ({url}) => {
  // Plain ".." is collapsed by URL parsing; an encoded slash is not.
  assert.equal(await statusOf(url, '/../outside.txt'), 404);
  assert.equal(await statusOf(url, '/..%2foutside.txt'), 403);
  assert.equal(await statusOf(url, '/_/..%2fpackage.json'), 403);
  assert.equal(await statusOf(url, '/_/vendor/reveal.js'), 403);
  assert.equal((await fetch(`${url}/_/src/editor/editor.html`)).status, 200);
}));

test('a missing deck fails with a clear message', () => {
  assert.throws(() => editServer('nope.md'), {message: 'deck file not found: nope.md'});
  assert.throws(
    () => execFileSync(process.execPath, [path.join(root, 'bin/venge-fyi.js'), 'edit', 'nope.md'], {stdio: 'pipe'}),
    error => error.stderr.toString().includes('error: deck file not found: nope.md')
  );
});
