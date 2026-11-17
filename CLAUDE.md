# Working on Venge FYI

## The goal

A simple, friendly way to make good-looking slide presentations by writing markdown. You type, and a live preview shows the result. Out comes a folder you can open from disk or upload anywhere. Think of it as the new PowerPoint, and as a design system for horizontal storytelling.

Tooling may exist underneath, but the person using it shouldn't feel it. It's built on Reveal.js, vendored and pinned: use what Reveal already does (navigation, fragments, speaker notes, print) before writing our own, and never patch files in `vendor/`.

`TODO.md` is the only list of planned work. PDF, whole-site output, the editor, detailed theming and WYSIWYG editing are not built; don't describe them as existing.

## Principles

- **Build exactly what's needed.** The fewest features, tokens and slide types that do the job.
- **First deck in one command.** A markdown file with no front matter gives a good deck. Every option has a default; add an option only when a default can't do the job.
- **The README is the test of ease.** Someone new gets from nothing to a deck on screen using only its first screen.
- **A slide type is a container, not a kind of content.** It's a layout that should hold many kinds of content: `split` can take text, a list, a picture or a chart on either side. We don't make slides for one kind of content (a "timeline slide", a "team slide"). Not now, maybe much later.
- **Reuse before adding.** Stretch an existing container, or give it a general option (flip left/right or top/bottom), before making a new type.
- **We can't predict what people need, so we enable them.** If someone wants many charts on one slide, make that possible and make it look as good as it can. Enabling means containers accept whatever is written, not adding options ahead of need.
- **Never block, never scold.** No hints, warnings or error labels on slides or in the preview; the exceptions are the "File not found" box that stands in for a missing file, and sections past the tenth, which don't show (a dotted red line marks the slide while the markdown panel is open). Whatever someone writes shows, in the order they wrote it; past a container's comfortable size, it just looks as good as it can.
- **Markdown is the centre.** People write; they don't draw. A specific diagram is made elsewhere and brought in as an image. SVG and text-based diagrams (such as Mermaid) may come later.
- **Output works anywhere.** Built decks are plain folders that drop into any static site or host, so we never need a plan per site builder.
- **Base CSS is small and clean; themes add taste.** The base gives structure and good defaults. A theme (dark, literary, …) is an embellishment on top, not a rebuild.
- **A theme is one CSS file of `--deck-*` tokens.** Someone outside the project can write one without reading `src/`. If a look needs a selector, the base is missing a token: stop and ask.
- **Renaming or removing a token or class breaks people's themes.** Ask first.
- **Looking is the test.** After a visual change, open the example decks in each theme and look. Passing snapshots means unchanged, not good. If you didn't look, say so.
- **Taste is the person's call.** Show the result and a recommendation.

## How to work

- **Don't rush.** Before answering, work out what the person is trying to do, what is still unknown, and what hasn't been tested. Say what is unverified.
- **Get the meaning, not the words.** When the person explains an idea, restate what it means in your own words, not their phrases back.
- **Answer the general question.** A named tool is usually an example of a category: "Hugo or Astro" means "any static site builder".
- **Don't assume features or needs.** If it wasn't asked for, leave it out and say so.
- **Stop when the task is done.** Report what changed and what's unverified, then stop. No "next steps" or "could also" lists.
- **Note real problems once.** A real bug found in passing gets one line in `TODO.md`. Don't fix it or raise it again.
- **When in doubt, ask.** Ask before a design choice that is the person's to make. Explain the options in plain words with concrete examples (a file tree, a command), not abstract labels.
- **Never make a brittle choice.** In the tooling, fail loudly with a clear message instead of guessing. (For people writing decks, see "Never block, never scold".)
- **Commands must run as written.** Use real paths, never placeholders like `path/to/deck.md`. Keep them short; if a command is long, add an `npm run` script.

## Project rules

- Plain JS and CSS. No framework or bundler.
- Keep code comments very short.
- `--deck-*` tokens and slide-type class names are the public API. Document every one in `docs/reference.md` (a test checks this).
- Keep the README thin. Details go in `docs/reference.md`.
- Docs change in the same commit as behaviour: front matter options, CLI commands, tokens and classes. Docs describe what exists; plans stay in `TODO.md` and the design notes in `notes/`.
- Pin every vendored library and record its license in `vendor/licenses/`.
- Don't edit the lookpointweb site repo. It will switch to this package later.
- After changing `src/`, run `npm run dist`. After an intended change to built output, run `UPDATE=1 npm test` and review the snapshot diff.
