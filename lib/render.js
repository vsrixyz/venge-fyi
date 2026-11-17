// Reads deck files for the CLI and the dev server.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {root} from './dist.js';

// Same parser as the browser: run src/deck-config.js in a sandbox.
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/deck-config.js'), 'utf8'), sandbox);
export const deckConfig = sandbox.deckConfig;

export {CHART_FILES, isThemeName, renderDeck} from './page.js';
