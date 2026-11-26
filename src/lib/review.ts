import type { Game, GlossaryEntry, Lang } from './types';
import { pick } from './types';

/** Rows per page of the preview and review segments (the deck's panels hold four). */
export const PAGE_SIZE = 4;

/** The proverbs a game teaches: every proverb offered as a choice, in the order the story reaches them. */
export function taughtProverbs(game: Game, glossary: Record<string, GlossaryEntry>): GlossaryEntry[] {
  const seen = new Set<string>();
  const out: GlossaryEntry[] = [];
  const queue = [game.start];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    const scene = game.scenes[id];
    if (!scene || visited.has(id)) continue;
    visited.add(id);
    for (const c of scene.choices) {
      if (c.proverb && glossary[c.proverb] && !seen.has(c.proverb)) {
        seen.add(c.proverb);
        out.push(glossary[c.proverb]);
      }
    }
    for (const next of [...scene.choices.map((c) => c.next), ...(scene.routes ?? []).map((r) => r.next), scene.next]) {
      if (next) queue.push(next);
    }
  }
  return out;
}

export function chunk<T>(items: T[], size = PAGE_SIZE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** A stable shuffle (same order on the server and in the browser, and on every reload). */
export function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const WORD = /[\p{L}\p{N}'’-]+/gu;
const clean = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const norm = (s: string) => clean(s).toLowerCase().replace(/’/g, "'");

export interface Blank {
  before: string;
  answer: string;
  after: string;
}

/** Cuts one word out of the proverb: the authored `blank`, else its longest word. */
export function blankOf(entry: GlossaryEntry): Blank {
  const words = [...entry.term.matchAll(WORD)];
  let target = entry.blank ? words.find((w) => norm(w[0]) === norm(entry.blank!)) : undefined;
  if (!target) target = words.reduce<RegExpExecArray | undefined>((best, w) => (!best || w[0].length > best[0].length ? w : best), undefined);
  if (!target) return { before: '', answer: entry.term, after: '' };
  const start = target.index ?? 0;
  const answer = clean(target[0]);
  const offset = target[0].indexOf(answer);
  return {
    before: entry.term.slice(0, start + offset),
    answer,
    after: entry.term.slice(start + offset + answer.length),
  };
}

/** The bulb's text: the authored hint, else the blank's first letter and length. */
export function hintOf(entry: GlossaryEntry, lang: Lang): string {
  if (entry.hint) return pick(entry.hint, lang);
  const { answer } = blankOf(entry);
  return `Starts with “${answer[0]?.toUpperCase() ?? ''}” · ${answer.length} letters`;
}

export const isRightBlank = (typed: string, entry: GlossaryEntry) => norm(typed) === norm(blankOf(entry).answer);
