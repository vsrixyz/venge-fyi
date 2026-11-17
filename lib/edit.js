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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Writes next to the deck, then renames over it, so a crash can't leave half a file.
function save(file, text) {
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
}

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
