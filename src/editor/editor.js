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
    area.addEventListener('input', () => edited(i, area));
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

async function open() {
  const response = await fetch(SOURCE, {cache: 'no-store'});
  if (!response.ok) {
    note.textContent = `${response.status} loading ${deckPath || 'the deck'}: ${await response.text()}`;
    return;
  }
  etag = response.headers.get('ETag');
  document.querySelector('.path').textContent = deckPath;
  document.title = `${deckPath.split('/').pop()} · Editor`;
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
document.querySelector('.back').addEventListener('click', async event => {
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

const typing = event => event.target.closest?.('textarea, input, summary, button') || event.metaKey || event.ctrlKey || event.altKey;

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
