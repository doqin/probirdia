---
name: Probirdia
description: English proverbs taught through illustrated choose-your-own-adventure stories.
colors:
  wall: "#d7d6fb"
  wall-deep: "#c8c6f2"
  paper: "#ffffff"
  paper-dim: "#f3f3fd"
  ink: "#1b1a26"
  outline: "#3b3953"
  teal: "#96c9ce"
  teal-deep: "#7bbcc2"
  cyan: "#42d6ff"
  sky: "#c6f4ff"
  cream: "#fff6e0"
  good: "#2f7d3a"
  bad: "#a33b2a"
typography:
  display:
    fontFamily: "Partita 1990, Zilla Slab, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Partita 1990, Zilla Slab, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Partita 1990, Zilla Slab, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Partita 1990, Zilla Slab, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Partita 1990, Zilla Slab, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  pill: "999px"
  popover: "0.5rem"
  plate: "0.55em"
  panel: "1.2cqw"
  card: "2cqw"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  page-pad: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.45em 1.4em"
    typography: "{typography.label}"
  button-play:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.4em 2.4em"
    typography: "{typography.label}"
  choice-pill:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.55em 1.1em"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.1em 0.9em"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.popover}"
    padding: "0.6rem 1.2rem"
---

# Design System: Probirdia

## Overview

**Creative North Star: "The Game Screen"**

Probirdia looks like a frame from a pixel-art adventure game. The approved design is the
Canva deck `DAHa5qfjhTw` (110 pages): every screen is a 16:9 stage where the artwork fills
the frame and the interface sits *on* the picture as chunky white panels with indigo outlines.
The world is lavender-walled, the type is pixel, the buttons are capsules that look pressed.

The system is deliberately two-tier. **Chrome** (site header, footer, page headings,
glossary, editor) stays flat and quiet — lavender ground, ink text, white cards. **Story
objects** (title card, chapter plates, speech bubbles, choice pills, verdict panels) are
tactile: a 3px indigo outline, a hard unblurred shadow, a white or near-white surface. That
split keeps the game feeling like a game while the glossary and the editor still read as
usable software.

Colour is used as signal, not decoration. Teal is the action colour, cyan is the loud accent
(PLAY, hover, the art heading), lavender is the room the panels sit in. The Canva artwork
supplies all the scenery; no gradient or illustration is invented in CSS.

**Key Characteristics:**
- Full-bleed 16:9 stage; the artwork owns the viewport, the interface floats on it.
- Hard pixel outlines plus a zero-blur offset shadow: object, not glass.
- Type — Partita 1990 (retro display face, covers Vietnamese) for everything in the game.
- Teal capsules mean "press me"; cyan means "go".
- Lavender wall, white paper, indigo ink — a four-colour system.

## Colors

### Primary
- **Action Teal** (#96c9ce): the default interactive fill — choice pills, secondary buttons,
  in-stage controls. Hover deepens to the cyan accent.
- **Signal Cyan** (#42d6ff): the loudest thing on any screen. PLAY, the chapter start button,
  the "Ending" restart, the art heading. One per screen, never a background.

### Secondary
- **Room Lavender** (#d7d6fb) and **Deep Lavender** (#c8c6f2): the wall behind the stage and
  the page ground. Also the chapter divider plate's fill in the deck.
- **Sky Wash** (#c6f4ff): the hover tint on quiet controls and the h1 accent in the editor.

### Neutral
- **Panel White** (#ffffff): every story panel, bubble, title card, choice pill text field.
- **Panel White Dim** (#f3f3fd): chapter divider plates and secondary panels — a half-step
  so two stacked panels still separate.
- **Ink Indigo** (#1b1a26): all text and all body copy.
- **Outline Indigo** (#3b3953): the 3px pixel border on every object.
- **Story Cream** (#fff6e0): the in-bubble note surface — the one warm surface in the system,
  carried over from the lesson's artwork.

### Status
- **Good Green** (#2f7d3a) and **Bad Red** (#a33b2a): status only. A status chip keeps its
  white fill and swaps both its border and its text. Neither is ever decorative.

### Named Rules
**The One Loud Colour Rule.** Cyan appears once per screen. If two elements are cyan, one of
them is wrong — the second most important action is teal.

**The Paper-On-Picture Rule.** Every story object is a white or near-white panel with an
indigo outline. Nothing is translucent except the HUD chips and the bubble, which sit at
88–94% white so the artwork still reads through them.

## Typography

**Display Font:** Partita 1990 (fallback Zilla Slab, system-ui)
**Body Font:** Partita 1990 (fallback Zilla Slab, system-ui)

**Character:** One face for the whole game: Partita 1990, a 1990s arcade-poster display type with full
Vietnamese coverage. It carries names, labels, headings, buttons and story text alike; sizes and
letter-spacing, not a second family, separate the roles.

### Hierarchy
- **Display** (Partita 700, `clamp(1.8rem, 4vw, 2.6rem)`, uppercase, centred): page titles —
  Games, Glossary, About — and the title card's name.
- **Headline** (Partita 700, 2rem, uppercase): chapter divider plates and section starts.
- **Title** (Partita 700, 1.6rem, uppercase): the brand in the header, panel headings.
- **Body** (Partita 400, 1.35rem, 1.3): story text, meanings, examples, editor fields. Runs to
  ~70ch in `main`; in the stage it is sized in `cqw` so it scales with the frame.
- **Label** (Partita 600, 0.8rem, 0.06em tracking, uppercase): name plates, chips, buttons,
  the choice hint, the HUD.

### Named Rules
**The Caps Label Rule.** Anything that is an interface label is uppercase; anything that is
prose stays sentence case. A sentence in caps is always a mistake, and a button in lower
case is too.

**The Two-Face Rule.** Partita 1990 is for display and labels only; VT323 is for prose only.
No third face, no serif revival, no geometric sans.

## Layout

A single centred column, `max-width: 70rem` (`--page`), with `1rem` side padding, sitting
between a sticky header and a footer. Sub-layouts are narrow on purpose: the home tiles grid
caps at `34rem` in two columns, the games grid at `56rem` with
`repeat(auto-fill, minmax(15rem, 1fr))` and `1.5rem` gaps, the glossary at
`repeat(auto-fit, minmax(18rem, 1fr))`.

The player is its own spatial system and takes over the viewport. `section.scene` is a
`100dvh` grid that centres a `min(100vw, 100dvh * 16 / 9)` frame with
`container-type: inline-size`; every in-stage size is expressed in `cqw`, so the composition
is identical at 1280px and 1920px. Characters stand on the ground line at 96% height, at 34%
(Minh) and 30% (Dr. Bird) of stage width. The speech bubble spans 25%→3% and sits at 4.5%
from the bottom; choice pills stack in a 33%-wide column at 3% from the left, over the ground
line. The title card and chapter plates are centred at 58% and 46% width.

Below `40rem` the stage unstacks into a flex column: the artwork keeps its 16:9 ratio, the
panel drops beneath it as normal flow, and the whole column is vertically centred in the
viewport so a portrait phone never leaves dead wall at the bottom.

## Elevation & Depth

Depth is a pixel-UI illusion: **zero blur, small y-offset, hard edge**. Every story object
sits on a shadow that reads as one pixel row of shadow under the object. The page and its
chrome are flat — no shadow on `main`, lists or headings. The header's frosted wash is the
only blur in the system.

### Shadow Vocabulary
- **Lift 1** (`0 0.2rem 0 rgb(59 57 83 / .55)`): HUD chips and small in-stage controls.
- **Lift 2** (`0 0.3rem 0 rgb(59 57 83 / .55)`): speech bubbles, choice pills, the pressable
  paper of the story.
- **Lift 3** (`0 0.45rem 0 rgb(59 57 83 / .45)`): title card, chapter plate, finale panel,
  popovers — the things that stand furthest forward.

### Named Rules
**The Zero-Blur Rule.** Every shadow on a control or panel is `0 Npx 0` — no blur radius, no
spread. A blurred shadow on a button is off-brand; blur is reserved for the header wash and
the proverb popover's hover lift.

**The Flat Chrome Rule.** Header, footer, page headings, glossary lists and form labels get
no shadow and no card treatment. If it is not part of the story, it does not lift.

## Shapes

**Controls are capsules.** Buttons, chips, HUD tags, the choice hint and the search field all
use `border-radius: 999px`. **Panels are soft rectangles** with a radius expressed in stage
units: the bubble `1.2cqw`, the title card `2cqw`, the finale `1.8cqw`, the name plate
`0.55em`. Nothing is square and nothing is a circle except the logo.

Outlines are the structural device. Every story object takes a `3px` solid Outline Indigo
border; small in-stage controls take `2px`; the secondary surfaces in the editor take a `2px`
outline instead of a fill. Nothing uses a translucent or "ghost" border — either the outline
is there at full indigo, or there is no outline.

The signature silhouette is a wide white panel with a hard shadow, and a small white name
pill riding its top edge, overlapping the border.

## Components

### Buttons
- **Shape:** full capsule, `3px` indigo outline, uppercase Partita 600 label at inherited
  size (`0.45em 1.4em` padding), Lift 2 shadow.
- **Primary:** Action Teal fill, ink text. Used for Continue, choices, Check answers.
- **Play:** Signal Cyan fill — title card and chapter plate only. One per screen.
- **Hover:** choices and primary buttons swap to Signal Cyan; quiet buttons lighten to
  Panel White. No lift, no size change.
- **Focus:** 3px Outline Indigo outline at 2px offset, never a glow.
- **In-bubble variant:** the same primary capsule at `0.82em`, right-aligned, because clicking
  the artwork is the main advance action and the button is the keyboard affordance.

### Chips
- **HUD tag:** Panel White at 88% opacity, 2px indigo outline, capsule, uppercase Pixelify at
  `1.15cqw`, Lift 1. Top-left of the stage, carrying the game's title.
- **HUD action:** the same capsule with a pointer cursor — "Start over", "Glossary".
- **Status chips:** Panel White fill, 2px outline, capsule at `0.85em`; a status swaps border
  and text to Good Green or Bad Red. Proverb gains appear as a plain white chip.

### Cards / Containers
- **Choice pill:** Action Teal fill, 3px indigo outline, capsule, centred uppercase Pixelify,
  Lift 2. Hover goes cyan. Stacked in a column at the ground line, not in a panel.
- **Title card:** Panel White, 3px outline, `2cqw` radius, Lift 3, 58% width, centred. A
  small tracked kicker above the game name, one sentence of summary, then a cyan PLAY.
- **Chapter plate:** Panel White Dim, same construction at 46% width, an uppercase headline
  and one line of subtitle, then a cyan Continue.
- **Speech bubble:** Panel White at 94%, 3px outline, `1.2cqw` radius, Lift 2, `1.2cqw 1.7cqw`
  padding. Wide and low: 25%→3%, 4.5% off the bottom. It doubles as the verdict panel — the
  proverb becomes the headline, the "why" follows, and a long reveal scrolls.
- **Finale panel:** Panel White, 62% width, max-height 82%, scrolls, centred — the ending,
  the recap list and the restart button live here.
- **Game card:** a 16:10 tile of artwork only (`0.4rem` radius, overflow hidden) with the
  game name at 38% height and a teal Play pill at the bottom; the entire card is the link.

### Inputs / Fields
- **Style:** capsule in the public chrome (search, chips), 2px indigo outline and
  `0.5rem` radius in the editor, Panel White fill, ink text at VT323 1.15rem.
- **Focus:** the global 3px indigo outline at 2px offset — inputs do not add a glow or a
  fill change.
- **Editor fields:** cream-paper-free; white fill with a 2px outline and a `0.4–0.5rem`
  radius, so a form reads as a panel being filled in rather than as an app control. Active
  editor tabs invert to ink fill with white text.

### Navigation
- **Style:** sticky header on the lavender wall; brand at 1.6rem Partita 700 with a
  50%-radius logo, nav links at 1.15rem/600 in a `1.5rem` gap.
- **States:** the current page is underlined (not bolder, not coloured); hover is the default
  ink with no underline until focus.
- **Mobile:** the nav wraps under the brand rather than collapsing into a menu.

### Speech bubble + name plate (signature)
Measured from the deck's 1600×900 frames. A frosted white box (82% white, 2px near-white
edge, `1.6cqw` radius, Lift 2) spans 66.5%→91.5% of the stage height and 24.5%→95% of its
width, text at `2.6cqw` VT323. The speaker is a **large upper-body sprite standing in front
of the box's edge**: a sprite's image box runs past the bottom of the stage (Minh: left
−13.7%, top 23.1%, width 62.4%), so only head and shoulders show. A white name tag with a 3px
indigo outline straddles the box's top edge beside the shoulder. When Dr. Bird speaks he
stands on the right (left 66%, top 50.7%, width 35.8%), the box runs left and keeps 31cqw
clear of him, and the tag sits left of his shoulder. The same box carries the question on a
choice screen and becomes the proverb verdict (it grows upward and scrolls).

**Sprites change per scene** to match the deck: Minh neutral (sweater + heart), cheering
(eyes closed, fists up), travel outfit (white tee, backpack — the outdoor chapter), and
cheering without the heart (the room-search chapter). Each sprite carries its own measured
`left/top/width`; a character without `top` falls back to standing on the ground line.

### Proverb / hard-word popover (signature)
A dotted underline plus a 12% teal background tint on the term itself (`cursor: help`), and a
Panel White card on open: 2px indigo outline, `0.5rem` radius, Lift 3, `21rem` max width,
meaning then italic example. It opens on hover and on tap; the term stays a real button for
keyboard and screen readers.

## Do's and Don'ts

### Do:
- **Do** put a 3px Outline Indigo border on every story object and give it a zero-blur offset
  shadow from the Lift scale.
- **Do** keep the page on Room Lavender and let story objects use Panel White so they read as
  panels laid on the picture.
- **Do** set every interface label in uppercase Partita 600 with ~0.06em tracking, and every
  sentence in VT323 sentence case.
- **Do** use full capsules (`999px`) for controls and soft rectangles for panels.
- **Do** reserve Signal Cyan for one action per screen and Action Teal for the rest.
- **Do** verify the stage at both ends: 1280px desktop and 420px phone, where the panel drops
  below the artwork and the column centres vertically.

### Don't:
- **Don't** introduce a serif, a geometric sans, or a third typeface.
- **Don't** fill a button with lavender or use cyan as a background.
- **Don't** use pure black (`#000`) for text or outlines — the ink is indigo (#1b1a26).
- **Don't** apply blurred, ambient shadows to controls; blur belongs to the header wash only.
- **Don't** add gradients, glassmorphism or coloured glows to UI chrome; the only gradient in
  the system is the placeholder landscape.
- **Don't** centre body prose — centring is for page titles, cards and the game stage.
- **Don't** use red (Bad Red) for anything but a negative state.
