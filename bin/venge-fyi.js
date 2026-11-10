#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {build} from '../lib/build.js';

const USAGE = `Usage: venge-fyi build <deck.md> [--out <folder>]

Writes <folder>/index.html, copies the files the deck links next to it, and
copies the runtime into <folder>/runtime/. The default folder is
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
if (command !== 'build' || !file || rest.length) {
  console.error(USAGE);
  process.exit(1);
}

if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
  console.error(`error: deck file not found: ${file}`);
  process.exit(1);
}

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
