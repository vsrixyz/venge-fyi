# Working on Venge FYI

## The goal

A simple, friendly way to make good-looking slide presentations by writing markdown. You type, and a live preview shows the result. Out comes a PDF, a local website or a whole website. Think of it as the new PowerPoint, and as a design system for horizontal storytelling.

Tooling may exist underneath, but the person using it shouldn't feel it. Later: detailed theming, maybe some WYSIWYG editing.

## Principles

- **Build exactly what's needed.** The fewest features, tokens and slide types that do the job.
- **A slide type is a container, not a kind of content.** It's a layout that should hold many kinds of content: `split` can take text, a list, a picture or a chart on either side. We don't make slides for one kind of content (a "timeline slide", a "team slide"). Not now, maybe much later.
- **Reuse before adding.** Stretch an existing container, or give it a general option (flip left/right or top/bottom), before making a new type.
- **We can't predict what people need, so we enable them.** If someone wants many charts on one slide, make that possible and make it look as good as it can.
- **Never block, never scold.** No hints, warnings or error labels on slides or in the preview. Whatever someone writes shows, in the order they wrote it; past a container's comfortable size, it just looks as good as it can.
- **Markdown is the centre.** People write; they don't draw. A specific diagram is made elsewhere and brought in as an image. SVG and text-based diagrams (such as Mermaid) may come later.
- **Output works anywhere.** Built decks are plain folders that drop into any static site or host, so we never need a plan per site builder.
- **Base CSS is small and clean; themes add taste.** The base gives structure and good defaults. A theme (dark, literary, …) is an embellishment on top, not a rebuild. Before writing more themes, audit the base CSS and tokens for excess.

## How to work

- **Don't rush.** Before answering, work out what the person is trying to do, what is still unknown, and what hasn't been tested. Say what is unverified.
- **Get the meaning, not the words.** When the person explains an idea, restate what it means in your own words, not their phrases back.
- **Answer the general question.** A named tool is usually an example of a category: "Hugo or Astro" means "any static site builder".
- **Don't assume features or needs.** If it wasn't asked for, leave it out and say so.
- **When in doubt, ask.** Ask before a design choice that is the person's to make. Explain the options in plain words with concrete examples (a file tree, a command), not abstract labels.
- **Never make a brittle choice.** In the tooling, fail loudly with a clear message instead of guessing. (For people writing decks, see "Never block, never scold".)
- **Commands must run as written.** Use real paths, never placeholders like `path/to/deck.md`. Keep them short; if a command is long, add an `npm run` script.

## Project rules

- Plain JS and CSS. No framework or bundler.
- Keep code comments very short.
- `--deck-*` tokens and slide-type class names are the public API. Document every one in `docs/reference.md` (a test checks this).
- Keep the README thin. Details go in `docs/reference.md`.
- Pin every vendored library and record its license in `vendor/licenses/`.
- Don't edit the lookpointweb site repo. It will switch to this package later.
- After changing `src/`, run `npm run dist`. After an intended change to built output, run `UPDATE=1 npm test` and review the snapshot diff.
