-- Probirdia content database (run once in Supabase → SQL Editor).
-- Content creators use /editor in the web app; nobody needs to touch this file again.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Who may edit. A row here = an editor account. Add one with the SQL at the
-- bottom of this file after the person has signed in once.
-- ---------------------------------------------------------------------------
create table public.editor (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.editor where user_id = auth.uid()) $$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table public.proverb (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'proverb' check (kind in ('proverb', 'word')),
  term text not null,
  term_vi text,
  meaning text not null,
  meaning_vi text,
  example text,
  example_vi text,
  -- extra spellings of a hard word (see src/lib/words.ts)
  forms text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (kind, term)
);

create table public.game (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  title_vi text,
  summary text not null default '',
  summary_vi text,
  description text not null default '',
  description_vi text,
  thumbnail text,
  relics text[] not null default '{}',
  positive_status text[] not null default '{}',
  -- key of the first scene; falls back to the scene with the lowest position
  start_key text,
  -- developer-owned artwork/audio mapping, copied from src/presentation/<slug>.json
  presentation jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The proverbs a game teaches, in order: the preview list and the review list.
create table public.game_proverb (
  game_id uuid not null references public.game (id) on delete cascade,
  proverb_id uuid not null references public.proverb (id) on delete cascade,
  position int not null default 0,
  -- review segment: why this proverb does or does not suit the scene
  why_it_fits text,
  why_it_fits_vi text,
  primary key (game_id, proverb_id)
);

create table public.scene (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game (id) on delete cascade,
  key text not null,
  phase text not null default 'game' check (phase in ('preview', 'game', 'review')),
  position int not null default 0,
  heading text,
  heading_vi text,
  text text not null default '',
  text_vi text,
  note text,
  note_vi text,
  note_simple text,
  note_simple_vi text,
  gives text[] not null default '{}',
  status text[] not null default '{}',
  clears text[] not null default '{}',
  next_key text,
  -- [{ label, label_vi, proverb_id, next_key, correct }]
  choices jsonb not null default '[]'::jsonb,
  -- [{ if, next }]
  routes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (game_id, key)
);

create index scene_game_position on public.scene (game_id, position);
create index game_proverb_game_position on public.game_proverb (game_id, position);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger game_touch before update on public.game
  for each row execute function public.touch_updated_at();
create trigger scene_touch before update on public.scene
  for each row execute function public.touch_updated_at();
create trigger proverb_touch before update on public.proverb
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: everyone may read published games, editors may read and
-- write everything.
-- ---------------------------------------------------------------------------
alter table public.editor enable row level security;
alter table public.game enable row level security;
alter table public.proverb enable row level security;
alter table public.game_proverb enable row level security;
alter table public.scene enable row level security;

-- an account may check whether it is an editor
create policy editor_self on public.editor
  for select using (user_id = auth.uid());

create policy proverb_read on public.proverb
  for select using (true);
create policy proverb_write on public.proverb
  for all using (public.is_editor()) with check (public.is_editor());

create policy game_read on public.game
  for select using (status = 'published' or public.is_editor());
create policy game_write on public.game
  for all using (public.is_editor()) with check (public.is_editor());

create policy game_proverb_read on public.game_proverb
  for select using (
    exists (
      select 1 from public.game g
      where g.id = game_id and (g.status = 'published' or public.is_editor())
    )
  );
create policy game_proverb_write on public.game_proverb
  for all using (public.is_editor()) with check (public.is_editor());

create policy scene_read on public.scene
  for select using (
    exists (
      select 1 from public.game g
      where g.id = game_id and (g.status = 'published' or public.is_editor())
    )
  );
create policy scene_write on public.scene
  for all using (public.is_editor()) with check (public.is_editor());

-- ---------------------------------------------------------------------------
-- Artwork: one public bucket. Players may read, editors may upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('art', 'art', true)
on conflict (id) do nothing;

create policy art_read on storage.objects
  for select using (bucket_id = 'art');
create policy art_write on storage.objects
  for all using (bucket_id = 'art' and public.is_editor())
  with check (bucket_id = 'art' and public.is_editor());

-- ---------------------------------------------------------------------------
-- Make somebody an editor (paste their email, after they have signed in once):
--
--   insert into public.editor (user_id)
--   select id from auth.users where email = 'creator@example.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------------
