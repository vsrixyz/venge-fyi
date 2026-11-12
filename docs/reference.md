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
theme: dark
---

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
| `eyebrow` | none | A small label at the top centre of every slide except the first. A slide's own `####` replaces it. See [Slides](#slides). |
| `accent` | the theme's | The colour for bullets, links, the quote mark and charts. Sets `--deck-theme-1`. Quote it: `accent: '#12467A'` (an unquoted `#` starts a comment). |
| `theme` | none | A built-in theme name (`dark`, `signal`) or a path to your own CSS file, relative to the deck file. |
| `charts` | `[]` | Chart libraries for charts written as JSON: `chartjs`, `echarts`. A deck that links a `.csv` file gets `chartjs` on its own. |
| `source` | `false` | Shows each slide's markdown in a panel beside it. Press M to hide it. |
| `page-numbering` | `false` | Shows Reveal's slide number in the bottom right corner of the window. The first slide has none. |

Other keys are ignored. Front matter is a small part of YAML: one `key: value` per line, with text, numbers, `true`/`false` and `[lists]`. Anything else (nesting, multi-line values) stops with an error that names the line.

### Slides

| Write | For |
| --- | --- |
| `---` on its own line, with a blank line above and below | A new slide |
| `--` on its own line, with blank lines around it | A slide below the current one |
| `<!-- .slide: class="prose" -->` | The slide's type and modifiers |
| `<!-- .cell: class="stack" -->` | Options for the cell that comes next. See [Cell options](#cell-options). |
| `Note:` | Starts the slide's speaker notes. They are hidden. Reveal's speaker view plugin is not included. |

Headings are sizes: `#` is the largest and `####` the smallest. The slide decides the actual size. Everything shows in the order you write it.

A `####` line is the eyebrow, a small label in capitals. It always shows at the top centre of the slide, whatever the slide type and wherever you write it. Only the first `####` on a slide is the eyebrow; any others stay where you wrote them.

The front matter `eyebrow` shows on every slide except the first. A slide's own `####` replaces it, and a blank `####` hides it on that slide.

Reveal's own markdown features still work, such as `<!-- .element: class="fragment" -->`.

## Slide types

Each slide has one type. A slide with no type is `grid`, and most slides need nothing else.

| Class | Use it for | Works best with |
| --- | --- | --- |
| `grid` | Almost everything | Text, pictures, or both. The slide finds its own [cells](#grid-slides). |
| `prose` | Longer text | `##` title, then paragraphs, lists, tables and code. The only type that scrolls. |
| `split` | Two sides | 2 [sections](#sections), one per half. Text only. |
| `cards` | A few short points | 2 to 6 [sections](#sections), each in a box. 2 or 4 go two across; 3, 5 or 6 go three across. |
| `columns` | Side-by-side text | 2 to 4 [sections](#sections) in one row. |

### Grid slides

A grid slide picks one of three layouts from what you write. Text that runs together is one cell; the pictures and charts beside it are another. Cells keep the order you wrote them in.

| Layout | You write | You get |
| --- | --- | --- |
| headline | Only text | One centred cell. `#` is headline size, or title size with headings only. `##` is a subtitle, `###` a small line. A `>` quote gets a big quote mark. |
| figure | Text, then pictures | Text in a third, the pictures in the other two thirds. Write the pictures first to put them on the left. |
| image | Only pictures | The pictures fill the slide |

Text and pictures that take turns more than once (text, a picture, more text) make a `prose` slide instead: one column, top to bottom. For parts side by side, use `columns` or `cards`.

Text scales with its cell. Pictures go 1 full, 2 across, 3 across, 4 as 2×2, 5 as 3 + 2, 6 as 3×2, 7 as 4 + 3, 8 as 4×2, 9 as 3×3, and past 9 four across. A short last row is centred. Beside text they turn on their side: 2 stack, 3 make 2 + 1, 4 a 2×2.

Pictures are shown whole, never cropped, unless you ask for `fill` or `bleed`.

**Captions.** Text directly under a picture, with no blank line between, is its caption. Under several pictures written on lines one after another, it captions them all. When pictures are separated by blank lines and more than one has text under it, each keeps its own caption, right under it.

```markdown
![The bar at night](assets/bar.jpg)
Open since 2019.
```

#### Cell options

A `<!-- .cell: … -->` comment sets options for the cell of whatever comes right after it.

| Class | What it does |
| --- | --- |
| `fill` | Crops the pictures to fill their cell |
| `bleed` | Like `fill`, and the cell runs off the slide's edge on the sides it touches |
| `stack` | Puts the pictures on top of each other, centred. A fragment on a later picture fades it in over the first. |

Other classes and attributes go on the cell too, such as `class="fragment"`.

```markdown
## My first try

<!-- .cell: class="stack" -->
![The first guidelines](assets/guidelines.png)
![Not like this](assets/not-like-this.gif) <!-- .element: class="fragment" -->
```

### Backgrounds

A slide's background uses Reveal's own attributes: `data-background-color`, `data-background-image`, `data-background-video`, `data-background-opacity` and the rest. Add `dark` for light text.

```markdown
<!-- .slide: class="dark" data-background-image="assets/street.jpg" data-background-color="#000" data-background-opacity="0.5" -->

# Text on a photo
```

`data-background-color` also takes the theme's colour names: `theme-1` to `theme-5`, `background`, `card`, `ink` and `line`. Any CSS colour works too.

### Sections

On `split`, `cards` and `columns`, each heading starts a part: a half, a card or a column. Everything under it, until the next heading, goes in that part: text, lists, images.

- With only `##` headings, each `##` starts a part.
- With `###` headings, each `###` starts a part, and a `##` above them is the slide's title.
- Anything above the first part stays on top, in the order you wrote it.

```markdown
<!-- .slide: class="cards" -->

## Check these before you share

### One idea
Each slide makes one point.

### Fits the frame
Nothing runs off the edge.
```

Part headings look the same whichever level you write: like `###` on cards and columns, like `##` on split.

Modifiers go in the same `class="…"`:

| Class | Works on | What it does |
| --- | --- | --- |
| `dark` | any type | Makes this slide dark. See [Light and dark](#light-and-dark). |
| `light` | any type | Makes this slide light on a dark deck. |

### When content doesn't fit the rules

Slides never warn. Whatever you write shows, in the order you wrote it: a tenth picture, a seventh card. Text that doesn't fit the frame runs off it, except on `prose`, which scrolls.

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

Colours come from `--deck-theme-1` to `--deck-theme-5`. Text and grid lines come from `--deck-ink-faint` and `--deck-line`. Any CSS colour works, including `color-mix()`. Charts on `dark` slides use that slide's colours.

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

The base theme is [`src/deck-tokens.css`](../src/deck-tokens.css). It is always loaded and holds every [token](#tokens). A theme is one CSS file that sets only the tokens it changes:

```css
:root {
  --deck-background: #ffffff;
  --deck-ink: #0b0b0c;
  --deck-theme-1: #ff4f1f;
}
```

Use it with `theme: path/to/my-theme.css` in the front matter, or add a `<link>` after `deck.css`. The built-in themes are `dark` and `signal`, in [`src/themes/`](../src/themes/).

Order matters: `deck.css`, then the theme, then the front matter `accent`.

### Light and dark

Slides are light unless you say otherwise:

- `theme: dark` makes every slide dark.
- `<!-- .slide: class="dark" -->` makes one slide dark. On a dark deck it changes nothing.
- `<!-- .slide: class="light" -->` makes one slide light. On a light deck it changes nothing.

Every colour comes in a pair: `--deck-background` and `--deck-dark-background`, `--deck-ink` and `--deck-dark-ink`, and so on. Each slide shows one side of each pair, picked by its CSS `color-scheme`. The greys, lines and inline code are mixed from ink and background on every slide, so they follow. `--deck-dark-theme-1` to `-5` are the theme colours lightened 40% toward white so they stay readable. An `accent` from the front matter is lightened too.

To change how dark looks, set the `--deck-dark-*` tokens in your theme. To make your own theme dark all over, add `:root { color-scheme: dark; }`, as `themes/dark.css` does. Don't set `--deck-background` to a dark colour for that: it is the light side, so `light` slides would turn dark too. Images are shown as they are: a diagram with dark lines on a clear background will be hard to see on a dark slide.

### Fonts

The default is the browser's sans-serif font for everything except code. Headings follow `--deck-font-base` unless you set `--deck-font-display`. To use a web font, add its `@font-face` to the theme and set the font tokens. Paths in `url()` are relative to the theme file.

```css
@font-face {
  font-family: "Inter";
  src: url("fonts/inter.woff2") format("woff2");
  font-weight: 100 900;
}

:root {
  --deck-font-base: "Inter", sans-serif;
}
```

The CLI copies a theme given by path, but not the files its `url()`s point to. Copy those yourself, or use full URLs.

### Tokens

All sizes are px on the fixed 1920×1080 frame; don't use `vw` or `vh`. Defaults are in [`src/deck-tokens.css`](../src/deck-tokens.css).

**Colours.** Set `--deck-background`, `--deck-card` and `--deck-ink`. The four marked *mixed* are worked out from ink and background on every slide, so they follow light and dark; don't set them.

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-background` | `#f7f5f2` | Page and slide background |
| `--deck-card` | `#fffdfa` | Cards, the second half of `split` |
| `--deck-ink` | `#1f1d1b` | Headings, bold text, `###` |
| `--deck-ink-soft` | *mixed*: 76% ink | Paragraphs, list items, table cells, subtitles |
| `--deck-ink-faint` | *mixed*: 52% ink | Labels, chart text |
| `--deck-line` | *mixed*: 12% ink | Lines, borders, chart grid, scrollbar |
| `--deck-code-inline` | *mixed*: ink at 9% | Inline code, the missing-image box |
| `--deck-theme-1` | `#12467A` | Bullets, numbers, links, quote mark and border, first chart colour. Front matter `accent` sets it. |
| `--deck-theme-2` | `#e1361f` | Second chart colour, overview background |
| `--deck-theme-3` | `#fbbe25` | Third chart colour, overview background |
| `--deck-theme-4` | `#2f7d5b` | Fourth chart colour |
| `--deck-theme-5` | `#7b4fa8` | Fifth chart colour |
| `--deck-dark-background` | `#1f1d1b` | `--deck-background` on dark slides |
| `--deck-dark-card` | `rgba(255, 255, 255, 0.06)` | `--deck-card` on dark slides |
| `--deck-dark-ink` | `#f7f5f2` | `--deck-ink` on dark slides |
| `--deck-dark-theme-1` | theme 1, 40% toward white | `--deck-theme-1` on dark slides |
| `--deck-dark-theme-2` | theme 2, 40% toward white | `--deck-theme-2` on dark slides |
| `--deck-dark-theme-3` | theme 3, 40% toward white | `--deck-theme-3` on dark slides |
| `--deck-dark-theme-4` | theme 4, 40% toward white | `--deck-theme-4` on dark slides |
| `--deck-dark-theme-5` | theme 5, 40% toward white | `--deck-theme-5` on dark slides |

**Code blocks.** The markdown panel (`source: true`) uses these too.

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-code-background` | `#22201d` | Code blocks; the markdown panel's background |
| `--deck-code-ink` | `#ece8e1` | Code block text, titles; the panel's text |
| `--deck-code-comment` | `#8f887e` | Comments; the panel's slide count and button border |
| `--deck-code-keyword` | `#e8859b` | Keywords, tags |
| `--deck-code-string` | `#93b0f0` | Strings, attributes |
| `--deck-code-number` | `#f0c766` | Numbers, literals, built-ins; the panel's slide type |

**Type**

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-font-base` | `sans-serif` | Body text, `###`, chart text |
| `--deck-font-display` | `var(--deck-font-base)` | `#` and `##` headings, quotes |
| `--deck-font-mono` | `ui-monospace, …, monospace` | Code, labels, numbered list markers |
| `--deck-weight-display` | `700` | `#` and `##` headings, the big quote mark |
| `--deck-text-title` | `200px` | `#` on a headline slide with headings only |
| `--deck-text-headline` | `144px` | `#` on a headline slide with text |
| `--deck-text-subheading` | `64px` | `##` on a headline slide |
| `--deck-text-heading` | `56px` | `#`/`##` on prose, cards and columns; quotes on a headline slide |
| `--deck-text-heading-small` | `48px` | `#`/`##` on a figure, and on `split` |
| `--deck-text-body` | `34px` | Paragraphs and lists. `###` and card labels are 5% larger. |
| `--deck-text-small` | `22px` | Labels: `####`, `###` on a headline slide, table headers; the missing-image box |
| `--deck-leading-title` | `0.82` | `#` on a headline slide with headings only |
| `--deck-leading-display` | `1.05` | Other `#` and `##` |
| `--deck-leading-snug` | `1.25` | The default; `###`, card labels, labels, tables |
| `--deck-leading-body` | `1.5` | Paragraphs, lists, code blocks |
| `--deck-track-display` | `-0.02em` | `#` and `##` |
| `--deck-track-caps` | `0.18em` | Labels |

**Space.** Set `--deck-space-m` and the others scale with it. You can still set one yourself.

| Token | Default | Used for |
| --- | --- | --- |
| `--deck-space-m` | `32px` | Between blocks; card and code padding, quote indent |
| `--deck-space-xs` | `12px` | The missing-image box |
| `--deck-space-s` | `20px` | Between list items; between the parts of a card or column |
| `--deck-space-l` | `48px` | Between cells, and between blocks on a headline slide and `split` |
| `--deck-space-xl` | `64px` | Between blocks on a headline slide with headings only; between columns |
| `--deck-inset-x` | `128px` | Left and right space inside a slide |
| `--deck-inset-y` | `64px` | Top and bottom space inside a slide |
| `--deck-inset-tight` | `96px` | Space inside each `split` half |
| `--deck-measure-prose` | `1040px` | Text width on `prose` and a headline slide. Quotes there are 25% wider. |
| `--deck-radius` | `8px` | Cards, code blocks. Inline code uses half. |

## Class names

These are public: themes and your own CSS can rely on them.

**On the slide `<section>`**, from your markdown: the [slide types](#slide-types) and modifiers above.

**Added by the runtime:**

| Name | On | What it is |
| --- | --- | --- |
| `deck-stage` | `div`, the only child of each slide besides notes and the eyebrow | Holds the slide's content. Insets and gaps are set here. |
| `deck-eyebrow` | `h4`, a child of the slide beside `deck-stage` | The eyebrow, from the slide's first `####` or the front matter |
| `data-shape` | `grid` slide's `deck-stage` | The layout: `headline`, `figure` or `image` |
| `deck-cell` | `grid` | Each cell. Also `deck-text` or `deck-pictures`, and any classes from a `.cell:` comment. |
| `deck-text` | `grid` | A text cell. `data-headings` when it holds only headings. |
| `deck-pictures` | `grid` | A cell of pictures. `data-count` is the number of pictures. |
| `deck-caption` | `grid` | A caption: the last child of its `deck-pictures`, or of a `deck-captioned` |
| `deck-captioned` | `grid` | A picture with its own caption, when a `deck-pictures` cell has several |
| `deck-head` | `split` | Holds anything above the halves, such as the title |
| `deck-half` | `split` | Each half |
| `deck-cards` | `cards` | The grid. `data-count` is the number of cards. |
| `deck-card` | `cards` | Each card |
| `deck-columns` | `columns` | The row. `data-count` is the number of columns. |
| `deck-column` | `columns` | Each column |
| `deck-chart` | any | The box around a chart |
| `deck-missing` | any | Stands in for a missing image or a failed chart. Children: `deck-missing__title`, `deck-missing__file`, `deck-missing__alt`. |
| `is-scrollable` | `prose` slide | The text is taller than the slide |

**On the page:**

| Name | On | What it is |
| --- | --- | --- |
| `deck-ready` | `.reveal` | Slides are built. Slides are hidden until then. |
| `is-first` | Reveal's `.slide-number` | Hides the number on the first slide |
| `has-source`, `source-hidden` | `body` | The markdown panel is on, or hidden with M |
| `deck-source` | `aside` | The markdown panel. Children: `deck-source__head`, `deck-source__count`, `deck-source__type`, `deck-source__code`. |
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
| `src/` | The runtime: `deck-config.js` (front matter), `deck-chrome.js` (builds slides), `deck-charts.js`, `deck-source.js` (markdown panel), `deck-start.js` (starts it all). CSS: `deck-tokens.css` (the base theme), `deck-layouts.css` (where cells and blocks go on each slide type), `deck-elements.css` (how text, lists, code, tables and cards look), `deck-page.css` (the panel, overview, load errors) |
| `src/themes/` | Built-in themes: `dark`, `signal` |
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
