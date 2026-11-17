// Text box beside a live preview. The preview is drawn here in the browser.
import {renderDeck} from '../../lib/page.js';

const text = document.querySelector('.text');
const stage = document.querySelector('.stage');
const note = document.querySelector('.note');
const count = document.querySelector('.count');

const file = new URLSearchParams(location.search).get('deck');
const deckUrl = file && new URL(file, location.origin);
const runtime = new URL('/dist/', location.origin).href;

let preview = null;
let timer = null;

// Which slide the cursor is in. Front matter counts as the first slide.
function cursorSlide() {
  try {
    const before = deckConfig(text.value.slice(0, text.selectionStart)).markdown;
    const slides = deckSlides(before);
    return [slides.length - 1, slides[slides.length - 1].length - 1];
  } catch {
    return [0, 0];
  }
}

function showCount(reveal) {
  count.textContent = `slide ${reveal.getSlidePastCount() + 1} of ${reveal.getTotalSlides()}`;
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
  if (reveal) {
    reveal.slide(...cursorSlide());
    reveal.on('slidechanged', () => showCount(reveal));
    showCount(reveal);
  }
  // A newer render may have finished first; keep only the latest.
  stage.querySelectorAll('iframe').forEach(old => {
    if (old !== frame && !old.classList.contains('loading')) old.remove();
  });
  frame.classList.remove('loading');
  preview = reveal;
}

function follow() {
  if (!preview) return;
  const [h, v] = cursorSlide();
  const now = preview.getIndices();
  if (now.h !== h || (now.v || 0) !== v) preview.slide(h, v);
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
  render();
}

text.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(render, 300);
});
document.addEventListener('selectionchange', () => {
  if (document.activeElement === text) follow();
});

open();
