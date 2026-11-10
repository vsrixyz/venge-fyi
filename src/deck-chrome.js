/* Builds each slide's structure for its type, then flags rule breaks.
   Call deckChrome(Reveal) after Reveal.initialize() resolves. */

(function (global) {
  'use strict';

  // A slide with no type is big.
  const LAYOUTS = [
    'cover', 'big', 'prose', 'figure', 'image',
    'split', 'cards', 'columns', 'chart'
  ];

  // Old names.
  const ALIASES = {title: 'cover', headline: 'big'};

  const MODIFIERS = ['theme-dark', 'is-reverse', 'overlay'];

  // Added by Reveal or this file.
  const RUNTIME = [
    'present', 'past', 'future', 'stack', 'visible',
    'has-dark-background', 'has-light-background', 'is-scrollable'
  ];

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

  // The eyebrow is a #### line. On cover, big and image it can be anywhere;
  // elsewhere it must come first.
  function resolveEyebrow(stage, layout) {
    const anywhere = ['cover', 'big', 'image'].includes(layout);
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
  function buildFigure(stage, eyebrow, problems) {
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
    if (media.length !== 1) {
      problems.push(`figure needs exactly 1 image, chart or table (has ${media.length})`);
    }
  }

  function buildImage(section, stage, eyebrow, problems) {
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
      else problems.push('image overlay needs one # heading');
    }

    // Not allowed: kept visible at the foot, and flagged.
    extra.forEach(child => stage.appendChild(child));
    if (extra.length) {
      problems.push(
        overlay
          ? 'image overlay allows one # heading and a #### label only'
          : 'image allows a #### label only'
      );
    }

    if (count === 0) problems.push('image needs at least 1 image');
    if (count > 4) problems.push(`image allows up to 4 images (has ${count})`);
  }

  // Each ## starts a half.
  function buildSplit(stage, eyebrow, problems) {
    if (stage.querySelector(':scope > .deck-half')) return;

    const halves = [];
    let current = null;
    Array.from(stage.children).forEach(child => {
      if (child === eyebrow) return;
      if (child.tagName === 'H2') {
        current = el('div', 'deck-half');
        halves.push(current);
      }
      if (current) current.appendChild(child);
      else if (child.textContent.trim() !== '') {
        problems.push('split: put everything under one of the two ## headings');
      }
    });

    halves.forEach(half => stage.appendChild(half));
    if (eyebrow) stage.prepend(eyebrow);

    if (halves.length !== 2) {
      problems.push(`split needs exactly 2 ## sections (has ${halves.length})`);
    }
    if (stage.querySelector(MEDIA)) problems.push('split is text only');
  }

  // Each list item is a card.
  function buildCards(stage, eyebrow, problems) {
    const list = stage.querySelector(':scope > ul, :scope > ol');
    if (eyebrow) stage.prepend(eyebrow);

    if (!list) {
      problems.push('cards needs a list, one item per card');
      return;
    }

    const items = Array.from(list.children).filter(li => li.tagName === 'LI');
    list.classList.add('deck-cards');
    list.dataset.count = String(items.length);

    items.forEach(li => {
      li.classList.add('deck-card');
      const first = li.firstElementChild;
      const startsBold =
        first &&
        first.tagName === 'STRONG' &&
        li.firstChild === first;
      if (startsBold) first.classList.add('deck-card__label');
    });

    if (items.length < 2 || items.length > 6) {
      problems.push(`cards needs 2–6 items (has ${items.length})`);
    }
    if (items.some(li => !li.querySelector(':scope > .deck-card__label'))) {
      problems.push('cards: start each item with a **bold label**');
    }
    if (stage.querySelectorAll(':scope > ul, :scope > ol').length > 1) {
      problems.push('cards takes one list');
    }
  }

  // Each ### starts a column.
  function buildColumns(stage, eyebrow, problems) {
    if (stage.querySelector(':scope > .deck-columns')) return;

    const row = el('div', 'deck-columns');
    let current = null;
    Array.from(stage.children).forEach(child => {
      if (child.tagName === 'H3') {
        current = el('div', 'deck-column');
        row.appendChild(current);
      }
      if (current) current.appendChild(child);
    });

    const count = row.children.length;
    row.dataset.count = String(count);
    stage.appendChild(row);
    if (eyebrow) stage.prepend(eyebrow);

    if (count < 2 || count > 4) {
      problems.push(`columns needs 2–4 ### columns (has ${count})`);
    }
  }

  function buildChart(stage, eyebrow, problems) {
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

    if (media.length !== 1) {
      problems.push(`chart needs exactly 1 chart or diagram (has ${media.length})`);
    }
  }

  function checkClasses(section, problems) {
    const allowed = [
      ...LAYOUTS, ...Object.keys(ALIASES), ...MODIFIERS, ...RUNTIME
    ];
    const unknown = Array.from(section.classList).filter(
      name => !allowed.includes(name) && !name.startsWith('deck-') &&
        !name.startsWith('has-')
    );
    if (unknown.length) problems.push(`unknown class: ${unknown.join(', ')}`);

    const types = LAYOUTS.filter(name => section.classList.contains(name));
    if (types.length > 1) problems.push(`one type per slide (has ${types.join(', ')})`);

    const layout = layoutOf(section);
    if (section.classList.contains('is-reverse') && layout !== 'figure') {
      problems.push('is-reverse only works on figure');
    }
    if (section.classList.contains('overlay') && layout !== 'image') {
      problems.push('overlay only works on image');
    }
  }

  function checkText(layout, stage, problems) {
    const media = stage.querySelector(MEDIA);
    const paragraphs = stage.querySelectorAll(':scope > p:not(.deck-eyebrow)');
    const lists = stage.querySelectorAll(':scope > ul, :scope > ol');

    if (layout === 'cover') {
      if (paragraphs.length || lists.length || media) {
        problems.push('cover takes headings only: no paragraphs, lists or images');
      }
    }
    if (layout === 'big') {
      if (media) problems.push('big has no images. Use figure or image');
      if (paragraphs.length > 2) {
        problems.push(`big allows up to 2 paragraphs (has ${paragraphs.length})`);
      }
    }
    if (layout === 'prose' && media) {
      problems.push('prose has no images. Use figure or image');
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
    const problems = [];
    checkClasses(section, problems);

    const layout = normalizeLayout(section);
    const stage = wrapStage(section);
    unwrapMedia(stage);
    csvCharts(stage);
    normalizeFragments(stage);
    checkText(layout, stage, problems);

    const eyebrow = resolveEyebrow(stage, layout);

    switch (layout) {
      case 'figure':
        buildFigure(stage, eyebrow, problems);
        break;
      case 'image':
        buildImage(section, stage, eyebrow, problems);
        break;
      case 'split':
        buildSplit(stage, eyebrow, problems);
        break;
      case 'cards':
        buildCards(stage, eyebrow, problems);
        break;
      case 'columns':
        buildColumns(stage, eyebrow, problems);
        break;
      case 'chart':
        buildChart(stage, eyebrow, problems);
        break;
    }

    return problems;
  }

  function overflowOf(section, scale) {
    const stage = section.querySelector(':scope > .deck-stage');
    if (!stage) return 0;

    const kids = Array.from(stage.children).filter(
      kid => getComputedStyle(kid).position !== 'absolute'
    );
    if (!kids.length) return 0;

    const styles = getComputedStyle(stage);
    const available =
      stage.clientHeight -
      parseFloat(styles.paddingTop) -
      parseFloat(styles.paddingBottom);

    let top = Infinity;
    let bottom = -Infinity;
    kids.forEach(kid => {
      const box = kid.getBoundingClientRect();
      if (box.height === 0 && box.width === 0) return;
      top = Math.min(top, box.top);
      bottom = Math.max(bottom, box.bottom);
    });
    if (top === Infinity) return 0;

    return Math.round((bottom - top) / (scale || 1) - available);
  }

  function watchOverflow(reveal, dev) {
    const check = () => {
      const section = reveal.getCurrentSlide();
      if (!section) return;

      const stage = section.querySelector(':scope > .deck-stage');

      // Prose scrolls, so it never overflows.
      if (layoutOf(section) === 'prose') {
        if (stage) {
          section.classList.toggle(
            'is-scrollable',
            stage.scrollHeight > stage.clientHeight + 4
          );
        }
        section.removeAttribute('data-deck-overflow');
        return;
      }

      if (!dev) return;

      const over = overflowOf(section, reveal.getScale());
      if (over > 4) {
        section.setAttribute('data-deck-overflow', over);
        console.warn(
          `[deck] slide ${reveal.getIndices().h + 1} overflows its region by ${over}px. ` +
            `Split it, or move it to the prose layout, which scrolls.`
        );
      } else {
        section.removeAttribute('data-deck-overflow');
      }
    };

    reveal.on('slidechanged', check);
    reveal.on('resize', check);
    check();
  }

  function deckChrome(reveal) {
    const root = document.querySelector('.reveal');
    if (!root) return;

    const dev =
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
      location.search.includes('overflow') ||
      root.hasAttribute('data-source');

    leafSlides(root).forEach((section, index) => {
      const problems = buildSlide(section);
      if (!problems.length) return;
      section.dataset.deckCheck = problems.join(' · ');
      if (dev) {
        console.warn(`[deck] slide ${index + 1}: ${problems.join('; ')}`);
      }
    });
    if (dev) root.classList.add('deck-dev');

    watchImages(root);

    // Re-read fragments from the rebuilt DOM.
    reveal.sync();
    reveal.layout();

    // deck.njk hides slides until this class is set.
    root.classList.add('deck-ready');

    watchOverflow(reveal, dev);
  }

  global.deckChrome = deckChrome;
})(window);
