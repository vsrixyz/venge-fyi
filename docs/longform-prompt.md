# Longform to deck prompt

A prompt for a language model that turns a long markdown document into a vengeslides deck. Paste the document where the prompt says, give it all to the model, and save the answer as a `.md` file in the deck's folder.

The model's answer is a first draft. Read it against the source: it can drop or merge points.

The prompt describes the syntax in [reference.md](reference.md). When slide types, classes or front matter change, change the prompt in the same commit.

## The prompt

````markdown
You turn a longform markdown document into a slide deck for vengeslides, a tool that renders one markdown file as a presentation. The layout is automatic: each slide's shape comes from what you write on it. Your job is editing, not design: decide what goes on each slide, and in what order.

Output only the deck: one markdown file, starting with front matter. No commentary before or after it, and no code fence around it.

## How to work

1. Read the whole document first. Find its one main point (what the audience should leave believing) and the steps of the argument that lead there.
2. Plan the order of slides in your head before writing. One idea per slide. A long section of the source usually becomes several slides, and a short aside may become none.
3. The source is the truth. Don't add facts, numbers, names, quotes or claims that aren't in it. Keep the author's wording for key lines, and shorten everything else. Write in the source's language, and keep mixed-language text as it is.
4. Detail you cut from a slide goes in that slide's speaker notes (`Note:`), so nothing is lost.

## Writing a good slide

- A headline states the point, not the topic: "Onboarding changes halved churn", not "Results".
- Keep body text short: about 30 words, at most 5 bullets. If it won't fit, split it into more slides.
- Use `#` for the slide's main line and work down: `##`, then `###`. `####` is a small label in capitals.
- Vary the rhythm. Run a few dense slides, then a single big statement. Open each part of the argument with a headline-only slide.

## Shapes: what you write decides the layout

| Write | Shape | Use it for |
| --- | --- | --- |
| Only text | Headline: centred and big | The title, a key claim, the opening of a part |
| Only pictures | Image: the pictures fill the slide | Pictures that speak for themselves |
| Text, then pictures | Figure: text in a third, pictures in two thirds | A point plus its evidence. Put the pictures first to put them on the left. |
| The same heading level 2–10 times | Sections side by side, one per heading | Comparisons, lists of parallel ideas, steps, big numbers |
| `<!-- .slide: class="split" -->` | Two halves, the right one tinted | Before and after, problem and answer, claim and support |
| `<!-- .slide: class="prose" -->` | One column that scrolls | Tables, code, or a passage that has to stay whole. Use it rarely. |

Text, then a picture, then more text turns into prose on its own. Avoid it unless that's what you want.

Sections: a heading above the repeated ones is the title.

```markdown
## Three things changed

### Faster
Setup takes two minutes.

### Cheaper
Half the price of last year.

### Simpler
One screen instead of five.
```

Big numbers in sections:

```markdown
### Slides made

128 <!-- .element: class="r-fit-text" -->
```

## Syntax

- Front matter at the very top: `title` (always), and `description` (one sentence). Add nothing else unless the source asks for it.
- `---` on its own line, with a blank line above and below, starts a new slide. Don't use `--` (vertical slides).
- Slide classes go in one comment at the top of the slide: `<!-- .slide: class="split dark" -->`.
  - `dark` gives that slide light text on a dark background. Use it now and then for openers and big claims, not on every slide.
  - `cards` puts an outline around each section. `spectrum` fills each section with the next theme colour.
- Eyebrow: a small label at the top, for a part name or a date. Put `<!-- .element: class="eyebrow" -->` at the end of the line.
- `>` is only for words a named person or source actually said or wrote, copied exactly. A strong claim of your own is a `#` headline, not a quote.
- Pictures: `![alt text](path)`. Use only image paths that appear in the source, exactly as written. Never invent an image file. A line right under a picture, with no blank line between, is its caption.
- Background photo, only with an image from the source: `<!-- .slide: class="dark" data-background-image="path" data-background-color="#000" data-background-opacity="0.45" -->`.
- Charts: only for numbers that are in the source. Add `charts: [chartjs]` to the front matter and write:
  `<canvas data-chart="chartjs" data-config='{"type":"bar","data":{"labels":["Q1","Q2"],"datasets":[{"label":"Sales","data":[12,18]}]}}'></canvas>`
- Speaker notes: a line starting with `Note:` at the end of the slide. Everything after it is hidden.
- Ideas for pictures that don't exist yet go in the notes as `Note: Visual idea: …`. Never on the slide.
- Don't use other HTML, inline styles, fragments or animations.

## Check before you answer

- The first slide is the title: `#` with the title, and an optional `##` line under it. The last slide restates the main point or the call to action.
- Every slide has one idea, and its headline says it.
- No slide has more than 10 sections, or more than about 30 words of body text.
- Every number, name and quote is in the source.
- Every image path is from the source.
- The output is just the markdown file.

## The document

<document>
{{PASTE longform.md HERE}}
</document>
````
