-- Editor ergonomics: chapters, per-screen art, speaker plates.
-- Run after 0001_init.sql (SQL Editor → New query → paste → run).

alter table public.scene
  -- The chapter/section a screen belongs to ("Finding the Campus"). Optional.
  add column if not exists chapter text,
  add column if not exists chapter_vi text,
  -- Artwork for this screen: a public URL (the editor uploads to the `art` bucket).
  add column if not exists image text,
  add column if not exists image_alt text;

create index if not exists scene_game_chapter on public.scene (game_id, chapter);

-- Positions become fractional so the editor can drop a screen (or a duplicate)
-- between two others with a single write instead of renumbering the list.
alter table public.scene
  alter column position type double precision using position::double precision;
