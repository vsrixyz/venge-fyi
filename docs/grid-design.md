# Grid layout: design notes

Status: V1 is built (see `docs/reference.md`, [Grid slides](reference.md#grid-slides)). The "Later" parts below are designed, not built. The prototypes used to design it are on the `claude/grid-design-2afdd8` branch.

## The idea

A slide is a grid of cells. A cell holds one thing: text, a picture (or a group of pictures), or a chart. The grid has no look of its own; it only places cells. This could replace most of today's slide types (`big`, `figure`, `image`, `split`, `columns`, `cards`, `chart`). `prose` stays its own type because it scrolls.

## Names

The three layouts a grid slide picks are **headline** (text only), **figure** (text in a third, pictures in two thirds) and **image** (pictures only). Text and pictures that take turns more than once fall back to **prose**. The other types keep their names: `prose`, `split`, `cards`, `columns`.

## V1

Real decks are simple. In petrus, 20 of 22 slides were one block of text or text beside pictures. In a 63-slide agency deck ("The Art of Deck Making"), nearly every slide was big text alone, a photo behind text, or a photo with a caption. V1 builds only these.

**V1:**

- Text alone: one centred cell.
- Text beside pictures, either side; the pictures share their half.
- Pictures alone, in the count shapes.
- Picture fit: whole, `fill`, `bleed`.
- Captions: text directly under a picture, with no blank line.
- `stack` for a picture over a picture.
- Slide backgrounds in Reveal's words, with theme colour names.
- `prose`, fragments and auto-animate.

**Later** (designed below, not built):

- Two or more `##` splitting a slide into cells, `cards`, `columns`.
- Cell backgrounds.
- `rows` and `columns` for arranging a picture group. Two tall pages beside text need one of these, or a half that chooses by the pictures' shape.

Until then, today's `split`, `cards` and `columns` slide types keep working as they do now.

## Agreed

**A default slide finds its own cells.** No class is needed.

- Text that runs together (headings, paragraphs, lists, quotes) is one cell.
- Pictures and charts beside that text form one group, with or without blank lines between them.
- Cells keep the order they were written in.

| You write | You get |
| --- | --- |
| Only text | One centred cell, like today's `big` |
| Text, then pictures | Text in one half, the picture group in the other |
| Pictures, then text | The same, with the pictures on the left |
| Only pictures | The pictures fill the slide |
| Text, picture, text | A prose slide: one column, top to bottom |
| A picture with a line directly under it (no blank line) | The line is the picture's caption, shown under it. Under a group, it captions the whole group. |

**Shapes by count.** 1 full, 2 across, 3 across, 4 as 2×2, 5 as 3 + 2, 6 as 3×2, 7 as 4 + 3, 8 as 4×2, 9 as 3×3. Inside a half, the shapes turn on their side: 2 stack, 3 make 2 + 1, 4 a 2×2.

- Every cell is the same size, so text scales the same in each.
- A short last row is centred.
- Past 9: four across, adding rows (10–12 make 4×3). Nothing is hidden. Cells just get smaller, and text that hits its smallest size runs off its cell.

**Options.**

- `<!-- .slide: class="columns" -->` puts every cell in one equal row. Text, a chart and a photo give equal thirds.
- `<!-- .cell: class="rows" -->` arranges the cell that comes next. The comment applies to the cell of whatever follows it.
  - `grid` (the default): pictures in a grid.
  - `rows`: pictures one above the other.
  - `stack`: pictures on top of each other, centred, each at its own size. A fragment on a later picture fades it in over the earlier one.
- Picture fit, also on `.cell:`. Whole (the default): never cropped, for screenshots, documents and charts. `fill`: cropped to fill the cell, inside the slide's margins. `bleed`: like `fill`, but running off the slide's edge. Not yet in the prototype.
- Layering at an exact spot (a mark on one ad, a label in one corner of a photo) is out of V1. It's drawing, not writing.

**Alignment.** Text is centred on a one-cell slide and on two text cells side by side (today's `big` and `split`). Everywhere else it is left-aligned.

**Text size** scales with the cell (container query units), within limits.

**Backgrounds.** A slide and a cell use the same words: Reveal's `data-background-color`, `-image`, `-size`, `-position` and `-opacity`. A slide takes them in `<!-- .slide: -->`, a cell in `<!-- .cell: -->`. A background picture fills the cell, cropped to cover it, and the cell's text sits on top. A plain `![]()` picture stays content. A chart is never a background.

```markdown
<!-- .cell: class="dark" data-background-color="theme-1" -->
## Visual formats
```

- `data-background-color` takes a theme colour name, a CSS colour name (`navy`) or any CSS colour (`#4285f4`). Reveal ignores a bare name, so the runtime turns theme names into theme colours first. Tested: Reveal draws `var(--deck-accent)` as a slide background.
- Any colour token's name without `--deck-` works as a value: `theme-1` to `theme-5`, `background`, `ink`, `card`, `line`. The prototype maps `theme-1` to `theme-3` onto today's three accents.

**Colour token names** (a public API change, made when the grid is built):

| Today | New |
| --- | --- |
| `--deck-bg` | `--deck-background` |
| `--deck-ink`, `-ink-soft`, `-ink-faint` | unchanged: ink is the text colour, and `--deck-text-*` stays the font sizes |
| `--deck-rule` | `--deck-line` |
| `--deck-panel` | `--deck-card` |
| `--deck-accent`, `-2`, `-3` | `--deck-theme-1`, `-2`, `-3`; new `-4`, `-5`. Charts get five colours. |
| `--deck-wash` | removed, with `image overlay`; background opacity replaces it |
| `--deck-dark-*` | follow the same names: `--deck-dark-background`, `-card`, `-theme-1` … |
| `--deck-code-panel` | `--deck-code-background`; `--deck-code-bg` (inline code) becomes `--deck-code-inline`. `code-ink` and the syntax colours stay. |

**Reveal features work per cell.** Tested in Chrome:

- `.cell:` comments don't split slides, and the prototype reads them.
- A cell can be a fragment, and cells can appear in any order with `data-fragment-index`.
- Auto-animate morphs cells, headings and pictures between two grid slides; new cells fade in.
- Text sizes hold under Reveal's scaling and in `?print-pdf`.

**Headings as cell markers.**

- Two or more `##` on a slide make one cell per `##`. A single `##` is an ordinary heading, so a title with a subtitle stays whole. No class is needed.
- `<!-- .slide: class="prose" -->` stops the split: one left-aligned column, in order, scrolling if it's long.
- The `#` line and anything before the first `##` (an eyebrow, an intro line) sit above the cells, full width.
- Everything after a `##`, up to the next one, belongs to that cell in order: text, lists, `###` subheadings, pictures, charts.
- A picture in a `##` cell is content: the heading sits above it. Making it the cell's background is an option (syntax still open).
- An empty `##` starts a cell with no title, such as a photo-only cell. The empty heading is removed from the slide.
- A fragment on the `##` brings in the whole cell; a fragment on anything inside brings in just that thing.
- `<!-- .slide: class="cards" -->` draws the cells as boxes.

## Open

Taken one at a time, in roughly this order.

1. A better way to make text light than `class="dark"`. On a cell, `dark` also flips the colour pairs, so the prototype resolves colour names on the slide to keep `theme-1` the same colour everywhere.
2. Whether `columns` should split a picture group into separate cells (a blank line between pictures would do it).

## What the real deck showed

`examples/petrus/` is a real portfolio deck (Story Ads), converted with only the rules above plus Reveal's own `data-background-*`. Most slides came out right with no class at all.

- **Worked:** title slides, text beside one picture (either side), six pictures as a 3×2, slide background colours and a background photo with a wash.
- **Heading, picture, caption** (slide 15): three cells in a row leave the picture tiny. The original stacked them top to bottom.
- **One big picture with several small ones** (last slide): the group makes all five the same size, so the main picture loses its weight.
- **Two tall pages beside text** (slide 19): stacking makes them tiny. `<!-- .cell: class="columns" -->` fixes it, but that option isn't agreed yet.
- **Labels placed on a photo** (the 2×2 wall): can't be written. That belongs in the image itself.
- **Pictures are fitted whole, not cropped**, in the prototype. That suits screenshots, which most of this deck is.
- **Slide backgrounds:** `dark` slides paint their own background over Reveal's `data-background-color`. The prototype turns that off when a slide has one.
