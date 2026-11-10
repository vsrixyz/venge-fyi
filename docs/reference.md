# venge-fyi reference

Show a markdown file as a slide deck on a static site, and style it with your own theme.

It gives you slide types, layout, design tokens and a theme file format, all built on [Reveal.js](https://revealjs.com). It does not give you a website.

- [Setup](#setup): drop-in files, the CLI, or from code
- [Writing a deck](#writing-a-deck): front matter, slides, notes
- [Slide types](#slide-types)
- [Charts](#charts)
- [Themes](#themes) and the [token reference](#tokens)
- [Class names](#class-names)
- [Working on this package](#working-on-this-package)

## Setup

There are three ways to use it. All need the files in `dist/`.

### 1. Drop-in files (no build step)

Copy `dist/` to your site, then add a page like this next to your `deck.md`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Deck</title>
    <link rel="stylesheet" href="dist/deck.css" />
  </head>
  <body>
    <div class="reveal" data-deck="deck.md"></div>
    <script src="dist/deck.js"></script>
  </body>
</html>
```

`deck.js` fetches `deck.md`, reads its front matter and shows the slides. It loads a built-in theme or a chart library only when the deck asks for one. Those files must stay where they are in `dist/`, next to `deck.js`.

The page must be served over http(s). Browsers block `fetch()` for pages opened from disk. If you need that, use the CLI.

A working copy is in [`examples/drop-in/`](../examples/drop-in/).

### 2. The CLI

```bash
npx venge-fyi build deck.md --out public/my-talk
```

This writes:

```
public/my-talk/
  index.html     the page, with the markdown and any CSV data inside it
  assets/…       every file the deck links, at the same relative path
  runtime/       deck.js, deck.css, the theme, and a chart library if the deck uses one
```

`--out` defaults to `build/<deck file name>/`, so `talk.md` builds to `build/talk/`. The folder works on any static host, in any subfolder, and opened straight from disk.

The CLI copies every local file the markdown links (images, video, CSV, a theme path). Those files must be inside the deck's folder. A linked file that doesn't exist is a warning, not an error.

### 3. From code

For a site builder that makes its own pages, such as Eleventy:

```js
import {prepare, renderDeck, distDir} from 'venge-fyi';

const {deck, dir, assets, csv} = prepare('decks/talk.md');
const html = renderDeck(deck, {
  runtime: '/assets/venge/',
  csv,
  head: '<link rel="stylesheet" href="/assets/deck-fonts.css" />',
  body: '<a class="back" href="/decks/">← Decks</a>'
});
```

- `prepare(file, warn)` reads a deck. `assets` are the files it links, relative to `dir`. Copy them next to the page.
- `renderDeck(deck, options)` returns the page's HTML. `runtime` is the URL of a copy of `distDir`. `csv` comes from `prepare()`.
- `head` is added at the end of `<head>`, after `deck.css`, the theme and the accent, so its styles win. `body` is added at the start of `<body>`, before `.reveal`. Both are raw HTML and are not escaped, so they must come from your own code, never from a deck file.
- `distDir` is the path of the `dist/` folder.

Only these three are public. Files inside `lib/` can't be imported.

## Writing a deck

A deck is one markdown file. It can start with front matter:

```markdown
---
title: My talk
theme: midnight
---

<!-- .slide: class="cover" -->

# My talk

---

# The first point
```

### Front matter

All options are optional.

| Option | Default | What it does |
| --- | --- | --- |
| `title` | `Deck` | The browser tab title. |
| `description` | none | The page's `<meta name="description">`. |
| `accent` | the theme's | The colour for bullets, links, the quote mark and charts. Sets `--deck-accent`. Quote it: `accent: '#12467A'` (an unquoted `#` starts a comment). |
| `theme` | none | A built-in theme name (`midnight`, `signal`) or a path to your own CSS file, relative to the deck file. |
| `charts` | `[]` | Chart libraries for charts written as JSON: `chartjs`, `echarts`. A deck that links a `.csv` file gets `chartjs` on its own. |
| `source` | `false` | Shows each slide's markdown in a panel beside it. Press M to hide it. Also turns on the [checks](#checks). |

Other keys are ignored. Front matter is a small part of YAML: one `key: value` per line, with text, numbers, `true`/`false` and `[lists]`. Anything else (nesting, multi-line values) stops with an error that names the line.

### Slides

| Write | For |
| --- | --- |
| `---` on its own line, with a blank line above and below | A new slide |
| `--` on its own line, with blank lines around it | A slide below the current one |
| `<!-- .slide: class="figure" -->` | The slide's type and modifiers |
| `Note:` | Starts the slide's speaker notes. They are hidden. Reveal's speaker view plugin is not included. |

Headings are sizes: `#` is the largest and `####` the smallest. The slide type decides the actual size. Everything shows in the order you write it.

A `####` line is the eyebrow, a small label in capitals. On `cover`, `big` and `image` it can go anywhere. On other types it must be the first line.

Reveal's own markdown features still work, such as `<!-- .element: class="fragment" -->`.

## Slide types

Each slide has one type. A slide with no type is `big`.

| Class | Use it for | Rules |
| --- | --- | --- |
| `cover` | Title slides | Headings only: `####` eyebrow, `#` title, `##` subtitle, `###` small line. No paragraphs, lists or images. |
| `big` | One short point | `#` headline plus up to 2 short paragraphs, a short list, or a `>` quote. No images. |
| `prose` | Longer text | `##` title, then paragraphs, lists, tables and code. The only type that scrolls. No images. |
| `figure` | Text about one picture | A text column plus exactly 1 image, video or chart. The picture is never cropped. |
| `image` | Photos | 1 to 4 images as cropped tiles, plus an optional `####` label. |
| `split` | Two sides | Exactly 2 `##` sections, one per half. Text only. |
| `cards` | A few short points | One list of 2 to 6 items. Each item starts with a `**bold label**`. Optional `##` title. |
| `columns` | Side-by-side text | 2 to 4 `###` columns. Optional `##` title. |
| `chart` | One chart or diagram | `##` title, exactly 1 chart or image. Text after it is the source line. |

`title` and `headline` still work as old names for `cover` and `big`.

Modifiers go in the same `class="…"`:

| Class | Works on | What it does |
| --- | --- | --- |
| `theme-dark` | any type | Dark background and light text for this slide. |
| `is-reverse` | `figure` | Puts the picture on the left. |
| `overlay` | `image` | Darkens the photos and puts one `#` heading over them. |

### Checks

Each slide is checked against these rules, and against overflow (content that doesn't fit the 1920×1080 frame). Problems show as red labels on the slide and as console warnings when the page is on `localhost`, has `?overflow` in its URL, or the deck has `source: true`. Elsewhere, the checks run but show nothing.

A missing image becomes a dashed box with its file name.

## Charts

### From a CSV file

Link the CSV like an image. The title picks the chart kind:

```markdown
![Slides made each quarter](assets/slides-per-quarter.csv "bar")
```

The first row is headers. The first column is the labels. Each other column is a series.

```csv
Quarter,Slides
Q1,15
Q2,18
```

Kinds: `bar` (the default), `line`, `pie`, `doughnut`. Add `horizontal` or `stacked`, as in `"horizontal stacked bar"`. Numbers may have `,`, `%`, `$`, `£` or `€`.

Colours come from `--deck-accent`, `--deck-accent-2` and `--deck-accent-3`. Text and grid lines come from `--deck-ink-faint` and `--deck-rule`. Charts on `theme-dark` slides use that slide's colours.

The CLI puts the CSV data into the page, so built decks work from disk. Drop-in decks fetch the file.

### From JSON

Write a `<canvas>` (Chart.js) or a `<div>` (ECharts) with the library's own config in `data-config`, and list the library in `charts:`:

```html
<canvas data-chart="chartjs" data-config='{"type":"bar","data":{"labels":["Q1","Q2"],"datasets":[{"data":[12,18]}]}}'></canvas>
```

```html
<div data-chart="echarts" data-config='{"xAxis":{"data":["Q1","Q2"]},"yAxis":{},"series":[{"type":"bar","data":[12,18]}]}'></div>
```

Chart.js configs get the deck's colours and fonts where you don't set them. ECharts configs are used as written.

## Themes

A theme is one CSS file that changes [tokens](#tokens). Nothing else is needed:

```css
:root {
  --deck-bg: #14161a;
  --deck-ink: #f3f1ec;
  --deck-accent: #f2b45c;
}
```

Use it with `theme: path/to/my-theme.css` in the front matter, or add a `<link>` after `deck.css`. The built-in themes are in [`src/themes/`](../src/themes/).

Order matters: `deck.css`, then the theme, then the front matter `accent`.

### Dark slides

`theme-dark` slides, and the text on `image overlay` slides, set their own colour tokens. To change them, set tokens on this selector too:

```css
.reveal section.theme-dark,
.reveal section.image.overlay {
  --deck-ink: #ffffff;
  --deck-ink-soft: #d0d0d0;
}

.reveal section.theme-dark {
  --deck-bg: #000000;
}
```

The tokens that dark slides set are `--deck-bg`, `--deck-ink`, `--deck-ink-soft`, `--deck-ink-faint`, `--deck-rule`, `--deck-panel`, `--deck-code-bg` and `--deck-display-ink`.

### Fonts

The default fonts are the system's. To use a web font, add its `@font-face` to the theme and set the font tokens. Paths in `url()` are relative to the theme file.

```css
@font-face {
  font-family: "Inter";
  src: url("fonts/inter.woff2") format("woff2");
  font-weight: 100 900;
}

:root {
  --deck-font-base: "Inter", system-ui, sans-serif;
}
```

The CLI copies a theme given by path, but not the files its `url()`s point to. Copy those yourself, or use full URLs.

### Tokens

All sizes are px on the fixed 1920×1080 frame; don't use `vw` or `vh`. Defaults are in [`src/deck-tokens.css`](../src/deck-tokens.css).

**Colours**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-bg` | `#f7f5f2` | Page and slide background |
| `--deck-panel` | `#fffdfa` | Cards, the second half of `split` |
| `--deck-ink` | `#1f1d1b` | Main text, bold text, `###` headings |
| `--deck-ink-soft` | `#56524d` | Paragraphs, list items, table cells, `##` on cover and big |
| `--deck-ink-faint` | `#8a847c` | Eyebrows, small lines, table headers, chart text, source lines |
| `--deck-rule` | `#e4e0d9` | Lines, borders, chart grid, scrollbar |
| `--deck-display-ink` | `var(--deck-ink)` | `#` and `##` headings |
| `--deck-accent` | `#12467A` | Bullets, numbers, links, quote mark and border, first chart colour. Front matter `accent` sets it. |
| `--deck-accent-2` | `#e1361f` | Second chart colour, overview background |
| `--deck-accent-3` | `#fbbe25` | Third chart colour, overview background |
| `--deck-wash` | `rgba(20, 18, 16, 0.55)` | The darkening on `image overlay` |
| `--deck-shadow` | `rgba(31, 29, 27, 0.14)` | Slide shadow in the overview (Esc) |
| `--deck-warn` | `#c0392b` | Check labels, the panel's problem line, load errors |
| `--deck-warn-ink` | `#fff` | Text on `--deck-warn` |

**Code.** The markdown panel (`source: true`) uses these too.

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-code-bg` | `rgba(31, 29, 27, 0.07)` | Inline code, the missing-image box |
| `--deck-code-panel` | `#22201d` | Code blocks; the markdown panel's background |
| `--deck-code-ink` | `#ece8e1` | Code block text, titles; the panel's text |
| `--deck-code-comment` | `#8f887e` | Comments; the panel's slide count and button border |
| `--deck-code-keyword` | `#e8859b` | Keywords, tags |
| `--deck-code-string` | `#93b0f0` | Strings, attributes |
| `--deck-code-number` | `#f0c766` | Numbers, literals, built-ins; the panel's slide type |

**Fonts**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-font-display` | `Georgia, serif` | `#` and `##` headings, quotes |
| `--deck-font-base` | `system-ui, …, sans-serif` | Body text, `###`, chart text |
| `--deck-font-mono` | `ui-monospace, …, monospace` | Code, eyebrows, table headers, numbered list markers, check labels |

**Type sizes.** The slide type picks the heading size, not the tag.

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-text-title` | `200px` | `#` on `cover` |
| `--deck-text-headline` | `104px` | `#` on `big` and `image overlay` |
| `--deck-text-prose` | `56px` | `#`/`##` on `prose`, `cards`, `columns`, `chart`; `##` on `cover` and `big`; quotes on `big` |
| `--deck-text-figure` | `48px` | `#`/`##` on `figure` and `split` |
| `--deck-text-label` | `36px` | Card labels, column `###` |
| `--deck-text-body` | `34px` | Paragraphs and lists |
| `--deck-text-meta` | `24px` | `###` on `cover` and `big` |
| `--deck-text-eyebrow` | `22px` | `####`, the missing-image box |
| `--deck-text-quote-mark` | `160px` | The big quote mark on `big` |

**Leading and tracking**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-leading-title` | `0.82` | `#` on `cover` |
| `--deck-leading-display` | `1.05` | Other `#` and `##` |
| `--deck-leading-body` | `1.5` | Paragraphs and lists |
| `--deck-track-display` | `-0.02em` | `#` and `##` |
| `--deck-track-eyebrow` | `0.18em` | `####` |
| `--deck-track-meta` | `0.12em` | `###` on `cover` and `big` |

**Layout**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-inset-x` | `128px` | Left and right space inside a slide |
| `--deck-inset-y` | `64px` | Top and bottom space inside a slide |
| `--deck-split-inset-x` | `96px` | Left and right space inside each `split` half |
| `--deck-split-inset-y` | `90px` | Top and bottom space inside each `split` half |
| `--deck-gap-title` | `64px` | Between blocks on `cover` |
| `--deck-gap-headline` | `50px` | Between blocks on `big` |
| `--deck-gap-prose` | `32px` | Between blocks on other types |
| `--deck-gap-figure` | `40px` | Between blocks in the `figure` text column and `split` halves |
| `--deck-gap-column` | `50px` | `figure`: between text and picture |
| `--deck-gap-cards` | `32px` | Between cards |
| `--deck-gap-columns` | `64px` | Between columns |
| `--deck-measure-prose` | `1040px` | Text width on `prose` and `big` |
| `--deck-measure-figure` | `480px` | Text column width on `figure` |
| `--deck-measure-quote` | `1280px` | Quote width on `big` |
| `--deck-measure-chart` | `1664px` | Chart width on `chart` |
| `--deck-space-xs` | `12px` | Inside cards, the missing-image box |
| `--deck-space-s` | `20px` | Between list items and column parts |
| `--deck-space-m` | `32px` | Card and code padding, quote indent |

**Overview (Esc)**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-overview-mix` | `45%` | How much accent colour is in the background |
| `--deck-overview-drift` | `24s` | How long the background takes to drift |

`--deck-h-size` and `--deck-p-size` are set by each slide type. They are not tokens; don't set them in a theme.

## Class names

These are public: themes and your own CSS can rely on them.

**On the slide `<section>`**, from your markdown: the [slide types](#slide-types) and modifiers above.

**Added by the runtime:**

| Name | On | What it is |
| --- | --- | --- |
| `deck-stage` | `div`, the only child of each slide besides notes | Holds the slide's content. Insets and gaps are set here. |
| `deck-eyebrow` | `h4` | The `####` label |
| `deck-col` | `figure` | The text column |
| `deck-tiles` | `image` | The grid of photos. `data-count` is 1 to 4. |
| `deck-band` | `image` | The strip that holds the label |
| `deck-wash` | `image overlay` | The darkening layer |
| `deck-half` | `split` | Each half |
| `deck-cards` | `cards` | The list. `data-count` is the number of cards. |
| `deck-card` | `cards` | Each list item |
| `deck-card__label` | `cards` | The bold label |
| `deck-columns` | `columns` | The row. `data-count` is the number of columns. |
| `deck-column` | `columns` | Each column |
| `deck-chart` | `chart`, `figure` | The box around a chart or diagram |
| `deck-source-line` | `chart` | Text after the chart |
| `deck-missing` | any | Stands in for a missing image or a failed chart. Children: `deck-missing__title`, `deck-missing__file`, `deck-missing__alt`. |
| `is-scrollable` | `prose` slide | The text is taller than the slide |
| `data-count` | `image` slide | Number of images |
| `data-deck-check` | any slide | The rules this slide breaks |
| `data-deck-overflow` | current slide | How many px it overflows by |

**On the page:**

| Name | On | What it is |
| --- | --- | --- |
| `deck-ready` | `.reveal` | Slides are built. Slides are hidden until then. |
| `deck-dev` | `.reveal` | Checks are shown |
| `has-source`, `source-hidden` | `body` | The markdown panel is on, or hidden with M |
| `deck-source` | `aside` | The markdown panel. Children: `deck-source__head`, `deck-source__count`, `deck-source__type`, `deck-source__check`, `deck-source__code`. |
| `deck-error` | `pre` | The deck failed to load |

## Working on this package

```bash
npm run dev
```

Serves `examples/` at http://localhost:8080 with live reload. Each folder is a deck: an `index.html` is served as is, otherwise the first `.md` that starts with front matter is shown. Set `PORT` to change the port.

```bash
npm run build examples/glou-glou/glou-glou.md
```

Builds a deck from this repo with the CLI, into `build/glou-glou/`. Open its `index.html` from disk.

```bash
npm test
```

Checks the front matter parser, that `dist/` is up to date, that `docs/reference.md` documents every token and slide class, and that building [`examples/glou-glou/`](../examples/glou-glou/) matches the files in `test/snapshots/`. After an intended change, rewrite the snapshots with `UPDATE=1 npm test` and review the diff.

```bash
npm run dist
```

Rebuilds `dist/` from `src/` and `vendor/`. `deck.js` and `deck.css` are the files joined in order; there is no bundler. `npm run dev` does this on every change.

| Folder | Holds |
| --- | --- |
| `src/` | The runtime: `deck-config.js` (front matter), `deck-chrome.js` (builds slides, checks), `deck-charts.js`, `deck-source.js` (markdown panel), `deck-start.js` (starts it all), and the CSS |
| `src/themes/` | Built-in themes |
| `lib/`, `bin/` | The CLI and the dev server's renderer |
| `vendor/` | Third-party files, unchanged |
| `examples/` | `glou-glou` (every slide type and option; the test deck), `slide-types`, `drop-in` |

### Vendored libraries

Each file is byte-identical to the npm release named here. Licenses are in [`vendor/licenses/`](../vendor/licenses/) and are copied into `dist/licenses/` and every built deck.

| File | From | License |
| --- | --- | --- |
| `reveal.js`, `reveal.css`, `reset.css` | `reveal.js@5.2.1` `dist/` (headers say 5.2.0) | MIT; `reset.css` is public domain |
| `reveal-markdown.js` | `reveal.js@5.2.1` `plugin/markdown/markdown.js`, which bundles marked 4.x | MIT, marked MIT |
| `reveal-highlight.js` | `reveal.js@5.2.1` `plugin/highlight/highlight.js`, which bundles highlight.js 11.9.0 | MIT, highlight.js BSD-3-Clause |
| `chart.umd.min.js` | `chart.js@4.5.1` | MIT |
| `echarts.min.js` | `echarts@6.1.0` | Apache-2.0 (see `echarts-NOTICE`) |
