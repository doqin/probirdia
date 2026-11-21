---
name: Probirdia
description: English proverbs taught through illustrated choose-your-own-adventure stories.
colors:
  cream: "#ffe6c2"
  parchment: "#c5bbab"
  ink: "#1a1208"
  brown: "#7a5538"
  paper: "#fffaf0"
  choice-cream: "#f2ecdd"
  butter: "#fff6e6"
  pebble: "#a6a6a6"
  stone: "#b8bfc4"
  umber: "#5a4630"
  sky-top: "#c3e8ff"
  sky-bottom: "#effcff"
  hill: "#8ba500"
  hill-light: "#c6e07f"
  danger: "#a33b2a"
  positive: "#2f7d3a"
typography:
  display:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0em"
  headline:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Zilla Slab, Rockwell, Georgia, serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  card-tight: "0.4rem"
  popover: "0.8rem"
  choice-card: "0.9rem"
  surface: "1.1rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  page-pad: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.brown}"
    textColor: "{colors.butter}"
    rounded: "{colors.pill}"
    padding: "0.45em 1.4em"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.pebble}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.45em 1.4em"
  choice-card:
    backgroundColor: "{colors.choice-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice-card}"
    padding: "0.85rem 1rem"
  chip:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.15em 1em"
  input-search:
    backgroundColor: "{colors.pebble}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.6rem 1.2rem"
---

# Design System: Probirdia

## Overview

**Creative North Star: "The Proverb Storybook"**

Probirdia looks like a printed picture-book that someone has been reading in class: a warm
cream page, ink outlines, chunky slabs of Zilla Slab, and things that sit *on* the paper
rather than float above it. Nothing is glossy or app-like. A screen is a page; a character
is a cut-out standing on it; the dialogue is a note pinned beside whoever is talking.

The system is deliberately two-tier. **Chrome** (header, footer, page headings, glossary
lists) stays quiet and flat — cream ground, ink text, one blurred band at the top. **Story
objects** (speech bubbles, name plates, choice cards, pops) are tactile: 3px ink outline,
offset shadow, paper surface. That split is what keeps the game feeling hand-made while the
glossary and the editor still read as usable software.

Every colour decision follows from the setting too. The palette is paper, leather and ink
with a single interactive accent — a saddle brown. The sky blues and rice-paddy greens exist
only in scenery (and in the placeholder hills), never behind or inside a control, so a button
can never be mistaken for a background.

**Key Characteristics:**
- Cream page, ink text, one brown accent — a three-colour system, not a palette.
- Ink outlines plus a hard offset shadow on anything pickable: sticker, not glass.
- All-caps labels and headings; sentence-case reading text.
- Zilla Slab throughout — a typewriter-slab voice, never a geometric sans.
- Scenery (sky, hills, Canva art) is the only place saturated colour appears.

## Colors

A warm paper-and-leather palette in which exactly one hue is allowed to mean "press me".

### Primary
- **Saddle Leather Brown** (#7a5538): the only interactive accent. Primary buttons, the
  footer band, links inside popovers, the name plate on a speech bubble, hover fills on
  choice cards, focus rings. If something can be clicked, this is its colour.
- **Butter Highlight** (#fff6e6): text on brown. Used on the primary button, the footer and
  the name plate; never as a page background (that is Cream's job).

### Secondary
- **Pebble Grey** (#a6a6a6) and **Cool Stone Grey** (#b8bfc4): the quiet controls — secondary
  buttons, the glossary search field, status pills — and the tinted band behind a week's
  worth of chrome (the "Welcome" strip uses Aged Parchment).

### Neutral
- **Warm Paper Cream** (#ffe6c2): the page itself. Every surface starts here.
- **Aged Parchment** (#c5bbab): a slightly darker paper for full-width bands that need to
  separate from the page without a border.
- **Bubble Paper** (#fffaf0): the surface of a story object — speech bubble body, proverb
  popover card. Brighter than the page so it reads as a note laid on top.
- **Choice Card Cream** (#f2ecdd): the two choice cards on a story branch; a half-step
  between Bubble Paper and the page, so cards read as paper stock rather than white.
- **Ink Brown-Black** (#1a1208): all body text, all outlines, all documentation headings.
- **Umber Ink** (#5a4630): secondary text — example sentences, popover meta, captions.

### Tertiary (scenery only)
- **Morning Sky Blue** (#c3e8ff) → **Haze White** (#effcff): the sky gradient of the
  placeholder landscape.
- **Rice-Paddy Green** (#8ba500) and **Young Shoot Green** (#c6e07f): the hills in that
  same placeholder.
- **Chili Brick Red** (#a33b2a) and **Positive Green** (#2f7d3a): status only. Red marks a
  negative condition ("Late", "Losing confidence"), green marks a positive one ("Helped",
  "Told the truth"). Neither is ever decorative, and Positive Green is a darker, separate
  value from the scenery greens so a status can never be mistaken for landscape.

### Named Rules
**The One Accent Rule.** Saddle Leather Brown is the interaction colour and nothing else.
Sky blue and paddy green may never fill a button, a chip, a card or a heading: they belong
to scenery, so a control is never camouflaged as background.

**The Paper-Or-Object Rule.** Each surface is either the page (Warm Paper Cream) or an
object lying on it (Bubble Paper / Choice Card Cream with an ink outline). There is no
mid-grey "panel" tier between them.

## Typography

**Display Font:** Zilla Slab (with Rockwell, Georgia, serif)
**Body Font:** Zilla Slab, 400 at 1.15rem (with Rockwell, Georgia, serif)

**Character:** One family, three weights, no pairing. Zilla Slab's slab serifs give the
stories a printed-book voice and keep long glossary entries comfortable at 1.15rem; the
uppercase 700 weight supplies all the emphasis the system needs, so hierarchy comes from
case and size rather than from a second face.

### Hierarchy
- **Display** (700, `clamp(1.8rem, 4vw, 2.6rem)`, 1.15, uppercase, centred): page titles —
  Games, Glossary, About. The only centred type on a page.
- **Headline** (700, 2rem, 1.15, uppercase, 2px ink underline): glossary letter headings
  (`A`, `B`, …) and section starts inside long pages.
- **Title** (700, 1.6rem, 1.15, uppercase): the brand in the header, the "Welcome" band, and
  in-story headings that sit in a bubble.
- **Body** (400, 1.15rem, 1.5): everything a learner reads — story text, meanings, examples,
  editor fields. Runs to ~70ch in `main`; popovers cap at 21rem.
- **Label** (700, 0.8rem, 0.08em tracking, uppercase): name plates, chips, buttons, the
  choice instruction, table-of-contents style nav.
- **Small meta** (400, 1rem, 1.4): popover meaning and example text.

### Named Rules
**The Caps Label Rule.** Anything that is an interface label is uppercase; anything that is
prose stays sentence case. A sentence in caps is always a mistake, and a button in lower
case is too.

**The One Family Rule.** No second typeface is introduced for accent, code or captions.
Weight and case carry the contrast. (The editor's inputs inherit the same family.)

## Layout

A single centred column, `max-width: 70rem` (`--page`), with `1rem` side padding, sitting
between a sticky header and a full-bleed brown footer. Sub-layouts are narrow on purpose:
the home tiles grid caps at `34rem` in two columns, the games grid at `56rem` with
`repeat(auto-fill, minmax(15rem, 1fr))` and `1.5rem` gaps, the glossary at
`repeat(auto-fit, minmax(18rem, 1fr))`.

The header is a sticky band with a frosted layer that fades out at its bottom edge (14px
backdrop blur, masked gradient, 82% → 35% → transparent cream). It can overlay a hero image
via a negative `margin-bottom` equal to its own height.

The player is its own spatial system: a 16:9 stage (`section.scene`) with a `container-type:
inline-size` context, so story type is sized in `cqw` and scales with the stage rather than
the viewport. Characters stand at 34% (Minh, left) and 30% (Dr. Bird, right) of stage width
on a ground line at 96% height; the speech bubble hangs beside the speaker at 46% width,
and choice cards stack in a 42%-wide column at the left. Below `40rem` the stage unstacks:
artwork on top, bubble or cards beneath it as normal flow.

## Elevation & Depth

A hybrid, and deliberately so. The page and its chrome are flat — flat cream, flat parchment
bands, no shadow on `main`, lists or headings. Depth belongs to story objects and to hover:
they carry a **hard offset shadow** (no blur) that reads as a sticker lifting off the paper.
Floating things that genuinely leave the page — the proverb popover, a tile on hover — use a
soft, diffuse shadow instead. The header adds a third vocabulary: not shadow but blur, a
frosted band that dissolves into the page.

### Shadow Vocabulary
- **Sticker offset, bubble** (`box-shadow: 0 .35rem 0 rgb(26 18 8 / .25)`): speech bubbles
  and name-bearing panels resting on the stage.
- **Sticker offset, card** (`box-shadow: 0 .25rem 0 rgb(26 18 8 / .55)`): choice cards and
  other pressable paper, heavier so it reads as lifted.
- **Floating popover** (`box-shadow: 0 .4rem 1rem rgb(0 0 0 / .2)`): the proverb/hard-word
  popup, which must clear the text it points at.
- **Hover lift** (`transform: translateY(-3px)` + `0 .6rem 1.2rem rgb(0 0 0 / .2)`): home
  tiles only.

### Named Rules
**The Sticker Offset Rule.** Shadows on a control are 0-offset-x, small-y, **zero blur**.
A blurred shadow on a button or card is off-brand; blur is reserved for things that actually
float above the page.

**The Flat Chrome Rule.** Header, footer, page headings, glossary lists and form labels get
no shadow and no card treatment. If it is not part of the story, it does not lift.

## Shapes

Two form languages, split along the same line as depth. **Controls are pills**: buttons,
chips, the search field and the glossary alphabet strip all use `border-radius: 999px`;
they are capsules, never rounded rectangles. **Paper is softly rectangular**: the story
bubble is `1rem`, choice cards `0.9rem`, popovers `0.8rem`, home tiles `1.1rem` (`--radius`),
game cards a tighter `0.4rem` because their artwork supplies the shape.

Outlines are the structural device. Story objects take a `3px` solid Ink Brown-Black border;
popovers take `2px` Saddle Leather Brown; the secondary surfaces (chips, search, alphabet)
take no border at all and rely on their grey fill. Nothing uses a translucent or "ghost"
border — either the outline is there at full ink, or there is no outline.

The signature silhouette of the system is a rounded paper rectangle with a triangular tail
pointing at a character, and a small brown tab (the name plate) riding its top edge.

## Components

### Buttons
- **Shape:** full pill (`999px`), no border, uppercase 700 label at inherited size
  (`0.45em 1.4em` padding).
- **Primary:** Saddle Leather Brown fill, Butter Highlight text. Used for Continue, Play,
  Check answers, Publish.
- **Hover / Focus:** hover brightens the fill by 12% (`filter: brightness(1.12)`), no lift,
  no colour change. Focus-visible is a 3px Saddle Leather Brown outline at 2px offset.
- **Secondary:** Pebble Grey fill with ink text — used for quieter actions beside a primary
  (Cancel, Reset, secondary nav for the editor).
- **In-bubble variant:** the same primary pill, but scaled down (0.82rem, `0.35rem 1rem`) and
  right-aligned, because clicking the artwork is the main advance action and the button is
  the keyboard affordance.

### Chips
- **Style in list UI:** `999px` capsule, `0.15em 1em`, uppercase 700, Cool Stone Grey fill and
  no border; Pebble Grey when the chip is an action ("Play").
- **Style in the player:** Bubble Paper fill with a `2px` Saddle Leather Brown border
  (`0.1em 0.8em`, 600 weight) — the same capsule, but it reads as a sticker on the stage.
- **State:** status chips keep their fill and swap **both border and text** to Positive Green
  (#2f7d3a) or Chili Brick Red (#a33b2a). Proverb gains appear as their own Bubble Paper
  chip, never as a coloured badge.

### Cards / Containers
- **Choice card:** Choice Card Cream fill, 3px ink border, `0.9rem` radius, uppercase 700
  centred text, sticker offset. Hover inverts to brown fill with Butter text.
- **Game card:** a 16:10 tile of artwork only (`0.4rem` radius, overflow hidden) with the
  game name at 38% height and a grey Play pill at the bottom; the entire card is the link.
- **Story bubble:** Bubble Paper at 97% opacity, 3px ink border, `1rem` radius, sticker
  offset, `1rem 1.3rem` padding, with a 14px triangular tail on the speaker's side.

### Inputs / Fields
- **Style:** pill, no border, Pebble Grey fill, ink text inherited at 1.15rem; the glossary
  search sets a 600 weight and a white uppercase placeholder.
- **Focus:** the global 3px brown outline at 2px offset — inputs do not add a glow or a
  fill change.
- **Editor fields:** same family; cream paper fill with a `2px` Saddle Leather Brown border
  and a `0.4–0.5rem` radius, so a form reads as paper being written on rather than as an app
  control. Active editor tabs invert to a brown fill with cream text.

### Navigation
- **Style:** sticky frosted header; brand at 1.6rem/700 with a 50%-radius logo, nav links at
  1.3rem/600 in a `1.5rem` gap.
- **States:** the current page is underlined (not bolder, not coloured); hover is the default
  link colour with no underline until focus.
- **Mobile:** the nav wraps under the brand rather than collapsing into a menu.

### Speech bubble + name plate (signature)
The system's most recognisable component. A Bubble Paper rectangle with a 3px ink border, an
offset shadow, a tail on the speaker's side, and a small Saddle Leather Brown tab above the
edge carrying the speaker's name in uppercase 0.8rem Butter text. Placed left when Minh
speaks, right when Dr. Bird does, or centred when nobody is on stage. It doubles as the
proverb reveal panel (the proverb name replaces the speaker name on the plate).

### Proverb / hard-word popover (signature)
Dotted underline plus a 12% brown background tint on the term itself (`cursor: help`), and a
Bubble Paper card on open: 2px brown border, `0.8rem` radius, soft shadow, `21rem` max width,
meaning then italic example. It opens on hover and on tap; the term stays a real button for
keyboard and screen readers.

## Do's and Don'ts

### Do:
- **Do** put a 3px Ink Brown-Black outline on every story object and give it
  `0 .35rem 0 rgb(26 18 8 / .25)` — no blur.
- **Do** keep the page on Warm Paper Cream and let story objects use Bubble Paper or Choice
  Card Cream so they read as paper laid on paper.
- **Do** set every interface label in uppercase 700 with ~0.08em tracking, and every sentence
  in sentence case.
- **Do** use full pills (`999px`) for controls and soft rectangles (`0.8–1.1rem`) for paper.
- **Do** reserve Saddle Leather Brown for interaction; the only other brown on a page is the
  footer band.
- **Do** verify story type at both ends: 1280px desktop and 420px phone, where the bubble
  drops below the artwork.

### Don't:
- **Don't** introduce a second typeface, a geometric sans, or a monospace "code" style.
- **Don't** fill buttons, chips or headings with sky blue or paddy green — those are scenery.
- **Don't** use pure white (`#fff`) or pure black (`#000`) surfaces or text; the coldest
  neutral in use is Cool Stone Grey.
- **Don't** apply blurred, ambient shadows to controls; blur belongs to popovers and hover
  lifts only.
- **Don't** add gradients, glassmorphism or coloured glows to UI chrome; the single gradient
  in the system is the placeholder landscape, and the single blur is the header wash.
- **Don't** centre body prose — centring is for page titles, cards and the game stage.
- **Don't** use red (Chili Brick Red) for anything but a negative state.
