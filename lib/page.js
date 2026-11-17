// Turns a parsed deck into one HTML page. No Node imports, so the editor runs it in the browser.

export const CHART_FILES = {chartjs: 'chart.umd.min.js', echarts: 'echarts.min.js'};

// A bare name is a built-in theme; anything else is a path from the deck file.
export function isThemeName(theme) {
  return /^[\w-]+$/.test(theme);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
}

// JSON that is safe inside a <script> element.
function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
}

// deck: the result of deckConfig(). runtime: URL of the folder holding deck.js.
// csv: {path as written in the markdown: file text}, put in the page.
// head, body: raw HTML from the site's own code, added last in <head> and first in <body>.
export function renderDeck(deck, {runtime = 'runtime/', csv = {}, head = '', body = ''} = {}) {
  const tags = [];
  if (deck.description) {
    tags.push(`<meta name="description" content="${escapeHtml(deck.description)}" />`);
  }
  tags.push(`<link rel="stylesheet" href="${runtime}deck.css" />`);
  if (deck.theme) {
    const href = isThemeName(deck.theme) ? `${runtime}themes/${deck.theme}.css` : deck.theme;
    tags.push(`<link rel="stylesheet" href="${escapeHtml(href)}" />`);
  }
  if (deck.accent) {
    tags.push(`<style>:root { --deck-theme-1: ${deck.accent}; }</style>`);
  }
  if (head) tags.push(head);

  // The markdown plugin turns __SCRIPT_END__ back into </script>.
  const markdown = deck.markdown.replace(/<\/script>/gi, '__SCRIPT_END__');

  const scripts = [];
  if (Object.keys(csv).length) {
    scripts.push(`<script type="application/json" id="deck-csv">${scriptJson(csv)}</script>`);
  }
  scripts.push(...deck.charts.map(name => `<script src="${runtime}${CHART_FILES[name]}"></script>`));
  scripts.push(`<script src="${runtime}deck.js"></script>`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${escapeHtml(deck.title || 'Deck')}</title>
    ${tags.join('\n    ')}
  </head>
  <body>${body ? `\n    ${body}` : ''}
    <div class="reveal"${deck.source ? ' data-source' : ''}${deck.pageNumbering ? ' data-page-numbering' : ''}>
      <div class="slides">
        <section
          data-markdown
          data-separator="^\\r?\\n---\\r?\\n$"
          data-separator-vertical="^\\r?\\n--\\r?\\n$"
          data-separator-notes="^Note:"
        >
          <script type="text/template">
${markdown}
          </script>
        </section>
      </div>
    </div>

    ${scripts.join('\n    ')}
  </body>
</html>
`;
}
