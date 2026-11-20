// The editor's local server: a library of decks under one folder, each read and saved as you type.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {root} from './dist.js';
import {contentType} from './types.js';
import {card, findDecks, frontMatter, listPage} from './library.js';

// The editor's own files live under /_/; everything else is the library folder.
const OWN = ['src', 'lib', 'dist'];
const EDITOR = '/_/src/editor/editor.html';

// The editor's URL for a deck, given its path relative to the library folder.
export const editorPath = deck => `${EDITOR}?deck=${encodeURIComponent(deck)}`;

const tag = text => `"${crypto.createHash('sha1').update(text).digest('hex')}"`;

// Resolves a URL path inside base, or null if it points outside.
function inside(base, pathname) {
  const file = path.resolve(base, '.' + pathname);
  return file === base || file.startsWith(base + path.sep) ? file : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers});
  res.end(body);
}

function sendFile(res, file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return send(res, 404, 'Not found');
  }
  if (!stat.isFile()) return send(res, 404, 'Not found');
  send(res, 200, fs.readFileSync(file), {'Content-Type': contentType(file)});
}

function readBytes(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const readBody = async req => (await readBytes(req)).toString('utf8');

// Pictures and video a slide background can use.
const MEDIA = /\.(png|jpe?g|gif|webp|avif|svg|mp4|webm)$/i;

// Puts an upload in assets/ beside the deck. A different file with the same name gets -2, -3…
function saveAsset(deck, name, bytes) {
  const dir = path.join(path.dirname(deck), 'assets');
  fs.mkdirSync(dir, {recursive: true});
  const ext = path.extname(name);
  const stem = path.basename(name, ext).replace(/[^\w.-]+/g, '-') || 'file';
  for (let n = 1; ; n++) {
    const file = path.join(dir, `${stem}${n > 1 ? `-${n}` : ''}${ext.toLowerCase()}`);
    if (fs.existsSync(file) && !fs.readFileSync(file).equals(bytes)) continue;
    if (!fs.existsSync(file)) save(file, bytes);
    return `assets/${path.basename(file)}`;
  }
}

// Writes next to the deck, then renames over it, so a crash can't leave half a file.
function save(file, text) {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
}

// Same as the rail in editor.html.
const RAIL = `<nav class="rail">
  <span class="tab logo">VENGE</span>
  <a class="tab" href="/">library</a>
  <a class="tab" aria-disabled="true">themes</a>
</nav>`;

function libraryPage(home) {
  const cards = findDecks(home).map(rel => card({
    href: editorPath(rel),
    label: rel,
    deck: frontMatter(path.join(home, rel))
  }));
  return listPage({
    title: 'Library',
    tokens: '/_/src/deck-tokens.css',
    cards,
    head: '<link rel="stylesheet" href="/_/src/editor/rail.css" />',
    rail: RAIL,
    empty: `No decks in ${home}. A deck is a .md file that starts with front matter (a line of ---).`
  });
}

// Serves every deck under dir. Paths outside dir are refused.
export function editServer(dir, log = () => {}) {
  const home = path.resolve(dir);
  if (!fs.existsSync(home) || !fs.statSync(home).isDirectory()) {
    throw new Error(`folder not found: ${dir}`);
  }

  return http.createServer(async (req, res) => {
    let url;
    let pathname;
    try {
      url = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return send(res, 400, 'Bad path');
    }

    if (pathname === '/') {
      return send(res, 200, libraryPage(home), {'Content-Type': contentType('page.html')});
    }

    if (pathname === '/_/source') {
      const name = url.searchParams.get('deck') || '';
      const deck = inside(home, '/' + name);
      if (!deck || !deck.endsWith('.md')) return send(res, 403, 'Forbidden');
      let current;
      try {
        current = fs.readFileSync(deck, 'utf8');
      } catch {
        return send(res, 404, `Not found: ${name}`);
      }
      if (req.method === 'GET') {
        return send(res, 200, current, {'Content-Type': contentType(deck), ETag: tag(current)});
      }
      if (req.method === 'PUT') {
        // Refuse to overwrite a file that changed since the editor last read or saved it.
        if (req.headers['if-match'] !== tag(current)) {
          log(`not saved: ${name} changed on disk`);
          return send(res, 409, `${path.basename(deck)} changed on disk. Reload the page to load it. Your unsaved text is still in the box.`);
        }
        const text = await readBody(req);
        try {
          save(deck, text);
        } catch (error) {
          log(`not saved: ${error.message}`);
          return send(res, 500, `Could not save: ${error.message}`);
        }
        return send(res, 204, '', {ETag: tag(text)});
      }
      return send(res, 405, 'Use GET or PUT', {Allow: 'GET, PUT'});
    }

    if (pathname === '/_/asset') {
      const deck = inside(home, '/' + (url.searchParams.get('deck') || ''));
      const name = path.basename(url.searchParams.get('name') || '');
      if (!deck || !deck.endsWith('.md')) return send(res, 403, 'Forbidden');
      if (req.method !== 'POST') return send(res, 405, 'Use POST', {Allow: 'POST'});
      if (!MEDIA.test(name)) return send(res, 415, `Not a picture or video: ${name}`);
      try {
        return send(res, 201, saveAsset(deck, name, await readBytes(req)));
      } catch (error) {
        log(`not uploaded: ${error.message}`);
        return send(res, 500, `Could not upload: ${error.message}`);
      }
    }

    if (pathname.startsWith('/_/')) {
      const own = inside(root, pathname.slice(2));
      const top = own && path.relative(root, own).split(path.sep)[0];
      if (!own || !OWN.includes(top)) return send(res, 403, 'Forbidden');
      return sendFile(res, own);
    }

    const local = inside(home, pathname);
    if (!local) return send(res, 403, 'Forbidden');
    sendFile(res, local);
  });
}
