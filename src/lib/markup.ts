import { slugify } from './slug';

export type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'proverb'; display: string; slug: string }
  | { kind: 'word'; display: string; slug: string };

const MARKUP = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/**
 * Splits story text into plain text and proverb references.
 *   [[a stitch in time saves nine]]            shows the proverb as written
 *   [[stitching early|a stitch in time ...]]   shows custom wording, links to the proverb
 */
export function parseMarkup(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ kind: 'text', value: text.slice(last, start) });
    const display = m[1].trim();
    const proverb = (m[2] ?? m[1]).trim();
    segments.push({ kind: 'proverb', display, slug: slugify(proverb) });
    last = start + m[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}
