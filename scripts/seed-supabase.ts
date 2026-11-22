/**
 * Copies the spreadsheet content in `content/` into the Supabase project.
 *
 *   npm run seed
 *
 * It uses the same publishable key as the site and signs in as a content editor,
 * so row level security lets it write. No service role key is involved.
 * Fill in `.env` first:
 *
 *   PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *   SUPABASE_EDITOR_EMAIL=you@example.com
 *   SUPABASE_EDITOR_PASSWORD=...
 *
 * The account must already be on the editor list (see supabase/README.md).
 */
import { createClient } from '@supabase/supabase-js';
import { loadAllGames, loadGlossary, loadWords } from '../src/lib/content';
import { parseMarkup } from '../src/lib/markup';
import { slugify } from '../src/lib/slug';
import type { Game, Scene } from '../src/lib/types';

// Use the same .env as the site when it exists.
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env yet: fall back to the shell environment */
}

const url = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key =
  process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_EDITOR_EMAIL;
const password = process.env.SUPABASE_EDITOR_PASSWORD;

const missing = [
  ['PUBLIC_SUPABASE_URL', url],
  ['PUBLIC_SUPABASE_PUBLISHABLE_KEY', key],
  ['SUPABASE_EDITOR_EMAIL', email],
  ['SUPABASE_EDITOR_PASSWORD', password],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length) {
  console.error(
    `Set ${missing.join(', ')} in .env before running this script.\n` +
      'The publishable key is the public one from Project Settings → API;\n' +
      'the email and password are an editor account (see supabase/README.md).',
  );
  process.exit(1);
}

const db = createClient(url!, key!, { auth: { persistSession: false } });

/** Proverbs a game actually uses, in the order they first appear. */
function proverbsIn(game: Game): string[] {
  const order: string[] = [];
  const add = (slug: string) => {
    if (slug && !order.includes(slug)) order.push(slug);
  };
  for (const scene of Object.values(game.scenes)) {
    for (const choice of scene.choices) add(choice.proverb ?? '');
    for (const field of [scene.text, scene.note, scene.noteSimple, scene.heading]) {
      for (const value of Object.values(field ?? {})) {
        for (const segment of parseMarkup(value ?? '')) if (segment.kind === 'proverb') add(segment.slug);
      }
    }
  }
  return order;
}

function sceneRow(gameId: string, scene: Scene, position: number, proverbIds: Map<string, string>) {
  return {
    game_id: gameId,
    key: scene.id,
    phase: scene.phase ?? 'game',
    position,
    heading: scene.heading?.en ?? null,
    heading_vi: scene.heading?.vi ?? null,
    text: scene.text.en,
    text_vi: scene.text.vi ?? null,
    note: scene.note?.en ?? null,
    note_vi: scene.note?.vi ?? null,
    note_simple: scene.noteSimple?.en ?? null,
    note_simple_vi: scene.noteSimple?.vi ?? null,
    gives: scene.gives,
    status: scene.status,
    clears: scene.clears,
    next_key: scene.next ?? null,
    choices: scene.choices.map((choice) => ({
      label: choice.label?.en,
      label_vi: choice.label?.vi,
      proverb_id: choice.proverb ? proverbIds.get(choice.proverb) : undefined,
      next_key: choice.next,
      correct: choice.correct,
    })),
    routes: scene.routes ?? [],
  };
}

async function main() {
  const { error: signInError } = await db.auth.signInWithPassword({ email: email!, password: password! });
  if (signInError) {
    throw new Error(
      `Could not sign in as ${email}: ${signInError.message}\n` +
        'If this account has no password yet, set one in Supabase → Authentication → Users.',
    );
  }

  const { data: editor, error: roleError } = await db.rpc('is_editor');
  if (roleError) throw roleError;
  if (editor !== true) {
    throw new Error(
      `${email} is signed in but is not on the editor list, so the database refuses the writes.\n` +
        'Add it in Supabase → SQL Editor:\n' +
        `  insert into public.editor (user_id) select id from auth.users where email = '${email}';`,
    );
  }
  console.log(`Signed in as ${email} (editor).`);

  const glossary = loadGlossary();
  const words = loadWords();

  console.log(`Proverbs: ${glossary.length}, hard words: ${words.length}`);

  const proverbIds = new Map<string, string>();
  for (const entry of [...glossary, ...words]) {
    const row = {
      kind: entry.kind,
      term: entry.term,
      meaning: entry.meaning.en,
      meaning_vi: entry.meaning.vi ?? null,
      example: entry.example?.en ?? null,
      example_vi: entry.example?.vi ?? null,
      forms: entry.forms ?? [],
    };
    const { data, error } = await db.from('proverb').upsert(row, { onConflict: 'kind,term' }).select('id').single();
    if (error) throw new Error(`${entry.term}: ${error.message}`);
    proverbIds.set(slugify(entry.term), data.id);
  }

  for (const game of loadAllGames(glossary)) {
    const meta = {
      slug: game.slug,
      title: game.title.en,
      title_vi: game.title.vi ?? null,
      summary: game.summary.en,
      summary_vi: game.summary.vi ?? null,
      description: game.description.en,
      description_vi: game.description.vi ?? null,
      thumbnail: game.thumbnail ?? null,
      relics: game.relics,
      positive_status: game.positiveStatus,
      start_key: game.start,
      presentation: game.presentation ?? null,
      status: 'published' as const,
    };
    const { data: saved, error } = await db.from('game').upsert(meta, { onConflict: 'slug' }).select('id').single();
    if (error) throw new Error(`${game.slug}: ${error.message}`);
    const gameId = saved.id as string;

    // Replace the scenes so a re-run never leaves stale screens behind.
    const { error: clearError } = await db.from('scene').delete().eq('game_id', gameId);
    if (clearError) throw clearError;

    const rows = Object.values(game.scenes).map((scene, i) => sceneRow(gameId, scene, i, proverbIds));
    const { error: sceneError } = await db.from('scene').insert(rows);
    if (sceneError) throw sceneError;

    const used = proverbsIn(game);
    await db.from('game_proverb').delete().eq('game_id', gameId);
    const { error: linkError } = await db.from('game_proverb').insert(
      used
        .filter((slug) => proverbIds.has(slug))
        .map((slug, position) => ({ game_id: gameId, proverb_id: proverbIds.get(slug)!, position })),
    );
    if (linkError) throw linkError;

    console.log(`${game.slug}: ${rows.length} screens, ${used.length} proverbs`);
  }

  console.log('Done. Open /editor to continue editing.');
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
