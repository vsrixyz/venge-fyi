# To do

## Next

- [ ] **Finish the editor.** Built so far: `npm run venge` (library) and `npm run edit`, markdown with the current slide boxed, live preview drawn in the browser, saved as you type. Still to do: search in the markdown pane (a place for it in the pane's sticky header), the deck settings pane, Add slide picker, then a version with no install. Plan: `notes/editor-design.md`.
- [ ] **"Changed on disk" loses the box's text.** The editor says to reload, but reloading replaces the box with the file, and there's no draft kept, so unsaved typing is gone. Proposed fix: the editor follows the file, loading changes from disk whenever the box has nothing unsaved. Add a way to collapse the editor: collapsed, it saves first and the disk wins; open, unsaved typing wins. Not decided: whether an open box with nothing unsaved still loads from disk (proposed: yes, or a keystroke saves stale text over the change).
- [ ] **Add Reveal's speaker view.** `Note:` text is parsed but never shown. Vendor the notes plugin at Reveal 5.2.0, record its license, turn it on in `src/deck-start.js`, and document the `S` key in `docs/reference.md`.
- [ ] **Delete old branches.** `grid-v1` and `new-slide-model` are merged into `main`. The remote branches `package-setup`, `simplify-base-css`, `site-options` and `slide-review-fixes` are fully in `main` too. `claude/grid-design-2afdd8` has 14 commits that never reached `main` (design notes, plus prototypes: the stack arrangement, shapes for 5, 7 and past 9, the petrus deck); check them against `notes/grid-design.md` first.

- [ ] **Editor: a slide's layout label can say `grid`.** Seen on glou-glou slide 9 (a quote); expected `headline`. Not reproduced in Chrome later: no box said `grid`.
- [ ] **`spectrum`: dark text on dark fills.** On glou-glou slide 55, the `theme-1` (blue) card keeps the dark body text, which is hard to read.

## Layout QA

Found while checking the example decks.

- [ ] **The eyebrow and the content.** Above a left-aligned heading it now sits in the text. Everywhere else it is top centre, outside the layout, and content starts just under it, so pictures nearly touch it and `bleed` runs under it. Options: push the content down on slides with an eyebrow, or move it to a footer. Not rechecked since the eyebrow became a marked line.
- [ ] **Sections: the title should sit higher.** The title and the sections are centred together, so with one row of cards the title floats in the middle of the slide. Wanted: the title near the top.
- [ ] **Heading sizes feel off; `#` should be bigger.** Outside headline slides, `#` is `--deck-text-heading` (56px), so a `#` title over sections looks no bigger than a prose heading. Check the whole heading scale across layouts.
- [ ] **Cards run almost to the slide edges?** About 40px from each side, where other layouts keep `--deck-inset-x` (128px). Found on the old `cards` layout; not rechecked on sections with `cards`.
- [ ] **Bug: on `split`, per-picture captions overflow.** Two pictures with their own captions in one half share its height without counting the captions, so the last caption runs off the bottom (`examples/focus-mode`, "Decisions, decisions").
- [ ] **Bug: `data-count` counts tiles, not pictures.** With one caption per picture, `deck-pictures` gets the number of tiles. The docs say it's the number of pictures. They differ when one captioned paragraph holds several pictures.
- [ ] **Bug: the dev server doesn't pick up `lib/` changes.** `scripts/dev.js` rebuilds `dist/` when `src/` or `vendor/` changes, but `lib/render.js` and the front matter reader (`src/deck-config.js`) are loaded once at start. A new front matter option does nothing until `npm run dev` is restarted, and nothing says so.
- [ ] **One way to fit content.** Today "too much on the slide" is handled six ways: the text shrink on sections, the picture cap on sections, the CSS height cap on picture groups, text that scales with cell width, the 9–10 "dense" step, and the `r-fit-text` box fit, each with its own numbers. Think through one fit step that every layout uses.

## Prompt QA

The longform prompt (`docs/longform-prompt.md`) is an output of this project, beside the editor and the built decks: someone pastes long writing and gets a deck that uses only our layouts and options. First test: `examples/substack-landscape/`, made from a brand-research write-up. Slides 1–17 were checked in a browser; 18–28 weren't.

- [ ] **Check slides 18–28 of `examples/substack-landscape/`** in Chrome Dev.
- [ ] **The headline count doesn't match the list.** "Six topics perform well" lists five; the sixth is only in the notes. The prompt's checklist doesn't catch it.
- [ ] **A slide with no headline.** The Free / Paid split states its point only in the notes.
- [ ] **A split with an empty half.** "The liver appears in no title in the scan" is a heading alone on the left; it should be the headline above both halves.
- [ ] **Extra front matter.** The model kept Obsidian's `date-created` and `date-modified`. Harmless, but the prompt says not to.
- [ ] **On `split`, `##` reads barely bigger than body text.** Fix the prompt (steer splits to `#`) or the heading scale; see "Heading sizes feel off" above.
- [ ] **Test more sources.** One deck is not a test: try a short essay, a document with images, one with a table of numbers, and one in another language.

Fixed: a finding written as a `>` quote ("No top or recent title in the scan mentions…"). The prompt now keeps `>` for words someone actually said or wrote.

## Missing from the goal

- [ ] **PDF output.** There's no command for it yet. See `notes/slide-layout-lessons.md` §3.12: one page per slide, captured from the screen layout.
- [ ] **Whole-website output.** Decide if this is still wanted. Today a build is one deck folder.

## Later

- [ ] **Layout names clash.** The `image` layout clashes with "image" (anything not text), and the `sections` layout and `deck-section` clash with "cluster". Pick new names.
- [ ] **A better light/dark.** `dark` mostly means "make the text light", and there's no real light mode. Rethink both names and what they do.
- [ ] **Prose stretches to its content.** Instead of scrolling inside the frame, a prose slide grows as tall as its text.
- [ ] **Go through `notes/slide-layout-lessons.md`.** Check which "Copy" lessons the CSS already follows, then pick which of the rest to do.
- [ ] **Audit the base CSS and tokens for excess.** Do this before writing more themes.
- [ ] **Detailed theming.** Two themes so far: `dark` and `signal`.
- [ ] **Editor: make slide and cluster options easier to add.** They are HTML comments (`<!-- .slide: class="dark" -->`, `<!-- .cluster: class="stack" -->`), and one slip, such as a missing colon, quietly does nothing. How is not decided.
- [ ] **Editor: some WYSIWYG editing.**
- [ ] **Charts: replay the animation.** Charts animate once, the first time their slide comes into view (`src/deck-charts.js`). Replay it each time the slide is shown.
- [ ] **Charts: step through the data.** Reveal a chart one series or one bar per click, like fragments.

## Log

Newest first. What changed and why, one entry per working session.

### 2026-11-19: toolbar (`editor`)

- **Built:** the toolbar under the preview, as decided below; icon over a word on each button. Colour and Image open a small panel above the button. Removing an image also removes tint.
- **Upload:** `POST /_/asset?deck=…&name=…` saves a picture or video into `assets/` beside the deck. A different file with the same name gets `-2`; the same file again is reused. Tested.
- **Pane header:** stays at the top as the slides scroll, with Top. Search is for later.
- **Checked in Chrome** on a copy of glou-glou: ↓ between boxes, the colour panel, and Cards and Spectrum appearing on a sections slide and redrawing it. Not checked: image upload, tint.

### 2026-11-19: toolbar decisions, `spectrum` (`editor`)

- **Renamed:** the `colors` slide class is now `spectrum` (each section filled with the next theme colour). Code, docs, the longform prompt and glou-glou.
- **Toolbar, decided:** layout (auto by default, split or prose); background colour (Default is the theme's own background, then the theme colours); background image (none by default, a URL or an upload into `assets/`). Controls appear only when they apply: tint only once there's an image (it does nothing without one), and Cards and Spectrum only on a slide with sections, as two on/off toggles, since both can be on at once (glou-glou has two such slides).

### 2026-11-19: editor layout (`editor`)

- **Slide strip removed:** its thumbnails were unstyled (Reveal draws backgrounds on a layer outside the slide, so a copied slide lost them). ← → and Esc already move through the deck, so the strip went rather than being fixed. Outside the text, those keys now reach the preview.
- **Markdown on the right,** preview on the left, to try it.
- **Decided, not built:** slide options move to a toolbar under the preview; the markdown keeps showing every line, `.slide:` comment included. The toolbar won't offer `dark`/`light` (to be rethought as one toggle for the theme's dark version) or motion. A background image can be a URL or an upload into `assets/`.
- **`big`:** removed in `31fbdaf`; dropped a leftover from `content-framework`.
- **Old markdown panel removed:** `src/deck-source.js`, its CSS, the `source` front matter option and its classes. M now belongs to the editor, where it slides the markdown pane out and back. The dotted red line for sections past ten went with the panel. `deckSlideType()` (the editor's slide label) moved to `deck-chrome.js`.
- **One box per slide:** each slide is its own text field, so the cursor can't land between slides, and changing slide jumps straight to its box (no glide). Typing a `---` line splits a box. Each box has delete and a + to add a slide after it; delete has no undo. Scrolling the pane no longer changes slide. The "Slide n of N" count moved to the bar above the preview.
- **Bug fixed:** removing the panel's CSS also removed the rule that sized `.reveal` to the window, so every deck drew at zero height. `deck-page.css` sizes it again. The snapshot test didn't catch it (it checks HTML only).
- **Front matter box:** the front matter folds open above the slides in its own box and is joined back on save, `---` lines unchanged (checked on LF, CRLF, empty and front-matter-only files).

### 2026-11-19: substack-landscape edits (`editor`, `df79bc4`)

- **By hand, not by the prompt:** the Free / Paid slide now has a `#` headline ("Gating content") and is no longer a split; "Six topics" is a `cards` list with all six topics; the "opportunity" slides were reworded. The prompt itself is unchanged, so the Prompt QA items stay open. The "Six topics" note still starts with a stub ("Sixth topic: st").

### 2026-11-19: cards from a list (`editor`)

- **`cards` on a list:** a `cards` slide with no repeated headings had nothing to turn into cards, so a plain bulleted list stayed a list. Now a list that ends the slide becomes the clusters, one card per item, with anything above it as the title. A `.element` comment on an item (a fill, `card`, `fragment`) goes to its card. Two ways to write clusters is on purpose: a simple list should be enough.
- **Not extended:** `colors` still needs headings. Checked in the browser by V, not by Claude.
- **Long lone `#`:** a slide with only headings put its `#` at title size, however long. An 82-character sentence ran six lines at 200px, and the tight title leading made the lines collide. Now title size is only for a `#` of 30 characters or fewer; longer ones keep the headline size and leading. Chose length over measuring lines: predictable, and print matches the screen. The cutoff is a guess; `#` of 25–30 characters still get title size.

### 2026-11-19: slide strip, longform prompt, two example decks (`editor`, `8caeb6f`)

- **Slide strip:** the editor has a horizontal strip of slides (`src/editor/`).
- **Longform prompt:** `docs/longform-prompt.md`, first tested on `examples/substack-landscape/`; see Prompt QA.
- **New deck:** `examples/3c-motion/`, "The three sees of design": slides written as positioned HTML with its own `3c.css` theme and GIF backgrounds. Not checked by Claude.
- **TODO:** the grid-v1 QA list became Layout QA, and the long-form prompt idea became the Prompt QA section.

### 2026-11-17: content framework example (`main`, `8a3e5d6`, `a699bfb`)

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
- **Headline quotes** (`ed7dbb3`): larger, and in the display weight, leading and tracking.
- **Decided, not built:** the four new items under Later (light/dark, prose that grows, the M panel matching the editor, layout name clashes). Modifiers and accent keep their names for now.

### 2026-11-17: renamed to vengeslides (`main`, `8d0fde1`)

- **Why:** the docs mixed `npx venge-fyi` and `npm run venge`. `venge` is taken on npm by someone else's package, so `npx venge` would run their code. `vengeslides` was free (checked, not reserved; `venge-fyi` was never published).
- **Package and command:** both are `vengeslides`, so `npx vengeslides`, `npx vengeslides edit talk.md`, `npx vengeslides build talk.md`. The CLI is `bin/vengeslides.js`. The `npm run venge`, `edit` and `build` scripts in this repo keep their names.
- **Repo:** GitHub is `vsrixyz/vengeslides` (the old address forwards), the folder is `~/dev/vengeslides`. The `grid-design` worktree was left with the old name. `~/dev/venge-fyi-editor` is an empty leftover holding only `.claude/`.
- **Docs:** `docs/reference.md`, `notes/editor-design.md`, tests and code comments use the new name.

### 2026-11-17: editor merged, extra folder removed (`main`, `8d76093`, `a8cee96`)

- **Merged:** the `editor` branch went into `main`, then `new-slide-model` was merged on top (`8d76093`). `~/dev/venge-fyi` went back to being on `main`.
- **Cleaned up:** `~/dev/venge-fyi-editor` was only ever meant to be temporary, so it and the `editor` branch were deleted. Its uncommitted `inter-content` deck moved into `examples/`. Its `package-lock.json` and its test edits to glou-glou were dropped.
- **Pushed:** `main` went to GitHub with the `inter-content` deck and the `CLAUDE.md` edits (`a8cee96`). The push was 35–40 MiB at about 100 KiB/s, so it took about 6 minutes. Most of the size is the `focus-mode` images (about 8 MB; `fork-in-the-road.gif` alone is 4.2 MB) and `dist/deck.js` (1.1 MB), which was committed five times.

### 2026-11-17: editor library (`main`, `a97ebce`)

Built in a second session started from the editor work, and merged into `main` the same morning.

- **Start it:** `npm run venge` in this repo, or `npx vengeslides` with no file in any folder. Opens a library at http://localhost:8090.
- **Library:** a card for every `.md` that starts with front matter under the folder it runs in (skipping `node_modules`, `build`, dot-folders). Same cards as the `npm run dev` gallery, now shared in `lib/library.js`.
- **Editor:** the deck is chosen by the address (`?deck=examples/glou-glou/glou-glou.md`). A left rail with `<` goes back to the library, saving first. `vengeslides edit <file>` still opens one deck straight away; the file must be under the folder you run it in.
- **Server:** serves the whole library folder, refuses anything outside it, and only reads or saves `.md` files.
- **Decided:** `npm run dev` stays separate (working on the package itself). The mock-up's `slide` and `theme` rail buttons are not built.

### 2026-11-16: editor, first version (`1063193` to `1785313`, merged into `main` 2026-11-17)

Built in a second folder, `~/dev/venge-fyi-editor` (a git worktree on the `editor` branch), so the work on `main` could go on alongside in another session. Started from the Figma mock-ups and `notes/editor-design.md`. The long-term goal is an editor that runs in the browser with no install, so the first steps were chosen to carry over to that.

- **Start it:** `npm run edit examples/glou-glou/glou-glou.md`, then open http://localhost:8090.
- **Text and preview:** markdown on the left, the deck on the right. The preview is drawn in the browser from the text, not by the server. That's the first step towards a version with no install. A redraw takes about 55 ms on a 22-slide deck.
- **Current slide in a box:** the slide you're on is framed at the top of the markdown with a "Slide n of N · type" header. The rest is dimmed. Clicking, scrolling or changing slide in the preview glides the right slide into the box.
- **Saving:** typing is saved to the file about 300 ms after you stop. If the file changed on disk, the editor won't overwrite it and says so.
- **Under the hood:** `renderDeck()` moved to `lib/page.js` so the browser can run it. Slide splitting is shared (`deckSlides()`), so the editor and the M panel agree. The current-slide box is drawn on a layer under a see-through text box, which is still the browser's own (no editor library). The server is `lib/edit.js`, and the content types are shared with `npm run dev` in `lib/types.js`.
- **Tests:** saving round-trips the file, a file changed on disk isn't overwritten, paths outside the folder are refused, and a missing deck gives a clear error.
- **Fixed along the way:** typing straight after a click stopped the glide halfway; the glide now finishes. The saving commit broke `npm run dev`: `contentType('.html')` reads `.html` as a hidden file with no extension, so pages were sent as unknown files. It was fixed with `contentType('page.html')`.
- **Open questions:** whether the preview changing as you scroll is distracting, since you might want to scroll without changing slide. The mock-up's slide strip, deck panel and slide-type buttons are not built.
