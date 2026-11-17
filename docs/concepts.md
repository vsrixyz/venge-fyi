# Introducing Venge Slides

Venge Slides takes a markdown document and turns it into a slide presentation. You write the content, and Venge automatically adds formatting and layout. The default presentation is quite good, but if you need more control it's easy to add classes to slides and elements.


## How it works

Every slide is a part of a markdown document. Here are the elements.

```markdown
---
# Headline
Some text.

![Picture](assets/picture.png)
```

### Deck
A deck is one markdown file. It can start with front matter: settings between two `---` lines at the very top.

```markdown
---
title: Story Ads
theme: dark
---
```

### Title
The deck's name, set with `title` in the front matter. It shows in the browser tab.

### Dividers
Every slide is delineated with `---` on a line by itself. If you want to do vertical slides use `--` instead.

### Headings
Headings are written with `#` characters. The number of `#` decides the size: `#` is the biggest, then `##`, then `###`. `####` is a label. If the same heading size appears more than once on a slide, each of those headings starts a **cluster**.

### Elements
An element is one paragraph, heading, image or list item. It's the smallest thing you can add a class to.

### Images
An image is anything that isn't text: a photo, a screenshot, a video, a chart. Images are written as `![alt text](file)`.

### Alt text
The words between the brackets in `![alt text](file)`. They describe the image for people who can't see it. If the file is missing, the slide shows them in its place.

### Captions
A line right under an image, with no blank line between, is its caption.

```markdown
![The bar at night](assets/bar.jpg)
Open since 2019.
```

### Clusters
A cluster is things that belong together. There are two kinds:

- A heading and everything under it, up to the next heading of the same size. A slide can hold up to 10.
- Images written one after another, with no text between.

```markdown
# Let's think about the audience

## Marketers
Not creative directors.

## Technical
More analytical than artistic.
```

Here each `##` starts a cluster. The `#` above them is just a heading.

### Labels
A label is small text in capitals, for a date, a category or a note. Write `####`, or add the `label` class to any element.

```markdown
16 November 2026 <!-- .element: class="label" -->
```

### Eyebrow
The eyebrow is a label at the top of the slide. Add the `eyebrow` class to any element to put it there. When the slide's text is left-aligned, the eyebrow sits right above the first heading instead. Only the first eyebrow on a slide counts.

```markdown
Mission <!-- .element: class="eyebrow" -->

# We help small teams tell clear stories.
```

### Speaker notes
A line starting with `Note:` starts the slide's speaker notes. Everything after it is hidden.

## Layouts

You don't pick a layout. Each slide reads what's on it and arranges itself. Two layouts, `split` and `prose`, you ask for with a class.

### Headline
Only text. It's centred and as big as the slide allows. For a title, a statement or a quote.

```markdown
# Story Ads

## A new chapter in search advertising
```

```text
┌──────────────────────────────────────┐
│                                      │
│             Story Ads                │
│   A new chapter in search advertising│
│                                      │
└──────────────────────────────────────┘
```

### Only images
The images fill the slide. They're shown whole, never cropped: tall images sit side by side, wide ones stack.

```markdown
![Specification, page 1](assets/spec-page-1.png)
![Specification, page 2](assets/spec-page-2.png)
```

```text
┌──────────────────────────────────────┐
│        ┌────────┐  ┌────────┐        │
│        │ page 1 │  │ page 2 │        │
│        │        │  │        │        │
│        └────────┘  └────────┘        │
└──────────────────────────────────────┘
```

### Figure
Text, then images. The text takes a third of the slide and the images take two thirds. Write the images first to put them on the left.

```markdown
## Launch

The product launched as Gallery Ads in May 2019.

![Gallery ads on a phone](assets/gallery-ads-phone.png)
```

```text
┌────────────┬─────────────────────────┐
│ Launch     │                         │
│            │          image          │
│ The product│                         │
│ launched…  │                         │
└────────────┴─────────────────────────┘
```

If text and images take turns more than once (text, an image, more text), the slide becomes prose.

### Clusters side by side
When a slide has clusters, they sit side by side, each with a line above it. Anything above the first cluster sits above them all.

```text
┌──────────────────────────────────────┐
│     Let's think about the audience   │
│ ──────────   ──────────   ────────── │
│ Marketers    Technical    Busy       │
│ Not creative More         They need  │
│ directors.   analytical…  clear rules│
└──────────────────────────────────────┘
```

### Split
Two halves, the right one tinted. With clusters, the right half starts at the second one.

```markdown
<!-- .slide: class="split" -->

## Before

Every ad was judged by taste.

## After

- A clear standard
- 36% fewer rejections
```

```text
┌──────────────────┬───────────────────┐
│                  │░░░░░░░░░░░░░░░░░░░│
│ Before           │░ After            │
│ Every ad was     │░ - A clear        │
│ judged by taste. │░   standard       │
│                  │░ - 36% fewer…     │
└──────────────────┴───────────────────┘
```

### Prose
One column, top to bottom, like a page. For paragraphs, tables and code. It's the only layout that scrolls.

## Classes

A class changes how something looks. It's written in an HTML comment, and where you put the comment decides what it changes: a slide, a cluster or an element.

### Slide classes
A `<!-- .slide: class="…" -->` comment at the top of a slide changes the whole slide.

- `split` and `prose`: the two layouts you ask for.
- `cards`: makes every cluster a card.
- `colors`: fills every cluster, each in the next theme colour.

### Modifiers
Slide classes that change the look but not the layout.

- `dark`: a dark background with light text.
- `light`: a light slide in a dark deck.
- `tint`: shows the background photo in the slide's background colour.
- `cards` and `colors`, above.

### Cluster classes
A `<!-- .cluster: … -->` comment on the line right above a cluster changes the whole cluster.

```markdown
## My initial approach

<!-- .cluster: class="stack" -->
![The first guidelines](assets/first-guidelines.png)
![The guidelines in use](assets/initial-approach.gif) <!-- .element: class="fragment" -->
```

- `stack`: the images sit on top of each other.
- `fill`: the images are cropped to fill their space.
- `bleed`: like `fill`, and they run off the edge.
- `fragment`: the whole cluster comes in on the next click.
- `card`: makes this cluster a card.
- `data-background-color="theme-2"`: fills this cluster.

### Element classes
A `<!-- .element: class="…" -->` comment at the end of an element changes only that element.

- `fragment`: the element comes in on the next click. On a heading, only the heading comes in; to bring in its whole cluster, put `fragment` on the cluster instead.
- `label`: shows it as a label.
- `eyebrow`: moves it to the top of the slide, as a label.
- `card`: makes this element a card.
- `data-background-color="theme-2"`: fills this element.

### Cards
A card is an outline with padding and rounded corners. Put `cards` on a slide to make every cluster a card, or `card` on one cluster or element.

### Fills
A fill is a background colour, written `data-background-color`. It always comes with padding, so text never touches the edge of the colour. A fill is separate from a card: something can be a card, filled, or both.

```markdown
<!-- .cluster: class="card" data-background-color="theme-2" -->
## Marketers
Not creative directors.
```

### Backgrounds
Any slide can have a background colour or photo.

```markdown
<!-- .slide: class="dark" data-background-image="assets/rejected-ad.gif" data-background-color="#000" data-background-opacity="0.45" -->

# Our standard wasn't clear
```

Colours can be any CSS colour, or a theme colour: `theme-1` to `theme-5`, `background`, `card`, `ink` or `line`.

## Themes

### Theme
A theme is the set of choices you change together to change how a deck looks: typefaces, colours, rounding and spacing. It lives in one CSS file. Pick one with `theme` in the front matter: a built-in name (`dark`, `signal`) or a path to your own file.

### Tokens
Each choice in a theme is a token, a CSS variable starting with `--deck-`, such as `--deck-theme-1` or `--deck-font-base`. A theme only sets the tokens it changes.

### Theme colours
Five colours, `theme-1` to `theme-5`, used for links, charts, `colors` and backgrounds.

### Accent
`accent` in the front matter sets `theme-1` for one deck, without writing a theme.

## Markdown source

Press M to show each slide's markdown beside it. Set `source: true` in the front matter to start with it open.

The full list of options is in the [reference](reference.md).
