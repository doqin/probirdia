# Probirdia

Learn English proverbs through choose-your-own-adventure games.

Stack: [Astro](https://astro.build) (static pages) + [Svelte](https://svelte.dev) (game player, glossary, proverb popups). Stories and proverbs are written as CSV spreadsheets in `content/`; see [content/README.md](content/README.md). Progress is saved in the browser (`localStorage`).

```
npm install
npm run dev        # http://localhost:4321
npm run validate   # check spreadsheets for mistakes
npm test           # engine + validator tests
npm run check      # type-check the Svelte components
npm run build      # validates, then builds static site to dist/
```

## Content studio (writing games in the browser)

Content creators write and publish games at `/editor` — no git, no spreadsheets,
no terminal. Content lives in a Supabase project; publishing is instant, because
`/play/?g=<slug>` and the games list read it live.

Setting the project up is a one-time job: see [supabase/README.md](supabase/README.md).

What a content creator can do without touching code:

- **Chapters** — every screen carries a chapter name; the story tab groups by it, so a
  five-chapter lesson reads as five sections, not a flat list of 110 screens.
- **Fast authoring** — duplicate a screen, move it up/down (fractional positions, one
  write per move), or paste a whole script: one line per screen, `Minh: …` sets the
  speaker, and the screens arrive already chained with Continue buttons.
- **Artwork per screen** — type an image address or upload a file to the `art` bucket;
  the editor turns it into the stage the player shows. A game with no presentation
  JSON still looks finished.
- **Preview before publishing** — "Preview draft" plays the unpublished game in
  another tab (row level security only shows drafts to signed-in editors).
- **Proverbs** — edit the proverb, its English and Vietnamese meaning, and why it fits
  where the story uses it; the panel warns when the set is not the ten the format uses.
- **Check tab** — the same validator the build runs, in plain English; publishing is
  blocked while it reports anything.

- `supabase/migrations/0001_init.sql`, `0002_scene_chapter_and_art.sql`: tables, row level security, `art` bucket, chapter/art columns
- `src/lib/remote.ts`: rows ⇄ the `Game` model the player understands (screen pictures become stages)
- `src/lib/scene-list.ts`: the editor's ordering, search, chapter grouping, fractional positions
- `src/lib/validate-game.ts`: the checks the editor runs before publishing
- `src/components/Editor.svelte`: auth gate, game list, story/proverbs/settings/check tabs
- `src/components/RemotePlayer.svelte`: plays a game straight from the database, published or draft
- `scripts/seed-supabase.ts`: imports the existing CSVs (`npm run seed`)

The CSVs in `content/` keep working: the static build still reads them, so the
site never depends on the database being reachable.

## Layout

- `content/`: proverb glossary, hard-word list and games (teacher-edited CSVs)
- `src/lib/content.ts`: reads and validates the CSVs
- `src/lib/engine.ts`: pure game logic (scenes, items, proverb reveal, saves)
- `src/components/Player.svelte`: the game UI; `ProverbTerm.svelte`: hover/tap popup
- `src/i18n/ui.ts` and `LANGS` in `src/lib/types.ts`: language support (English now; add `vi` there and fill `_vi` columns)

## Deploying to Vercel

The site is static. Vercel builds it with `npm run build` (see `vercel.json`) on every push to `main`; other branches get preview URLs. The site is served from the domain root, so `BASE` and `SITE` stay unset.

1. Import the repo at vercel.com (or run `vercel link`).
2. In **Settings > Environment Variables**, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production and Preview. They are needed at build time and are safe in the browser.
3. Add the deployed address to Supabase **Authentication > URL Configuration > Redirect URLs**: `https://<your-site>/editor/`.

`npm run build` checks the spreadsheets first, so a mistake fails the deploy and the live site stays as it was.

Rules for code that links to anything:
- Never write a bare `/games/...` link or image path in a component. Wrap it: `withBase('/games/')` from `src/lib/url.ts`. Files under `public/` (and paths in `src/presentation/*.json`) are written root-relative as usual; `withBase` adds the prefix when they are rendered.
- Images imported from `src/assets` and `<Image>` already handle the base path.

To test a sub-path build locally: `SITE=https://example.com BASE=/probirdia npm run build && npx astro preview`.

## Scene art (developer-owned)

Teachers only write story text in `content/`. How a scene looks lives in `src/presentation/<game-slug>.json`, keyed by scene `id`, with images in `public/games/<game-slug>/`.

- `stages`: named backgrounds (`background`, `ground` = where characters stand as % from top, default `dialogue` position: `top` | `center` | `bottom`).
- `characters`, `props`: images with sizes in % of the 16:9 stage. Characters stand in a `left` / `center` / `right` slot; props have a bottom-centre `x`/`y` (the centre when `rotate` is set). A prop with `text` can carry the scene note (e.g. a signpost). A prop with `label` prints fixed text on itself (speech bubbles), `labelSize` is the font size in % of the stage width, and `rotate` turns it clockwise in degrees. A game whose sprites must stand anywhere can use props for everything instead of character slots.
- `items`: art for each item name used in the `gives` column (shown on the "You got" card).
- `music`: audio files (`loop: true` repeats). A scene rule's `music` picks the track; `proverbSting` is played when a proverb is revealed. Music starts after the player's first click and can be muted (the choice is remembered).
- `scenes`: an ordered list of rules. Each rule applies to `ids` (a list, or `"*"`) and later rules override earlier ones: `stage`, `dialogue`, `characters` (merged per slot; `null` empties a slot), `props` (replaced), `noteOn`, `headingInArt`.

`npm run validate` checks that every referenced scene, stage, character, prop and image file exists. A game with no presentation file still plays (placeholder landscape, dialogue at the bottom).

On phones (under 40rem) the artwork is shown on top and the dialogue below it, and a note printed on a prop moves into the dialogue box.

Swap the files (WebP/AVIF recommended, about 1600px wide, transparent PNG/WebP for characters) and adjust the numbers in the JSON.

The game that shipped first (Slay the Demon King) has been dropped with the format change: its content now lives in `tests/fixtures/` as engine-test data only, and its art is gone from `public/`.

## Not built yet

Real artwork (home banner, game thumbnails: set `"thumbnail"` in `game.json`), About page copy, Vietnamese UI routing, any server or accounts.