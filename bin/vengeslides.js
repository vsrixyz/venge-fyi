#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {build} from '../lib/build.js';
import {editServer, editorPath} from '../lib/edit.js';

const USAGE = `Usage: vengeslides
       vengeslides edit <deck.md>
       vengeslides build <deck.md> [--out <folder>]

With nothing after it, vengeslides opens a library of the decks in this folder
and the folders beneath it, at http://localhost:8090. A deck is a .md file that
starts with front matter. Pick one to open it in the editor, which saves as
you type.

edit opens one deck straight in the editor. The deck must be in this folder or
beneath it. Both use port 8090, or PORT if set.

build writes <folder>/index.html, copies the files the deck links next to it,
and copies the runtime into <folder>/runtime/. The default folder is
build/<deck file name>/, e.g. build/talk/ for talk.md.`;

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {out: {type: 'string'}, help: {type: 'boolean', short: 'h'}}
  });
} catch (error) {
  console.error(`${error.message}\n\n${USAGE}`);
  process.exit(1);
}

const [command, file, ...rest] = args.positionals;
if (args.values.help) {
  console.log(USAGE);
  process.exit(0);
}
if (!command) {
  if (args.values.out) fail(USAGE);
  serve(null);
} else if (!['build', 'edit'].includes(command) || !file || rest.length || (command === 'edit' && args.values.out)) {
  fail(USAGE);
} else {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`error: deck file not found: ${file}`);
  if (command === 'edit') {
    const rel = path.relative(process.cwd(), path.resolve(file));
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      fail(`error: ${file} is outside this folder. Run vengeslides edit from a folder that holds the deck.`);
    }
    serve(rel.split(path.sep).join('/'));
  } else {
    runBuild();
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// The library of decks under this folder; with a deck, its editor is the address shown.
function serve(deck) {
  const port = Number(process.env.PORT) || 8090;
  const server = editServer(process.cwd(), message => console.error(`error: ${message}`));
  server.on('error', error => fail(error.code === 'EADDRINUSE'
    ? `error: port ${port} is in use. Stop what is using it, or set PORT, e.g. PORT=${port + 1}`
    : `error: ${error.message}`));
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(deck ? `Editing ${deck} at ${url}${editorPath(deck)}` : `Library at ${url}/`);
  });
}

function runBuild() {
  try {
    const out = path.resolve(args.values.out || path.join('build', path.basename(file, path.extname(file))));
    build(file, out, message => console.warn(`warning: ${message}`));
    const index = path.join(out, 'index.html');
    const shown = path.relative(process.cwd(), index);
    console.log(`Wrote ${shown.startsWith('..') ? index : shown}`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exit(1);
  }
}
