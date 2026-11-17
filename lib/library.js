// Finding decks under a folder, and the cards that list them.
import fs from 'node:fs';
import path from 'node:path';
import {prepare} from './build.js';

const SKIP = new Set(['node_modules', 'build']);

// Every .md under dir that starts with front matter, as sorted paths relative to dir.
export function findDecks(dir) {
  const out = [];
  const walk = sub => {
    for (const entry of fs.readdirSync(path.join(dir, sub), {withFileTypes: true})) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      const rel = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile() && entry.name.endsWith('.md') && startsWithFrontMatter(path.join(dir, rel))) out.push(rel);
    }
  };
  walk('');
  return out.sort();
}

function startsWithFrontMatter(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(3);
    fs.readSync(fd, head, 0, 3, 0);
    return head.toString() === '---';
  } finally {
    fs.closeSync(fd);
  }
}

// The deck's front matter, or {} if it can't be read.
export function frontMatter(file) {
  try {
    return prepare(file).deck;
  } catch {
    return {};
  }
}

export const escape = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function card({href, label, deck}) {
  const strip = deck.accent ? ` style="background: ${escape(deck.accent)}"` : '';
  const description = deck.description ? `<p>${escape(deck.description)}</p>` : '';
  return `<a class="card" href="${escape(href)}">` +
    `<div class="strip"${strip}><span>${escape(label)}</span></div>` +
    `<div class="body"><h2>${escape(deck.title || label)}</h2>${description}</div></a>`;
}

// A page of cards. tokens is the URL of deck-tokens.css.
export function listPage({title, tokens, cards, empty = '', tail = ''}) {
  const body = cards.length ? `<div class="grid">${cards.join('')}</div>` : `<p>${empty}</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escape(title)}</title>
<link rel="stylesheet" href="${escape(tokens)}" />
<style>
  body { margin: 0; padding: 4rem 1rem; background: var(--deck-background); color: var(--deck-ink); font-family: var(--deck-font-base); }
  main { max-width: 64rem; margin: 0 auto; }
  h1 { font-family: var(--deck-font-display); font-weight: var(--deck-weight-display); letter-spacing: var(--deck-track-display); font-size: 2.5rem; margin: 0 0 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: 1.5rem; }
  .card { display: flex; flex-direction: column; border: 1px solid var(--deck-line); border-radius: var(--deck-radius); overflow: hidden; text-decoration: none; color: inherit; background: var(--deck-card); transition: box-shadow 200ms ease, transform 200ms ease; }
  .card:hover { box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.1); transform: translateY(-2px); }
  .strip { height: 8rem; display: flex; align-items: flex-end; padding: 0.75rem 1rem; background: var(--deck-theme-1); }
  .strip span { font-family: var(--deck-font-mono); font-size: 0.75rem; letter-spacing: var(--deck-track-caps); text-transform: uppercase; color: rgba(255, 255, 255, 0.8); }
  .body { padding: 1.25rem 1rem 1.5rem; flex: 1; }
  h2 { font-size: 1.25rem; line-height: var(--deck-leading-snug); margin: 0 0 0.5rem; }
  p { margin: 0; font-size: 0.95rem; line-height: var(--deck-leading-body); color: var(--deck-ink-soft); }
</style>
</head>
<body>
<main>
<h1>${escape(title)}</h1>
${body}
</main>
${tail}
</body>
</html>`;
}
