import type { GlossaryEntry } from './types';
import type { Segment } from './markup';

/** A word plus the common spellings teachers should not have to list (hesitate -> hesitated, hesitating). */
export function generateForms(word: string, extra: string[] = []): string[] {
  const w = word.toLowerCase().trim().replace(/\s+/g, ' ');
  const forms = new Set<string>([w, ...extra.map((e) => e.toLowerCase().trim()).filter(Boolean)]);
  const space = w.lastIndexOf(' ');
  const head = space >= 0 ? w.slice(0, space + 1) : '';
  const last = space >= 0 ? w.slice(space + 1) : w;

  if (last.length >= 4 && /^[a-z]+$/.test(last)) {
    const add = (suffix: string, base = last) => forms.add(head + base + suffix);
    for (const s of ['s', 'es', 'ed', 'ing', 'ly', 'er', 'ers']) add(s);
    if (last.endsWith('e')) {
      add('ing', last.slice(0, -1));
      add('d');
      add('r');
      add('rs');
    }
    if (/[^aeiou]y$/.test(last)) {
      for (const s of ['ies', 'ied', 'ier', 'ily']) add(s, last.slice(0, -1));
    }
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(last)) {
      for (const s of ['ed', 'ing', 'er']) add(last.slice(-1) + s);
    }
  }
  return [...forms];
}

export interface WordMatcher {
  regex: RegExp | null;
  slugByForm: Map<string, string>;
}

export function buildMatcher(entries: GlossaryEntry[]): WordMatcher {
  const slugByForm = new Map<string, string>();
  for (const e of entries) {
    for (const form of e.forms ?? [e.term.toLowerCase()]) if (!slugByForm.has(form)) slugByForm.set(form, e.slug);
  }
  if (slugByForm.size === 0) return { regex: null, slugByForm };
  const alternatives = [...slugByForm.keys()]
    .sort((a, b) => b.length - a.length)
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  return { regex, slugByForm };
}

/** Turns plain-text segments into text and word segments. Only the first use of each word in a block is linked. */
export function linkWords(segments: Segment[], matcher: WordMatcher): Segment[] {
  if (!matcher.regex) return segments;
  const seen = new Set<string>();
  const out: Segment[] = [];
  for (const seg of segments) {
    if (seg.kind !== 'text') {
      out.push(seg);
      continue;
    }
    let last = 0;
    for (const m of seg.value.matchAll(new RegExp(matcher.regex.source, matcher.regex.flags))) {
      const slug = matcher.slugByForm.get(m[1].toLowerCase().replace(/\s+/g, ' '));
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const start = m.index ?? 0;
      if (start > last) out.push({ kind: 'text', value: seg.value.slice(last, start) });
      out.push({ kind: 'word', display: m[1], slug });
      last = start + m[0].length;
    }
    if (last < seg.value.length) out.push({ kind: 'text', value: seg.value.slice(last) });
  }
  return out;
}