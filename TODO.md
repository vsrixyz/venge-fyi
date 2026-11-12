# To do

## Next

- [ ] **Build the editor.** `npm run edit <deck.md>`: markdown, live preview and a slide strip in the browser, saved as you type. Plan: `docs/editor-design.md`.
- [ ] **Add Reveal's speaker view.** `Note:` text is parsed but never shown. Vendor the notes plugin at Reveal 5.2.0, record its license, turn it on in `src/deck-start.js`, and document the `S` key in `docs/reference.md`.
- [ ] **Merge `grid-v1` into `main`.** It has the grid code, `docs/grid-design.md` and the example decks. Not pushed. Once it's merged, `claude/grid-design-2afdd8` (early notes and the prototype) can go.
- [ ] **Commit `examples/chardonnay/`.** The last loose folder on `grid-v1`.

## QA: grid-v1

Found while checking `examples/chardonnay/`. Notes only; nothing built yet.

- [ ] **Pictures touch the eyebrow.** The eyebrow sits above the layout (32–54px from the top) and content starts at 64px, so pictures nearly touch it and `bleed` runs under it. Idea: on slides with an eyebrow, push the content down about 32px. Decide whether `bleed` should stop below it too.
- [ ] **No heading over a group of pictures.** On a grid slide, a `##` after the text joins the text cell; the picture cell can't hold a heading. The fix is designed in `docs/grid-design.md` ("Headings as cell markers": two or more `##` make one cell per `##`) but not built.
- [ ] **split: pictures run off the bottom.** Three pictures under a `##` in a split half stack full width at full size, and the third is cut off. The docs say split is text only, but nothing stops pictures, and "a slide type is a container" says it should hold them.
- [ ] **image: 3 and 5 pictures leave too much space top to bottom.** Rows split the slide's height equally, and wide pictures are shown whole inside each cell, so each one floats in a tall cell with empty bands above and below. With 5, the gap between the rows is as big as a picture. Idea: size rows to the pictures and centre the whole group on the slide.
- [ ] **cards: the title should sit higher.** The title and the cards are centred together as one block, so with one row of cards the title floats in the middle of the slide. Wanted: the title near the top.
- [ ] **Heading sizes feel off; `#` should be bigger.** Outside headline slides, `#` and `##` are the same size (`--deck-text-heading`, 56px), so a `#` title on cards looks no bigger than a prose heading. Check the whole heading scale across slide types.
- [ ] **Bug: the dev server doesn't pick up `lib/` changes.** `scripts/dev.js` rebuilds `dist/` when `src/` changes, but `lib/render.js` and the front matter reader (`src/deck-config.js`, run once at start) stay as they were. A new front matter option does nothing until `npm run dev` is restarted, and nothing says so.
- [ ] **Bug: `data-count` counts tiles, not pictures.** With one caption per picture, `deck-pictures` gets the number of tiles. The docs say it's the number of pictures. They differ when one captioned paragraph holds several pictures.
- [ ] **Bug? Cards run almost to the slide edges.** About 40px from each side; other slide types keep `--deck-inset-x` (128px).
- [ ] **Bug? No eyebrow on the cards slide.** Chardonnay's "Check these before you share a deck" has no `####` and the deck sets `eyebrow: Venge FYI`, so it should show. The screenshot may be cropped; check in the browser.
- [ ] **The eyebrow sits too close to the content.** On split it also straddles the line where the second half's card colour starts, so it reads as part of neither half. Options: move it higher, or make it a footer item at the bottom of the slide. (Goes with "Pictures touch the eyebrow" above.)

## Missing from the goal

- [ ] **PDF output.** There's no command for it yet. See `slide-layout-lessons.md` §3.12: one page per slide, captured from the screen layout.
- [ ] **A prompt that turns a long narrative into a deck.** A core goal beside the editor: someone pastes long-form writing, and the prompt splits it into slides and picks the right type for each one, using only our types and options. Keep this in mind while designing: the rules for choosing a type should be plain enough to write down in `docs/reference.md` and hand to a model.
- [ ] **Whole-website output.** Decide if this is still wanted. Today a build is one deck folder.

## Later

- [ ] **Go through `slide-layout-lessons.md`.** Check which "Copy" lessons the CSS already follows, then pick which of the rest to do.
- [ ] **Audit the base CSS and tokens for excess.** Do this before writing more themes.
- [ ] **Detailed theming.** Two themes so far: `dark` and `signal`.
- [ ] **Some WYSIWYG editing.**
- [ ] **Replay chart animations.** Charts animate once, the first time their slide comes into view (`src/deck-charts.js`). Replay it each time the slide is shown.
- [ ] **Step through chart data.** Reveal a chart one series or one bar per click, like fragments.
