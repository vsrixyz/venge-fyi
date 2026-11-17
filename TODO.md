# To do

## Next

- [ ] **Finish the editor.** Built on the `editor` branch: `npm run edit`, markdown with the current slide boxed, live preview drawn in the browser, saved as you type. Still to do: the slide strip, then a version with no install. Plan: `notes/editor-design.md`.
- [ ] **Add Reveal's speaker view.** `Note:` text is parsed but never shown. Vendor the notes plugin at Reveal 5.2.0, record its license, turn it on in `src/deck-start.js`, and document the `S` key in `docs/reference.md`.
- [ ] **Merge `grid-v1` into `main`.** It has the grid code, `docs/grid-design.md` and the example decks. Not pushed. Once it's merged, `claude/grid-design-2afdd8` (early notes and the prototype) can go.

## QA: grid-v1

Found while checking the example decks. Notes only; nothing built yet.

- [ ] **Pictures touch the eyebrow.** The eyebrow sits above the layout (32–54px from the top) and content starts at 64px, so pictures nearly touch it and `bleed` runs under it. Idea: on slides with an eyebrow, push the content down about 32px. Decide whether `bleed` should stop below it too.
- [x] **No heading over a group of pictures.** On a grid slide, a `##` after the text joins the text cell; the picture cell can't hold a heading. The fix is designed in `notes/grid-design.md` ("Headings as cell markers": two or more `##` make one cell per `##`) but not built.
- [x] **split: pictures run off the bottom.** Three pictures under a `##` in a split half stack full width at full size, and the third is cut off. The docs say split is text only, but nothing stops pictures, and "a slide type is a container" says it should hold them.
- [ ] **image: 3 and 5 pictures leave too much space top to bottom.** Rows split the slide's height equally, and wide pictures are shown whole inside each cell, so each one floats in a tall cell with empty bands above and below. With 5, the gap between the rows is as big as a picture. Idea: size rows to the pictures and centre the whole group on the slide.
- [ ] **Sections: pictures leave a band under them.** A picture under a heading takes its row's share of height and sits at the top, so short pictures leave empty space below (a sections slide with one picture under each heading).
- [x] **Move `columns` onto sections.** `notes/grid-design.md`: `columns` puts every cell in one row. (`split` is done.)
- [ ] **cards: the title should sit higher.** The title and the cards are centred together as one block, so with one row of cards the title floats in the middle of the slide. Wanted: the title near the top.
- [ ] **Heading sizes feel off; `#` should be bigger.** Outside headline slides, `#` and `##` are the same size (`--deck-text-heading`, 56px), so a `#` title on cards looks no bigger than a prose heading. Check the whole heading scale across slide types.
- [ ] **Bug: the dev server doesn't pick up `lib/` changes.** `scripts/dev.js` rebuilds `dist/` when `src/` changes, but `lib/render.js` and the front matter reader (`src/deck-config.js`, run once at start) stay as they were. A new front matter option does nothing until `npm run dev` is restarted, and nothing says so.
- [ ] **Bug: `data-count` counts tiles, not pictures.** With one caption per picture, `deck-pictures` gets the number of tiles. The docs say it's the number of pictures. They differ when one captioned paragraph holds several pictures.
- [ ] **Bug: on `split`, per-picture captions overflow.** Two pictures with their own captions in one half share its height without counting the captions, so the last caption runs off the bottom (`examples/focus-mode`, "Decisions, decisions").
- [ ] **Bug? Cards run almost to the slide edges.** About 40px from each side; other slide types keep `--deck-inset-x` (128px).
- [ ] **The eyebrow sits too close to the content.** On split it also straddles the line where the second half's card colour starts, so it reads as part of neither half. Options: move it higher, or make it a footer item at the bottom of the slide. (Goes with "Pictures touch the eyebrow" above.)

- [ ] **One way to fit content.** Today "too much on the slide" is handled six ways: the text shrink on sections, the picture cap on sections, the CSS height cap on picture groups, text that scales with cell width, the 9–10 "dense" step, and the `r-fit-text` box fit, each with its own numbers. Think through one fit step that every layout uses.

## Missing from the goal

- [ ] **PDF output.** There's no command for it yet. See `notes/slide-layout-lessons.md` §3.12: one page per slide, captured from the screen layout.
- [ ] **A prompt that turns a long narrative into a deck.** A core goal beside the editor: someone pastes long-form writing, and the prompt splits it into slides and picks the right type for each one, using only our types and options. Keep this in mind while designing: the rules for choosing a type should be plain enough to write down in `docs/reference.md` and hand to a model.
- [ ] **Whole-website output.** Decide if this is still wanted. Today a build is one deck folder.

## Later

- [ ] **Go through `notes/slide-layout-lessons.md`.** Check which "Copy" lessons the CSS already follows, then pick which of the rest to do.
- [ ] **Audit the base CSS and tokens for excess.** Do this before writing more themes.
- [ ] **Detailed theming.** Two themes so far: `dark` and `signal`.
- [ ] **Some WYSIWYG editing.**
- [ ] **A better light/dark.** `dark` mostly means "make the text light", and there's no real light mode. Rethink both names and what they do.
- [ ] **Prose stretches to its content.** Instead of scrolling inside the frame, a prose slide grows as tall as its text.
- [ ] **The markdown source (M) should look like the editor.** Today the panel and the editor show the markdown differently.
- [ ] **Layout names clash.** The `image` layout clashes with "image" (anything not text), and the `sections` layout and `deck-section` clash with "cluster". Pick new names.
- [ ] **Make adding elements to slides easier in the editor.** Slide and picture options are HTML comments (`<!-- .slide: class="dark" -->`, `<!-- .cluster: class="stack" -->`), and one slip, such as a missing colon, quietly does nothing. How to make this easier is not decided.
- [ ] **Replay chart animations.** Charts animate once, the first time their slide comes into view (`src/deck-charts.js`). Replay it each time the slide is shown.
- [ ] **Step through chart data.** Reveal a chart one series or one bar per click, like fragments.

## Log

Newest first. What changed and why, one entry per working session.

### 2026-11-17: content framework example (`main`, uncommitted)

- **New deck:** `examples/content-framework/content-framework.md`, the Inter core messaging framework (v2), copied unchanged from `inter.md`.
- **Images:** the original image names weren't available, so each image slide got a random photo from the ones added to `inter-content/assets` (copied over; the originals stay). There were 10 photos for 11 slides, so `pexels-ktccphotography` is used twice. The deck builds with no missing-file warnings. Not looked at in the editor.

### 2026-11-17: naming the concepts (`main`, `8a3e5d6`)

Went through every concept in the docs and the code looking for collisions and fuzzy names, then settled a vocabulary and built the parts that needed code.

- **Vocabulary:** slide, **cluster**, element are the three sizes a class can target. A cluster is a heading and what's under it, or images written together; the code keeps "cell" internally. An element is one paragraph, heading, image or list item ("block" is dropped). **Image** means anything not text. **Title** is only the deck's title. Slide types are **layouts**; "grid" is the logic that picks one and writers never see it. "Box", "column" and "picture" are gone.
- **`.cluster`:** the `.cell` comment is renamed, in the code and the example decks.
- **Fragments:** on a heading, `fragment` brings in only the heading. On a `.cluster` comment it brings in the whole cluster.
- **Label:** new `label` element class. `####` still makes a label too.
- **Eyebrow:** only a line you mark `eyebrow`. The front matter `eyebrow` and `hide-eyebrow` are removed.
- **Card and fill:** separate. A card is an outline with padding and rounded corners (`card`, or `cards` on a slide for every cluster). A fill is `data-background-color`, always with padding (`colors` on a slide fills every cluster). Both work on a cluster or one element. `cards` no longer fills, so those decks look lighter.
- **Docs:** `docs/slide-types.md` is now `docs/concepts.md`, a glossary for writers. `docs/reference.md` matches.
- **Decided, not built:** the four new items under Later (light/dark, prose that grows, the M panel matching the editor, layout name clashes). Modifiers and accent keep their names for now.

### 2026-11-17: renamed to vengeslides (`main`, `8d0fde1`)

- **Why:** the docs mixed `npx venge-fyi` and `npm run venge`. `venge` is taken on npm by someone else's package, so `npx venge` would run their code. `vengeslides` was free (checked, not reserved; `venge-fyi` was never published).
- **Package and command:** both are `vengeslides`, so `npx vengeslides`, `npx vengeslides edit talk.md`, `npx vengeslides build talk.md`. The CLI is `bin/vengeslides.js`. The `npm run venge`, `edit` and `build` scripts in this repo keep their names.
- **Repo:** GitHub is `vsrixyz/vengeslides` (the old address forwards), the folder is `~/dev/vengeslides`. `~/dev/venge-fyi-editor` and the `grid-design` worktree were left with the old name.
- **Docs:** `docs/reference.md`, `notes/editor-design.md`, tests and code comments use the new name.

### 2026-11-17: editor library (`editor` branch)

- **Start it:** `npm run venge` in this repo, or `npx vengeslides` with no file in any folder. Opens a library at http://localhost:8090.
- **Library:** a card for every `.md` that starts with front matter under the folder it runs in (skipping `node_modules`, `build`, dot-folders). Same cards as the `npm run dev` gallery, now shared in `lib/library.js`.
- **Editor:** the deck is chosen by the address (`?deck=examples/glou-glou/glou-glou.md`). A left rail with `<` goes back to the library, saving first. `vengeslides edit <file>` still opens one deck straight away; the file must be under the folder you run it in.
- **Server:** serves the whole library folder, refuses anything outside it, and only reads or saves `.md` files.
- **Decided:** `npm run dev` stays separate (working on the package itself). The mock-up's `slide` and `theme` rail buttons are not built.

### 2026-11-16: editor, first version (`editor` branch)

Built in its own folder, `~/dev/venge-fyi-editor`, on the `editor` branch, so the work on `main` could go on alongside. Not merged yet.

- **Start it:** `npm run edit examples/glou-glou/glou-glou.md`, then open http://localhost:8090.
- **Text and preview:** markdown on the left, the deck on the right. The preview is drawn in the browser from the text, not by the server. That's the first step towards a version with no install. A redraw takes about 55 ms on a 22-slide deck.
- **Current slide in a box:** the slide you're on is framed at the top of the markdown with a "Slide n of N · type" header. The rest is dimmed. Clicking, scrolling or changing slide in the preview glides the right slide into the box.
- **Saving:** typing is saved to the file about 300 ms after you stop. If the file changed on disk, the editor won't overwrite it and says so.
- **Under the hood:** `renderDeck()` moved to `lib/page.js` so the browser can run it. Slide splitting is shared (`deckSlides()`), so the editor and the M panel agree.
- **Open questions:** whether the preview changing as you scroll is distracting, since you might want to scroll without changing slide. The mock-up's slide strip, deck panel and slide-type buttons are not built.
