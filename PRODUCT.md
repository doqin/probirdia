# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: UFLS Da Nang students, in class, playing an assigned game.** The teacher
gives a lesson; students play a short story (5 chapters, roughly 10–15 minutes) on
laptops or phones during or after class. They are Vietnamese learners of English at
university level, not native speakers; idioms and proverbs are the part of English
they read fluently but cannot produce.

**Secondary: the teacher / content creator.** One or two people per course, not
developers. They write the story, the proverbs and the wording themselves, and must be
able to publish a new lesson without touching spreadsheets, git or a terminal.

## Product Purpose

Probirdia teaches English proverbs through short choose-your-own-adventure stories.
Each game is built around a fixed set of ten proverbs: the learner meets each one
inside a situation where it does or does not fit, and the proverb itself is the thing
they click. Success is **productive use** — the student can drop the proverb into
their own writing or speech afterwards, correctly and in the right register, not just
recognise it.

## Positioning

Story-first, proverb-as-choice. Neighbouring products teach idioms as flashcards or
quiz items, separate from any context. Here the proverbs *are* the interaction: the
branch point of the story is a choice between proverbs, so a wrong pick is a wrong
reading of the situation, and the feedback explains why one proverb fits and the
other does not. A neighbouring product could copy the story format or the glossary,
but not the pairing of a situational branch with a "why this proverb works here"
explanation.

## Operating Context

- Classroom use at UFLS Da Nang; the story setting (Minh enrolling, the monument
  square, the rented room, the tuition bill) is drawn from these students' own
  first-year life.
- The teacher authors in the browser at `/editor`, signs in with an editor account, and
  publishes instantly; students reach a game at `/play/?g=<slug>`.
- The legacy path stays live: stories and glossaries are also plain CSV files in
  `content/`, and the static build reads them, so the site works when the database is
  unreachable.
- Progress is per-browser (`localStorage`, key `probirdia:v1:<slug>`); no accounts for
  students.
- Deployed as a static site (GitHub Pages workflow), with Supabase for authored content
  and art.

## Capabilities and Constraints

**Confirmed**
- Games carry a glossary of proverbs and a separate hard-word list; any listed word in
  a story is hoverable/tappable for its meaning, first use per block only.
- Per the product manager's revised format, a lesson has three parts: **Preview**
  (match ten proverbs to meanings with dropdowns, wrong answers retried until correct,
  then a proverb / meaning / Vietnamese-translation table), **Game** (point-and-click
  story, two lives called *confidence*, two wrong picks restart the run), **Review**
  (fill in the blank, one random word removed per proverb, typed by hand, with a
  mini-screen after each cutscene explaining why the proverb works or fails in that
  context).
- Ten proverbs per game is the format's fixed size; the editor warns when a game
  drifts from it.
- English is the interface and the learners' meanings are English; Vietnamese exists
  only as optional extra columns (`meaning_vi`, `example_vi`) and may be filled later.
- The vocabulary level inside stories is deliberately controlled by the hard-word list,
  and poems/notes can carry a plain-words version.

**Undecided / not built yet**
- The Preview and Review phases, and the two-confidence-life counter, are specified but
  not implemented; the current player is still the dialogue-and-choice story.
- Whether a video/photo of a classroom session will be used as evidence is open.

## Brand Commitments

- Name: **Probirdia**. Voice: warm, plain-English, student-facing, never exam-sheet
  formal; explains instead of scoring.
- The guide character is **Dr. Bird**, an owl; the protagonist is **Minh**, a first-year
  student. Both appear throughout the games and are part of the product's identity.
- The lesson content is Vietnamese-university first-year life in Da Nang, not generic
  foreign settings.

## Evidence on Hand

- `content/glossary.csv`: 22 proverbs with English meanings and examples.
- `content/words.csv`: 35 hard words.
- `content/games/starting-university/`: the full first lesson, 5 chapters plus an
  ending (85 scene rows), branching on proverb choices.
- The approved visual design: Canva deck `DAHa5qfjhTw`, 110 pages, covering the
  lesson's screens, choice cards, and character art. Backgrounds and character sprites
  were extracted from it into `public/games/starting-university/`.
- No testimonials, enrolment numbers, press or benchmark data exist; future work must
  not invent any.

## Product Principles

1. **The situation does the teaching.** A proverb is never introduced on its own; it
   arrives as the answer (or a tempting wrong answer) to a moment in the story.
2. **Wrong is information, not failure.** A mistaken pick explains why the proverb
   does not fit, in English the learner can actually parse.
3. **Ten, well. Not fifty, badly.** Each lesson commits to a fixed small set the
   learner should be able to use afterwards.
4. **The teacher ships without a developer.** Anything a lesson needs — text, proverbs,
   chapters, art — must be authorable in the browser editor.
5. **The learner's own world.** Settings, characters and problems come from Vietnamese
   first-year university life, not from imported textbook scenarios.

## Accessibility & Inclusion

Learners are non-native English speakers reading on laptops and classroom phones; text
must stay legible at phone widths, meanings must not rely on hover alone (tap and
keyboard must reach them), and vocabulary support is a product feature rather than an
accessibility afterthought.
