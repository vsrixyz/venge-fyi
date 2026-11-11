/* Builds each slide's structure for its type, then flags rule breaks.
   Call deckChrome(Reveal) after Reveal.initialize() resolves. */

(function (global) {
  'use strict';

  // A slide with no type is big.
  const LAYOUTS = [
    'big', 'prose', 'figure', 'image',
    'split', 'cards', 'columns', 'chart'
  ];

  // Old names.
  const ALIASES = {cover: 'big', title: 'big', headline: 'big'};

  const MEDIA =
    'img, picture, video, svg, iframe, canvas, [data-chart], ' +
    '.deck-chart, .deck-missing';

  function layoutOf(section) {
    return LAYOUTS.find(name => section.classList.contains(name)) || 'big';
  }

  // Puts the type name on the section, so CSS only needs the nine names.
  function normalizeLayout(section) {
    Object.entries(ALIASES).forEach(([old, name]) => {
      if (section.classList.contains(old)) section.classList.add(name);
    });
    const layout = layoutOf(section);
    section.classList.add(layout);
    return layout;
  }

  function leafSlides(root) {
    return Array.from(root.querySelectorAll('.slides section')).filter(
      section => !section.querySelector(':scope > section')
    );
  }

  function wrapStage(section) {
    let stage = section.querySelector(':scope > .deck-stage');
    if (stage) return stage;

    stage = document.createElement('div');
    stage.className = 'deck-stage';

    // Reveal needs notes as a direct child of the section.
    Array.from(section.childNodes).forEach(node => {
      if (node.nodeType === 1 && node.matches('aside.notes')) return;
      stage.appendChild(node);
    });

    section.appendChild(stage);
    return stage;
  }

  // Markdown wraps images in <p>. Lift media-only paragraphs out.
  function unwrapMedia(stage) {
    stage.querySelectorAll(':scope > p').forEach(p => {
      if (!p.querySelector(MEDIA)) return;

      // Own text only: an inline SVG's <text> doesn't count.
      const ownText = Array.from(p.childNodes)
        .filter(node => node.nodeType === 3)
        .map(node => node.textContent)
        .join('')
        .trim();
      if (ownText !== '') return;

      const kids = Array.from(p.children).filter(kid => kid.tagName !== 'BR');
      if (!kids.length) return;
      kids.forEach(kid => stage.insertBefore(kid, p));
      p.remove();
    });
  }

  function isMedia(el) {
    return el.matches(MEDIA) || el.tagName === 'FIGURE';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ![alt](data.csv "bar") becomes a chart canvas. deck-charts.js draws it.
  const CSV = /\.csv(?:[?#].*)?$/i;

  function csvCharts(stage) {
    stage.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (!CSV.test(src)) return;

      const box = el('div', 'deck-chart');
      const canvas = el('canvas');
      canvas.dataset.chart = 'chartjs';
      canvas.dataset.csv = src; // as written; deck-charts.js resolves it
      canvas.dataset.kind = img.getAttribute('title') || 'bar';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', img.getAttribute('alt') || 'Chart');
      box.appendChild(canvas);

      img.removeAttribute('src');
      img.replaceWith(box);
    });
  }

  // A failed image becomes a labelled box.
  function markMissing(img) {
    if (!img.isConnected) return;
    const box = el('div', 'deck-missing');
    const file = (img.getAttribute('src') || '').split('/').pop();
    box.appendChild(el('span', 'deck-missing__title', 'Missing image'));
    if (file) box.appendChild(el('span', 'deck-missing__file', file));
    const alt = img.getAttribute('alt');
    if (alt) box.appendChild(el('span', 'deck-missing__alt', alt));
    img.replaceWith(box);
  }

  function watchImages(root) {
    root.querySelectorAll('.slides img').forEach(img => {
      const src = img.getAttribute('src');
      if (!src) return;
      if (img.complete && img.naturalWidth === 0 && !/\.svg/i.test(src)) {
        markMissing(img);
        return;
      }
      img.addEventListener('error', () => markMissing(img), {once: true});
    });
  }

  // The eyebrow is a #### line. On big and image it can be anywhere;
  // elsewhere it must come first.
  function resolveEyebrow(stage, layout) {
    const anywhere = ['big', 'image'].includes(layout);
    const h4 = anywhere
      ? stage.querySelector(':scope > h4')
      : stage.firstElementChild && stage.firstElementChild.tagName === 'H4'
        ? stage.firstElementChild
        : null;

    if (!h4) return null;
    h4.classList.add('deck-eyebrow');
    return h4;
  }

  // Text goes in one column so it can't size the media's grid row.
  function buildFigure(stage, eyebrow) {
    if (stage.querySelector(':scope > .deck-col')) return;

    const col = el('div', 'deck-col');
    const media = [];

    Array.from(stage.children).forEach(child => {
      if (isMedia(child)) {
        media.push(child);
        return;
      }
      col.appendChild(child);
    });

    if (eyebrow) col.prepend(eyebrow);
    if (col.children.length) stage.prepend(col);
  }

  function buildImage(section, stage, eyebrow) {
    if (stage.querySelector(':scope > .deck-tiles')) return;

    const overlay = section.classList.contains('overlay');
    const tiles = el('div', 'deck-tiles');
    const extra = [];
    let heading = null;

    Array.from(stage.children).forEach(child => {
      if (child === eyebrow) return;
      if (isMedia(child)) {
        tiles.appendChild(child);
      } else if (overlay && !heading && child.tagName === 'H1') {
        heading = child;
      } else if (child.textContent.trim() !== '') {
        extra.push(child);
      } else {
        child.remove();
      }
    });

    const count = tiles.children.length;
    tiles.dataset.count = String(Math.min(count, 4));
    section.dataset.count = String(count);

    if (eyebrow) {
      const band = el('div', 'deck-band');
      band.appendChild(eyebrow);
      stage.appendChild(band);
      section.classList.add('has-label');
    }
    stage.appendChild(tiles);

    if (overlay) {
      stage.appendChild(el('div', 'deck-wash'));
      if (heading) stage.appendChild(heading);
    }

    // Other text shows at the foot.
    extra.forEach(child => stage.appendChild(child));
  }

  // Split, cards and columns: the smallest heading on the slide (### if there
  // is one, else ##) starts each part. Anything before the first stays on top.
  function sections(stage, partClass) {
    const level = stage.querySelector(':scope > h3') ? 'H3' : 'H2';
    const parts = [];
    let current = null;
    Array.from(stage.children).forEach(child => {
      if (child.tagName === level) parts.push((current = el('div', partClass)));
      if (current) current.appendChild(child);
    });
    return parts;
  }

  function buildSplit(stage, eyebrow) {
    if (stage.querySelector(':scope > .deck-half')) return;

    const halves = sections(stage, 'deck-half');
    if (stage.children.length) {
      const head = el('div', 'deck-head');
      head.append(...stage.children);
      stage.appendChild(head);
    }
    stage.append(...halves);
  }

  function buildCards(stage, eyebrow) {
    if (stage.querySelector(':scope > .deck-cards')) return;

    const cards = sections(stage, 'deck-card');
    const grid = el('div', 'deck-cards');
    grid.dataset.count = String(cards.length);
    grid.append(...cards);
    stage.appendChild(grid);
  }

  function buildColumns(stage, eyebrow) {
    if (stage.querySelector(':scope > .deck-columns')) return;

    const columns = sections(stage, 'deck-column');
    const row = el('div', 'deck-columns');
    row.dataset.count = String(columns.length);
    row.append(...columns);
    stage.appendChild(row);
  }

  function buildChart(stage, eyebrow) {
    const media = Array.from(stage.children).filter(isMedia);

    media.forEach(item => {
      if (item.classList.contains('deck-chart')) return;
      const box = el('div', 'deck-chart');
      item.replaceWith(box);
      box.appendChild(item);
    });

    if (eyebrow) stage.prepend(eyebrow);

    const box = stage.querySelector(':scope > .deck-chart');
    if (box) {
      // Text after the chart is the source line.
      let next = box.nextElementSibling;
      while (next) {
        if (next.tagName === 'P') next.classList.add('deck-source-line');
        next = next.nextElementSibling;
      }
    }
  }

  const INLINE = 'strong, em, code, span, a, b, i, mark, small, sub, sup';
  const FRAGMENT_STYLES = [
    'fade-out', 'fade-up', 'fade-down', 'fade-left', 'fade-right',
    'fade-in-then-out', 'fade-in-then-semi-out', 'semi-fade-out',
    'grow', 'shrink', 'strike', 'current-visible',
    'highlight-red', 'highlight-green', 'highlight-blue',
    'highlight-current-red', 'highlight-current-green', 'highlight-current-blue'
  ];

  // Reveal puts a list item's fragment class on its first inline element
  // (e.g. <strong>). Move it to the block so the whole item animates.
  function normalizeFragments(stage) {
    stage.querySelectorAll('.fragment').forEach(node => {
      if (!node.matches(INLINE)) return;

      const block = node.closest('li, p, h1, h2, h3, h4, blockquote, figure, td');
      if (!block || block === node || !stage.contains(block)) return;
      if (block.classList.contains('fragment')) {
        node.classList.remove('fragment');
        return;
      }

      node.classList.remove('fragment');
      block.classList.add('fragment');

      const index = node.getAttribute('data-fragment-index');
      if (index !== null) {
        node.removeAttribute('data-fragment-index');
        block.setAttribute('data-fragment-index', index);
      }

      FRAGMENT_STYLES.forEach(name => {
        if (node.classList.contains(name)) {
          node.classList.remove(name);
          block.classList.add(name);
        }
      });
    });
  }

  function buildSlide(section) {
    const layout = normalizeLayout(section);
    const stage = wrapStage(section);
    unwrapMedia(stage);
    csvCharts(stage);
    normalizeFragments(stage);

    const eyebrow = resolveEyebrow(stage, layout);

    switch (layout) {
      case 'figure':
        buildFigure(stage, eyebrow);
        break;
      case 'image':
        buildImage(section, stage, eyebrow);
        break;
      case 'split':
        buildSplit(stage, eyebrow);
        break;
      case 'cards':
        buildCards(stage, eyebrow);
        break;
      case 'columns':
        buildColumns(stage, eyebrow);
        break;
      case 'chart':
        buildChart(stage, eyebrow);
        break;
    }

  }

  // Prose scrolls; a fade shows there is more.
  function watchScroll(reveal) {
    const update = () => {
      const section = reveal.getCurrentSlide();
      if (!section || layoutOf(section) !== 'prose') return;
      const stage = section.querySelector(':scope > .deck-stage');
      if (stage) {
        section.classList.toggle('is-scrollable', stage.scrollHeight > stage.clientHeight + 4);
      }
    };

    reveal.on('slidechanged', update);
    reveal.on('resize', update);
    update();
  }

  function deckChrome(reveal) {
    const root = document.querySelector('.reveal');
    if (!root) return;

    leafSlides(root).forEach(buildSlide);

    watchImages(root);

    // Re-read fragments from the rebuilt DOM.
    reveal.sync();
    reveal.layout();

    // deck.njk hides slides until this class is set.
    root.classList.add('deck-ready');

    watchScroll(reveal);
  }

  global.deckChrome = deckChrome;
})(window);
