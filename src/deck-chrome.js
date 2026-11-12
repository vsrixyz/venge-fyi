/* Builds each slide's structure for its type.
   Call deckChrome(Reveal) after Reveal.initialize() resolves. */

(function (global) {
  'use strict';

  // A slide with no type is grid: it finds its own cells.
  const LAYOUTS = ['grid', 'prose', 'split', 'cards', 'columns'];

  const MEDIA =
    'img, picture, video, svg, iframe, canvas, [data-chart], ' +
    '.deck-chart, .deck-missing';

  function layoutOf(section) {
    return LAYOUTS.find(name => section.classList.contains(name)) || 'grid';
  }

  // Puts the type name on the section, so CSS only needs these names.
  function normalizeLayout(section) {
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

  // The eyebrow sits top centre, outside the layout. The first element marked
  // class="eyebrow" sets it; otherwise it is the deck's, except on the first
  // slide and on slides marked hide-eyebrow.
  function placeEyebrow(section, stage, deckEyebrow, isFirst) {
    const own = stage.querySelector(':scope > .eyebrow');
    if (own) own.remove();

    const hidden = isFirst || section.classList.contains('hide-eyebrow');
    const text = own ? own.textContent.trim() : hidden ? '' : deckEyebrow;
    if (!text) return;

    const eyebrow = own || el('p', null, text);
    eyebrow.classList.add('deck-eyebrow');
    section.appendChild(eyebrow);
  }

  // --- grid: the slide finds its own cells. Text that runs together is one
  // cell; the pictures beside it are another. ---

  // Columns per number of cells or pictures: on the whole slide, and in a half.
  const WHOLE = {1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3};
  const HALF = {1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3};
  const columnsFor = (table, count) => table[count] || (table === WHOLE ? 4 : 3);

  // <!-- .cell: class="stack" --> → {class: 'stack'}
  function cellOptions(comment) {
    const match = comment.textContent.match(/^\s*\.cell:([\s\S]*)$/);
    if (!match) return null;
    const options = {};
    match[1].replace(/([\w-]+)="([^"]*)"/g, (_, key, value) => { options[key] = value; });
    return options;
  }

  function applyOptions(cell, options) {
    Object.entries(options).forEach(([key, value]) => {
      if (key === 'class') cell.classList.add(...value.split(/\s+/).filter(Boolean));
      else cell.setAttribute(key, value);
    });
  }

  // Equal cells, two half-tracks each, so a short last row can be centred.
  function place(container, items, cols) {
    container.style.setProperty('--_cols', cols);
    container.style.setProperty('--_rows', Math.ceil(items.length / cols));
    const rest = items.length % cols;
    if (cols > 1 && rest) {
      items[items.length - rest].style.gridColumnStart = String(cols - rest + 1);
    }
  }

  // A chart written as JSON gets the same box as a CSV chart.
  function boxChart(node) {
    if (!node.matches('[data-chart]') || node.closest('.deck-chart')) return node;
    const box = el('div', 'deck-chart');
    node.replaceWith(box);
    box.appendChild(node);
    return box;
  }

  const isCaptioned = node => node.tagName === 'P' && node.textContent.trim() !== '' &&
    Array.from(node.children).some(kid => kid.matches(MEDIA));

  // Text and pictures that take turns more than once read top to bottom: prose.
  function takesTurns(stage) {
    const kinds = Array.from(stage.children)
      .map(node => (node.matches(MEDIA) || isCaptioned(node) ? 'pictures' : 'text'))
      .filter((kind, i, all) => kind !== all[i - 1]);
    return kinds.length > 2;
  }

  // Sibling sections: the first heading size that appears two or more times,
  // with only single headings above it, starts one cell each. Returns its tag.
  const HEADINGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

  function sectionLevel(stage) {
    const counts = {};
    Array.from(stage.children).forEach(node => {
      if (HEADINGS.includes(node.tagName)) counts[node.tagName] = (counts[node.tagName] || 0) + 1;
    });
    for (const tag of HEADINGS) {
      if ((counts[tag] || 0) >= 2) return tag;
    }
    return null;
  }

  // Moves a fragment from a cell's heading to the cell, so the whole cell comes in.
  function liftFragment(heading, cell) {
    if (!heading.classList.contains('fragment')) return;
    ['fragment', ...FRAGMENT_STYLES].forEach(name => {
      if (heading.classList.contains(name)) {
        heading.classList.remove(name);
        cell.classList.add(name);
      }
    });
    const index = heading.getAttribute('data-fragment-index');
    if (index !== null) {
      heading.removeAttribute('data-fragment-index');
      cell.setAttribute('data-fragment-index', index);
    }
  }

  function buildSections(section, stage, level) {
    const head = el('div', 'deck-head');
    const cells = [];
    let cell = null;
    let options = null;

    Array.from(stage.childNodes).forEach(node => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const found = cellOptions(node);
        if (found) {
          options = found;
          node.remove();
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        if (!node.textContent.trim()) node.remove();
        return;
      }
      if (node.tagName === level) {
        cell = el('div', 'deck-cell deck-section');
        if (section.classList.contains('cards')) cell.classList.add('deck-card');
        if (options) {
          applyOptions(cell, options);
          options = null;
        }
        liftFragment(node, cell);
        cells.push(cell);
      }
      (cell || head).appendChild(node.matches(MEDIA) ? boxChart(node) : node);
    });

    stage.dataset.shape = 'sections';
    if (cells.some(c => c.querySelector(MEDIA))) stage.dataset.pictures = '';
    place(stage, cells, columnsFor(WHOLE, cells.length));
    if (head.children.length) stage.appendChild(head);
    stage.append(...cells);
  }

  function buildGrid(section, stage) {
    if (stage.querySelector(':scope > .deck-cell')) return;
    const level = sectionLevel(stage);
    if (level) {
      buildSections(section, stage, level);
      return;
    }
    if (takesTurns(stage)) {
      section.classList.replace('grid', 'prose');
      return;
    }

    const cells = [];
    let cell = null;
    let options = null;

    const add = (node, kind) => {
      if (!cell || cell.kind !== kind) {
        cell = {kind, el: el('div', `deck-cell deck-${kind}`), count: 0};
        cells.push(cell);
      }
      if (options) {
        applyOptions(cell.el, options);
        options = null;
      }
      cell.el.appendChild(node);
      if (kind === 'pictures') cell.count += 1;
    };

    Array.from(stage.childNodes).forEach(node => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const found = cellOptions(node);
        if (found) {
          options = found;
          node.remove();
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        if (!node.textContent.trim()) node.remove();
        return;
      }

      // Text in the same paragraph as pictures is their caption.
      if (isCaptioned(node)) {
        const item = el('div', 'deck-captioned');
        Array.from(node.children)
          .filter(kid => kid.matches(MEDIA))
          .forEach(pic => item.appendChild(boxChart(pic)));
        node.classList.add('deck-caption');
        item.appendChild(node);
        add(item, 'pictures');
        return;
      }

      if (node.matches(MEDIA)) add(boxChart(node), 'pictures');
      else add(node, 'text');
    });

    // A caption under all of a cell's pictures captions the group; with
    // several, each stays under its own pictures.
    cells.filter(c => c.kind === 'pictures').forEach(c => {
      const only = c.el.children.length === 1 && c.el.firstElementChild.matches('.deck-captioned');
      if (only) {
        const item = c.el.firstElementChild;
        item.replaceWith(...item.childNodes);
      }
      c.count = c.el.querySelectorAll(':scope > :not(.deck-caption)').length;
    });

    // headline: text only. image: pictures only. figure: text beside pictures.
    const shape = cells.length === 2 ? 'figure' : cells[0] && cells[0].kind === 'text' ? 'headline' : 'image';
    stage.dataset.shape = shape;
    place(stage, cells.map(c => c.el), cells.length);

    cells.forEach(c => {
      if (c.kind === 'text') {
        if (!c.el.querySelector(':scope > :not(h1, h2, h3, h4)')) c.el.dataset.headings = '';
        return;
      }
      const pictures = Array.from(c.el.children).filter(kid => !kid.matches('.deck-caption'));
      const cols = c.el.classList.contains('stack') ? 1
        : columnsFor(shape === 'image' ? WHOLE : HALF, c.count);
      place(c.el, pictures, cols);
      c.el.dataset.count = String(c.count);
    });

    stage.append(...cells.map(c => c.el));
  }

  // data-background-color takes theme colour names. Reveal ignores them,
  // so they become the theme's colours before Reveal draws the backgrounds.
  const COLOUR_NAMES = {
    'theme-1': '--_theme-1', 'theme-2': '--_theme-2', 'theme-3': '--_theme-3',
    'theme-4': '--_theme-4', 'theme-5': '--_theme-5',
    background: '--_bg', card: '--_card', ink: '--_ink', line: '--deck-line'
  };

  function backgroundNames(section) {
    const name = section.getAttribute('data-background-color');
    if (COLOUR_NAMES[name]) {
      section.setAttribute('data-background-color', `var(${COLOUR_NAMES[name]})`);
    }
  }

  // Columns: the smallest heading on the slide (### if there is one, else ##)
  // starts each part. Anything before the first stays on top.
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

  // split: the first part on one side, the rest on the other. With sibling
  // sections, the rest starts at the second section's heading. Without, the
  // first part is the opening: headings and the paragraphs right under them.
  function splitAt(stage, kids, level) {
    if (level) return kids.indexOf(kids.filter(kid => kid.tagName === level)[1]);

    let seenText = false;
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (HEADINGS.includes(kid.tagName)) {
        if (seenText) return i;
        continue;
      }
      if (kid.tagName === 'P' && !kid.querySelector(MEDIA)) {
        seenText = true;
        continue;
      }
      return i;
    }
    return kids.length;
  }

  function buildSplit(stage) {
    if (stage.querySelector(':scope > .deck-half')) return;

    const kids = Array.from(stage.children);
    const level = sectionLevel(stage);
    const cut = splitAt(stage, kids, level);
    const first = el('div', 'deck-half');
    const rest = el('div', 'deck-half');

    // Sections are siblings: a title goes in a row above them, and the two
    // parts share a row so their headings line up.
    if (level) {
      stage.dataset.sections = '';
      const start = kids.findIndex(kid => kid.tagName === level);
      if (start > 0) {
        const head = el('div', 'deck-head');
        head.append(...kids.slice(0, start));
        stage.appendChild(head);
      }
      first.append(...kids.slice(Math.max(start, 0), cut));
    } else {
      first.append(...kids.slice(0, cut));
    }
    rest.append(...kids.slice(cut));
    stage.appendChild(first);
    if (rest.children.length) stage.appendChild(rest);
  }

  function buildColumns(stage) {
    if (stage.querySelector(':scope > .deck-columns')) return;

    const columns = sections(stage, 'deck-column');
    const row = el('div', 'deck-columns');
    row.dataset.count = String(columns.length);
    row.append(...columns);
    stage.appendChild(row);
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

  function buildSlide(section, isFirst, deckEyebrow) {
    const layout = normalizeLayout(section);
    const isBuilt = !!section.querySelector(':scope > .deck-stage');
    const stage = wrapStage(section);
    unwrapMedia(stage);
    csvCharts(stage);
    normalizeFragments(stage);

    if (!isBuilt) placeEyebrow(section, stage, deckEyebrow, isFirst);

    switch (layout) {
      case 'grid':
        buildGrid(section, stage);
        break;
      case 'split':
        buildSplit(stage);
        break;
      case 'cards':
        buildGrid(section, stage);
        break;
      case 'columns':
        buildColumns(stage);
        break;
    }

  }

  // Sections: lower the text size in steps until the slide fits, down to
  // about 22px body text. Past that, text runs off. Hidden slides can't be
  // measured, so each is fitted the first time it shows.
  const FIT_FLOOR = 0.65;

  function fitSlide(section) {
    const stage = section && section.querySelector(':scope > .deck-stage[data-shape="sections"]');
    if (!stage || stage.dataset.fit || !stage.clientHeight) return;
    let fit = 1;
    while (stage.scrollHeight > stage.clientHeight + 1 && fit > FIT_FLOOR) {
      fit = Math.max(FIT_FLOOR, fit - 0.05);
      stage.style.setProperty('--_fit', fit.toFixed(2));
    }
    stage.dataset.fit = fit.toFixed(2);
  }

  function watchFit(reveal, root) {
    const fitAll = () => leafSlides(root).forEach(fitSlide);
    reveal.on('slidechanged', event => fitSlide(event.currentSlide));
    fitAll();
    if (document.fonts) document.fonts.ready.then(() => {
      leafSlides(root).forEach(section => {
        const stage = section.querySelector(':scope > .deck-stage[data-fit]');
        if (stage) {
          delete stage.dataset.fit;
          stage.style.removeProperty('--_fit');
        }
      });
      fitAll();
    });
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

  // Reveal's slide number: hidden on the first slide, light or dark like the slide.
  function watchSlideNumber(reveal, root) {
    const number = root.querySelector(':scope > .slide-number');
    if (!number) return;

    const update = () => {
      const section = reveal.getCurrentSlide();
      number.classList.toggle('is-first', reveal.isFirstSlide());
      if (section) number.style.colorScheme = getComputedStyle(section).colorScheme;
    };

    reveal.on('slidechanged', update);
    update();
  }

  function deckChrome(reveal) {
    const root = document.querySelector('.reveal');
    if (!root) return;

    const deckEyebrow = root.getAttribute('data-eyebrow') || '';
    leafSlides(root).forEach((section, i) => buildSlide(section, i === 0, deckEyebrow));
    leafSlides(root).forEach(backgroundNames);

    watchImages(root);

    // Re-read fragments from the rebuilt DOM.
    reveal.sync();
    reveal.layout();

    // deck.njk hides slides until this class is set.
    root.classList.add('deck-ready');

    watchScroll(reveal);
    watchSlideNumber(reveal, root);
    watchFit(reveal, root);
  }

  global.deckChrome = deckChrome;
})(window);
