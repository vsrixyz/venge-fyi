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

function listPage() {
  const items = fs.readdirSync(examples, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => `<li><a href="/examples/${entry.name}/">${entry.name}</a></li>`);
  return `<!doctype html><meta charset="utf-8"><title>Examples</title><ul>${items.join('')}</ul>${RELOAD}`;
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
