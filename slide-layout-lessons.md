# Slide layout lessons for a reveal.js markdown presentation tool

These lessons come from studying the code of a mature commercial slide editor, called **the originator software** below. They cover three topics: **alignment**, **theming** and **fiddly spacing/overflow/print fixes**. Every lesson has been rewritten for a tool that turns Markdown into reveal.js decks with CSS themes, and exports to live preview, static HTML and PDF.

## How to read this

The originator software does not use CSS layout for slides. Each slide is a fixed 1280×720 box that a JavaScript engine lays out with absolute positions, using text measured from a hidden DOM. You can't reuse its code. What carries over is the problems it hit and the fixes and numbers it settled on.

Each entry has:

- **Problem**: the actual bug or visual flaw.
- **Fix**: what the originator software does.
- **Originator code**: the smallest snippet that shows the fix, with its source location in the originator codebase. It is evidence, not code to copy.
- **In reveal.js**: what reveal.js already does, where it falls short, and what to build.
- **Verdict**:
  - **Copy**: a general rule.
  - **Adapt**: the idea is sound, but the details belong to the originator.
  - **Avoid**: the originator learned this the hard way, so do the opposite.

Where the reason behind a choice is a guess, it is marked *(guess)*.

The reveal.js facts were checked against revealjs.com and the reveal.js `master` source (`js/reveal.js`, `js/controllers/backgrounds.js`, `js/controllers/printview.js` and `css/theme/template/*.scss`). Check them again against the version you pin.

---

## reveal.js defaults to change on day one

| Setting | reveal.js default | Recommendation | Why |
|---|---|---|---|
| `width` × `height` | 960 × 700 (not 16:9) | 1280 × 720, or 1920 × 1080 | Matches projectors and PDF expectations. All the originator software's numbers assume 1280×720. |
| `margin` | 0.04 | `0`, with your own safe area in CSS (§1.2) | reveal's margin is empty viewport space around the scaled slide, not a content safe area. It also inflates PDF pages: page size = `floor(size × (1 + margin))`, so 960×700 becomes 998×728 and pages stop being an exact ratio. |
| `center` | `true` | `false`, and centre per layout in CSS (§1.4) | Geometric vertical centring moves the title on every slide depending on how much content follows it. |
| `minScale` / `maxScale` | 0.2 / 2.0 | Keep, or raise `maxScale` for large screens | Fine as is. |
| `pdfMaxPagesPerSlide` | `Infinity` | `1` | Otherwise an overflowing slide quietly becomes two PDF pages (§3.12). |

---

## 1. Alignment

### 1.1 Lay out at one fixed size, then scale the whole slide
- **Problem:** if layout runs at each display size, line wraps (and therefore which content fits) differ between preview, player, thumbnails and PDF.
- **Fix:** always lay out at 1280×720, then scale with `transform: scale(min(w/1280, h/720))`. The player centres the slide with `translate(-50%,-50%)` and letterboxes it.
- **Originator code** (`js/canvas/v10/canvas/canvas.js:81`):
  ```js
  this.CANVAS_WIDTH = this.options.canvasWidth || 1280;
  this.CANVAS_HEIGHT = this.options.canvasHeight || 720;
  ```
- **In reveal.js:** this is built in. `layout()` computes `scale = min(presentationWidth / width, presentationHeight / height)`, clamps it to `minScale`/`maxScale`, rounds to 0.01, and applies `translate(-50%, -50%) scale(s)` to `.slides`. It also exposes `--slide-scale`.
  - **Do not set `disableLayout: true`.** You would lose exactly this behaviour.
  - When you measure text for auto-fit (§3.7), use `offsetHeight`/`scrollHeight`, which are unaffected by the transform. `getBoundingClientRect()` returns scaled values.
- **Verdict:** Copy. reveal.js already gives you this; just don't defeat it.

### 1.2 One safe area, defined once
- **Problem:** content starts at a different distance from the edge on each slide type.
- **Fix:** one 50px inset on all sides for every slide, defined once in the theme. Layouts that need something different (full bleed, title slides) override it explicitly.
- **Originator code** (`static/themes/v10/default.scss:112`):
  ```scss
  ElementMargin { margin: 50px 50px 50px 50px; }
  ```
- **Cautionary tale:** the literal `50` was later typed again by hand in at least six overrides, for example `Math.max(50 - canvasMargin.left, 0)` (`js/canvas/v10/elements/base/CanvasElement.js:573`). Changing the token no longer changes the layout.
- **In reveal.js:** set `margin: 0` and add `--safe: 50px` (at 1280 wide). Apply it as `padding: var(--safe)` on every `section`, using `box-sizing: border-box` and an explicit height (see 1.3). Full-bleed layouts use `calc()` with `--safe`, never a literal.
- **Verdict:** Copy.

### 1.3 One outer frame owns the regions; layouts only fill the body
- **Problem:** headers, footers and content overlap or drift when every layout positions its own title.
- **Fix:** one root layout function cuts space from the canvas in a fixed order: side panels, then header, then footer reservation, then safe area. Whatever remains is the body box handed to the layout.
- **Originator code** (`js/canvas/v10/elements/base/CanvasElement.js:368`):
  ```js
  let primaryBounds = bodyBounds.deflate(canvasMargin);
  ```
- **In reveal.js:** make every `section` a CSS grid with named areas. Your layout containers (`title`, `split`, `grid`…) style only the `body` area.
  ```css
  .reveal .slides section {
      box-sizing: border-box;
      height: 100%;            /* verify in devtools that sections get the full configured height */
      padding: var(--safe);
      display: grid;
      grid-template-rows: auto 1fr auto;
      grid-template-areas: "header" "body" "footer";
  }
  ```
  reveal positions sections absolutely and sets `display` itself in some modes. Scope your grid to `.present` and `.past`/`.future` as needed, and test it in `?print-pdf`, which builds its own page wrappers.
- **Verdict:** Copy.

### 1.4 The header owns the top inset, so titles land in the same place everywhere
- **Problem:** the title moves between layouts when each layout adds its own top padding, or when content is vertically centred.
- **Fix:**
  - With the header on top, the canvas's top margin is set to 0.
  - The header's own padding (`50 50 30 50`) puts the title's first line at x=50, y=50 on every slide.
  - A fixed `marginBottom: 50px` gives the title-to-body gap.
  - The header uses its measured height, so a two-line title pushes the body down, but the title itself never moves.
- **Originator code** (`js/canvas/v10/elements/base/CanvasElement.js:463`, `static/themes/v10/decorations/none_left.scss:7`):
  ```js
  if (this.headerPosition === HeaderPositionType.TOP) {
      canvasMargin.top = 0;
  }
  ```
  ```scss
  padding: 50px 50px 30px 50px;
  ```
- **In reveal.js:** this is the main reason to set `center: false`. Pin the first heading to the `header` grid area. Centre only the `body` area, and only when the layout asks for it (`align-content: center`). Title and section-divider slides can centre everything with a layout class.
- **Verdict:** Copy. Pin the title and let the body flow.

### 1.5 Optical vertical centring
- **Problem:** content centred exactly in the space under a title looks too low.
- **Fix:** when a header is on top, "middle" alignment moves up by 10% of the unused space, measured against 75% of the container height.
- **Originator code** (`js/canvas/v10/elements/layouts/ElementLayouter.js:205`):
  ```js
  // adjust for optical white space
  if (adjustOptical && ...headerPosition === HeaderPositionType.TOP) {
      offsetY -= Math.max(this.containerSize.height * 0.75 - this.size.height, 0) * 0.1;
  }
  ```
- **In reveal.js:** grid can't express "shift by a share of the leftover space" directly. Two options:
  - Cheap: unequal spacers, `grid-template-rows: 0.9fr auto 1.1fr` in the body.
  - Exact: a small JS pass after layout.
  Either one is on by default only for centred-body layouts.
- **Verdict:** Adapt. The idea is general; the constants were tuned by eye.

### 1.6 Full bleed means growing back by the safe area, minus a gutter
- **Problem:** images should touch the slide edge, or sit an exact gutter from it, while text stays inside the safe area.
- **Fix:** grow the image box by the safe-area margins, then shrink by a 10px gutter. Don't grow the bottom edge when a caption sits below. Full-bleed layouts also cut the header-to-body gap from 50px to 20px (`js/canvas/v10/elements/elements/Header.js:211`).
- **Originator code** (`js/canvas/v10/elements/elements/Headline.js:183`):
  ```js
  imageGridBounds = imageGridBounds.inflate({
      top: canvasMargins.top - gutterSize,
      right: canvasMargins.right - gutterSize, ...
  ```
- **In reveal.js:** `.bleed-right > figure { margin: calc(var(--gutter) - var(--safe)); margin-left: 0; }`. Images in the bleed area use `object-fit: cover` (§3.11).
- **Verdict:** Copy.

### 1.7 Split layout: fixed side column, centred vertically
- **Problem:** with the title in a side column, the title column needs a predictable width and should be centred.
- **Fix:** the side header is 400px wide out of 1280 (about 31%), centred vertically. The body loses that width.
- **Originator code:** `js/canvas/v10/elements/base/CanvasElement.js:480`.
- **In reveal.js:** `grid-template-columns: 400px 1fr` (or a token), with `align-self: center` on the title.
- **Verdict:** Copy. The numbers are a sensible starting point.

### 1.8 A fixed footer band, with space reserved
- **Problem:** the logo and slide number overlap content.
- **Fix:** the footer always takes the bottom 50px of the full canvas. The body gives up 40px for it unless a layout opts out and lets the footer overlay it, as full-bleed images do. With the footer on, the body ends 90px from the bottom.
- **Originator code** (`js/canvas/v10/elements/base/CanvasElement.js:489`):
  ```js
  const footerBounds = new geom.Rect(0, canvasBounds.height - footerHeight, canvasBounds.width, footerHeight);
  ```
- **In reveal.js:** `slideNumber` and `showSlideNumber` draw outside your slide DOM. For a themeable footer (logo, page number, deck title), render it into the `footer` grid area of each section, or as one fixed overlay plus a body reservation token (`--footer-reserve: 40px`).
- **Logo sizing (Adapt):** logos narrower than 1.5:1 fill the band height. Wider logos are capped at 100px wide (`js/canvas/v10/elements/elements/Footer.js:228`). Without a rule like this, wordmarks look huge and square marks look tiny.
- **Verdict:** Copy the band and the reservation. Adapt the logo numbers.

### 1.9 Trim text to cap height and baseline
- **Problem:** CSS line boxes add space above and below the letters, and that space differs per font and line height. Text never lines up with shapes, margins or neighbouring columns, and a "20px gap" looks different in every font.
- **Fix:**
  - For each font, measure the ink height of "H" and the baseline position once, and cache them.
  - Subtract the space above the cap and below the baseline from each block's bounds.
  - Every block's top is then the top of a capital and its bottom is the baseline. Spacing values then mean the visible gap (§3.1).
- **Originator code** (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:281`):
  ```js
  // calculate space above and below the H character in a line at the given lineHeight
  block.topSpace = block.middleOfText - block.fontHeight / 2;
  block.bottomSpace = (textStyles.fontSize * textStyles.lineHeight) - (block.middleOfText + block.fontHeight / 2);
  ```
  It is measured with `ctx.measureText("H").actualBoundingBoxAscent` (`TextLayoutHelpers.js:87`).
- **In reveal.js:** use CSS `text-box: trim-both cap alphabetic` on headings and paragraphs. Check current browser support, especially for your PDF renderer (Chromium supports it). If you need a fallback, measure cap height once per font with the canvas API after fonts load. Write it to a `--cap-trim` variable and apply it as negative `margin-block` on the first and last lines.
- **Verdict:** Copy. This is the single most valuable alignment technique in the originator software.

### 1.10 Anchor decorations to the cap height and baseline
- **Problem:** underlines, accent bars and side-by-side "title next to content" layouts shift when the font changes.
- **Fix:** ornaments are placed from the trimmed heading bottom, which is the baseline. Layouts that centre a title against content centre the first line's cap height.
- **Originator code** (`js/canvas/v10/elements/layouts/BlockLayouts.js:103`):
  ```js
  textProps.bounds.top = contentSize.height / 2 - firstLineHeight / 2;
  ```
- **In reveal.js:** once headings are trimmed (1.9), `::after` underlines placed with `margin-top: 0.5cap` behave consistently across fonts. The originator software's offsets (`+33`, `+22`, `+30`px) are magic numbers chosen per theme. Express them in `cap` or `em` units instead.
- **Verdict:** Copy the anchoring. Avoid px magic numbers.

### 1.11 Correct each typeface's apparent size in the font, not the theme
- **Problem:** at the same px size, a condensed display face (Bebas Neue) looks tiny and a wide one (Montserrat) looks huge. Natural leading also differs.
- **Fix:** each font definition carries a size-correction percentage plus its own line height and letter spacing. Text size is multiplied by the percentage.
- **Originator code** (`static/themes/v10/fonts/bebasneue-title-heavy.scss:5`; applied in `js/canvas/v10/elements/base/Text/TextElement.js:877`):
  ```scss
  $titleFontLineHeight: 1.4;
  $titleFontLetterSpacing: 0.02;
  $titleFontScaling: 125;
  ```
  Montserrat uses `91`.
- **In reveal.js:** put the correction in each font's definition: `@font-face { size-adjust: 125%; }`, plus a per-font `--line-height` and `--tracking`. Themes then pick fonts without re-tuning sizes. Note that reveal's heading line height (1.2) and paragraph line height (1.3) are font-agnostic.
- **Verdict:** Copy.

### 1.12 Snap edges to whole pixels
- **Problem:** fractional positions blur hairlines and image edges.
- **Fix:** round the body box's top and height in logical (unscaled) units (`js/canvas/v10/elements/base/CanvasElement.js:393`).
- **In reveal.js:** keep tokens in whole px at the logical size. reveal rounds the scale to 0.01, which helps.
- **Verdict:** Copy. It's cheap.

---

## 2. Theming

### 2.1 Merge layers in a fixed order, and await every one
- **Problem:** you need a predictable answer to which layer wins.
- **Fix:** the base stylesheet, then background, decoration, element style, shapes, weights, font settings, effects and finally user CSS. Later layers win. Per-slide overrides (background, colour, font scale) apply last, at render time.
- **Originator code** (`js/core/models/theme.js:103`):
  ```js
  const styleSheet = await this.loadStyleSheet(getVersionedThemeUrl(null, "default"));
  this.loadStyleSheet(getVersionedThemeUrl("backgrounds", ...), styleSheet);   // ← no await
  await this.loadStyleSheet(getVersionedThemeUrl("decorations", decoration), styleSheet);
  ```
  The missing `await` means the background layer can land after the decoration layer, and both set the same variable. *(guess: a latent race; no bug was observed.)*
- **In reveal.js:** use CSS cascade layers so source order can't matter: `@layer reveal, base, theme, layout, slide;`. Import reveal's CSS into the `reveal` layer so that your base always wins over it. Per-slide overrides come from markdown `<!-- .slide: class="…" style="…" -->`.
- **Verdict:** Copy layering. Avoid order that depends on load timing.

### 2.2 Name colours by role and resolve them late, with modifiers
- **Problem:** styles need "theme colour at 50%" or "darker" without baking in RGB values that go stale when the palette changes.
- **Fix:** colour values are written as `name [alpha | darkenN | lightenN]`, e.g. `primary 0.5` or `secondary 0.08`. The name is resolved at render time against the actual background.
- **Originator code** (`js/core/models/palette.js:152`):
  ```js
  colorMods = color.split(" ").slice(1);
  color = color.split(" ")[0];
  ```
- **In reveal.js:** use plain CSS: `color-mix(in oklab, var(--accent) 50%, transparent)`, or relative colour syntax. Never write hex outside the palette block.
- **Verdict:** Copy.

### 2.3 Foreground roles come in light/dark pairs, picked by the background
- **Problem:** text must stay readable on light, dark and coloured backgrounds without every component knowing which one it's on.
- **Fix:** `primary` and `secondary` each have `_light` and `_dark` values. Asking for `primary` returns the one that contrasts with the background behind it.
- **Originator code** (`js/core/models/palette.js:107`):
  ```js
  if (backgroundColor.isDark(canvasBackgroundColor) || (backgroundColor.isColor && forceWhiteForPrimaryOnColor)) {
      return this.getColor(PaletteColorType.PRIMARY_LIGHT);
  ```
- **In reveal.js:** reveal already decides dark versus light for you, with caveats. On each slide sync it adds `has-dark-background` or `has-light-background` to the `section` and copies it to `.reveal`. It decides from `data-background-color`, falling back to the background element's computed colour. Brightness below 128 counts as dark. The stock theme template does **not** style these classes, so you must:
  ```css
  section.has-dark-background  { --fg: var(--fg-on-dark);  --fg-muted: var(--fg-muted-on-dark); }
  section.has-light-background { --fg: var(--fg-on-light); --fg-muted: var(--fg-muted-on-light); }
  ```
  Components use only `--fg`/`--fg-muted`, never the pair tokens.
- **Verdict:** Copy.

### 2.4 Every background declares whether it is light, dark or colour, images included
- **Problem:** contrast logic needs one representative colour even when the background is an image or a gradient.
- **Fix:** image and gradient backgrounds carry a `colorStyle` of `dark`, `color` or `light`, which stands in for black, the theme colour or white when picking foregrounds.
- **Originator code** (`js/canvas/v10/elements/base/CanvasBackground.js:80`):
  ```js
  switch ((this.backgroundImage ?? this.backgroundGradient).colorStyle) {
      case "dark":  return this.canvas.getTheme().palette.getColor("black");
      case "color": return this.canvas.getTheme().palette.getColor("theme");
  ```
- **In reveal.js:** a slide with only `data-background-image` gets **no** contrast class, because reveal reads only the colour. Have your markdown syntax require a tone for image backgrounds, or default it. Emit it as `data-background-color` (a representative colour) or as your own `tone-dark`/`tone-light` class.
- **Related gotcha:** on a background in the theme's own colour, the originator software forces theme-coloured text to white (`js/core/models/palette.js:201-222`). Its "is this a colour?" test is "R, G and B are not all equal", so an off-white such as `#fffffe` counts as a colour. Use an explicit `tone-color` class rather than a heuristic.
- **Verdict:** Copy.

### 2.5 Load fonts completely before measuring, fitting or printing
- **Problem:** text measured with a fallback font wraps differently. Font metrics were cached forever, so a measurement taken before the font loaded stuck.
- **Fix:**
  - Fetch each font file to a data URL, which avoids cross-origin problems.
  - Register it with `FontFace`, then await `load()` and `document.fonts.ready`.
  - Only then build styles and run layout.
- **Originator code** (`js/core/services/fonts.js:373`):
  ```js
  const cssFont = new FontFace(fontId, `url("${fontUrl}")`, { weight, style: italic ? "italic" : "normal" });
  document.fonts.add(cssFont);
  await cssFont.load();
  await document.fonts.ready;
  ```
- **In reveal.js:** `await document.fonts.ready`, then call `Reveal.layout()` and re-run any fitting (your auto-fit, `r-fit-text`). Do this in live preview, in static HTML and in `?print-pdf`. For static HTML, ship the font files or inline them; don't depend on a CDN at presentation time.
- **Verdict:** Copy.

### 2.6 Per-script fallback fonts, with a regional variant for CJK
- **Problem:** theme fonts lack CJK and other scripts, and the same Han code point is drawn differently in Japanese, Korean and Chinese fonts.
- **Fix:** when a character has no glyph, look up its Unicode range and load the matching Noto font. For CJK, use the deck's language variant (`jp`, `kr`, `sc` or `tc`) (`js/core/services/fonts.js:106`).
- **In reveal.js:** list the Noto families after the theme font in the font stack, using `unicode-range`, and set `lang` on `<html>` from the deck's front matter so the browser picks the right CJK forms.
- **Verdict:** Copy. Use CSS here, not JS.

### 2.7 How many tokens, and which ones
reveal.js's theme template defines about 27 `--r-*` properties:
- background
- main font, size and colour
- block margin
- heading font, colour, line height, letter spacing, text transform, shadow and weight
- `h1`–`h4` sizes
- code font
- link colours
- selection colours
- overlay colours

That is a good size. These are the gaps to fill, with the originator software's experience as the reason:

| Add | Why |
|---|---|
| Light/dark foreground pairs (2.3) | reveal has one `--r-main-color` and one heading colour. |
| One accent family plus muted text | The originator software's palette has about 22 colours per theme, but `primary_light`/`secondary_light`/`background_light` barely vary across 17 themes. One accent, one muted colour and the pairs cover nearly everything. |
| `--safe`, `--gap`, `--gap-after-heading`, `--gutter` | reveal has only `--r-block-margin`. Alignment needs a safe area and a spacing scale (§1.2, §3.2). |
| Per-font corrections (1.11) | Not themeable in reveal. |

What turned out to be **too many tokens or the wrong ones** in the originator software:

- **Two naming schemes for the same thing.** Theme data said `fontTitleWeight` while the stylesheet said `$titleFontWeight`, so glue code generated a fake stylesheet to translate between them (`js/core/models/theme.js:303`). Also, `display` was silently mapped to the header settings. → Use one name from theme file to CSS. Keep reveal's `--r-*` names as they are, and namespace your additions (e.g. `--x-*`).
- **Dead tokens.** `$titleFontFontId` and its siblings, `$titleLeading`, `$bodyLeading` and `$connectorEffect` are declared in the base but never read (`static/themes/v10/default.scss:4`, `:44`). 25 of the 81 base tokens have no direct reference. → Lint for declared-but-unused variables.
- **Theme keys that never vary.** 15 of the roughly 64 keys per theme have the same value in all 17 built-in themes (logo settings, `fontScale: 1`, `styleEffect: "none"`, …), even though a defaults object exists (`common/themes/index.js:131`). → A theme stores only what differs from the base.
- **A duplicated role.** A "label" font role was split from "title" later, and in every theme its six settings equal the title's. Old themes needed a fallback (`js/core/styleSheet.js:131`). → Make aliased roles inherit by default: `--label-font: var(--heading-font)`.
- **Tokens nobody uses.** No built-in theme overrides any shape, icon, connector or chart-ring token. They change only through variant files. → Don't add a token until a second theme needs a different value.
- **Silent typos.** One built-in theme ships the keys `hart8` and `egative` (`common/themes/horizon.js:111`, `:114`) instead of `chart8` and `negative`. The palette quietly substitutes defaults. → Validate theme files against a schema and fail loudly.
- **A context-dependent value as a token.** A colour value meaning "auto" was deprecated through a data migration, but it is still the base default for icon fill. → Don't make "depends on context" a token value; resolve it in CSS with the contrast classes.
- **Resolved values stored next to role names.** Default slides persist `"fontColor":"primary"` alongside its resolved `rgba(…)`. → Persist only the role name.
- **A line-height unit that couldn't be migrated.** Line height was first expressed in multiples of the cap height, and every stored theme then needed on-the-fly conversion when the engine moved to HTML text (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:273`). → Use unitless CSS line height from day one.
- **A comment that contradicts the code.** "At least 700" sits on a `Math.min`, which caps the bold weight at 700 instead of raising it (`js/core/styleSheet.js:162`). → If you derive bold from regular, write it as `clamp()` and test it.

---

## 3. Spacing, overflow and print

### 3.1 Measure gaps between letters, not between line boxes
- **Problem:** with line-box padding included, `blockSpacing: 20px` looks different in every font and line height.
- **Fix:** subtract the cap/baseline trim from 1.9 from each block's margins, so spacing values are the visible gap.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:409`):
  ```js
  marginTop -= block.topSpace ?? 0;
  marginBottom -= block.bottomSpace ?? 0;
  ```
- **In reveal.js:** this comes for free once `text-box` trimming (1.9) is on.
- **Verdict:** Copy.

### 3.2 Space only between siblings, with a larger gap when the style changes
- **Problem:** two body paragraphs should sit closer together than a heading and the paragraph after it. The first and last blocks should have no outer margin.
- **Fix:**
  - The first block gets no top margin.
  - Between blocks of the same style, a smaller `paragraphSpacing` is used.
  - When the style changes, `spaceAbove` and `spaceBelow` are added.
  - The last block gets no bottom margin.
  - All gaps are multiplied by the auto-fit scale, so they shrink along with the text.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:417`):
  ```js
  if (index > 0) {
      let spacing = block.textStyles.blockSpacing ?? 0;
      ...
      if (effectivePrevTextBlock && effectivePrevTextBlock.textStyle === block.textStyle && ...) {
          spacing = block.textStyles.paragraphSpacing ?? spacing;
  ```
- **In reveal.js:** the stock theme gives `p`, `img` and `pre` `margin: var(--r-block-margin) …` on **both** top and bottom. So the first paragraph sits 20px below the title and the last one leaves 20px of dead space before the bottom. Replace this with:
  ```css
  .reveal .body > * { margin-block: 0; }
  .reveal .body > * + * { margin-block-start: calc(var(--gap) * var(--fit, 1)); }
  .reveal .body > :is(h2, h3) + * { margin-block-start: calc(var(--gap-after-heading) * var(--fit, 1)); }
  ```
- **Verdict:** Copy.

### 3.3 Give each gap one owner
- **Problem:** a block's bottom margin and the next block's top margin are counted twice.
- **Fix:** move every bottom margin into the next block's top margin and zero the original (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:331`).
- **In reveal.js:** use only `margin-block-start`, via the sibling selector in 3.2. This also makes behaviour inside grid and flex containers predictable, since margins don't collapse there.
- **Verdict:** Copy.

### 3.4 Non-text blocks don't break the style run
- **Problem:** a horizontal rule between two paragraphs triggered the larger "style changed" spacing from 3.2.
- **Fix:** skip non-text blocks when looking for neighbours.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:390`):
  ```js
  // Find the nearest TEXT block neighbors, skipping over non-text blocks like dividers,
  // so that dividers don't break textStyle continuity and trigger extra transition spacing
  ```
- **In reveal.js:** give `hr` symmetric margins of its own and exclude it from the heading rule: `:is(h2, h3) + hr + *`.
- **Verdict:** Copy.

### 3.5 List geometry follows the font
- **Problem:** the bullet gutter should scale with text size, nested lists should line up under the parent's text, and bullets look off-centre when line height changes.
- **Fix:**
  - The first-level gutter is the cap height × 3 (`bulletSpacing: 3`).
  - Each nested level adds a fixed indent.
  - Bullets are centred on the first line's cap height, not on the line box.
  - Lists without bullets get no gutter.
  - Numbering restarts after any paragraph but keeps counting across section headings.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextElement.js:1328`):
  ```js
  listDecProps.bounds = new geom.Rect(block.indentWidth, block.topSpace + block.fontHeight / 2 - listDecorationSize / 2, listDecProps.size);
  ```
- **In reveal.js:** the stock theme makes lists `display: inline-block; margin-left: 1em`, so a list is centred as a shrink-wrapped block on centred slides. Nested lists get a fixed `margin-left: 40px` that does not scale with the font. Replace these with:
  ```css
  .reveal .body :is(ul, ol) { display: block; padding-inline-start: 2.5cap; margin: 0; }
  .reveal .body :is(ul, ol) :is(ul, ol) { padding-inline-start: 2cap; }
  .reveal .body li + li { margin-block-start: calc(var(--gap) * 0.5 * var(--fit, 1)); }
  ```
  Use `::marker` or a custom `::before` sized in `cap` units. Markdown's ordered-list `start=` already handles restarts.
- **Verdict:** Copy.

### 3.6 Code blocks never inherit centred alignment
- **Problem:** code inherited the slide's centred alignment and split across columns.
- **Fix:**
  - Force `text-align: left` (the originator's own comment calls it "a hack").
  - Add `break-inside: avoid-column`.
  - Use `white-space: pre-wrap` with `line-height: 1.5em`, at fixed sizes of 16, 20 or 30px.
- **Originator code** (`js/canvas/v10/elements/elements/authoring/AuthoringBlocks/CodeBlock.js:14`):
  ```css
  break-inside: avoid-column;
  ```
- **In reveal.js:** reveal centres slide text by default, and `pre` is `width: 90%; margin: auto`. Set `pre, code { text-align: left; }` and `pre { break-inside: avoid; }`. Code should **not** shrink with auto-fit below a readable floor. Consider fixed code sizes as theme tokens and exclude `pre` from the fit scale.
- **Verdict:** Copy.

### 3.7 Auto-fit by binary search on one scale factor
- **Problem:** content has to fit its box.
- **Fix:**
  - Search a scale factor between 0.5 and 1 in steps of 1/20. The factor scales the whole text style, including gaps, not just font size.
  - Try the maximum first, so content that already fits costs one layout pass.
  - "Fits" means height fits, width fits, and no block exceeds its maximum line count.
  - If nothing fits, use the minimum scale and flag the slide.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextElement.js:1201`; fit test at `:1223`):
  ```js
  const { isFit, fitValue, ... } = FindBestFit({
      min: minScale, max: options.maxTextScale ?? 1, preCheckMax: true,
  ```
  The search has an explicit final layout pass, because otherwise it leaves the DOM in whatever state it tried last (`js/canvas/v10/elements/layouts/FindBestFit.js:72`).
- **In reveal.js:** `r-fit-text` (powered by fitty) makes text as large as possible without overflowing the slide's width. It is meant for single-line headlines, not paragraphs in a box. `r-stretch` sizes only one direct child of a section. So build paragraph auto-fit yourself:
  - Write sizes and gaps as `calc(var(--size) * var(--fit, 1))`.
  - Per slide, binary-search `--fit` on the `body` element: set it, then compare `scrollHeight` with `clientHeight`. Both are unaffected by reveal's transform.
  - Run it after `document.fonts.ready`, on reveal's `ready` event, and again in `?print-pdf`.
  - Cache the result per slide content hash.
- **Verdict:** Copy.

### 3.8 Siblings share one shrink factor
- **Problem:** grid or column cells that each shrink by a different amount look uneven.
- **Fix:** fit each cell, have the parent keep the smallest scale, then lay everything out again at that scale.
- **Originator code** (`js/canvas/v10/elements/base/BaseElement.js:2025`):
  ```js
  this.matchedTextElements[elementId].textScale = Math.min(textScale, this.matchedTextElements[elementId].textScale);
  ```
- **In reveal.js:** run the fit per cell for your `grid`/`split` containers, then set the minimum as `--fit` on the container.
- **Verdict:** Copy.

### 3.9 When shrinking isn't enough
- **Problem:** content still overflows at the minimum scale.
- **Fix:** they escalate in steps:
  1. Change the layout: an agenda splits into 3 columns below scale 0.5.
  2. Show a "text is clipped" warning, in the editor only, never in playback or export (`js/canvas/v10/elements/base/Text/TextElement.js:1514`).
  3. Undo the edit that caused the overflow.
- **In reveal.js / markdown:**
  1. Shrink to a floor of about 0.6–0.7.
  2. Optionally reflow: long lists can switch to `columns: 2`.
  3. Clip with `overflow: hidden` on the body.
  4. Report it, both as a visible badge in live preview and as a build or CLI warning naming the slide and source line.

  Never scroll a slide. Undoing the edit is not applicable to a text-file workflow.
- **Verdict:** Adapt.

### 3.10 Make measurement robust
- **Problem:** browser text measurement is slightly off, so the fit check flips between iterations or text wraps unexpectedly.
- **Fix:** round container sizes up. Allow some tolerance in the fit test.
- **Originator code** (`js/canvas/v10/elements/base/Text/TextLayoutHelpers.js:959`):
  ```js
  // We have to ceil the container size to make sure we don't have wrapping on safari
  // on displays with pixel density > 1 due to sizes rounding
  ```
  There are also hand-tuned Safari and negative-letter-spacing fudges (`:783`, `:896`).
- **In reveal.js:** treat `scrollHeight <= clientHeight + 1` as fitting. Reserve empty space for placeholders in live preview so the fit doesn't jump while the author types: the originator software reserves height for empty blocks "to prevent scale jumping".
- **Verdict:** Copy the tolerance. Skip the hand-tuned per-browser numbers.

### 3.11 Images: cover, a focal point, limited zoom; logos use contain
- **Problem:** photos crop badly, crops break when the layout changes, and logos get cropped.
- **Fix:**
  - Photos use cover, i.e. `max(wScale, hScale)`, with a stored focal rectangle.
  - A photo that filled its frame keeps filling it after a layout change.
  - Zoom is clamped between half of fit and 1.5×.
  - Logos use contain.
  - Optional face detection pads the face box by 20% horizontally and 30% vertically for a better composition.
- **Originator code** (`js/canvas/v10/elements/base/MediaElements/MediaElement.js:220`):
  ```js
  let finalScale = Math.max(heightScale, widthScale);
  if (didFit) {
      // ensure that changing layout will not cause a fitting image to stop fitting
      finalScale = Math.max(finalScale, geom.fillRect(this.mediaSize, size));
  }
  ```
- **In reveal.js:** stock themes cap `img` at `max-width: 95%; max-height: 95%` and give it block margins, so images shrink to fit but never fill a layout cell. In layout cells use `width: 100%; height: 100%; object-fit: cover;`, with `object-position` taken from an optional markdown attribute (`<!-- .element: style="object-position: 30% 20%" -->`, or your own focal-point syntax). Use `object-fit: contain` for logos and diagrams. Set `aspect-ratio` on media frames so the layout doesn't jump while images load.
- **Verdict:** Copy.

### 3.12 Screen vs PDF: don't let the print engine lay out slides
- **Problem:**
  - Fonts or images that haven't loaded yet get captured.
  - Print CSS paginates differently from the screen.
  - Backgrounds disappear unless the browser is told to print them.
  - An overflowing slide spills onto a second page.
- **Fix:** the originator software has no print CSS at all. Headless Chrome renders each slide at 1280×720 using the same scale transform as the screen. It waits for fonts and images, then prints exactly one page per slide with backgrounds on.
- **Originator code** (`cloudrun/screenshot/src/screenshot.ts:307`):
  ```ts
  const pdf = await this._page.pdf({
      width: this._width, height: this._height,
      pageRanges: "1-1", printBackground: true,
  });
  ```
- **In reveal.js:** `?print-pdf` is the equivalent, and it is confirmed only in Chrome/Chromium. Set it up like this:
  - **Page size:** reveal sets `@page { size: floor(width × (1+margin)) floor(height × (1+margin)); margin: 0 }`. With `margin: 0` you get exact 1280×720 pages.
  - **Overflow:** pages per slide = `ceil(contentHeight / pageHeight)`, capped by `pdfMaxPagesPerSlide` (default unlimited). Set it to `1` so overflow clips instead of creating extra pages, and rely on your auto-fit warnings (3.9).
  - **Vertical centring in print:** applied only when `center: true` or the slide has class `center`. If your layouts handle centring themselves (§1.4), check that print matches the screen.
  - **Fragments:** `pdfSeparateFragments` defaults to `true`, which gives one page per fragment step. Most people want `false` for handouts.
  - **Notes:** `showNotes: "separate-page"` for speaker handouts.
  - **Automation:** drive it with Puppeteer or Playwright, or use decktape:
    1. Load `?print-pdf`.
    2. `await document.fonts.ready`.
    3. Wait for images and for your auto-fit pass.
    4. Call `page.pdf({ printBackground: true, preferCSSPageSize: true })`.
  - **Colours:** add `-webkit-print-color-adjust: exact; print-color-adjust: exact;` on slides so backgrounds and tinted panels survive manual browser printing too.
- **Verdict:** Copy. Treat PDF as "screenshot each slide's screen layout", not as a document reflow.

---

## Top 10 lessons, ranked

1. **One fixed logical size (1280×720), scaled as a unit.** reveal.js does this. Change the default 960×700 to 16:9 and set `margin: 0` so preview, HTML and PDF are pixel-identical.
2. **Trim text to cap height and baseline** (`text-box: trim-both cap alphabetic`, or a fallback using measured cap height). Spacing values then mean the visible gap, and text lines up with shapes and edges.
3. **One outer frame owns the safe area, header, body and footer; layouts only fill the body.** Turn off reveal's `center` so titles sit in the same spot on every slide.
4. **Make the safe area a single token and never repeat its literal.**
5. **Wait for fonts (and images) before measuring, fitting or printing,** then call `Reveal.layout()` and re-fit. This applies in preview, static HTML and `?print-pdf`.
6. **Auto-fit paragraphs yourself with one `--fit` variable.** Binary search with "try the maximum first", a minimum floor, gaps that shrink along with the text, and siblings that share the smallest scale. `r-fit-text` only handles headlines.
7. **Role-based colour tokens with light/dark pairs, driven by reveal's `has-dark-background`/`has-light-background`.** Style them yourself, and require a tone for image backgrounds.
8. **Space only between siblings,** with a bigger gap after headings, dividers that don't break the style run, and no outer margin on the first or last block. reveal's stock top-and-bottom block margins need replacing.
9. **Keep tokens lean:** keep reveal's `--r-*` names and add only what's missing (fg pairs, accent, safe area, spacing scale). Themes store only what differs from the base, aliased roles inherit, and theme files are validated against a schema.
10. **Make PDF a capture of the screen layout:** exact page size, one page per slide (`pdfMaxPagesPerSlide: 1`), backgrounds printed, overflow reported at build time rather than spilled onto a second page.
