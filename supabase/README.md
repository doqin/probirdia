# Content database (Supabase)

Everything the team writes lives here, not in the repo. Content creators never
touch git, npm or a terminal: they sign in at `/editor` and publish.

## One-time setup (whoever owns the project, about 10 minutes)

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. Open **SQL Editor → New query**, paste all of `migrations/0001_init.sql`, run it,
   then do the same with `migrations/0002_scene_chapter_and_art.sql`.
   That creates the tables, the permission rules, the public `art` bucket, and the
   chapter/artwork columns the editor writes.
3. **Authentication → Providers → Email**: keep *Email* enabled (magic links).
   Under **URL Configuration**, add your site to *Redirect URLs*:
   `http://localhost:4321/editor/` and `https://<your-site>/editor/`.
   Create one account for the importer under **Authentication → Users → Add user**
   with **email + password** (magic-link accounts have no password to sign in with).
4. **Project Settings → API keys**: copy the *Project URL* and the *publishable*
   key (`sb_publishable_…`, the one formerly called *anon*) into `.env` — copy
   `.env.example` first.
5. Make that account an editor (SQL Editor, with its email):
   ```sql
   insert into public.editor (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```
6. Import the games and glossary that already exist in `content/`:
   ```
   npm run seed
   ```
   It reads `.env`, signs in as the editor above with the publishable key, and
   writes through row level security. No service role key is used anywhere.
7. Start the site with `npm run dev` and open `/editor`; sign in with any editor
   email (a magic link arrives). Add teammates the same way after they have
   signed in once.

## Day-to-day

- `/editor` → pick a game, edit the story, proverbs and settings. The **Check**
  tab lists anything that would break the game; **Publish** is blocked until it
  is empty. **Preview draft** plays the unpublished game in another tab.
- Screens carry a chapter name, so the story tab reads as sections. Drag-free
  reordering uses ↑/↓, copying uses ⧉, and **Paste a script** turns one line per
  screen into chained screens (`Minh: …` sets the speaker).
- Publishing is instant: players see it at `/play/?g=<slug>` and on `/games`
  immediately, without a rebuild or a deploy.

## What content creators can and cannot do

| Can | Cannot |
|---|---|
| Write scenes, choices, notes, proverbs, Vietnamese meanings | Edit `supabase/migrations`, `.env`, or the code |
| Upload a picture per screen (goes to the `art` bucket) | Change the presentation JSON rules (developer-owned) |
| Mark the right answer, write why a proverb fits | Delete a game outright |
| Publish / unpublish a game, preview a draft | Add an editor account (that is a SQL step) |

Artwork stays a developer job: `src/presentation/<slug>.json` and
`public/games/<slug>/`. When it changes, update the game's `presentation`
column (`npm run seed` copies it from `game.json`/presentation for seeded games).

## Notes

- Row level security does the access control: anyone may read published games,
  editors may read and write everything. The publishable key is safe in the
  browser for exactly that reason — it grants nothing on its own.
- The service role key is never needed. The importer (`npm run seed`) signs in
  as an ordinary editor account and writes through the same policies.
- The CSV files in `content/` stay the authoring format for the build-time site
  until the team is fully moved over; the editor is the source of truth for
  published content.
