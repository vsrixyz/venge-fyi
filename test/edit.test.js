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

// A library folder holding one deck, a note, a deck under node_modules, and a file outside it.
async function withServer(text, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'venge-edit-'));
  const home = path.join(dir, 'home');
  const file = path.join(home, 'deck', 'talk.md');
  fs.mkdirSync(path.join(home, 'deck'), {recursive: true});
  fs.mkdirSync(path.join(home, 'node_modules', 'x'), {recursive: true});
  fs.writeFileSync(file, text);
  fs.writeFileSync(path.join(home, 'deck', 'pic.txt'), 'pic');
  fs.writeFileSync(path.join(home, 'notes.md'), '# Notes\n');
  fs.writeFileSync(path.join(home, 'node_modules', 'x', 'readme.md'), '---\ntitle: Hidden\n---\n');
  fs.writeFileSync(path.join(dir, 'outside.md'), 'secret');
  const server = editServer(home);
  await new Promise(resolve => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  const source = `${url}/_/source?deck=deck%2Ftalk.md`;
  try {
    await run({url, file, source});
  } finally {
    server.close();
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

const DECK = '---\ntitle: My talk\ndescription: About things\n---\n\n# One\n';

test('the library lists decks with front matter, and links them to the editor', () => withServer(DECK, async ({url}) => {
  const page = await (await fetch(`${url}/`)).text();
  assert.match(page, /My talk/);
  assert.match(page, /About things/);
  assert.match(page, /href="\/_\/src\/editor\/editor\.html\?deck=deck%2Ftalk\.md"/);
  assert.doesNotMatch(page, /notes\.md|Hidden/);
}));

test('reading and saving round-trips the file', () => withServer('# One\n', async ({url, file, source}) => {
  const read = await fetch(source);
  assert.equal(await read.text(), '# One\n');
  const saved = await fetch(source, {method: 'PUT', headers: {'If-Match': read.headers.get('ETag')}, body: '# Two\n'});
  assert.equal(saved.status, 204);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Two\n');
  assert.deepEqual(fs.readdirSync(path.dirname(file)).sort(), ['pic.txt', 'talk.md']);
  assert.equal(await (await fetch(`${url}/deck/pic.txt`)).text(), 'pic');
}));

test('a file changed on disk is not overwritten', () => withServer('# One\n', async ({file, source}) => {
  const read = await fetch(source);
  fs.writeFileSync(file, '# Changed elsewhere\n');
  const saved = await fetch(source, {method: 'PUT', headers: {'If-Match': read.headers.get('ETag')}, body: '# Two\n'});
  assert.equal(saved.status, 409);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Changed elsewhere\n');
}));

test('uploads go into assets/ beside the deck, without overwriting', () => withServer('# One\n', async ({url, file}) => {
  const upload = (name, body) => fetch(`${url}/_/asset?deck=deck%2Ftalk.md&name=${encodeURIComponent(name)}`, {method: 'POST', body});
  const first = await upload('My Photo.JPG', 'a');
  assert.equal(first.status, 201);
  assert.equal(await first.text(), 'assets/My-Photo.jpg');
  assert.equal(await (await upload('My Photo.JPG', 'a')).text(), 'assets/My-Photo.jpg');
  assert.equal(await (await upload('My Photo.JPG', 'b')).text(), 'assets/My-Photo-2.jpg');
  assert.equal(fs.readFileSync(path.join(path.dirname(file), 'assets', 'My-Photo.jpg'), 'utf8'), 'a');
  assert.equal((await upload('notes.txt', 'x')).status, 415);
  assert.equal((await fetch(`${url}/_/asset?deck=..%2Foutside.md&name=a.png`, {method: 'POST', body: 'x'})).status, 403);
}));

test('paths outside the library folder are refused', () => withServer('# One\n', async ({url}) => {
  // Plain ".." is collapsed by URL parsing; an encoded slash is not.
  assert.equal(await statusOf(url, '/../outside.md'), 404);
  assert.equal(await statusOf(url, '/..%2foutside.md'), 403);
  assert.equal(await statusOf(url, '/_/..%2fpackage.json'), 403);
  assert.equal(await statusOf(url, '/_/vendor/reveal.js'), 403);
  assert.equal(await statusOf(url, '/_/source?deck=..%2foutside.md'), 403);
  assert.equal(await statusOf(url, '/_/source?deck=deck%2Fpic.txt'), 403);
  assert.equal(await statusOf(url, '/_/source'), 403);
  assert.equal(await statusOf(url, '/_/source?deck=deck%2Fnope.md'), 404);
  assert.equal((await fetch(`${url}/_/src/editor/editor.html`)).status, 200);
}));

test('a missing deck or folder fails with a clear message', () => {
  assert.throws(() => editServer('nope'), {message: 'folder not found: nope'});
  const cli = args => execFileSync(process.execPath, [path.join(root, 'bin/vengeslides.js'), ...args], {stdio: 'pipe', cwd: root});
  assert.throws(() => cli(['edit', 'nope.md']), error => error.stderr.toString().includes('error: deck file not found: nope.md'));
  const outside = path.join(os.tmpdir(), `venge-outside-${process.pid}.md`);
  fs.writeFileSync(outside, '# One\n');
  try {
    assert.throws(() => cli(['edit', outside]), error => error.stderr.toString().includes('is outside this folder'));
  } finally {
    fs.rmSync(outside);
  }
});
