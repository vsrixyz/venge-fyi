# Editor design

A local command that opens a deck in the browser: you type markdown on the left and see the slides on the right.

```bash
npm run edit examples/glou-glou/glou-glou.md
```

For people using the package: `npx venge-fyi edit talk.md`. Both print the address to open, e.g. `http://localhost:8090/`.

## Decided

- **Saving:** as you type. The file is written about 300 ms after you stop typing. The preview always shows the file as it is on disk, so it matches what `build` makes.
- **Text box:** the browser's own. No editor library. The current slide's lines are marked with a bar beside them, not coloured text.
- **First version:** text, preview and the slide strip.
- **One deck per command.** The editor edits the file you name, nothing else.

## Not in the first version

The deck settings panel, the "Add slide" picker, slide-type buttons (dark, prose), the theme panel, editing several decks, and a browser-only version. The mock-ups keep these for later.

## Layout

```
┌──────────────┬──────────────────────────────┐
│ markdown     │ path · slide 3 of 13         │
│ (whole file) │ preview                      │
│ ▌current     │                              │
│ ▌slide       ├──────────────────────────────┤
│              │ [1] [2] [3] [4] …  strip     │
└──────────────┴──────────────────────────────┘
```

- Moving the cursor goes to that slide. The front matter counts as slide 1.
- Changing slide in the preview or the strip moves the cursor to the start of that slide's text.

## How it works

**Server** (`lib/edit.js`, started by `venge-fyi edit`):

| Address | What it does |
|---|---|
| `/` | The editor page. |
| `/source` | `GET` returns the file's text. `PUT` writes it: to a temporary file first, then renamed over the deck so a crash can't leave half a file. |
| `/deck` | The preview page, made by `renderDeck()` from the file, the same as `build` and `npm run dev`. |
| `/runtime/…` | `deck.js`, `deck.css`, themes and chart libraries from `dist/`. |
| `/events` | Tells the editor when the deck file changes. |
| anything else | Files in the deck's folder (images, CSV). Paths outside the folder are refused. |

The port is `PORT` or 8090. If it is taken, the command stops and says so.

The file-serving and reload code in `scripts/dev.js` moves into a shared module that both servers use.

**Editor page** (plain JS and CSS in `src/editor/`, copied into `dist/` by `npm run dist`):

1. Load `/source` into the text box.
2. On typing, wait 300 ms, then `PUT /source`.
3. When `/events` says the file changed, reload the preview at the same slide (`/deck#/3`). The new preview loads hidden and replaces the old one once it's ready, so it doesn't flash.
4. Find slides by splitting the text on the same separators as the deck. That splitting moves into one shared function, so the M panel and the editor can't disagree.

**Slide strip:** small copies of the preview's slides, scaled down. Charts are drawn into canvases that don't copy, so they're copied as images.

## When something goes wrong

This is tooling, so it fails loudly (see CLAUDE.md). Slides still never show warnings.

- **The deck file doesn't exist:** the command stops with `error: deck file not found: …`.
- **A save fails:** a message bar in the editor and a line in the terminal. The text stays in the box.
- **The file changes in another editor:** if you have no unsaved typing, the box reloads. If you do, a message bar asks whether to keep yours or load theirs. Nothing is overwritten silently.

## Unverified

- Whether reloading the preview on every save is fast enough. It should be for a 13-slide deck. Measure on `examples/story-ads`.
- Whether copying slides for the strip looks right, especially with charts, images still loading, and themes. This is the riskiest part. If it doesn't work, the fallback is one small preview per slide, which is heavier.
- Whether `npm run edit <file>` passes the file through on every npm version. It works on npm 11.
- Separators inside code blocks: a `---` line in a fenced code block. Check what Reveal does and match it.

## Docs and tests

- `docs/reference.md`: an `edit` section. The README gets one line.
- Tests: reading and saving round-trips the file, paths outside the folder are refused, a missing deck fails with the message above, and the shared splitter matches Reveal on the example decks.
