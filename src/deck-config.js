/* Reads a deck file: front matter plus markdown.
   Used by the browser runtime and by the CLI. */

(function (global) {
  'use strict';

  // A link to a .csv file needs Chart.js.
  const CSV_LINK = /\]\([^)\s]+\.csv(?:\s+"[^"]*")?\)/i;

  const CHARTS = ['chartjs', 'echarts'];

  const FRONT_MATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

  // Splits "a, 'b, c'" on commas outside quotes.
  function splitList(text, fail) {
    const items = [];
    let item = '';
    let quote = null;
    for (const c of text) {
      if (quote) {
        if (c === quote) quote = null;
        item += c;
      } else if (c === '"' || c === "'") {
        quote = c;
        item += c;
      } else if (c === ',') {
        items.push(item);
        item = '';
      } else {
        item += c;
      }
    }
    if (quote) fail('unclosed quote');
    if (item.trim() !== '' || items.length) items.push(item);
    return items.map(part => scalar(part.trim(), fail));
  }

  function scalar(text, fail) {
    if (text === '' || text === '~' || text === 'null') return null;
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
    const quoted = text.match(/^(["'])(.*)\1$/);
    if (quoted) return quoted[2];
    if (/^["'[{|>&*!%@`]/.test(text)) fail(`unsupported value: ${text}`);
    return text;
  }

  // One value: a word, a quoted string or a [list]. A " #" starts a comment.
  function value(text, fail) {
    const open = text[0];
    if (open === '"' || open === "'" || open === '[') {
      const close = open === '[' ? ']' : open;
      const end = text.indexOf(close, 1);
      if (end === -1) fail(`missing ${close}`);
      const rest = text.slice(end + 1).trim();
      if (rest !== '' && !rest.startsWith('#')) fail(`unexpected text: ${rest}`);
      return open === '['
        ? splitList(text.slice(1, end), fail)
        : text.slice(1, end);
    }
    const comment = text.search(/(^|\s)#/);
    return scalar((comment === -1 ? text : text.slice(0, comment)).trim(), fail);
  }

  // Flat "key: value" lines only. Anything else is an error, not a guess.
  function parseYaml(text) {
    const data = {};
    text.split(/\r?\n/).forEach((line, index) => {
      const fail = message => {
        throw new Error(`Front matter line ${index + 2}: ${message}`);
      };
      if (/^\s*(#.*)?$/.test(line)) return;
      if (/^\s/.test(line)) fail('nested or multi-line values are not supported');
      const match = line.match(/^([A-Za-z_][\w-]*)[ \t]*:(?:[ \t]+(.*))?[ \t]*$/);
      if (!match) fail(`expected "key: value", got "${line.trim()}"`);
      data[match[1]] = value((match[2] || '').trim(), fail);
    });
    return data;
  }

  function text(data, key) {
    const raw = data[key];
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'object') throw new Error(`Front matter ${key}: expected text`);
    return String(raw);
  }

  function deckConfig(source) {
    const raw = String(source).replace(/^﻿/, '');
    const match = raw.match(FRONT_MATTER);
    const data = match ? parseYaml(match[1] || '') : {};
    const markdown = (match ? raw.slice(match[0].length) : raw).trim();

    const accent = text(data, 'accent');
    if (accent && /[<>;{}]/.test(accent)) {
      throw new Error(`Front matter accent: not a colour: ${accent}`);
    }

    let charts = data.charts === null || data.charts === undefined ? [] : data.charts;
    if (!Array.isArray(charts)) charts = [charts];
    charts.forEach(name => {
      if (!CHARTS.includes(name)) {
        throw new Error(`Front matter charts: unknown library "${name}". Use ${CHARTS.join(' or ')}`);
      }
    });
    if (CSV_LINK.test(markdown) && !charts.includes('chartjs')) {
      charts = [...charts, 'chartjs'];
    }

    if (data.source !== undefined && data.source !== null && typeof data.source !== 'boolean') {
      throw new Error('Front matter source: expected true or false');
    }

    return {
      title: text(data, 'title'),
      description: text(data, 'description'),
      accent,
      theme: text(data, 'theme'),
      charts,
      source: data.source === true,
      markdown
    };
  }

  global.deckConfig = deckConfig;
})(globalThis);
