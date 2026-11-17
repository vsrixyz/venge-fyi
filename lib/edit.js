// The editor's local server: one deck file, read and saved as you type.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {root} from './dist.js';
import {contentType} from './types.js';

// The editor's own files live under /_/; everything else is the deck's folder.
const OWN = ['src', 'lib', 'dist'];
const EDITOR = '/_/src/editor/editor.html';

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

export function editServer(file, log = () => {}) {
  const deck = path.resolve(file);
  if (!fs.existsSync(deck) || !fs.statSync(deck).isFile()) {
    throw new Error(`deck file not found: ${file}`);
  }
  const dir = path.dirname(deck);

  return http.createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return send(res, 400, 'Bad path');
    }

    if (pathname === '/') {
      res.writeHead(302, {Location: EDITOR});
      return res.end();
    }

    if (pathname === '/_/source') {
      const current = fs.readFileSync(deck, 'utf8');
      if (req.method === 'GET') {
        return send(res, 200, current, {
          'Content-Type': contentType(deck),
          ETag: tag(current),
          'X-Deck-File': encodeURIComponent(path.basename(deck))
        });
      }
      if (req.method === 'PUT') {
        // Refuse to overwrite a file that changed since the editor last read or saved it.
        if (req.headers['if-match'] !== tag(current)) {
          log(`not saved: ${file} changed on disk`);
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

    const local = inside(dir, pathname);
    if (!local) return send(res, 403, 'Forbidden');
    sendFile(res, local);
  });
}
