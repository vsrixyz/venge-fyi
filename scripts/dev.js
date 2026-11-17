// Serves examples/ with live reload. Decks render from their markdown on each request.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {root, writeDist} from '../lib/dist.js';
import {prepare} from '../lib/build.js';
import {renderDeck} from '../lib/render.js';

const port = Number(process.env.PORT) || 8080;
const examples = path.join(root, 'examples');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.md': 'text/markdown; charset=utf-8', '.csv': 'text/csv', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm'
};

const RELOAD = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;

const clients = new Set();

// A deck folder holds index.html (served as is) or a .md that starts with front matter.
function deckFile(dir) {
  const names = fs.readdirSync(dir).sort();
  if (names.includes('index.html')) return null;
  return names
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(dir, name))
    .find(file => fs.readFileSync(file, 'utf8').startsWith('---'));
}

const escape = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// The deck's front matter, even when the folder serves its own index.html.
function frontMatter(dir) {
  const md = fs.readdirSync(dir).sort()
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(dir, name))
    .find(file => fs.readFileSync(file, 'utf8').startsWith('---'));
  try {
    return md ? prepare(md).deck : {};
  } catch {
    return {};
  }
}

function listPage() {
  const cards = fs.readdirSync(examples, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .map(name => {
      const deck = frontMatter(path.join(examples, name));
      const strip = deck.accent ? ` style="background: ${escape(deck.accent)}"` : '';
      const description = deck.description ? `<p>${escape(deck.description)}</p>` : '';
      return `<a class="card" href="/examples/${encodeURIComponent(name)}/">` +
        `<div class="strip"${strip}><span>${escape(name)}</span></div>` +
        `<div class="body"><h2>${escape(deck.title || name)}</h2>${description}</div></a>`;
    });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Examples</title>
<link rel="stylesheet" href="/src/deck-tokens.css" />
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
<h1>Examples</h1>
<div class="grid">${cards.join('')}</div>
</main>
${RELOAD}
</body>
</html>`;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'});
  res.end(body);
}

function withReload(html) {
  return html.replace('</body>', `${RELOAD}\n</body>`);
}

function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/__reload') {
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store'});
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (pathname === '/') return send(res, 200, listPage(), TYPES['.html']);

  const file = path.join(root, pathname);
  if (!file.startsWith(root + path.sep)) return send(res, 403, 'Forbidden');

  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return send(res, 404, 'Not found');
  }

  if (stat.isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, {Location: pathname + '/'});
      return res.end();
    }
    const md = deckFile(file);
    if (md) {
      try {
        const {deck, csv} = prepare(md, message => console.warn(`${path.relative(root, md)}: ${message}`));
        const html = renderDeck(deck, {runtime: '/dist/', csv});
        return send(res, 200, withReload(html), TYPES['.html']);
      } catch (error) {
        return send(res, 500, `${path.relative(root, md)}: ${error.message}`);
      }
    }
    const index = path.join(file, 'index.html');
    if (!fs.existsSync(index)) return send(res, 404, 'Not found');
    return send(res, 200, withReload(fs.readFileSync(index, 'utf8')), TYPES['.html']);
  }

  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  send(res, 200, fs.readFileSync(file), type);
}

writeDist();

let timer = null;
fs.watch(root, {recursive: true}, (event, name) => {
  if (!name || /^(\.git|node_modules|dist)([\\/]|$)/.test(name)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (/^(src|vendor)[\\/]/.test(name)) {
      try {
        writeDist();
      } catch (error) {
        console.error(error.message);
      }
    }
    clients.forEach(client => client.write('data: reload\n\n'));
  }, 100);
});

http.createServer(handle).listen(port, () => {
  console.log(`Examples at http://localhost:${port}/`);
});
