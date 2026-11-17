# Slide types on one page

The full rules are in the [reference](reference.md#slide-types).

## One idea

You write; the slide reads its shape from what you wrote. Most slides need no class. Two you ask for: `split` and `prose`.

| You write | You get |
| --- | --- |
| Only text | [Headline](#headline) |
| Only pictures | [Image](#image) |
| Text, then pictures | [Figure](#figure) |
| The same heading size two or more times | [Sections](#sections) |
| `<!-- .slide: class="split" -->` | [Split](#split) |
| `<!-- .slide: class="prose" -->` | [Prose](#prose) |

## Headings

Start with `#` and work down. Every heading has the same style; the size follows the level.

| Write | Shows as |
| --- | --- |
| `#` | The biggest heading |
| `##` | Smaller |
| `###` | A little bigger than body text |
| `####` | A small label in capitals |
| `# Mission <!-- .element: class="eyebrow" -->` | The eyebrow: a small label at the top centre |

---

## Headline

Only text, centred and as big as the slide allows. For a title, a big statement or a quote.

```text
┌──────────────────────────────────────┐
│                                      │
│          # Big headline              │
│          ## Subheading               │
│          A short paragraph.          │
│                                      │
└──────────────────────────────────────┘
```

## Image

Only pictures. 1 fills the slide, 2 sit side by side, 3 in a row.

```text
┌──────────────┐  ┌──────┬──────┐  ┌────┬────┬────┐
│              │  │      │      │  │    │    │    │
│   picture    │  │      │      │  │    │    │    │
│              │  │      │      │  │    │    │    │
└──────────────┘  └──────┴──────┘  └────┴────┴────┘
```

## Figure

Text, then pictures: text in a third, pictures in two thirds. Write the pictures first to put them on the left.

```text
┌────────────┬─────────────────┐
│ ## Title   │                 │
│ Paragraph. │    picture(s)   │
│ - list     │                 │
└────────────┴─────────────────┘
```

## Sections

The same heading size used two or more times splits the slide: each of those headings starts a section, side by side, with a line above each. A heading above them is the title.

```text
┌──────────────────────────────────────┐
│               # Title                │
│ ──────────   ──────────   ────────── │
│ ## One       ## Two       ## Three   │
│ text         picture      - list     │
└──────────────────────────────────────┘
```

Put the sections in boxes:

| Write | Boxes |
| --- | --- |
| `<!-- .slide: class="cards" -->` | Every section, in the card colour |
| `<!-- .slide: class="colors" -->` | Every section, each in the next theme colour |
| `<!-- .cell: data-background-color="theme-2" -->` above one heading | That section only |

Up to 10 sections show. For a big number on a dashboard, mark it with Reveal's `r-fit-text`: it grows to fill its section.

## Split

Two halves; the right one tinted. The left half is the opening (or the first section); the right half is the rest. Each half reads its own shape: text alone is a headline, pictures alone an image.

```text
┌──────────────────┬───────────────────┐
│                  │░░░░░░░░░░░░░░░░░░░│
│ # The Shift      │░ - Name the Enemy │
│ ## Who your      │░ - Why now?       │
│    audience      │░░░░░░░░░░░░░░░░░░░│
└──────────────────┴───────────────────┘
```

## Prose

Everything in one column, in order, like a page. For paragraphs, tables and code. It scrolls.

---

## Pictures

Pictures written together are one group, on any slide type. They're shown whole. Put a `.cell` comment right above them to change that:

```markdown
<!-- .cell: class="fill" -->
![The bar](assets/bar.jpg)
```

| Option | What it does |
| --- | --- |
| *(none)* | The whole picture, as big as fits |
| `fill` | Cropped to fill its space |
| `bleed` | Cropped, and runs to the edge |
| `stack` | On top of each other; a fragment fades the next one in |

Text right under a picture, with no blank line, is its caption. A `.csv` file linked like a picture is a chart.

## Colour

| Write | What it does |
| --- | --- |
| `class="dark"` / `class="light"` | A dark or light slide |
| `data-background-color="theme-1"` | A background colour: `theme-1` to `theme-5`, `background`, `card`, `ink`, `line`, or any CSS colour |
| `data-background-image="assets/street.jpg"` | A photo behind the slide |
| `class="tint"` | The background photo in the background colour |
