#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {build} from '../lib/build.js';
import {editServer} from '../lib/edit.js';

const USAGE = `Usage: venge-fyi build <deck.md> [--out <folder>]
       venge-fyi edit <deck.md>

build writes <folder>/index.html, copies the files the deck links next to it,
and copies the runtime into <folder>/runtime/. The default folder is
build/<deck file name>/, e.g. build/talk/ for talk.md.

edit opens the deck in an editor in your browser and saves as you type.
It uses port 8090, or PORT if set.`;

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
if (!['build', 'edit'].includes(command) || !file || rest.length || (command === 'edit' && args.values.out)) {
  console.error(USAGE);
  process.exit(1);
}

if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
  console.error(`error: deck file not found: ${file}`);
  process.exit(1);
}

if (command === 'edit') {
  const port = Number(process.env.PORT) || 8090;
  const server = editServer(file, message => console.error(`error: ${message}`));
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `error: port ${port} is in use. Stop what is using it, or set PORT, e.g. PORT=${port + 1}`
      : `error: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, () => console.log(`Editing ${file} at http://localhost:${port}/`));
} else {
  runBuild();
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
