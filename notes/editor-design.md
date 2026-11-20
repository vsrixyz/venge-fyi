# Editor design

A local command that opens a deck in the browser: you see the slides on the left and type markdown on the right.

```bash
npm run edit examples/glou-glou/glou-glou.md
```

For people using the package: `npx vengeslides edit talk.md`. Both print the address to open, e.g. `http://localhost:8090/`.

## Decided

- **Saving:** as you type. The file is written about 300 ms after you stop typing. The preview always shows the file as it is on disk, so it matches what `build` makes.
- **Text box:** the browser's own. No editor library. The current slide's lines are marked with a bar beside them, not coloured text.
- **First version:** text and preview. No slide strip: ← → move through the deck and Esc shows every slide (Reveal's overview). Removed 2026-11-19.
- **One deck per command.** The editor edits the file you name, nothing else.

## Not in the first version

The deck settings panel, the "Add slide" picker, slide-type buttons (dark, prose), the theme panel, editing several decks, and a browser-only version. The mock-ups keep these for later.

## Layout

```
┌──────────────────────────────┬──────────────┐
│ path                         │ markdown     │
│ preview                      │ (whole file) │
│                              │ ▌current     │
│                              │ ▌slide       │
└──────────────────────────────┴──────────────┘
```

- Moving the cursor goes to that slide. The front matter counts as slide 1.
- Outside the text, ← → ↑ ↓ and Esc reach the preview, and M slides the markdown out and back.
- The front matter folds open in a Deck box above the slides, and each slide is its own box (its own text field), so the cursor is always inside one slide. Separators and the blank lines around them live between boxes and are joined back exactly on save.
- Each box has delete in its header and a + on its lower edge to add a slide after it.
- Changing slide in the preview moves the cursor to the start of that slide's text.

## How it works

**Server** (`lib/edit.js`, started by `vengeslides edit`):

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
4. Find slides by splitting the text on the same separators as the deck. The front matter goes in its own box above the slides and is joined back, with its `---` lines as they were, when saving.

## When something goes wrong

This is tooling, so it fails loudly (see CLAUDE.md). Slides still never show warnings.

- **The deck file doesn't exist:** the command stops with `error: deck file not found: …`.
- **A save fails:** a message bar in the editor and a line in the terminal. The text stays in the box.
- **The file changes in another editor:** if you have no unsaved typing, the box reloads. If you do, a message bar asks whether to keep yours or load theirs. Nothing is overwritten silently.

## Unverified

- Whether reloading the preview on every save is fast enough. It should be for a 13-slide deck. Measure on `examples/story-ads`.
- **Verified:** slide thumbnails copy the rendered slides, including chart canvases as images. Checked on `examples/glou-glou` with 81 slides and 14 charts.
- Whether `npm run edit <file>` passes the file through on every npm version. It works on npm 11.
- Separators inside code blocks: a `---` line in a fenced code block. Check what Reveal does and match it.

## Docs and tests

- `docs/reference.md`: an `edit` section. The README gets one line.
- Tests: reading and saving round-trips the file, paths outside the folder are refused, a missing deck fails with the message above, and the shared splitter matches Reveal on the example decks.
