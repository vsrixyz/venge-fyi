# To do

## Next

- [ ] **Build the editor.** `npm run edit <deck.md>`: markdown, live preview and a slide strip in the browser, saved as you type. Plan: `docs/editor-design.md`.
- [ ] **Add Reveal's speaker view.** `Note:` text is parsed but never shown. Vendor the notes plugin at Reveal 5.2.0, record its license, turn it on in `src/deck-start.js`, and document the `S` key in `docs/reference.md`.
- [ ] **Merge the grid layouts.** Two branches, neither pushed nor merged. `claude/grid-design-2afdd8` has the design notes (`docs/grid-design.md`) and the prototype. `claude/grid-v1` has the real code, without the notes. `examples/petrus/grid-proto.js` needs the notes.
- [ ] **Commit or drop the loose files.** `slide-layout-lessons.md`, `examples/grid-cases/` and `examples/petrus/` aren't in git.

## Missing from the goal

- [ ] **PDF output.** There's no command for it yet. See `slide-layout-lessons.md` §3.12: one page per slide, captured from the screen layout.
- [ ] **Whole-website output.** Decide if this is still wanted. Today a build is one deck folder.

## Later

- [ ] **Go through `slide-layout-lessons.md`.** Check which "Copy" lessons the CSS already follows, then pick which of the rest to do.
- [ ] **Detailed theming.** Two themes so far: `dark` and `signal`.
- [ ] **Some WYSIWYG editing.**
