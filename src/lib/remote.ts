import type { Choice, Game, GlossaryEntry, Localized, Presentation, Route, Scene, SceneRule } from './types';
import { slugify } from './slug';
import { generateForms } from './words';
import { supabase } from './supabase';

/**
 * The database shape (see supabase/migrations/0001_init.sql) and the mapping to
 * the `Game` / `GlossaryEntry` types the player already understands.
 * Everything that maps rows to the domain model is pure, so it is unit tested
 * without a database (tests/remote.test.ts).
 */

export interface ProverbRow {
  id: string;
  kind: 'proverb' | 'word';
  term: string;
  term_vi: string | null;
  meaning: string;
  meaning_vi: string | null;
  example: string | null;
  example_vi: string | null;
  forms: string[];
  /** Review segment: the word to type back, and a nudge toward it. Optional; defaults are derived. */
  blank?: string | null;
  hint?: string | null;
  hint_vi?: string | null;
}

export interface StoredChoice {
  label?: string;
  label_vi?: string;
  proverb_id?: string;
  next_key?: string;
  correct?: boolean;
}

export interface SceneRow {
  id: string;
  game_id: string;
  key: string;
  phase: 'title' | 'divider' | 'preview' | 'game' | 'review' | 'gameover';
  position: number;
  chapter: string | null;
  chapter_vi: string | null;
  heading: string | null;
  heading_vi: string | null;
  text: string;
  text_vi: string | null;
  note: string | null;
  note_vi: string | null;
  note_simple: string | null;
  note_simple_vi: string | null;
  image: string | null;
  image_alt: string | null;
  gives: string[];
  status: string[];
  clears: string[];
  next_key: string | null;
  choices: StoredChoice[];
  routes: Route[];
}

export interface GameRow {
  id: string;
  slug: string;
  title: string;
  title_vi: string | null;
  summary: string;
  summary_vi: string | null;
  description: string;
  description_vi: string | null;
  thumbnail: string | null;
  relics: string[];
  positive_status: string[];
  start_key: string | null;
  presentation: Presentation | null;
  status: 'draft' | 'published';
}

export interface GameProverbRow {
  game_id: string;
  proverb_id: string;
  position: number;
  why_it_fits: string | null;
  why_it_fits_vi: string | null;
}

export interface EditorData {
  game: GameRow;
  scenes: SceneRow[];
  proverbs: ProverbRow[];
  used: GameProverbRow[];
}

// ---------------------------------------------------------------------------
// Mapping (pure)
// ---------------------------------------------------------------------------

const text = (value: string | null | undefined) => value?.trim() ?? '';

export const proverbSlug = (term: string) => slugify(term);

/** Builds a Localized value from an `en` column and its optional `_vi` twin. */
function localized(en: string | null | undefined, vi: string | null | undefined): Localized | undefined {
  const e = text(en);
  if (!e) return undefined;
  const v = text(vi);
  return v ? { en: e, vi: v } : { en: e };
}

function required(en: string | null | undefined, vi: string | null | undefined, fallback = ''): Localized {
  return localized(en, vi) ?? { en: fallback };
}

export function toScene(row: SceneRow, slugById: Map<string, string>): Scene {
  const choices: Choice[] = (row.choices ?? [])
    .filter((c) => c.next_key?.trim())
    .map((c) => {
      const next = c.next_key!.trim();
      if (c.proverb_id) {
        return { proverb: slugById.get(c.proverb_id) ?? '', next, correct: c.correct };
      }
      return { label: localized(c.label, c.label_vi), next, correct: c.correct };
    });

  return {
    id: row.key,
    heading: localized(row.heading, row.heading_vi),
    text: { en: text(row.text), ...(row.text_vi?.trim() ? { vi: row.text_vi.trim() } : {}) },
    note: localized(row.note, row.note_vi),
    noteSimple: localized(row.note_simple, row.note_simple_vi),
    chapter: localized(row.chapter, row.chapter_vi),
    image: row.image?.trim() || undefined,
    imageAlt: row.image_alt?.trim() || undefined,
    phase: row.phase,
    gives: row.gives ?? [],
    status: row.status ?? [],
    clears: row.clears ?? [],
    choices,
    next: row.next_key?.trim() || undefined,
    routes: row.routes?.length ? row.routes : undefined,
  };
}

/**
 * Screens that carry their own picture become a one-stage presentation, so the
 * editor can publish a fully illustrated game without a developer writing
 * presentation JSON. Developer rules (row.presentation) still win: they are
 * merged over the top and applied after.
 */
function artFromScenes(scenes: SceneRow[]): Presentation | undefined {
  const stages: Presentation['stages'] = {};
  const rules: SceneRule[] = [];
  let carry: string | null = null;

  for (const scene of scenes) {
    const image = scene.image?.trim();
    if (image) {
      carry = `art-${scene.key}`;
      stages[carry] = { background: image, alt: scene.image_alt?.trim() || undefined };
    }
    // Like the old presentation rules: a picture stays until another one replaces it.
    if (carry) rules.push({ ids: [scene.key], stage: carry });
  }

  if (!rules.length) return undefined;
  return { stages, characters: {}, props: {}, items: {}, scenes: rules };
}

export function toGame(row: GameRow, scenes: SceneRow[], slugById: Map<string, string>): Game {
  const ordered = [...scenes].sort((a, b) => a.position - b.position);
  const map: Record<string, Scene> = {};
  for (const scene of ordered) map[scene.key] = toScene(scene, slugById);

  const art = artFromScenes(ordered);
  const dev = row.presentation;
  const presentation: Presentation | undefined = dev
    ? {
        stages: { ...(art?.stages ?? {}), ...dev.stages },
        characters: dev.characters ?? {},
        props: dev.props ?? {},
        items: dev.items ?? {},
        music: dev.music,
        proverbSting: dev.proverbSting,
        sfx: dev.sfx,
        font: dev.font,
        ui: dev.ui,
        scenes: [...(art?.scenes ?? []), ...(dev.scenes ?? [])],
      }
    : art;

  return {
    slug: row.slug,
    title: required(row.title, row.title_vi, row.slug),
    summary: required(row.summary, row.summary_vi, row.title),
    description: required(row.description, row.description_vi, row.summary || row.title),
    thumbnail: row.thumbnail ?? undefined,
    start: row.start_key?.trim() || ordered[0]?.key || '',
    relics: row.relics ?? [],
    positiveStatus: row.positive_status ?? [],
    scenes: map,
    presentation,
  };
}

export function toGlossaryEntry(row: ProverbRow): GlossaryEntry {
  const slug = proverbSlug(row.term);
  return {
    slug,
    kind: row.kind,
    term: row.term.trim(),
    forms: row.kind === 'word' ? generateForms(row.term, row.forms ?? []) : undefined,
    letter: slug[0]?.toUpperCase() ?? '#',
    meaning: required(row.meaning, row.meaning_vi),
    example: localized(row.example, row.example_vi),
    blank: row.blank?.trim() || undefined,
    hint: localized(row.hint ?? null, row.hint_vi ?? null),
  };
}

export function toGlossary(rows: ProverbRow[]): GlossaryEntry[] {
  return rows.map(toGlossaryEntry).sort((a, b) => a.slug.localeCompare(b.slug));
}

export function slugById(rows: ProverbRow[]): Map<string, string> {
  return new Map(rows.map((r) => [r.id, proverbSlug(r.term)]));
}

// ---------------------------------------------------------------------------
// Reading content
// ---------------------------------------------------------------------------

function client() {
  if (!supabase) {
    throw new Error(
      'The content database is not set up yet: add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env (see .env.example).',
    );
  }
  return supabase;
}

async function scenesOf(ids: string[]): Promise<SceneRow[]> {
  if (!ids.length) return [];
  const { data, error } = await client().from('scene').select('*').in('game_id', ids).order('position');
  if (error) throw error;
  return (data ?? []) as SceneRow[];
}

async function allProverbs(): Promise<ProverbRow[]> {
  const { data, error } = await client().from('proverb').select('*').order('term');
  if (error) throw error;
  return (data ?? []) as ProverbRow[];
}

export async function fetchPublishedGames(): Promise<Game[]> {
  const { data, error } = await client().from('game').select('*').eq('status', 'published').order('title');
  if (error) throw error;
  const rows = (data ?? []) as GameRow[];
  if (!rows.length) return [];
  const [scenes, proverbs] = await Promise.all([scenesOf(rows.map((r) => r.id)), allProverbs()]);
  const ids = slugById(proverbs);
  return rows
    .map((row) => toGame(row, scenes.filter((s) => s.game_id === row.id), ids))
    .sort((a, b) => a.title.en.localeCompare(b.title.en));
}

export async function fetchPublishedGame(slug: string): Promise<Game | null> {
  const { data, error } = await client().from('game').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as GameRow;
  const [scenes, proverbs] = await Promise.all([scenesOf([row.id]), allProverbs()]);
  return toGame(row, scenes, slugById(proverbs));
}

/**
 * The draft preview in the editor. Row level security only returns a row that is
 * not published when the caller is signed in as an editor, so this is safe to
 * expose on the same page as the public player.
 */
export async function fetchGameForPreview(slug: string): Promise<{ game: Game; published: boolean } | null> {
  const { data, error } = await client().from('game').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as GameRow;
  const [scenes, proverbs] = await Promise.all([scenesOf([row.id]), allProverbs()]);
  return { game: toGame(row, scenes, slugById(proverbs)), published: row.status === 'published' };
}

export async function fetchGlossary(): Promise<{ proverbs: GlossaryEntry[]; words: GlossaryEntry[] }> {
  const rows = await allProverbs();
  const entries = toGlossary(rows);
  return {
    proverbs: entries.filter((e) => e.kind === 'proverb'),
    words: entries.filter((e) => e.kind === 'word'),
  };
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

export async function amAnEditor(): Promise<boolean> {
  const { data, error } = await client().rpc('is_editor');
  if (error) throw error;
  return data === true;
}

export async function fetchEditorGames(): Promise<GameRow[]> {
  const { data, error } = await client().from('game').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

export async function fetchEditorData(gameId: string): Promise<EditorData> {
  const [{ data: game, error: gameError }, scenes, proverbs, used] = await Promise.all([
    client().from('game').select('*').eq('id', gameId).single(),
    scenesOf([gameId]),
    allProverbs(),
    client().from('game_proverb').select('*').eq('game_id', gameId).order('position'),
  ]);
  if (gameError) throw gameError;
  if (used.error) throw used.error;
  return {
    game: game as GameRow,
    scenes,
    proverbs,
    used: (used.data ?? []) as GameProverbRow[],
  };
}

export async function createGame(slug: string, title: string): Promise<GameRow> {
  const { data, error } = await client()
    .from('game')
    .insert({ slug, title, summary: '', description: '' })
    .select('*')
    .single();
  if (error) throw error;
  return data as GameRow;
}

export async function updateGame(id: string, patch: Partial<GameRow>): Promise<void> {
  const { error } = await client().from('game').update(patch).eq('id', id);
  if (error) throw error;
}

export async function setGameStatus(id: string, status: 'draft' | 'published'): Promise<void> {
  const { error } = await client().from('game').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function saveScene(scene: Omit<SceneRow, 'id'> & { id?: string }): Promise<SceneRow> {
  const { id, ...row } = scene;
  const query = id
    ? client().from('scene').update(row).eq('id', id)
    : client().from('scene').insert(row);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return data as SceneRow;
}

export async function deleteScene(id: string): Promise<void> {
  const { error } = await client().from('scene').delete().eq('id', id);
  if (error) throw error;
}

export async function saveProverb(row: Partial<ProverbRow> & { id?: string }): Promise<ProverbRow> {
  const { id, ...values } = row;
  const query = id ? client().from('proverb').update(values).eq('id', id) : client().from('proverb').insert(values);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return data as ProverbRow;
}

/** The shared hard-word list: not tied to any game, picked up by every game's text. */
export async function fetchWordList(): Promise<ProverbRow[]> {
  const { data, error } = await client().from('proverb').select('*').eq('kind', 'word').order('term');
  if (error) throw error;
  return (data ?? []) as ProverbRow[];
}

export async function deleteWord(id: string): Promise<void> {
  const { error } = await client().from('proverb').delete().eq('id', id).eq('kind', 'word');
  if (error) throw error;
}

export async function attachProverb(gameId: string, proverbId: string, position: number): Promise<void> {
  const { error } = await client()
    .from('game_proverb')
    .upsert({ game_id: gameId, proverb_id: proverbId, position }, { onConflict: 'game_id,proverb_id' });
  if (error) throw error;
}

export async function detachProverb(gameId: string, proverbId: string): Promise<void> {
  const { error } = await client()
    .from('game_proverb')
    .delete()
    .eq('game_id', gameId)
    .eq('proverb_id', proverbId);
  if (error) throw error;
}

export async function saveWhyItFits(
  gameId: string,
  proverbId: string,
  why: { why_it_fits: string; why_it_fits_vi: string },
): Promise<void> {
  const { error } = await client()
    .from('game_proverb')
    .update(why)
    .eq('game_id', gameId)
    .eq('proverb_id', proverbId);
  if (error) throw error;
}

export async function savePresentation(id: string, presentation: Presentation): Promise<void> {
  const { error } = await client().from('game').update({ presentation }).eq('id', id);
  if (error) throw error;
}

export async function uploadArt(file: File, folder: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error } = await client().storage.from('art').upload(path, file, { upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  const { data } = client().storage.from('art').getPublicUrl(path);
  return data.publicUrl;
}
