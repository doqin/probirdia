# Probirdia

Learn English proverbs through choose-your-own-adventure games.

Stack: [Astro](https://astro.build) (static pages) + [Svelte](https://svelte.dev) (game player, glossary, proverb popups). Stories and proverbs are written as CSV spreadsheets in `content/`; see [content/README.md](content/README.md). Progress is saved in the browser (`localStorage`).

```
npm install
npm run dev        # http://localhost:4321
npm run validate   # check spreadsheets for mistakes
npm test           # engine + validator tests
npm run build      # validates, then builds static site to dist/
```

## Layout

- `content/`: proverb glossary, hard-word list and games (teacher-edited CSVs)
- `src/lib/content.ts`: reads and validates the CSVs
- `src/lib/engine.ts`: pure game logic (scenes, items, proverb reveal, saves)
- `src/components/Player.svelte`: the game UI; `ProverbTerm.svelte`: hover/tap popup
- `src/i18n/ui.ts` and `LANGS` in `src/lib/types.ts`: language support (English now; add `vi` there and fill `_vi` columns)

## Deploying to GitHub Pages

The site is static. `.github/workflows/deploy.yml` builds and publishes it on every push to `main`.

1. Push this project to a GitHub repo named `probirdia` (public, unless the account has a paid plan).
2. In the repo: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. Push to `main`. The site appears at `https://<user>.github.io/probirdia/`.

The workflow sets `SITE` and `BASE` itself (`BASE` is `/probirdia`, taken from the repo name; a repo called `<user>.github.io` gets `/`). `npm run build` checks the spreadsheets first, so a mistake fails the deploy and the live site stays as it was.

Rules for code that links to anything:
- Never write a bare `/games/...` link or image path in a component. Wrap it: `withBase('/games/')` from `src/lib/url.ts`. Files under `public/` (and paths in `src/presentation/*.json`) are written root-relative as usual; `withBase` adds the prefix when they are rendered.
- Images imported from `src/assets` and `<Image>` already handle the base path.

To test the sub-path build locally (PowerShell):

```
$env:SITE='https://user.github.io'; $env:BASE='/probirdia'; npm run build; npx astro preview
```

(In Git Bash on Windows, prefix with `MSYS_NO_PATHCONV=1`, or the shell rewrites `/probirdia` into a Windows path.)

Moving to a custom domain later: add `public/CNAME` containing the domain, set `BASE` to `/` in the workflow, and set the domain in Settings > Pages.

## Scene art (developer-owned)

Teachers only write story text in `content/`. How a scene looks lives in `src/presentation/<game-slug>.json`, keyed by scene `id`, with images in `public/games/<game-slug>/`.

- `stages`: named backgrounds (`background`, `ground` = where characters stand as % from top, default `dialogue` position: `top` | `center` | `bottom`).
- `characters`, `props`: images with sizes in % of the 16:9 stage. Characters stand in a `left` / `center` / `right` slot; props have a bottom-centre `x`/`y`. A prop with `text` can carry the scene note (e.g. a signpost).
- `items`: art for each item name used in the `gives` column (shown on the "You got" card).
- `scenes`: an ordered list of rules. Each rule applies to `ids` (a list, or `"*"`) and later rules override earlier ones: `stage`, `dialogue`, `characters` (merged per slot; `null` empties a slot), `props` (replaced), `noteOn`, `headingInArt`.

`npm run validate` checks that every referenced scene, stage, character, prop and image file exists. A game with no presentation file still plays (placeholder landscape, dialogue at the bottom).

On phones (under 40rem) the artwork is shown on top and the dialogue below it, and a note printed on a prop moves into the dialogue box.

The current art is placeholder SVG shapes copied from the mock scenes. Swap the files (WebP/AVIF recommended, about 1600px wide, transparent PNG/WebP for characters) and adjust the numbers in the JSON.

## Not built yet

Real artwork (home banner, game thumbnails: set `"thumbnail"` in `game.json`), About page copy, Vietnamese UI routing, any server or accounts.