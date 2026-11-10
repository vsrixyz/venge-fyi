// The public API, imported by package name as a site would.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {distDir, prepare, renderDeck} from 'venge-fyi';
import {root} from '../lib/dist.js';

const {deck} = prepare(path.join(root, 'examples/glou-glou/glou-glou.md'));

test('exports the public API only', async () => {
  assert.equal(distDir, path.join(root, 'dist'));
  await assert.rejects(import('venge-fyi/lib/build.js'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
});

test('head goes last in <head>, body first in <body>', () => {
  const html = renderDeck(deck, {head: '<link rel="stylesheet" href="/site.css" />', body: '<a href="/decks/">Decks</a>'});
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  assert.match(head, /<link rel="stylesheet" href="\/site.css" \/>\s*$/);
  assert.match(html, /<body>\s*<a href="\/decks\/">Decks<\/a>\s*<div class="reveal"/);
});

test('without head and body the page is unchanged', () => {
  assert.equal(renderDeck(deck, {head: '', body: ''}), renderDeck(deck));
  assert.match(renderDeck(deck), /<body>\n    <div class="reveal"/);
});
