import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { LANGS, type Choice, type Game, type GlossaryEntry, type Localized, type Scene } from './types';
import { parseMarkup } from './markup';
import { slugify } from './slug';
import { SLOT_X } from './presentation';
import { generateForms } from './words';
import type { Presentation } from './types';

/** Raised with every problem found, written for teachers rather than programmers. */
export class ContentError extends Error {
  constructor(public problems: string[]) {
    super(`Content problems:\n` + problems.map((p) => `  - ${p}`).join('\n'));
  }
}

const MAX_CHOICES = 4;
export const contentDir = () => path.resolve(process.cwd(), 'content');

type Row = Record<string, string>;

function readCsv(file: string): Row[] {
  return parse(readFileSync(file, 'utf8'), {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

/** Reads `name` plus any `name_vi`-style columns into a Localized value. */
function localized(row: Record<string, unknown>, name: string): Localized | undefined {
  const get = (k: string) => {
    const v = row[k];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const en = get(name);
  if (!en) return undefined;
  const out: Localized = { en };
  for (const lang of LANGS) if (lang !== 'en') out[lang] = get(`${name}_${lang}`);
  return out;
}

const list = (v: string | undefined) =>
  (v ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

export function loadGlossary(dir = contentDir()): GlossaryEntry[] {
  const file = path.join(dir, 'glossary.csv');
  const problems: string[] = [];
  const seen = new Set<string>();
  const entries: GlossaryEntry[] = [];

  readCsv(file).forEach((row, i) => {
    const where = `glossary.csv row ${i + 2}`;
    const proverb = row.proverb?.trim();
    const meaning = localized(row, 'meaning');
    if (!proverb) return problems.push(`${where}: the "proverb" column is empty`);
    if (!meaning) return problems.push(`${where} ("${proverb}"): the "meaning" column is empty`);
    const slug = slugify(proverb);
    if (seen.has(slug)) return problems.push(`${where}: "${proverb}" is listed twice`);
    seen.add(slug);
    entries.push({
      slug,
      kind: 'proverb',
      term: proverb,
      letter: slug[0]?.toUpperCase() ?? '#',
      meaning,
      example: localized(row, 'example'),
    });
  });

  if (problems.length) throw new ContentError(problems);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Hard words that get a hover definition automatically wherever they appear in a story. Optional file. */
export function loadWords(dir = contentDir()): GlossaryEntry[] {
  const file = path.join(dir, 'words.csv');
  if (!existsSync(file)) return [];
  const problems: string[] = [];
  const seen = new Set<string>();
  const entries: GlossaryEntry[] = [];

  readCsv(file).forEach((row, i) => {
    const where = `words.csv row ${i + 2}`;
    const word = row.word?.trim();
    const meaning = localized(row, 'meaning');
    if (!word) return problems.push(`${where}: the "word" column is empty`);
    if (!meaning) return problems.push(`${where} ("${word}"): the "meaning" column is empty`);
    const slug = slugify(word);
    if (seen.has(slug)) return problems.push(`${where}: "${word}" is listed twice`);
    seen.add(slug);
    entries.push({
      slug,
      kind: 'word',
      term: word,
      forms: generateForms(word, list(row.forms)),
      letter: slug[0]?.toUpperCase() ?? '#',
      meaning,
      example: localized(row, 'example'),
    });
  });

  if (problems.length) throw new ContentError(problems);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function glossaryMap(entries: GlossaryEntry[]): Record<string, GlossaryEntry> {
  return Object.fromEntries(entries.map((e) => [e.slug, e]));
}

export interface PresentationOptions {
  /** Folder holding <game-slug>.json files (dev-owned). */
  presentationDir?: string;
  /** Folder that image paths such as /games/x/bg.svg are resolved against. */
  publicDir?: string;
}

const POSITIONS = ['top', 'center', 'bottom'];

function loadPresentation(slug: string, scenes: Record<string, Scene>, opts: PresentationOptions): Presentation | undefined {
  const presentationDir = opts.presentationDir ?? path.resolve(process.cwd(), 'src', 'presentation');
  const publicDir = opts.publicDir ?? path.resolve(process.cwd(), 'public');
  const file = path.join(presentationDir, `${slug}.json`);
  if (!existsSync(file)) return undefined;

  const where = `presentation/${slug}.json`;
  const problems: string[] = [];
  const bad = (msg: string) => problems.push(`${where}: ${msg}`);
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<Presentation>;
  const p: Presentation = {
    stages: raw.stages ?? {},
    characters: raw.characters ?? {},
    props: raw.props ?? {},
    items: raw.items ?? {},
    scenes: raw.scenes ?? [],
  };

  const checkImage = (what: string, image: string | undefined) => {
    if (!image) return bad(`${what} has no image`);
    if (image.startsWith('/') && !existsSync(path.join(publicDir, image))) bad(`${what}: image "${image}" is not in public/`);
  };
  for (const [id, s] of Object.entries(p.stages)) {
    checkImage(`stage "${id}"`, s.background);
    if (s.dialogue && !POSITIONS.includes(s.dialogue)) bad(`stage "${id}": dialogue must be top, center or bottom`);
  }
  for (const [id, c] of Object.entries(p.characters)) checkImage(`character "${id}"`, c.image);
  for (const [id, pr] of Object.entries(p.props)) checkImage(`prop "${id}"`, pr.image);
  for (const [id, it] of Object.entries(p.items)) checkImage(`item "${id}"`, it.image);

  p.scenes.forEach((rule, i) => {
    const r = `scenes[${i}]`;
    if (rule.ids !== '*') {
      for (const id of rule.ids ?? []) if (!(id in scenes)) bad(`${r}: there is no scene "${id}" in scenes.csv`);
    }
    if (rule.stage && !(rule.stage in p.stages)) bad(`${r}: unknown stage "${rule.stage}"`);
    if (rule.dialogue && !POSITIONS.includes(rule.dialogue)) bad(`${r}: dialogue must be top, center or bottom`);
    for (const [slot, id] of Object.entries(rule.characters ?? {})) {
      if (!(slot in SLOT_X)) bad(`${r}: unknown slot "${slot}" (use left, center or right)`);
      if (id && !(id in p.characters)) bad(`${r}: unknown character "${id}"`);
    }
    for (const id of rule.props ?? []) if (!(id in p.props)) bad(`${r}: unknown prop "${id}"`);
    if (rule.noteOn && !(rule.noteOn in p.props)) bad(`${r}: unknown prop "${rule.noteOn}" in noteOn`);
  });

  if (problems.length) throw new ContentError(problems);
  return p;
}

const targetsOf = (s: Scene) => [...(s.next ? [s.next] : []), ...s.choices.map((c) => c.next)];

export function loadGame(slug: string, glossary: GlossaryEntry[], dir = contentDir(), opts: PresentationOptions = {}): Game {
  const gameDir = path.join(dir, 'games', slug);
  const known = new Set(glossary.map((g) => g.slug));
  const problems: string[] = [];
  const at = (row: number, msg: string) => problems.push(`${slug}/scenes.csv row ${row}: ${msg}`);

  const meta = JSON.parse(readFileSync(path.join(gameDir, 'game.json'), 'utf8')) as Record<string, unknown>;
  const title = localized(meta, 'title');
  if (!title) problems.push(`${slug}/game.json: "title" is missing`);

  const scenes: Record<string, Scene> = {};
  const rowOf: Record<string, number> = {};
  const rows = readCsv(path.join(gameDir, 'scenes.csv'));
  if (rows.length === 0) problems.push(`${slug}/scenes.csv has no scenes`);

  rows.forEach((row, i) => {
    const n = i + 2;
    const id = row.id?.trim();
    if (!id) return at(n, 'the "id" column is empty');
    if (id in scenes) return at(n, `the id "${id}" is already used on row ${rowOf[id]}`);
    const text = localized(row, 'text');
    if (!text) return at(n, `scene "${id}" has no text`);

    const choices: Choice[] = [];
    for (let c = 1; c <= MAX_CHOICES; c++) {
      const label = localized(row, `choice_${c}_label`);
      const proverbText = row[`choice_${c}_proverb`]?.trim();
      const next = row[`choice_${c}_next`]?.trim();
      if (!label && !proverbText && !next) continue;
      if (!next) { at(n, `choice ${c} has no "choice_${c}_next"`); continue; }
      if (!label && !proverbText) { at(n, `choice ${c} needs either a label or a proverb`); continue; }
      if (label && proverbText) { at(n, `choice ${c} has both a label and a proverb; use one`); continue; }
      if (proverbText) {
        const pslug = slugify(proverbText);
        if (!known.has(pslug)) at(n, `choice ${c}: proverb "${proverbText}" is not in glossary.csv`);
        choices.push({ proverb: pslug, next });
      } else {
        choices.push({ label, next });
      }
    }

    const next = row.next?.trim() || undefined;
    if (next && choices.length) at(n, `scene "${id}" has both "next" and choices; use one`);

    rowOf[id] = n;
    scenes[id] = {
      id,
      heading: localized(row, 'heading'),
      text,
      note: localized(row, 'note'),
      gives: list(row.gives),
      status: list(row.status),
      choices,
      next,
    };
  });

  // Cross-checks: links, [[proverb]] markup, unreachable scenes.
  for (const scene of Object.values(scenes)) {
    const n = rowOf[scene.id];
    for (const target of targetsOf(scene)) {
      if (!(target in scenes)) at(n, `scene "${scene.id}" points to "${target}", which does not exist`);
    }
    for (const field of [scene.text, scene.note, scene.heading]) {
      for (const value of Object.values(field ?? {})) {
        for (const seg of parseMarkup(value ?? '')) {
          if (seg.kind === 'proverb' && !known.has(seg.slug)) {
            at(n, `[[${seg.display}]] refers to a proverb that is not in glossary.csv`);
          }
        }
      }
    }
  }

  const start = rows[0]?.id?.trim();
  if (start && start in scenes) {
    const reached = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      for (const t of targetsOf(scenes[queue.pop()!])) {
        if (t in scenes && !reached.has(t)) {
          reached.add(t);
          queue.push(t);
        }
      }
    }
    for (const id of Object.keys(scenes)) {
      if (!reached.has(id)) at(rowOf[id], `scene "${id}" can never be reached from the first scene`);
    }
  }

  if (problems.length) throw new ContentError(problems);

  const presentation = loadPresentation(slug, scenes, opts);

  return {
    slug,
    title: title!,
    summary: localized(meta, 'summary') ?? title!,
    description: localized(meta, 'description') ?? localized(meta, 'summary') ?? title!,
    thumbnail: typeof meta.thumbnail === 'string' ? meta.thumbnail : undefined,
    start: start!,
    scenes,
    presentation,
  };
}

export function loadAllGames(glossary = loadGlossary(), dir = contentDir(), opts: PresentationOptions = {}): Game[] {
  const root = path.join(dir, 'games');
  if (!existsSync(root)) return [];
  const slugs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);
  const problems: string[] = [];
  const games: Game[] = [];
  for (const slug of slugs) {
    const meta = JSON.parse(readFileSync(path.join(root, slug, 'game.json'), 'utf8'));
    if (meta.published === false) continue;
    try {
      games.push(loadGame(slug, glossary, dir, opts));
    } catch (e) {
      if (e instanceof ContentError) problems.push(...e.problems);
      else throw e;
    }
  }
  if (problems.length) throw new ContentError(problems);
  return games.sort((a, b) => a.title.en.localeCompare(b.title.en));
}