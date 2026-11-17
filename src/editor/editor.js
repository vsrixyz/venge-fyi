// Text box beside a live preview. The preview is drawn here in the browser.
import {renderDeck} from '../../lib/page.js';

const text = document.querySelector('.text');
const backdrop = document.querySelector('.backdrop');
const stage = document.querySelector('.stage');
const note = document.querySelector('.note');
const count = document.querySelector('.count');
const type = document.querySelector('.type');

const file = new URLSearchParams(location.search).get('deck');
const deckUrl = file && new URL(file, location.origin);
const runtime = new URL('/dist/', location.origin).href;

let preview = null;
let timer = null;
let groups = [];
let current = null;
let wheeling = false;

// Runs of lines that belong to one slide, or to a separator between slides.
// Same separators as the deck: a line of --- or --. Front matter counts as the first slide.
function groupLines(source) {
  const lines = source.split('\n');
  const out = [];
  let offset = 0;
  let front = -1;
  if (/^---\r?$/.test(lines[0])) {
    front = lines.findIndex((line, i) => i > 0 && /^---[ \t]*\r?$/.test(line));
  }
  let h = 0;
  let v = 0;
  lines.forEach((line, i) => {
    const bare = line.replace(/\r$/, '');
    let kind = 'slide';
    let key;
    if (i <= front) {
      key = 'front';
    } else if (bare === '---' || bare === '--') {
      kind = 'sep';
      if (bare === '---') { h += 1; v = 0; } else { v += 1; }
      key = `sep${h}.${v}`;
    } else {
      key = `${h}.${v}`;
    }
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.lines.push(line);
    } else {
      out.push({key, kind, h: key === 'front' ? 0 : h, v: key === 'front' ? 0 : v, start: offset, lines: [line]});
    }
    offset += line.length + 1;
  });
  // Blank lines at a slide's edges sit outside its box but still belong to it.
  const tight = [];
  out.forEach(g => {
    if (g.kind !== 'slide') {
      g.owner = tight.findLast(t => t.kind === 'slide');
      tight.push(g);
      return;
    }
    let a = 0;
    let b = g.lines.length;
    while (a < b && !g.lines[a].trim()) a++;
    while (b > a && !g.lines[b - 1].trim()) b--;
    const part = (from, to, kind) => {
      if (from >= to) return null;
      const before = g.lines.slice(0, from).join('\n').length + (from ? 1 : 0);
      return {...g, kind, start: g.start + before, lines: g.lines.slice(from, to)};
    };
    const body = part(a, b, 'slide') || {...g};
    [part(0, a, 'gap'), body, part(b, g.lines.length, 'gap')].forEach(p => {
      if (!p) return;
      if (p.kind === 'gap') p.owner = body;
      tight.push(p);
    });
  });
  tight.forEach(g => { g.end = g.start + g.lines.join('\n').length; });
  return tight;
}

function drawBackdrop() {
  groups = groupLines(text.value);
  backdrop.replaceChildren(...groups.map(g => {
    const div = document.createElement('div');
    div.className = g.kind;
    if (g.kind === 'slide' && g.key === current) div.classList.add('current');
    // The zero-width space keeps a trailing empty line from collapsing.
    div.textContent = g.lines.join('\n') + '​';
    g.el = div;
    return div;
  }));
  backdrop.scrollTop = text.scrollTop;
}

function caretGroup() {
  const at = text.selectionStart;
  const i = groups.findIndex(g => at >= g.start && at <= g.end);
  if (i === -1) return groups[groups.length - 1];
  if (groups[i].kind === 'slide') return groups[i];
  return groups[i].owner || groups.find(g => g.kind === 'slide') || groups[i];
}

// Gap between the top of the field and the top of the box.
function topGap() {
  return parseFloat(getComputedStyle(text).paddingTop);
}

function glide(group) {
  text.scrollTo({top: group.el.offsetTop - topGap(), behavior: 'smooth'});
}

function showHeader() {
  if (!preview) return;
  count.textContent = `Slide ${preview.getSlidePastCount() + 1} of ${preview.getTotalSlides()}`;
  const group = groups.find(g => g.kind === 'slide' && g.key === current);
  const win = stage.querySelector('iframe:not(.loading)').contentWindow;
  type.textContent = group && group.key === 'front'
    ? 'front matter'
    : win.deckSlideType ? win.deckSlideType(preview.getCurrentSlide()) : '';
}

function setCurrent(group, move) {
  if (!group) return;
  const changed = group.key !== current;
  current = group.key;
  groups.forEach(g => g.el.classList.toggle('current', g.kind === 'slide' && g.key === current));
  if (preview) {
    const now = preview.getIndices();
    if (now.h !== group.h || (now.v || 0) !== group.v) preview.slide(group.h, group.v);
  }
  showHeader();
  if (changed && move) glide(group);
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
    deck = deckConfig(text.value);
    note.textContent = '';
  } catch (error) {
    note.textContent = error.message;
    return;
  }
  // The text box is the source, so the deck's own panel stays off.
  deck.source = false;
  const html = renderDeck(deck, {runtime})
    .replace('<head>', `<head>\n<base href="${new URL('.', deckUrl).href}" />`);

  const frame = document.createElement('iframe');
  frame.className = 'loading';
  frame.title = 'Preview';
  stage.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  const reveal = await ready(frame.contentWindow);
  if (!frame.isConnected) return;
  // A newer render may have finished first; keep only the latest.
  stage.querySelectorAll('iframe').forEach(old => {
    if (old !== frame && !old.classList.contains('loading')) old.remove();
  });
  frame.classList.remove('loading');
  preview = reveal;
  if (reveal) {
    reveal.on('slidechanged', showHeader);
    setCurrent(groups.find(g => g.kind === 'slide' && g.key === current) || caretGroup(), false);
  }
}

async function open() {
  if (!file) {
    note.textContent = 'No deck. Open this page with ?deck=/examples/glou-glou/glou-glou.md';
    return;
  }
  document.querySelector('.path').textContent = file;
  const response = await fetch(deckUrl, {cache: 'no-store'});
  if (!response.ok) {
    note.textContent = `${response.status} loading ${file}`;
    return;
  }
  text.value = await response.text();
  text.setSelectionRange(0, 0);
  text.focus();
  drawBackdrop();
  setCurrent(caretGroup(), false);
  render();
}

text.addEventListener('input', () => {
  drawBackdrop();
  setCurrent(caretGroup(), true);
  clearTimeout(timer);
  timer = setTimeout(render, 300);
});

document.addEventListener('selectionchange', () => {
  if (document.activeElement === text && groups.length) setCurrent(caretGroup(), true);
});

text.addEventListener('scroll', () => {
  backdrop.scrollTop = text.scrollTop;
});

// Scrolling by hand: the slide that comes to rest nearest the top becomes current.
text.addEventListener('wheel', () => { wheeling = true; }, {passive: true});
text.addEventListener('scrollend', () => {
  if (!wheeling) return;
  wheeling = false;
  const top = text.scrollTop + topGap();
  const nearest = groups
    .filter(g => g.kind === 'slide')
    .reduce((best, g) => Math.abs(g.el.offsetTop - top) < Math.abs(best.el.offsetTop - top) ? g : best);
  setCurrent(nearest, false);
  glide(nearest);
});

open();
