/* Markdown panel for decks with source: true. M toggles it.
   Call deckSource(Reveal, markdown) after Reveal.initialize() resolves. */

(function (global) {
  'use strict';

  // Same separators as deck-start.js.
  const HORIZONTAL = /\r?\n---\r?\n/;
  const VERTICAL = /\r?\n--\r?\n/;

  function slidesOf(markdown) {
    return markdown
      .split(HORIZONTAL)
      .map(chunk => chunk.split(VERTICAL).map(part => part.trim()));
  }

  const MODIFIERS = ['dark', 'light', 'is-reverse', 'overlay'];

  function typeOf(section) {
    const types = [
      'big', 'prose', 'figure', 'image',
      'split', 'cards', 'columns', 'chart'
    ];
    const type = types.find(name => section.classList.contains(name)) || 'big';
    const extras = MODIFIERS.filter(name =>
      section.classList.contains(name)
    );
    return [type, ...extras].join(' · ');
  }

  function buildPanel() {
    const panel = document.createElement('aside');
    panel.className = 'deck-source';
    panel.setAttribute('aria-label', 'Markdown for this slide');
    panel.innerHTML =
      '<div class="deck-source__head">' +
      '<span class="deck-source__count"></span>' +
      '<span class="deck-source__type"></span>' +
      '<button type="button" data-source-toggle>Hide (M)</button>' +
      '</div>' +
      '<pre class="deck-source__code"></pre>';
    document.body.appendChild(panel);
    return panel;
  }

  function deckSource(reveal, markdown) {
    const panel = buildPanel();
    const slides = slidesOf(markdown || '');

    const total = reveal.getTotalSlides();
    const count = panel.querySelector('.deck-source__count');
    const type = panel.querySelector('.deck-source__type');
    const code = panel.querySelector('.deck-source__code');

    const update = () => {
      const {h, v} = reveal.getIndices();
      const section = reveal.getCurrentSlide();
      const text = (slides[h] && slides[h][v || 0]) || '';
      const number = reveal.getSlidePastCount() + 1;

      count.textContent = `Slide ${number} of ${total}`;
      type.textContent = section ? typeOf(section) : '';
      code.textContent = text;
      panel.scrollTop = 0;
    };

    const toggle = () => {
      document.body.classList.toggle('source-hidden');
      requestAnimationFrame(() => reveal.layout());
    };

    document.querySelectorAll('[data-source-toggle]').forEach(button =>
      button.addEventListener('click', toggle)
    );
    reveal.addKeyBinding({keyCode: 77, key: 'M', description: 'Show or hide the Markdown'}, toggle);

    reveal.on('slidechanged', update);
    update();
  }

  global.deckSource = deckSource;
})(window);
