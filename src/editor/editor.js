// Text box beside a live preview. The preview is drawn here in the browser.
import {renderDeck} from '../../lib/page.js';

const text = document.querySelector('.text');
const backdrop = document.querySelector('.backdrop');
const stage = document.querySelector('.stage');
const strip = document.querySelector('.strip');
const note = document.querySelector('.note');
const count = document.querySelector('.count');
const type = document.querySelector('.type');

// Served by `vengeslides`: the library folder at /, our files under /_/, the deck named in ?deck=.
const deckPath = new URLSearchParams(location.search).get('deck') || '';
const SOURCE = `/_/source?deck=${encodeURIComponent(deckPath)}`;
const runtime = new URL('/_/dist/', location.origin).href;
const folder = deckPath.split('/').slice(0, -1).map(encodeURIComponent).join('/');
const base = new URL(folder ? `/${folder}/` : '/', location.origin).href;

let preview = null;
let timer = null;
let groups = [];
let current = null;
let stripItems = [];
let wheeling = false;
let etag = null;
let saving = false;
let unsaved = false;
const problems = {deck: '', save: ''};

function showProblem(kind, message) {
  problems[kind] = message;
  note.textContent = problems.save || problems.deck;
}

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

// Typing during a glide stops it, so input resumes it until it lands.
let gliding = null;

function glide(group) {
  gliding = group.key;
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

function markStripSlide(h, v) {
  let selected = null;
  stripItems.forEach(item => {
    const active = item.h === h && item.v === (v || 0);
    item.button.classList.toggle('current', active);
    if (active) {
      item.button.setAttribute('aria-current', 'true');
      selected = item.button;
    } else {
      item.button.removeAttribute('aria-current');
    }
  });
  if (!selected) return;
  const itemRect = selected.getBoundingClientRect();
  const stripRect = strip.getBoundingClientRect();
  if (itemRect.left < stripRect.left) {
    strip.scrollLeft += itemRect.left - stripRect.left;
  } else if (itemRect.right > stripRect.right) {
    strip.scrollLeft += itemRect.right - stripRect.right;
  }
}

function fillThumbnail(frame, slide) {
  const sourceDoc = stage.querySelector('iframe:not(.loading)').contentDocument;
  const doc = frame.contentDocument;
  doc.open();
  doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();

  const baseTag = doc.createElement('base');
  baseTag.href = sourceDoc.querySelector('base')?.href || base;
  doc.head.append(baseTag);
  sourceDoc.head.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
    doc.head.append(node.cloneNode(true));
  });
  const styles = doc.createElement('style');
  styles.textContent = `
    html, body { width: 1920px !important; height: 1080px !important; margin: 0 !important; overflow: hidden !important; }
    body { background: var(--deck-background) !important; }
    .reveal { position: relative !important; inset: auto !important; width: 1920px !important; height: 1080px !important; margin: 0 !important; overflow: hidden !important; }
    .reveal .slides { position: relative !important; inset: auto !important; width: 1920px !important; height: 1080px !important; transform: none !important; overflow: hidden !important; }
    .reveal .slides section { display: block !important; position: absolute !important; inset: 0 !important; width: 1920px !important; height: 1080px !important; opacity: 1 !important; visibility: visible !important; transform: none !important; }
  `;
  doc.head.append(styles);

  const root = doc.createElement('div');
  root.className = 'reveal deck-ready';
  const slides = doc.createElement('div');
  slides.className = 'slides';
  root.append(slides);
  doc.body.append(root);

  const clone = slide.cloneNode(true);
  clone.classList.remove('past', 'present', 'future', 'stack');
  clone.style.cssText = '';
  clone.removeAttribute('data-index-h');
  clone.removeAttribute('data-index-v');
  clone.removeAttribute('data-index');
  const canvases = slide.querySelectorAll('canvas');
  clone.querySelectorAll('canvas').forEach((canvas, index) => {
    const image = doc.createElement('img');
    try {
      image.src = canvases[index].toDataURL();
    } catch (error) {
      console.error('Could not copy a chart into its slide thumbnail.', error);
      return;
    }
    image.width = canvases[index].width;
    image.height = canvases[index].height;
    image.style.cssText = canvases[index].style.cssText;
    canvas.replaceWith(image);
  });
  slides.append(clone);
}

function drawStrip(reveal) {
  stripItems = reveal.getSlides().map((slide, index) => {
    const {h, v = 0} = reveal.getIndices(slide);
    const button = document.createElement('button');
    button.className = 'slide-thumb';
    button.type = 'button';
    button.setAttribute('aria-label', `Go to slide ${index + 1}`);

    const viewport = document.createElement('span');
    viewport.className = 'thumb-viewport';
    const frame = document.createElement('iframe');
    frame.title = '';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    viewport.append(frame);
    const label = document.createElement('span');
    label.className = 'thumb-label';
    label.textContent = `Slide ${index + 1}`;
    button.append(viewport, label);
    button.addEventListener('click', () => {
      reveal.slide(h, v);
      followPreview(reveal);
    });
    strip.append(button);
    fillThumbnail(frame, slide);
    return {h, v, button};
  });
  const indices = reveal.getIndices();
  markStripSlide(indices.h, indices.v);
}

function setCurrent(group, move) {
  if (!group) return;
  const changed = group.key !== current;
  current = group.key;
  groups.forEach(g => g.el.classList.toggle('current', g.kind === 'slide' && g.key === current));
  if (preview) {
    const now = preview.getIndices();
    if (now.h !== group.h || (now.v || 0) !== group.v) preview.slide(group.h, group.v);
    markStripSlide(group.h, group.v);
  }
  showHeader();
  if (changed && move) glide(group);
}

// Changing slide in the preview glides its text into the box and puts the cursor there.
function followPreview(reveal) {
  if (reveal !== preview) return;
  const {h, v = 0} = reveal.getIndices();
  const now = groups.find(g => g.kind === 'slide' && g.key === current);
  if (now && now.h === h && now.v === v) return showHeader();
  const group = groups.find(g => g.kind === 'slide' && g.key === `${h}.${v}`);
  if (!group) return showHeader();
  text.setSelectionRange(group.start, group.start);
  setCurrent(group, true);
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
    showProblem('deck', '');
  } catch (error) {
    showProblem('deck', error.message);
    return;
  }
  // The text box is the source, so the deck's own panel stays off.
  deck.source = false;
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

  const reveal = await ready(frame.contentWindow);
  if (!frame.isConnected) return;
  // A newer render may have finished first; keep only the latest.
  stage.querySelectorAll('iframe').forEach(old => {
    if (old !== frame && !old.classList.contains('loading')) old.remove();
  });
  frame.classList.remove('loading');
  preview = reveal;
  if (reveal) {
    strip.replaceChildren();
    drawStrip(reveal);
    reveal.on('slidechanged', () => followPreview(reveal));
    setCurrent(groups.find(g => g.kind === 'slide' && g.key === current) || caretGroup(), false);
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
  text.value = await response.text();
  text.setSelectionRange(0, 0);
  text.focus();
  drawBackdrop();
  setCurrent(caretGroup(), false);
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
      response = await fetch(SOURCE, {method: 'PUT', headers: {'If-Match': etag}, body: text.value, keepalive: true});
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

text.addEventListener('input', () => {
  drawBackdrop();
  setCurrent(caretGroup(), true);
  const target = gliding && groups.find(g => g.kind === 'slide' && g.key === gliding);
  if (target) requestAnimationFrame(() => glide(target));
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    unsaved = true;
    save();
    render();
  }, 300);
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
  const target = gliding && groups.find(g => g.kind === 'slide' && g.key === gliding);
  if (target && Math.abs(text.scrollTop - (target.el.offsetTop - topGap())) < 2) gliding = null;
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
