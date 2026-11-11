# Venge FYI

Markdown slides for normal people. It's a dead easy way to make presentations that look good and that lets you focus on making the presentation rather than think about formatting.

## Try it

```bash
npm run dev
```

Opens the example decks at http://localhost:8080. Edit a `.md` file in `examples/` and the page reloads.

```bash
npm run build examples/glou-glou/glou-glou.md
```

Builds a deck into `build/glou-glou/`. Open its `index.html` from disk or upload the folder anywhere.

## Use it on a site

Either build each deck with the command above, or copy `dist/` to your site and add a page next to your `deck.md`:

```html
<link rel="stylesheet" href="dist/deck.css" />
<div class="reveal" data-deck="deck.md"></div>
<script src="dist/deck.js"></script>
```

## Write a deck

```markdown
---
title: My talk
theme: dark
---

# My talk

---

# One point per slide
```

Slide types: `big`, `prose`, `figure`, `image`, `split`, `cards`, `columns`, `chart`. A theme is one CSS file that changes the `--deck-*` tokens.

Everything else (front matter, slide rules, charts, themes, tokens, class names) is in [docs/reference.md](docs/reference.md).

## Develop

`npm test` runs the tests. `npm run dist` rebuilds `dist/` after changing `src/`.

MIT licensed. Bundled libraries and their licenses are listed in the reference.
