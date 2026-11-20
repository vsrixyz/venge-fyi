/* Builds each slide's structure for its type.
   Call deckChrome(Reveal) after Reveal.initialize() resolves. */

(function (global) {
  'use strict';

  // A slide with no type is grid: it finds its own cells.
  const LAYOUTS = ['grid', 'prose', 'split'];
  const MODIFIERS = ['dark', 'light', 'tint', 'cards', 'colors'];

  const MEDIA =
    'img, picture, video, svg, iframe, canvas, [data-chart], ' +
    '.deck-chart, .deck-missing';

  function layoutOf(section) {
    return LAYOUTS.find(name => section.classList.contains(name)) || 'grid';
  }

  // The editor's label for a slide: its layout (a grid slide's shape) and modifiers.
  function slideType(section) {
    let type = layoutOf(section);
    const stage = section.querySelector(':scope > .deck-stage');
    if (type === 'grid' && stage && stage.dataset.shape) type = stage.dataset.shape;
    return [type, ...MODIFIERS.filter(name => section.classList.contains(name))].join(' · ');
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

  const WARNING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' +
    '<path d="M12 9v4M12 17h.01"/></svg>';

  // A failed image becomes a labelled box.
  function markMissing(img) {
    if (!img.isConnected) return;
    const box = el('div', 'deck-missing');
    const file = (img.getAttribute('src') || '').split('/').pop();
    const icon = el('span', 'deck-missing__icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = WARNING;
    box.appendChild(icon);
    box.appendChild(el('span', 'deck-missing__title', 'File not found'));
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

  // The eyebrow sits top centre, outside the layout: the first element marked
  // class="eyebrow".
  function placeEyebrow(section, stage) {
    const eyebrow = stage.querySelector(':scope > .eyebrow');
    if (!eyebrow) return;
    eyebrow.classList.add('deck-eyebrow');
    section.appendChild(eyebrow);
  }

  // --- grid: the slide finds its own cells. Text that runs together is one
  // cell; the pictures beside it are another. ---

  // Columns per number of cells or pictures: on the whole slide, and in a half.
  const WHOLE = {1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 10: 5};
  const HALF = {1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3};
  const columnsFor = (table, count) => table[count] || (table === WHOLE ? 4 : 3);

  // <!-- .cluster: class="stack" --> → {class: 'stack'}
  function clusterOptions(comment) {
    const match = comment.textContent.match(/^\s*\.cluster:([\s\S]*)$/);
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
    items.forEach(item => item.style.removeProperty('grid-column-start'));
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

  const MAX_SECTIONS = 10;
  const TITLE_LENGTH = 30;

  // Pictures written together are one group, wherever they are: a slide, a
  // split half or a section. Text in the same paragraph is their caption.
  function addPicture(group, node) {
    if (!isCaptioned(node)) {
      group.appendChild(boxChart(node));
      return;
    }
    const item = el('div', 'deck-captioned');
    Array.from(node.children)
      .filter(kid => kid.matches(MEDIA))
      .forEach(pic => item.appendChild(boxChart(pic)));
    node.classList.add('deck-caption');
    item.appendChild(node);
    group.appendChild(item);
  }

  // A caption under all of a group's pictures captions the group; with
  // several, each stays under its own picture. Then the count shape.
  function settlePictures(group, table) {
    const only = group.children.length === 1 && group.firstElementChild.matches('.deck-captioned');
    if (only) {
      const item = group.firstElementChild;
      item.replaceWith(...item.childNodes);
    }
    const pictures = Array.from(group.children).filter(kid => !kid.matches('.deck-caption'));
    const cols = group.classList.contains('stack') ? 1 : columnsFor(table, pictures.length);
    place(group, pictures, cols);
    group.dataset.count = String(pictures.length);
  }

  const isPicture = node => node.matches(MEDIA) || isCaptioned(node);

  function buildSections(section, stage, level) {
    const head = el('div', 'deck-head');
    const cells = [];
    let cell = null;
    let group = null;
    let options = null;

    Array.from(stage.childNodes).forEach(node => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const found = clusterOptions(node);
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
      // A .cluster comment above a section's heading is for the section; above
      // pictures, for that group of pictures.
      if (node.tagName === level) {
        cell = el('div', 'deck-cell deck-section');
        if (options) {
          applyOptions(cell, options);
          options = null;
        }
        cells.push(cell);
        group = null;
      } else if (cell && isPicture(node)) {
        if (!group) {
          group = el('div', 'deck-pictures');
          if (options) {
            applyOptions(group, options);
            options = null;
          }
          cell.appendChild(group);
        }
        addPicture(group, node);
        return;
      }
      group = null;
      (cell || head).appendChild(node.matches(MEDIA) ? boxChart(node) : node);
    });

    cells.forEach(c => c.querySelectorAll(':scope > .deck-pictures').forEach(g => settlePictures(g, HALF)));
    settleSections(section, stage, head, cells);
  }

  // cards with no sections: a list that ends the slide makes one section per item.
  function buildListSections(section, stage) {
    const kids = Array.from(stage.children);
    const list = kids[kids.length - 1];
    if (!list || !list.matches('ul, ol') || kids.some(kid => kid !== list && kid.matches('ul, ol'))) return false;

    const head = el('div', 'deck-head');
    kids.slice(0, -1).forEach(kid => head.appendChild(kid));
    const cells = Array.from(list.children).map(item => {
      const cell = el('div', item.className);
      cell.classList.add('deck-cell', 'deck-section');
      Array.from(item.attributes).forEach(a => { if (a.name !== 'class') cell.setAttribute(a.name, a.value); });
      // The item's own text becomes a paragraph; nested lists stay as they are.
      let para = null;
      Array.from(item.childNodes).forEach(node => {
        if (node.nodeType === Node.COMMENT_NODE) return;
        if (node.nodeType === Node.ELEMENT_NODE && !node.matches(INLINE)) {
          para = null;
          cell.appendChild(node);
          return;
        }
        if (!para && !node.textContent.trim()) return;
        if (!para) para = cell.appendChild(el('p'));
        para.appendChild(node);
      });
      return cell;
    });
    list.remove();
    settleSections(section, stage, head, cells);
    return true;
  }

  function settleSections(section, stage, head, cells) {
    // cards: every cluster is a card. colors: each the next theme colour, unless it has its own.
    cells.forEach((c, i) => {
      if (section.classList.contains('cards')) c.classList.add('card');
      if (section.classList.contains('colors') && !c.hasAttribute('data-background-color')) {
        c.setAttribute('data-background-color', `theme-${i % 5 + 1}`);
      }
    });

    stage.dataset.shape = 'sections';
    // Past ten, sections stay in the markdown but don't show.
    cells.slice(MAX_SECTIONS).forEach(c => { c.hidden = true; });
    const shown = cells.slice(0, MAX_SECTIONS);
    const cols = columnsFor(WHOLE, shown.length);
    place(stage, shown, cols);
    // Three rows or five across: smaller text, like a dashboard.
    if (Math.ceil(shown.length / cols) >= 3 || cols >= 5) stage.dataset.dense = '';
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
    if (section.classList.contains('cards') && buildListSections(section, stage)) return;
    if (takesTurns(stage)) {
      section.classList.replace('grid', 'prose');
      return;
    }
    inferCells(stage, false);
  }

  // headline, figure or image, from what was written. In a split half,
  // pictures take the half's shapes.
  function inferCells(stage, inHalf) {
    const cells = [];
    let cell = null;
    let options = null;

    Array.from(stage.childNodes).forEach(node => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const found = clusterOptions(node);
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
      const kind = isPicture(node) ? 'pictures' : 'text';
      if (!cell || cell.kind !== kind) {
        cell = {kind, el: el('div', `deck-cell deck-${kind}`)};
        cells.push(cell);
      }
      if (options) {
        applyOptions(cell.el, options);
        options = null;
      }
      if (kind === 'pictures') addPicture(cell.el, node);
      else cell.el.appendChild(node);
    });

    // headline: text only. image: pictures only. figure: text beside pictures.
    const shape = cells.length === 2 ? 'figure' : cells[0] && cells[0].kind === 'text' ? 'headline' : 'image';
    stage.dataset.shape = shape;
    cells.filter(c => c.kind === 'text').forEach(c => {
      if (!c.el.querySelector(':scope > :not(h1, h2, h3, h4)')) c.el.dataset.headings = '';
      // A # longer than a short title is a sentence: headline size, not title size.
      const long = Array.from(c.el.querySelectorAll(':scope > h1')).some(h => h.textContent.trim().length > TITLE_LENGTH);
      if (long) c.el.dataset.long = '';
    });
    // A figure whose text is only headings: a title above the pictures.
    const titled = shape === 'figure' && cells.some(c => 'headings' in c.el.dataset);
    place(stage, cells.map(c => c.el), titled ? 1 : cells.length);

    const table = !inHalf && (shape === 'image' || titled) ? WHOLE : HALF;
    cells.filter(c => c.kind === 'pictures').forEach(c => settlePictures(c.el, table));

    stage.append(...cells.map(c => c.el));
  }

  // data-background-color takes theme colour names. Reveal ignores them,
  // so they become the theme's colours before Reveal draws the backgrounds.
  const COLOUR_NAMES = {
    'theme-1': '--_theme-1', 'theme-2': '--_theme-2', 'theme-3': '--_theme-3',
    'theme-4': '--_theme-4', 'theme-5': '--_theme-5',
    background: '--_bg', card: '--_card', ink: '--_ink', line: '--deck-line'
  };

  // A fill on a cluster or element: colour names become the theme's colours.
  function paintFills(stage) {
    stage.querySelectorAll('[data-background-color]').forEach(node => {
      const name = node.getAttribute('data-background-color');
      node.style.setProperty('--_fill', COLOUR_NAMES[name] ? `var(${COLOUR_NAMES[name]})` : name);
    });
  }

  const OWN_BACKGROUND =['color', 'image', 'video', 'gradient', 'iframe']
    .map(kind => `data-background-${kind}`);

  function backgroundNames(section) {
    const name = section.getAttribute('data-background-color');
    if (COLOUR_NAMES[name]) {
      section.setAttribute('data-background-color', `var(${COLOUR_NAMES[name]})`);
    }
    // A dark or light slide with no background of its own: Reveal draws it, full bleed.
    if (OWN_BACKGROUND.some(attr => section.hasAttribute(attr))) return;
    // split: the tinted right half too, to the window's edges.
    if (section.classList.contains('split') && section.querySelectorAll(':scope > .deck-stage > .deck-half').length > 1) {
      section.dataset.panel = '';
      const side = section.classList.contains('dark') ? 'dark-' : section.classList.contains('light') ? '' : null;
      const bg = side === null ? 'var(--_bg)' : `var(--deck-${side}background)`;
      const card = side === null ? 'var(--_card)' : `var(--deck-${side}card)`;
      section.setAttribute('data-background-gradient',
        `linear-gradient(to right, transparent 50%, ${card} 50%), linear-gradient(${bg}, ${bg})`);
      return;
    }
    if (section.classList.contains('dark')) {
      section.setAttribute('data-background-color', 'var(--deck-dark-background)');
    } else if (section.classList.contains('light')) {
      section.setAttribute('data-background-color', 'var(--deck-background)');
    }
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
    const start = level ? Math.max(kids.findIndex(kid => kid.tagName === level), 0) : 0;
    const head = el('div', 'deck-head');
    const first = el('div', 'deck-half');
    const rest = el('div', 'deck-half');

    // Each node goes where its element goes; a .cluster comment goes with the next one.
    let pending = [];
    Array.from(stage.childNodes).forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        pending.push(node);
        return;
      }
      const i = kids.indexOf(node);
      const into = i < start ? head : i < cut ? first : rest;
      into.append(...pending, node);
      pending = [];
    });

    // Sections are siblings: a title goes in a row above them, and the two
    // parts share a row so their headings line up.
    if (level) stage.dataset.sections = '';
    if (head.children.length) stage.appendChild(head);
    stage.appendChild(first);
    if (rest.children.length) stage.appendChild(rest);

    // A half of only text is a headline; only pictures, an image. Both: a column.
    // Sections in a split are parallel parts: columns, so their headings line up.
    if (level) return;
    [first, rest].forEach(half => {
      const kids = Array.from(half.children);
      if (kids.length && (kids.every(isPicture) || !kids.some(isPicture))) inferCells(half, true);
    });
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
    const isBuilt = !!section.querySelector(':scope > .deck-stage');
    const stage = wrapStage(section);
    unwrapMedia(stage);
    csvCharts(stage);
    normalizeFragments(stage);

    if (!isBuilt) placeEyebrow(section, stage);

    switch (layout) {
      case 'grid':
        buildGrid(section, stage);
        break;
      case 'split':
        buildSplit(stage);
        break;
    }
    paintFills(stage);

    if (!isBuilt) settleEyebrow(section, stage);
  }

  // Above left-aligned text, the eyebrow joins it, right above its first
  // heading. Not inside a card, column or section cell.
  function settleEyebrow(section, stage) {
    const eyebrow = section.querySelector(':scope > .deck-eyebrow');
    const heading = stage.querySelector('h1, h2, h3, h4');
    if (!eyebrow || !heading || heading.closest('.deck-section')) return;
    const align = getComputedStyle(heading).textAlign;
    if (align !== 'left' && align !== 'start') return;

    // Split parts: above both, so their headings stay on one line.
    if (heading.parentElement.matches('.deck-half') && 'sections' in stage.dataset) {
      let head = stage.querySelector(':scope > .deck-head');
      if (!head) {
        head = el('div', 'deck-head');
        stage.prepend(head);
      }
      head.prepend(eyebrow);
      return;
    }
    heading.before(eyebrow);
  }

  // Sections: lower the text size in steps until the slide fits, down to
  // about 22px body text. Past that, text runs off. Hidden slides can't be
  // measured, so each is fitted the first time it shows.
  const FIT_FLOOR = 0.65;

  // Reveal's r-fit-text fills the width only. In a part, also keep it inside
  // the part's height: the text takes whatever the part has left.
  const PROBE = 100;

  function fitBoxes(section) {
    if (!section) return;
    section.querySelectorAll('.deck-section > .r-fit-text').forEach(text => {
      const part = text.parentElement;
      if (!part.clientHeight) return;
      const style = getComputedStyle(part);
      const px = name => parseFloat(style[name]) || 0;
      const width = part.clientWidth - px('paddingLeft') - px('paddingRight');
      const height = part.clientHeight - px('paddingTop') - px('paddingBottom');
      const others = Array.from(part.children).filter(kid => kid !== text);
      const used = others.reduce((sum, kid) => sum + kid.offsetHeight + px('rowGap'), 0);
      text.style.fontSize = PROBE + 'px';
      const scale = Math.min(width / text.offsetWidth, (height - used) / text.offsetHeight);
      text.style.fontSize = Math.max(0, Math.floor(PROBE * scale)) + 'px';
    });
  }

  // After Reveal has sized r-fit-text (a frame after the slide loads).
  const afterReveal = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

  // Sections with pictures: rows fit their content. If the slide is too tall,
  // cap the pictures' height, then shrink the text.
  const PICTURE_FLOOR = 120;

  // How far the content runs past the stage's padding, in slide px.
  function excessOf(stage) {
    const box = stage.getBoundingClientRect();
    const scale = box.height / stage.offsetHeight || 1;
    const kids = Array.from(stage.children).filter(kid => !kid.hidden);
    const bottom = Math.max(...kids.map(kid => kid.getBoundingClientRect().bottom));
    const limit = box.bottom - (parseFloat(getComputedStyle(stage).paddingBottom) || 0) * scale;
    return (bottom - limit) / scale;
  }

  function fitPictures(stage) {
    stage.style.removeProperty('--_pic-max');
    const pictures = Array.from(stage.querySelectorAll(
      ':scope > .deck-section .deck-pictures :is(img, video, picture, .deck-chart, .deck-missing)'));
    if (!pictures.length) return;
    const rows = parseInt(stage.style.getPropertyValue('--_rows'), 10) || 1;
    for (let i = 0; i < 4 && excessOf(stage) > 1; i++) {
      const tallest = Math.max(...pictures.map(p => p.offsetHeight));
      const excess = excessOf(stage);
      stage.style.setProperty('--_pic-max', Math.max(PICTURE_FLOOR, Math.floor(tallest - excess / rows)) + 'px');
    }
  }

  // Whole pictures in a cell: the column count that shows them biggest, from
  // their shapes. Until every picture has loaded, the count table stands.
  function ratioOf(item) {
    const media = item.matches('img, video') ? item : item.querySelector('img, video');
    if (!media) return 0;
    const w = media.naturalWidth || media.videoWidth;
    const h = media.naturalHeight || media.videoHeight;
    return w && h ? w / h : 0;
  }

  function arrangePictures(section) {
    if (!section) return;
    section.querySelectorAll('.deck-cell.deck-pictures:not(.fill, .bleed, .stack)').forEach(group => {
      const width = group.clientWidth;
      const height = group.clientHeight;
      if (!width || !height) return;
      const items = Array.from(group.children).filter(kid => !kid.matches('.deck-caption'));
      const ratios = items.map(ratioOf);
      if (items.length < 2 || ratios.some(r => !r)) return;
      const gap = parseFloat(getComputedStyle(group).rowGap) || 0;
      let best = 0;
      let bestCols = 1;
      for (let cols = 1; cols <= items.length; cols++) {
        const rows = Math.ceil(items.length / cols);
        const cellW = (width - (cols - 1) * gap) / cols;
        const cellH = (height - (rows - 1) * gap) / rows;
        const area = ratios.reduce((sum, r) => {
          const w = Math.min(cellW, cellH * r);
          return sum + w * w / r;
        }, 0);
        if (area > best * 1.01) {
          best = area;
          bestCols = cols;
        }
      }
      place(group, items, bestCols);
    });
  }

  function fitSlide(section) {
    arrangePictures(section);
    fitBoxes(section);
    const stage = section && section.querySelector(':scope > .deck-stage[data-shape="sections"]');
    if (!stage || stage.dataset.fit || !stage.clientHeight) return;
    fitPictures(stage);
    let fit = 1;
    while (excessOf(stage) > 1 && fit > FIT_FLOOR) {
      fit = Math.max(FIT_FLOOR, fit - 0.05);
      stage.style.setProperty('--_fit', fit.toFixed(2));
    }
    stage.dataset.fit = fit.toFixed(2);
    fitBoxes(section);
  }

  function watchFit(reveal, root) {
    const fitAll = () => leafSlides(root).forEach(fitSlide);
    reveal.on('slidechanged', event => {
      fitSlide(event.currentSlide);
      afterReveal(() => fitBoxes(event.currentSlide));
    });
    reveal.on('overviewshown', () => afterReveal(() => leafSlides(root).forEach(fitBoxes)));
    // A picture that loads later has a shape: arrange its group again.
    root.querySelectorAll('.deck-cell.deck-pictures img').forEach(img => {
      if (img.complete) return;
      img.addEventListener('load', () => arrangePictures(img.closest('section')), {once: true});
    });
    // A picture that loads later changes the height: fit its slide again.
    root.querySelectorAll('.deck-stage[data-shape="sections"] img').forEach(img => {
      if (img.complete) return;
      img.addEventListener('load', () => {
        const stage = img.closest('.deck-stage');
        delete stage.dataset.fit;
        stage.style.removeProperty('--_fit');
        fitSlide(stage.parentElement);
      }, {once: true});
    });
    afterReveal(() => fitBoxes(reveal.getCurrentSlide()));
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

  // Overview: a sideways swipe or a scroll moves through the slides instead of
  // going back a page. Each slide shows its number.
  const WHEEL_STEP = 60;
  const WHEEL_PAUSE = 90;

  function watchOverview(reveal, root) {
    leafSlides(root).forEach((section, i) => {
      const number = el('span', 'deck-number', String(i + 1));
      number.setAttribute('aria-hidden', 'true');
      section.appendChild(number);
    });

    let travel = 0;
    let quietUntil = 0;
    document.addEventListener('wheel', event => {
      if (!reveal.isOverview()) return;
      event.preventDefault();
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      travel += sideways ? event.deltaX : event.deltaY;
      if (Math.abs(travel) < WHEEL_STEP || event.timeStamp < quietUntil) return;
      if (travel > 0) reveal.next(); else reveal.prev();
      travel = 0;
      quietUntil = event.timeStamp + WHEEL_PAUSE;
    }, {passive: false});
  }

  function deckChrome(reveal) {
    const root = document.querySelector('.reveal');
    if (!root) return;

    leafSlides(root).forEach(buildSlide);
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
    watchOverview(reveal, root);
  }

  global.deckChrome = deckChrome;
  global.deckSlideType = slideType;
})(window);
