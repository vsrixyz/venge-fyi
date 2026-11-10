import assert from 'node:assert/strict';
import test from 'node:test';
import {deckConfig} from '../lib/render.js';

test('reads front matter and markdown', () => {
  const deck = deckConfig(`---
# comment
title: "A: deck"
accent: '#12467A'
theme: midnight # trailing comment
charts: ["echarts"]
source: true
order: 3
---

# Hello
`);
  assert.equal(deck.title, 'A: deck');
  assert.equal(deck.accent, '#12467A');
  assert.equal(deck.theme, 'midnight');
  assert.deepEqual([...deck.charts], ['echarts']);
  assert.equal(deck.source, true);
  assert.equal(deck.markdown, '# Hello');
});

test('blank values use defaults; unquoted # is a comment', () => {
  const deck = deckConfig('---\ntitle: x\naccent: #fff\ntheme:\n---\nbody');
  assert.equal(deck.accent, null);
  assert.equal(deck.theme, null);
  assert.deepEqual([...deck.charts], []);
  assert.equal(deck.source, false);
});

test('no front matter', () => {
  assert.equal(deckConfig('# Just slides').markdown, '# Just slides');
  assert.equal(deckConfig('---\n---\n# Empty').markdown, '# Empty');
});

test('a CSV link adds chartjs', () => {
  const deck = deckConfig('---\ntitle: x\n---\n![a](data.csv "bar")');
  assert.deepEqual([...deck.charts], ['chartjs']);
});

test('unsupported YAML is an error, not a guess', () => {
  assert.throws(() => deckConfig('---\ntitle:\n  nested: 1\n---\n'), /line 3/);
  assert.throws(() => deckConfig('---\ncharts: [d3]\n---\n'), /unknown library/);
  assert.throws(() => deckConfig('---\nsource: yes\n---\n'), /true or false/);
  assert.throws(() => deckConfig('---\naccent: "red;}"\n---\n'), /not a colour/);
});
