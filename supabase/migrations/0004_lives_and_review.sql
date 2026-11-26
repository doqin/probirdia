-- Lives, the game-over screen and the review segment. Run after 0003.

-- A screen shown when the player runs out of confidence hearts.
alter table public.scene
  drop constraint if exists scene_phase_check;

alter table public.scene
  add constraint scene_phase_check
  check (phase in ('title', 'divider', 'preview', 'game', 'review', 'gameover'));

-- Review segment: the word the learner types back, and a nudge toward it.
-- Both are optional; the player derives them from the proverb when empty.
alter table public.proverb
  add column if not exists blank text,
  add column if not exists hint text,
  add column if not exists hint_vi text;
