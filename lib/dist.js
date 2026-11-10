// Builds dist/: deck.js and deck.css by plain concatenation, plus themes and chart libraries.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const distDir = path.join(root, 'dist');

const JS = [
  'vendor/reveal.js',
  'vendor/reveal-markdown.js',
  'vendor/reveal-highlight.js',
  'src/deck-config.js',
  'src/deck-chrome.js',
  'src/deck-charts.js',
  'src/deck-source.js',
  'src/deck-start.js'
];

const CSS = [
  'vendor/reset.css',
  'vendor/reveal.css',
  'src/deck-tokens.css',
  'src/deck.css',
  'src/deck-page.css'
];

const COPY = {
  'chart.umd.min.js': 'vendor/chart.umd.min.js',
  'echarts.min.js': 'vendor/echarts.min.js'
};

function join(files) {
  return files
    .map(file => `/* ---- ${file} ---- */\n${fs.readFileSync(path.join(root, file), 'utf8').trim()}\n`)
    .join('\n');
}

// Every file in dist/, keyed by its path inside dist/.
export function distFiles() {
  const files = {
    'deck.js': join(JS),
    'deck.css': join(CSS)
  };
  for (const [name, from] of Object.entries(COPY)) {
    files[name] = fs.readFileSync(path.join(root, from));
  }
  for (const dir of ['src/themes', 'vendor/licenses']) {
    const out = path.basename(dir);
    const entries = fs.readdirSync(path.join(root, dir), {withFileTypes: true});
    for (const name of entries.filter(e => e.isFile() && !e.name.startsWith('.')).map(e => e.name).sort()) {
      files[`${out}/${name}`] = fs.readFileSync(path.join(root, dir, name));
    }
  }
  return files;
}

export function writeDist() {
  fs.rmSync(distDir, {recursive: true, force: true});
  for (const [name, content] of Object.entries(distFiles())) {
    const file = path.join(distDir, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
  }
}
