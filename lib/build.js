// Builds a deck into a folder: index.html, the deck's files, and runtime/.
import fs from 'node:fs';
import path from 'node:path';
import {distDir} from './dist.js';
import {CHART_FILES, deckConfig, isThemeName, renderDeck} from './render.js';

// Paths in markdown links and images, and in HTML attributes.
const LINK = /\]\(\s*<?([^)\s>]+)/g;
const ATTRIBUTE = /\b(?:src|href|poster|data-src|data-background(?:-image|-video|-iframe)?)\s*=\s*["']([^"']+)["']/gi;

function localPaths(markdown) {
  const found = new Set();
  for (const regex of [LINK, ATTRIBUTE]) {
    for (const match of markdown.matchAll(regex)) {
      const ref = match[1].replace(/[?#].*$/, '');
      // Skip URLs with a scheme, root paths and in-page anchors.
      if (!ref || /^([a-z][\w+.-]*:|\/|#)/i.test(ref)) continue;
      try {
        found.add(decodeURI(ref));
      } catch {
        found.add(ref);
      }
    }
  }
  return [...found];
}

// Reads a deck file and finds the files it links. Warnings go to warn().
export function prepare(file, warn = () => {}) {
  const deck = deckConfig(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(path.resolve(file));

  const refs = localPaths(deck.markdown);
  if (deck.theme && !isThemeName(deck.theme)) refs.push(deck.theme);

  const assets = [];
  const csv = {};
  for (const ref of refs) {
    const from = path.resolve(dir, ref);
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) {
      warn(`not found: ${ref}`);
      continue;
    }
    const rel = path.relative(dir, from);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`${ref} is outside the deck's folder. Move it into ${dir}`);
    }
    assets.push(rel);
    if (/\.csv$/i.test(ref)) csv[ref] = fs.readFileSync(from, 'utf8');
  }
  return {deck, dir, assets, csv};
}

export function build(file, out, warn = () => {}) {
  const {deck, dir, assets, csv} = prepare(file, warn);

  const files = ['deck.js', 'deck.css', ...deck.charts.map(name => CHART_FILES[name])];
  if (deck.theme && isThemeName(deck.theme)) {
    const theme = `themes/${deck.theme}.css`;
    if (!fs.existsSync(path.join(distDir, theme))) {
      throw new Error(`Unknown theme "${deck.theme}". Built-in themes: ${builtInThemes().join(', ')}`);
    }
    files.push(theme);
  }

  const copy = (from, to) => {
    if (path.resolve(from) === path.resolve(to)) return;
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.copyFileSync(from, to);
  };
  for (const rel of assets) copy(path.join(dir, rel), path.join(out, rel));
  for (const name of files) copy(path.join(distDir, name), path.join(out, 'runtime', name));
  fs.cpSync(path.join(distDir, 'licenses'), path.join(out, 'runtime', 'licenses'), {recursive: true});

  const html = renderDeck(deck, {runtime: 'runtime/', csv});
  fs.writeFileSync(path.join(out, 'index.html'), html);
  return {html, assets};
}

export function builtInThemes() {
  return fs.readdirSync(path.join(distDir, 'themes')).map(name => name.replace(/\.css$/, ''));
}
