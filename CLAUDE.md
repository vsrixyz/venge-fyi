# Working on Venge FYI

## The goal

A simple way to make good-looking slide presentations by writing markdown. You type, and a live preview shows the result. It is a design system for horizontal storytelling. You can output to a static site, or a single HTML file, or a PDF. It is free for individuals, and costs $5 per month for pro users.

Tooling may exist underneath, but the person using it shouldn't feel it. It's built on Reveal.js, vendored and pinned: use what Reveal already does (navigation, fragments, speaker notes, print) before writing our own, and never patch files in `vendor/`.

`TODO.md` is the list of planned work. `notes/` is the design notes, and `docs/reference.md` is the reference for users and theme authors.

## Principles of Good Design

- **Build fewer, better things.** Every new feature makes the product worse by default. Build on what exists before adding a new feature. If a new feature is needed, make it as small and general as possible.
- **Markdown is the center.** A markdown file with no additional styles can give a good deck. Every option has a smart default.
- **We are not a repository of slide types.** The goal is not to add a new slide type for every use bespoke case. The goal is to make a few slide types that work well for many use cases.
- **Don't be a nag.** No hints, tooltips, unnecessary warnings or error labels. The UX should help people know what to do. Editing the Markdown should get users 99% of the way there.
- **Output works anywhere.** Built decks are plain folders that drop into any static site or host, so we never need a plan per site builder.
- **Base CSS is small and clean; themes add taste.** The base gives structure and good defaults. Themes are embellishment on top, not a rebuild.

## How to work

- **Don't rush to act.** Before answering, work out what the user is trying to do, what is still unknown, and what hasn't been tested. Say what is unverified.
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
