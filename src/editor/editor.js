// One text box per slide beside a live preview. The preview is drawn here in the browser.
import {renderDeck} from '../../lib/page.js';

const list = document.querySelector('.slides-list');
const front = document.querySelector('.front-text');
const stage = document.querySelector('.stage');
const note = document.querySelector('.note');
const count = document.querySelector('.count');

// Served by `vengeslides`: the library folder at /, our files under /_/, the deck named in ?deck=.
const deckPath = new URLSearchParams(location.search).get('deck') || '';
const SOURCE = `/_/source?deck=${encodeURIComponent(deckPath)}`;
const runtime = new URL('/_/dist/', location.origin).href;
const folder = deckPath.split('/').slice(0, -1).map(encodeURIComponent).join('/');
const base = new URL(folder ? `/${folder}/` : '/', location.origin).href;

let preview = null;
let timer = null;
let etag = null;
let saving = false;
let unsaved = false;
// The front matter's own --- lines, kept as they were (null: the file had none).
let fence = null;
// Each slide: {pre, body, post} (blank lines around it stay out of its box), and the separators between.
let slides = [];
let seps = [];
let current = 0;
const problems = {deck: '', save: ''};

const SEP = /^(---|--)(?=\r?$)/m;

function showProblem(kind, message) {
  problems[kind] = message;
  note.textContent = problems.save || problems.deck;
}

// The file is front matter (its own box) and slides.
function splitFile(source) {
  const lines = source.split('\n');
  const end = /^---\r?$/.test(lines[0])
    ? lines.findIndex((line, i) => i > 0 && /^---[ \t]*\r?$/.test(line))
    : -1;
  if (end === -1) return {fence: null, front: '', body: source};
  return {
    fence: {open: lines[0], close: lines[end], rest: end < lines.length - 1},
    front: lines.slice(1, end).join('\n'),
    body: lines.slice(end + 1).join('\n')
  };
}

// Same separators as the deck: a line of --- or --. Joining the parts gives back the text exactly.
function splitSlides(body) {
  const parts = body.split(new RegExp(SEP.source, 'gm'));
  const out = {slides: [], seps: []};
  parts.forEach((part, i) => {
    if (i % 2) return out.seps.push(part);
    const pre = part.match(/^(?:[ \t]*\r?\n)*/)[0];
    const rest = part.slice(pre.length);
    const post = rest.match(/(?:\r?\n[ \t]*)*$/)[0];
    out.slides.push({pre, body: rest.slice(0, rest.length - post.length), post});
  });
  return out;
}

function bodyText() {
  return slides.map((s, i) => s.pre + s.body + s.post + (i < seps.length ? seps[i] : '')).join('');
}

function fileText() {
  const body = bodyText();
  if (!fence && !front.value.trim()) return body;
  const {open, close, rest} = fence || {open: '---', close: '---', rest: true};
  const after = rest || body ? `\n${body}` : '';
  return `${open}\n${front.value ? front.value + '\n' : ''}${close}${after}`;
}

// Reveal's index for each slide: --- starts a new column, -- goes below.
function indices() {
  let h = 0;
  let v = 0;
  return slides.map((_, i) => {
    if (i > 0) {
      if (seps[i - 1] === '---') { h += 1; v = 0; } else { v += 1; }
    }
    return {h, v};
  });
}

function boxes() {
  return [...list.querySelectorAll('.slide-box')];
}

function drawSlides(focusAt) {
  const at = indices();
  list.replaceChildren(...slides.map((slide, i) => {
    const box = document.createElement('section');
    box.className = 'slide-box';
    box.classList.toggle('current', i === current);
    box.dataset.h = at[i].h;
    box.dataset.v = at[i].v;
    const head = document.createElement('header');
    const number = document.createElement('span');
    number.className = 'number';
    number.textContent = i + 1;
    const type = document.createElement('span');
    type.className = 'type';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.title = 'Delete this slide';
    remove.setAttribute('aria-label', `Delete slide ${i + 1}`);
    remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>';
    remove.addEventListener('click', () => removeSlide(i));
    head.append(number, type, remove);
    const area = document.createElement('textarea');
    area.spellcheck = false;
    area.value = slide.body;
    area.setAttribute('aria-label', `Slide ${i + 1}`);
    area.addEventListener('focus', () => setCurrent(i));
    area.addEventListener('keydown', event => leaveBox(event, i, area));
    area.addEventListener('input', () => { edited(i, area); refreshToolbar(); });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add';
    add.textContent = '+';
    add.title = 'Add a slide here';
    add.setAttribute('aria-label', `Add a slide after slide ${i + 1}`);
    add.addEventListener('click', () => addSlide(i));
    box.append(head, area, add);
    return box;
  }));
  showTypes();
  if (focusAt) {
    const area = boxes()[focusAt.index]?.querySelector('textarea');
    if (area) {
      area.focus({preventScroll: true});
      area.setSelectionRange(focusAt.caret, focusAt.caret);
    }
  }
}

function showCount() {
  if (preview) count.textContent = `${preview.getSlidePastCount() + 1} of ${preview.getTotalSlides()}`;
}

function showTypes() {
  const win = preview && stage.querySelector('iframe:not(.loading)')?.contentWindow;
  boxes().forEach(box => {
    const section = preview && preview.getSlide(Number(box.dataset.h), Number(box.dataset.v));
    box.querySelector('.type').textContent = section && win?.deckSlideType ? win.deckSlideType(section) : '';
  });
  showCount();
}

function setCurrent(i, scroll) {
  const all = boxes();
  if (!all[i]) return;
  current = i;
  all.forEach((box, n) => box.classList.toggle('current', n === i));
  if (preview) {
    const h = Number(all[i].dataset.h);
    const v = Number(all[i].dataset.v);
    const now = preview.getIndices();
    if (now.h !== h || (now.v || 0) !== v) preview.slide(h, v);
  }
  showCount();
  refreshToolbar();
  if (scroll) all[i].scrollIntoView({block: 'start'});
}

// Typing a --- or -- line in a box splits it into slides there and then.
function edited(i, area) {
  slides[i].body = area.value;
  if (SEP.test(area.value)) {
    const before = slides.slice(0, i).map((s, n) => s.pre + s.body + s.post + seps[n]).join('') + slides[i].pre;
    const caret = before.length + area.selectionStart;
    ({slides, seps} = splitSlides(bodyText()));
    let start = 0;
    let index = slides.length - 1;
    let inBox = slides[index].body.length;
    for (let n = 0; n < slides.length; n++) {
      const bodyStart = start + slides[n].pre.length;
      const end = bodyStart + slides[n].body.length + slides[n].post.length + (seps[n] || '').length;
      if (caret <= end) {
        index = n;
        inBox = Math.max(0, Math.min(caret - bodyStart, slides[n].body.length));
        break;
      }
      start = end;
    }
    current = index;
    drawSlides({index, caret: inBox});
    setCurrent(index);
  }
  changed();
}

function addSlide(i) {
  const last = i === slides.length - 1;
  const added = {pre: '\n\n', body: '', post: last ? slides[i].post || '\n' : '\n\n'};
  slides[i].post = '\n\n';
  slides.splice(i + 1, 0, added);
  seps.splice(i, 0, '---');
  current = i + 1;
  drawSlides({index: i + 1, caret: 0});
  setCurrent(i + 1);
  changed();
}

// Like one document: ↓ at the end of a box goes to the next slide, ↑ at its start to the one before.
function leaveBox(event, i, area) {
  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
  if (area.selectionStart !== area.selectionEnd) return;
  const down = event.key === 'ArrowDown' && area.selectionEnd === area.value.length && i < slides.length - 1;
  const up = event.key === 'ArrowUp' && area.selectionStart === 0 && i > 0;
  if (!down && !up) return;
  event.preventDefault();
  const next = boxes()[down ? i + 1 : i - 1].querySelector('textarea');
  next.focus({preventScroll: true});
  const at = down ? 0 : next.value.length;
  next.setSelectionRange(at, at);
  setCurrent(down ? i + 1 : i - 1, true);
}

// The only slide is emptied instead. A column's first slide passes its --- to the next.
function removeSlide(i) {
  if (slides.length === 1) {
    slides[0].body = '';
  } else if (i === 0) {
    slides[1].pre = slides[0].pre;
    slides.splice(0, 1);
    seps.splice(0, 1);
  } else {
    if (i === slides.length - 1) slides[i - 1].post = slides[i].post;
    if (seps[i - 1] === '---' && seps[i] === '--') seps[i] = '---';
    slides.splice(i, 1);
    seps.splice(i - 1, 1);
  }
  current = Math.min(i, slides.length - 1);
  drawSlides();
  setCurrent(current, true);
  changed();
}

// Changing slide in the preview brings its box into view at once.
function followPreview(reveal) {
  if (reveal !== preview) return;
  const {h, v = 0} = reveal.getIndices();
  const i = boxes().findIndex(box => Number(box.dataset.h) === h && Number(box.dataset.v) === v);
  if (i !== -1 && i !== current) setCurrent(i, true);
  else showCount();
}

function ready(win) {
  return new Promise(resolve => {
    const done = () => resolve(win.Reveal && win.Reveal.isReady() ? win.Reveal : null);
    win.addEventListener('load', () => {
      if (!win.Reveal || win.Reveal.isReady()) return done();
      win.Reveal.on('ready', done);
      // A deck that fails to start never says ready.
      setTimeout(done, 2000);
    });
  });
}

// Draws the deck into a hidden frame and swaps it in once it's ready, so it doesn't flash.
async function render() {
  let deck;
  try {
    deck = deckConfig(fileText());
    showProblem('deck', '');
  } catch (error) {
    showProblem('deck', error.message);
    return;
  }
  const html = renderDeck(deck, {runtime})
    .replace('<head>', `<head>\n<base href="${base}" />`);

  const frame = document.createElement('iframe');
  frame.className = 'loading';
  frame.title = 'Preview';
  stage.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  frame.contentWindow.addEventListener('keydown', toggleKey);
  const reveal = await ready(frame.contentWindow);
  if (!frame.isConnected) return;
  // A newer render may have finished first; keep only the latest.
  stage.querySelectorAll('iframe').forEach(old => {
    if (old !== frame && !old.classList.contains('loading')) old.remove();
  });
  frame.classList.remove('loading');
  preview = reveal;
  if (reveal) {
    reveal.on('slidechanged', () => followPreview(reveal));
    setCurrent(current);
    showTypes();
  }
}

// --- Toolbar: the current slide's options, written into its <!-- .slide: --> line.

const toolbar = document.querySelector('.toolbar');
const LINE = /<!--\s*\.slide:\s*([\s\S]*?)\s*-->/;
const LAYOUTS = ['grid', 'split', 'prose'];
const COLOURS = ['theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 'card', 'ink'];
const ICONS = {
  auto: '<path d="M2.5 3.5h11v9h-11z"/><path d="M5 6.5h6M5 9.5h4"/>',
  split: '<path d="M2.5 3.5h11v9h-11zM8 3.5v9"/>',
  prose: '<path d="M4 4h8M4 6.7h8M4 9.4h8M4 12h5"/>',
  image: '<path d="M2.5 3.5h11v9h-11z"/><path d="M2.5 10.5l3-3 3 3 2-2 3 3"/><circle cx="10.5" cy="6" r="1"/>',
  tint: '<path d="M8 2.5c2.2 2.6 3.5 4.6 3.5 6.3a3.5 3.5 0 0 1-7 0c0-1.7 1.3-3.7 3.5-6.3z"/>',
  cards: '<rect x="2" y="4" width="5" height="8" rx="1.3"/><rect x="9" y="4" width="5" height="8" rx="1.3"/>',
  spectrum: '<path d="M3 3.5v9M6.3 3.5v9M9.7 3.5v9M13 3.5v9"/>'
};

function slideLine(body) {
  const match = body.match(LINE);
  const attrs = [];
  if (match) {
    for (const [, name, value] of match[1].matchAll(/([\w-]+)(?:\s*=\s*"([^"]*)")?/g)) attrs.push([name, value ?? null]);
  }
  return {match, attrs};
}

const attr = (attrs, name) => attrs.find(([key]) => key === name)?.[1] ?? null;
const classesOf = attrs => (attr(attrs, 'class') || '').split(/\s+/).filter(Boolean);

// Changes the current slide's line; adds it at the top, or removes it once it's empty.
function setSlideLine(change) {
  const slide = slides[current];
  const {match, attrs} = slideLine(slide.body);
  change(attrs);
  const kept = attrs.filter(([key, value]) => !(key === 'class' && !value));
  const text = kept.map(([key, value]) => value === null ? key : `${key}="${value}"`).join(' ');
  let body = slide.body;
  if (match) {
    body = kept.length
      ? body.replace(LINE, `<!-- .slide: ${text} -->`)
      : body.slice(0, match.index) + body.slice(match.index + match[0].length).replace(/^[ \t]*\r?\n(?:[ \t]*\r?\n)?/, '');
  } else if (kept.length) {
    body = `<!-- .slide: ${text} -->\n\n${body}`;
  }
  slide.body = body;
  const area = boxes()[current]?.querySelector('textarea');
  if (area) area.value = body;
  refreshToolbar();
  changed();
}

function setAttr(attrs, name, value) {
  const at = attrs.findIndex(([key]) => key === name);
  if (value === null) { if (at !== -1) attrs.splice(at, 1); return; }
  if (at === -1) attrs.push([name, value]); else attrs[at][1] = value;
}

function setClasses(attrs, edit) {
  const list = classesOf(attrs);
  edit(list);
  setAttr(attrs, 'class', [...new Set(list)].join(' '));
}

function toggleClass(name) {
  setSlideLine(attrs => setClasses(attrs, list => {
    const at = list.indexOf(name);
    if (at === -1) list.push(name); else list.splice(at, 1);
  }));
}

function button(name, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tool';
  b.dataset.tool = name;
  b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[name] || ''}</svg><span>${label}</span>`;
  b.addEventListener('click', onClick);
  return b;
}

// The theme's colour for a name, read from the preview.
function colourOf(name) {
  const win = stage.querySelector('iframe:not(.loading)')?.contentWindow;
  if (!win) return 'transparent';
  const token = name === 'background' ? '--deck-background' : `--deck-${name}`;
  return win.getComputedStyle(win.document.documentElement).getPropertyValue(token).trim() || 'transparent';
}

// A small panel above a toolbar button. Clicking elsewhere closes it.
function openPanel(anchor, fill) {
  const panel = document.querySelector('.tool-panel');
  panel.replaceChildren();
  fill(panel);
  panel.showPopover();
  const a = anchor.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(8, Math.min(innerWidth - p.width - 8, a.left + a.width / 2 - p.width / 2))}px`;
  panel.style.top = `${a.top - p.height - 8}px`;
}

function closePanel() {
  const panel = document.querySelector('.tool-panel');
  if (panel.matches(':popover-open')) panel.hidePopover();
}

function colourPanel(anchor) {
  openPanel(anchor, panel => {
    const now = attr(slideLine(slides[current].body).attrs, 'data-background-color');
    ['', ...COLOURS].forEach(name => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.classList.toggle('on', (now || '') === name);
      swatch.style.setProperty('--swatch', colourOf(name || 'background'));
      swatch.setAttribute('aria-label', name || 'Default');
      swatch.innerHTML = `<span></span>${name ? name.replace('theme-', '') : 'Default'}`;
      swatch.addEventListener('click', () => {
        setSlideLine(attrs => setAttr(attrs, 'data-background-color', name || null));
        closePanel();
      });
      panel.append(swatch);
    });
  });
}

function imagePanel(anchor) {
  openPanel(anchor, panel => {
    const now = attr(slideLine(slides[current].body).attrs, 'data-background-image');
    const form = document.createElement('form');
    const field = document.createElement('input');
    field.type = 'text';
    field.placeholder = 'Paste a link, or upload';
    field.value = now || '';
    field.spellcheck = false;
    form.append(field);
    form.addEventListener('submit', event => {
      event.preventDefault();
      setSlideLine(attrs => setAttr(attrs, 'data-background-image', field.value.trim() || null));
      closePanel();
    });
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*,video/mp4,video/webm';
    file.hidden = true;
    file.addEventListener('change', async () => {
      const chosen = file.files[0];
      if (!chosen) return;
      const response = await fetch(`/_/asset?deck=${encodeURIComponent(deckPath)}&name=${encodeURIComponent(chosen.name)}`, {method: 'POST', body: chosen});
      if (!response.ok) return showProblem('save', `Not uploaded: ${await response.text()}`);
      const where = await response.text();
      setSlideLine(attrs => setAttr(attrs, 'data-background-image', where));
      closePanel();
    });
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.textContent = 'Upload';
    upload.addEventListener('click', () => file.click());
    const row = document.createElement('div');
    row.className = 'row';
    row.append(upload);
    if (now) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        setSlideLine(attrs => {
          setAttr(attrs, 'data-background-image', null);
          setClasses(attrs, list => { const at = list.indexOf('tint'); if (at !== -1) list.splice(at, 1); });
        });
        closePanel();
      });
      row.append(remove);
    }
    panel.append(form, file, row);
    requestAnimationFrame(() => field.focus());
  });
}

function drawToolbar() {
  const layout = document.createElement('div');
  layout.className = 'group';
  [['auto', 'Auto', null], ['split', 'Split', 'split'], ['prose', 'Prose', 'prose']].forEach(([name, label, value]) => {
    layout.append(button(name, label, () => setSlideLine(attrs => setClasses(attrs, list => {
      LAYOUTS.forEach(l => { const at = list.indexOf(l); if (at !== -1) list.splice(at, 1); });
      if (value) list.unshift(value);
    }))));
  });
  const colour = button('colour', 'Colour', event => colourPanel(event.currentTarget));
  colour.querySelector('svg').outerHTML = '<span class="dot"></span>';
  const look = document.createElement('div');
  look.className = 'group';
  look.append(colour, button('image', 'Image', event => imagePanel(event.currentTarget)), button('tint', 'Tint', () => toggleClass('tint')));
  const sections = document.createElement('div');
  sections.className = 'group sections';
  sections.append(button('cards', 'Cards', () => toggleClass('cards')), button('spectrum', 'Spectrum', () => toggleClass('spectrum')));
  toolbar.replaceChildren(layout, look, sections);
}

// Shows what the current slide has set. Tint needs an image; cards and spectrum need sections.
function refreshToolbar() {
  if (!toolbar.childElementCount || !slides[current]) return;
  const {attrs} = slideLine(slides[current].body);
  const classes = classesOf(attrs);
  const layout = classes.find(c => c === 'split' || c === 'prose') || 'auto';
  const tool = name => toolbar.querySelector(`[data-tool="${name}"]`);
  ['auto', 'split', 'prose'].forEach(name => tool(name).classList.toggle('on', name === layout));
  const colour = attr(attrs, 'data-background-color');
  tool('colour').classList.toggle('on', !!colour);
  tool('colour').querySelector('.dot').style.background = colour ? colourOf(colour) : colourOf('background');
  const image = attr(attrs, 'data-background-image');
  tool('image').classList.toggle('on', !!image);
  tool('tint').hidden = !image;
  tool('tint').classList.toggle('on', classes.includes('tint'));
  const box = boxes()[current];
  const section = preview && box && preview.getSlide(Number(box.dataset.h), Number(box.dataset.v));
  const hasSections = !!section?.querySelector('[data-shape="sections"]') || classes.includes('cards') || classes.includes('spectrum');
  toolbar.querySelector('.sections').hidden = !hasSections;
  tool('cards').classList.toggle('on', classes.includes('cards'));
  tool('spectrum').classList.toggle('on', classes.includes('spectrum'));
}

drawToolbar();

async function open() {
  const response = await fetch(SOURCE, {cache: 'no-store'});
  if (!response.ok) {
    note.textContent = `${response.status} loading ${deckPath || 'the deck'}: ${await response.text()}`;
    return;
  }
  etag = response.headers.get('ETag');
  const name = deckPath.split('/').pop();
  document.querySelector('.path').textContent = name;
  document.title = `${name} · Editor`;
  const file = splitFile(await response.text());
  fence = file.fence;
  front.value = file.front;
  ({slides, seps} = splitSlides(file.body));
  drawSlides({index: 0, caret: 0});
  render();
}

// One save at a time; typing during a save saves again after it.
async function save() {
  if (saving) return;
  saving = true;
  while (unsaved) {
    unsaved = false;
    let response;
    try {
      response = await fetch(SOURCE, {method: 'PUT', headers: {'If-Match': etag}, body: fileText(), keepalive: true});
    } catch {
      showProblem('save', 'Not saved: the editor server is not running. Your text is still here.');
      break;
    }
    if (!response.ok) {
      showProblem('save', `Not saved: ${await response.text()}`);
      break;
    }
    etag = response.headers.get('ETag');
    showProblem('save', '');
  }
  saving = false;
}

// Going back to the library saves first, so the last few keystrokes aren't lost.
document.querySelector('.rail a[href]').addEventListener('click', async event => {
  if (!timer && !saving) return;
  event.preventDefault();
  const href = event.currentTarget.href;
  if (timer) unsaved = true;
  clearTimeout(timer);
  timer = null;
  while (saving) await new Promise(resolve => setTimeout(resolve, 50));
  await save();
  if (!problems.save) location.href = href;
});

function changed() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    unsaved = true;
    save();
    render();
  }, 300);
}

front.addEventListener('input', changed);

document.querySelector('.to-top').addEventListener('click', () => {
  document.querySelector('.source-scroll').scrollTo({top: 0});
});

const typing = event => event.target.closest?.('textarea, input') || event.metaKey || event.ctrlKey || event.altKey;

// M shows or hides the markdown, from anywhere but a text box (the preview included).
function toggleKey(event) {
  if (event.key !== 'm' && event.key !== 'M' || typing(event)) return;
  event.preventDefault();
  document.body.classList.toggle('source-hidden');
}
document.addEventListener('keydown', toggleKey);

// Outside the text, the arrows and Esc reach the preview, as they do inside it.
const KEYS = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Escape: 'toggleOverview'};
document.addEventListener('keydown', event => {
  const action = KEYS[event.key];
  if (!action || !preview || typing(event)) return;
  event.preventDefault();
  preview[action]();
});

// Esc in a text box leaves it, so the keys above work again.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && event.target.matches?.('textarea')) event.target.blur();
});

open();
