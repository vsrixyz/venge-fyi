# How slides work

You don't pick a layout. You write markdown, and each slide arranges itself from what's on it. Three rules explain all of it. The full details are in the [reference](reference.md#slide-types).

## The three rules

### 1. Text, pictures, or both

What a slide holds decides its shape.

- **Only text:** centred and big. For a title, a statement or a quote.
- **Only pictures:** the pictures fill the slide.
- **Text, then pictures:** the text takes a third of the slide and the pictures take two thirds. Write the pictures first to put them on the left.

If text and pictures take turns more than once (text, a picture, more text), the slide reads top to bottom, like a page.

### 2. Repeat a heading size to make sections

When the same heading size appears two or more times, each of those headings starts a section. The sections sit side by side, each with a line above it. A single heading above them is the slide's title.

Heading size follows the number of `#`: `#` is the biggest, then `##`, then `###`. `####` is a small label.

### 3. Pictures written together are one group

Pictures written one after another, with no text between, are a group. They're shown whole and as big as they fit: tall pictures sit side by side, wide ones stack. A line right under a picture, with no blank line between, is its caption.

### Two layouts you ask for

The rules cover most slides. For the rest, add a class at the top of the slide:

- `split`: two halves, the right one tinted.
- `prose`: one column of text that scrolls, for paragraphs, tables and code.

## Examples

### A title

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

### Text beside a picture

```markdown
## Launch

The product launched as Gallery Ads in May 2019.

![Gallery ads on a phone](assets/gallery-ads-phone.png)
```

```text
┌────────────┬─────────────────────────┐
│ Launch     │                         │
│            │         picture         │
│ The product│                         │
│ launched…  │                         │
└────────────┴─────────────────────────┘
```

### Two tall pictures

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

Two wide pictures would stack instead, one above the other.

### Three points

```markdown
# Let's think about the audience

## Marketers
Not creative directors.

## Technical
More analytical than artistic.

## Busy
They need clear rules.
```

```text
┌──────────────────────────────────────┐
│     Let's think about the audience   │
│ ──────────   ──────────   ────────── │
│ Marketers    Technical    Busy       │
│ Not creative More         They need  │
│ directors.   analytical…  clear rules│
└──────────────────────────────────────┘
```

### The same points in boxes

Add `cards` to put each section in a box, or `colors` for a different theme colour in each.

```markdown
<!-- .slide: class="cards" -->

# Let's think about the audience

## Marketers
…
```

```text
┌──────────────────────────────────────┐
│     Let's think about the audience   │
│ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│ │Marketers │ │Technical │ │Busy    │ │
│ │…         │ │…         │ │…       │ │
│ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────────────────────┘
```

### Before and after

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

### One picture after another

A `.cell` comment right above a group of pictures changes how they show. `stack` puts them on top of each other; a fragment fades the next one in.

```markdown
## My initial approach

<!-- .cell: class="stack" -->
![The first guidelines](assets/first-guidelines.png)
![The guidelines in use](assets/initial-approach.gif) <!-- .element: class="fragment" -->
```

The other options are `fill`, which crops the pictures to fill their space, and `bleed`, which crops them and runs them off the edge.

### Text on a photo

```markdown
<!-- .slide: class="dark" data-background-image="assets/rejected-ad.gif" data-background-color="#000" data-background-opacity="0.45" -->

# Our standard wasn't clear
```

`dark` makes the text light. Any slide can have a background colour or photo.
