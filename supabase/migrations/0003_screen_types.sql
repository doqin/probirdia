-- Screens the deck draws as their own pages: a title card with PLAY, and a
-- chapter divider over the next stage. Run after 0002.

alter table public.scene
  drop constraint if exists scene_phase_check;

alter table public.scene
  add constraint scene_phase_check
  check (phase in ('title', 'divider', 'preview', 'game', 'review'));

-- The deck's title card names the course ("Complete your enrollment") on one
-- line and the game ("Start university life") on the next.
alter table public.game
  add column if not exists kicker text,
  add column if not exists kicker_vi text;
