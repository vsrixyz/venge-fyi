/* Draws charts when their slide first shows.
   CSV: ![alt](data.csv "bar") — first row is headers, first column is labels,
   each other column a series. Kinds: bar, line, pie, doughnut, plus
   "horizontal" or "stacked". Or inline JSON: data-chart + data-config.
   CSV comes from the page's #deck-csv data (CLI builds) or is fetched.
   Colours come from the accent tokens. Call deckCharts() after deckChrome(). */

(function (global) {
  'use strict';

  function token(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  function palette(el) {
    return [
      token(el, '--deck-accent'),
      token(el, '--deck-accent-2'),
      token(el, '--deck-accent-3')
    ];
  }

  // Commas, quoted fields, "" for a quote.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') {
          quoted = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows
      .map(r => r.map(cell => cell.trim()))
      .filter(r => r.some(cell => cell !== ''));
  }

  function number(cell) {
    const n = parseFloat(String(cell).replace(/[,\s%$£€]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function configFromCsv(rows, kindText, el) {
    const words = String(kindText || 'bar').toLowerCase().split(/\s+/);
    const type =
      ['line', 'pie', 'doughnut', 'bar'].find(kind => words.includes(kind)) || 'bar';
    const horizontal = words.includes('horizontal');
    const stacked = words.includes('stacked');

    const [header, ...body] = rows;
    const labels = body.map(r => r[0]);
    const colors = palette(el);
    const series = header.slice(1);
    const round = type === 'pie' || type === 'doughnut';

    const datasets = series.map((name, i) => {
      const data = body.map(r => number(r[i + 1]));
      const color = colors[i % colors.length];
      if (round) {
        return {label: name, data, backgroundColor: labels.map((_, j) => colors[j % colors.length])};
      }
      if (type === 'line') {
        return {
          label: name, data,
          borderColor: color, backgroundColor: color,
          borderWidth: 4, pointRadius: 6, tension: 0.3
        };
      }
      // One series: each bar takes the next accent.
      const fill = series.length === 1
        ? labels.map((_, j) => colors[j % colors.length])
        : color;
      return {label: name, data, backgroundColor: fill, borderRadius: 4};
    });

    const config = {
      type,
      data: {labels, datasets},
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {legend: {display: series.length > 1 || round}}
      }
    };

    if (!round) {
      config.options.scales = {
        x: {stacked, grid: {display: false}},
        y: {stacked, beginAtZero: true}
      };
    }
    return config;
  }

  function chartDefaults(el) {
    if (!global.Chart) return;
    const Chart = global.Chart;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.responsive = true;
    Chart.defaults.font.family = token(el, '--deck-font-base');
    Chart.defaults.font.size = 22;
    Chart.defaults.plugins.legend.labels.boxWidth = 22;
    Chart.defaults.plugins.legend.labels.padding = 24;
  }

  // Per chart, since light and dark slides can share a deck.
  function themed(config, el) {
    const ink = token(el, '--deck-ink-faint');
    const rule = token(el, '--deck-rule');
    const options = (config.options = config.options || {});
    options.color = options.color || ink;

    const scales = options.scales || {};
    Object.values(scales).forEach(scale => {
      scale.ticks = Object.assign({color: ink}, scale.ticks);
      scale.grid = Object.assign({color: rule}, scale.grid);
      scale.border = Object.assign({color: rule}, scale.border);
    });

    const colors = palette(el);
    const datasets = (config.data && config.data.datasets) || [];
    datasets.forEach((set, i) => {
      if (set.backgroundColor) return;
      set.backgroundColor =
        datasets.length === 1 && (config.type || 'bar') === 'bar'
          ? (config.data.labels || []).map((_, j) => colors[j % colors.length])
          : colors[i % colors.length];
      if (!set.borderColor && config.type === 'line') {
        set.borderColor = colors[i % colors.length];
      }
    });
    return config;
  }

  // Keyed by the path as written in the markdown.
  let inline = null;
  function inlineCsv() {
    if (!inline) {
      const data = document.getElementById('deck-csv');
      inline = data ? JSON.parse(data.textContent) : {};
    }
    return inline;
  }

  async function csvText(src) {
    const text = inlineCsv()[src];
    if (typeof text === 'string') return text;
    const response = await fetch(new URL(src, document.baseURI));
    if (!response.ok) throw new Error(`${response.status}: ${src.split('/').pop()}`);
    return response.text();
  }

  function showError(el, message) {
    const note = document.createElement('div');
    note.className = 'deck-missing';
    note.innerHTML = '<span class="deck-missing__title">Chart failed</span>';
    const detail = document.createElement('span');
    detail.className = 'deck-missing__file';
    detail.textContent = message;
    note.appendChild(detail);
    note.style.height = '100%';
    el.replaceWith(note);
  }

  async function renderChart(el) {
    if (el.dataset.chart === 'chartjs') {
      if (!global.Chart) {
        showError(el, 'Add charts: ["chartjs"] to the front matter');
        return;
      }
      let config;
      try {
        if (el.dataset.csv) {
          const rows = parseCsv(await csvText(el.dataset.csv));
          if (rows.length < 2 || rows[0].length < 2) {
            throw new Error('The CSV needs a header row, then at least one row of data');
          }
          config = configFromCsv(rows, el.dataset.kind, el);
        } else {
          config = JSON.parse(el.dataset.config || '{}');
        }
      } catch (error) {
        console.error('[deck] chart', el, error);
        showError(el, error.message);
        return;
      }
      new global.Chart(el, themed(config, el));
      return;
    }

    if (el.dataset.chart === 'echarts' && global.echarts) {
      let config = {};
      try {
        config = JSON.parse(el.dataset.config || '{}');
      } catch (error) {
        console.error('[deck] chart', el, error);
        showError(el, 'Invalid data-config JSON');
        return;
      }
      const instance = global.echarts.init(el);
      instance.setOption(config);
      global.addEventListener('resize', () => instance.resize());
    }
  }

  function deckCharts() {
    const charts = document.querySelectorAll('.reveal [data-chart]');
    if (!charts.length) return;

    chartDefaults(document.querySelector('.reveal'));

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        renderChart(entry.target);
      });
    }, {threshold: 0.1});

    charts.forEach(el => observer.observe(el));
  }

  global.deckCharts = deckCharts;
})(window);
