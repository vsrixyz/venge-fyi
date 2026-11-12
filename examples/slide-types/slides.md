---
title: Slide types
description: The slide types, with sample content.
order: 0
accent: '#12467A'
---

#### Look & Point <!-- .element: class="eyebrow" -->

# Slide types

## How to write a deck in Markdown

### November 2026 · V. Sri

---

# Part 1: The slide types

---

#### Part 1 <!-- .element: class="eyebrow" -->

# Most slides need no type

### A slide with no type finds its own layout.

---

# Write, and the slide follows

Text alone sits in the middle, like this. Add a picture and the text moves to one side.

---

> Write the words first. Then add the pictures they need.

### Sample quote

---

<!-- .slide: class="prose" -->

## How to make a deck

Make a folder in `src/decks/` and put a file called `slides.md` inside it. The deck will show up at `/decks/<folder name>/`.

Start the file with the front matter. Then write your slides. Separates slides with three dashes. `---`

- The first line of a slide says its type
- If there is no type, the slide is `big`
- Put images in the same folder as `slides.md`

Note: This is a speaker note. Only the speaker can see it.

---

## Text and a picture

A few lines of text beside a picture or a screenshot.

![Screenshot of the slide type picker](picker.png)

---

![A Markdown file next to the slide it makes](editor-and-slide.png)

## Picture first

Write the picture first to put it on the left.

---

![Photo of a meeting room with a slide on the screen](room.jpg)

---

![Photo of a whiteboard after a workshop](whiteboard-before.jpg)
![Photo of the same whiteboard, cleaned up](whiteboard-after.jpg)

---

![Photo of the front of the office](office-front.jpg)

![Photo of the main meeting room](office-room.jpg)

![Photo of the kitchen](office-kitchen.jpg)

---

![Sticky notes, group 1](notes-1.jpg)
![Sticky notes, group 2](notes-2.jpg)
![Sticky notes, group 3](notes-3.jpg)
![Sticky notes, group 4](notes-4.jpg)

---

![Photo of people sorting sticky notes on a wall](workshop.jpg)
Workshop, October 2026

---

<!-- .slide: class="dark" data-background-image="stage.jpg" data-background-color="#000" data-background-opacity="0.5" -->

# Part 2: Images

---

<!-- .slide: class="split" -->

## Before

Each person builds slides their own way, so no two decks look the same.

## After

- Everyone writes Markdown the same way
- Text and images go in the right place on their own
- A check finds mistakes before the deck goes live

---

<!-- .slide: class="cards" -->

## Check these before you share a deck

- **One idea:** each slide makes one point.
- **Right type:** the slide type fits the content.
- **Fits the frame:** nothing runs off the edge.

---

<!-- .slide: class="columns" -->

## Who does what

### Writers

Write the slides in Markdown and pick a type for each one.

### Designers

Design the slide types in Figma and set the colours and sizes.

### Developers

Keep the code working and run the check on every deck.

---

| --- | --- |
| Slide types | 5, plus one-off styles | 10 |
| Checking | By hand, one slide at a time | Automatic, every slide |
| Images | Links to other websites | In the deck folder |
| Starting a deck | Copy an old one | Start a new file |

---

## Slides made each quarter

![Bar chart of slides made each quarter](assets/slides-per-quarter.csv "bar")
Sample data, not real numbers.

---

# Questions?
