/* Starts the deck on page load. The markdown is inline (built by the CLI)
   or fetched from <div class="reveal" data-deck="deck.md">. */

(function (global) {
  'use strict';

  // Themes and chart libraries sit next to this file.
  const here = document.currentScript ? document.currentScript.src : location.href;

  const LIBS = {
    chartjs: {file: 'chart.umd.min.js', global: 'Chart'},
    echarts: {file: 'echarts.min.js', global: 'echarts'}
  };

  const SEPARATORS = {
    'data-separator': '^\\r?\\n---\\r?\\n$',
    'data-separator-vertical': '^\\r?\\n--\\r?\\n$',
    'data-separator-notes': '^Note:'
  };

  function load(tag, props) {
    return new Promise((resolve, reject) => {
      const node = Object.assign(document.createElement(tag), props);
      node.onload = resolve;
      node.onerror = () => reject(new Error(`Could not load ${props.src || props.href}`));
      document.head.appendChild(node);
    });
  }

  // A bare name is a built-in theme; anything else is a path from the deck file.
  function themeUrl(theme, deckUrl) {
    return /^[\w-]+$/.test(theme)
      ? new URL(`themes/${theme}.css`, here).href
      : new URL(theme, deckUrl).href;
  }

  async function fetchDeck(root, url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} loading ${url}`);
    const deck = global.deckConfig(await response.text());

    if (deck.title) document.title = deck.title;
    if (deck.accent) {
      document.documentElement.style.setProperty('--deck-accent', deck.accent);
    }
    if (deck.source) root.setAttribute('data-source', '');

    const template = document.createElement('script');
    template.type = 'text/template';
    template.textContent = deck.markdown;
    const section = document.createElement('section');
    section.setAttribute('data-markdown', '');
    Object.entries(SEPARATORS).forEach(([name, value]) => section.setAttribute(name, value));
    section.appendChild(template);
    const slides = document.createElement('div');
    slides.className = 'slides';
    slides.appendChild(section);
    root.replaceChildren(slides);

    const waits = deck.charts
      .filter(name => !global[LIBS[name].global])
      .map(name => load('script', {src: new URL(LIBS[name].file, here).href}));
    if (deck.theme) {
      waits.push(load('link', {rel: 'stylesheet', href: themeUrl(deck.theme, url)}));
    }
    await Promise.all(waits);
  }

  function markdownOf(root) {
    const template = root.querySelector('[data-markdown] > script[type="text/template"]');
    return template
      ? template.textContent.replace(/__SCRIPT_END__/g, '</script>').trim()
      : '';
  }

  function showError(root, error) {
    console.error('[deck]', error);
    const note = document.createElement('pre');
    note.className = 'deck-error';
    note.textContent = `Deck failed: ${error.message}`;
    document.body.prepend(note);
    root.classList.add('deck-ready');
  }

  async function start() {
    const root = document.querySelector('.reveal');
    if (!root) return;

    try {
      const file = root.getAttribute('data-deck');
      if (file) await fetchDeck(root, new URL(file, location.href).href);

      const source = root.hasAttribute('data-source');
      const markdown = markdownOf(root);
      if (source) document.body.classList.add('has-source');

      await global.Reveal.initialize({
        plugins: [global.RevealMarkdown, global.RevealHighlight],
        hash: true,

        // Fixed 1920×1080 frame; slide types set their own insets.
        width: 1920,
        height: 1080,
        margin: 0,
        minScale: 0.2,
        maxScale: 2,

        center: false,
        controls: false,
        progress: false,
        slideNumber: false,

        transition: 'fade',
        transitionSpeed: 'fast',

        embedded: source
      });

      global.deckChrome(global.Reveal);
      global.deckCharts();
      if (source) global.deckSource(global.Reveal, markdown);
    } catch (error) {
      showError(root, error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
