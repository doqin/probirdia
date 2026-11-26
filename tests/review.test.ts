import { describe, expect, it } from 'vitest';
import type { Game, GlossaryEntry, Scene } from '../src/lib/types';
import { blankOf, chunk, hintOf, isRightBlank, shuffled, taughtProverbs } from '../src/lib/review';
import { MAX_LIVES, advance, begin, choose, closeReview, finishPreview, isEnd, livesOf, openReview, recapOf, startState } from '../src/lib/engine';

const entry = (term: string, extra: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  slug: term.toLowerCase().replace(/\W+/g, '-'),
  kind: 'proverb',
  term,
  letter: term[0],
  meaning: { en: 'm' },
  ...extra,
});

const scene = (id: string, extra: Partial<Scene> = {}): Scene => ({
  id,
  text: { en: id },
  gives: [],
  status: [],
  clears: [],
  choices: [],
  ...extra,
});

const apple = entry('An apple a day keeps the doctor away');
const hurry = entry('Look before you leap');

const game = (): Game => ({
  slug: 'g',
  title: { en: 'G' },
  summary: { en: '' },
  description: { en: '' },
  start: 'a',
  relics: [],
  positiveStatus: [],
  scenes: {
    a: scene('a', {
      choices: [
        { proverb: apple.slug, correct: true, next: 'b' },
        { proverb: hurry.slug, correct: false, next: 'b' },
      ],
    }),
    b: scene('b', {
      choices: [
        { proverb: hurry.slug, correct: true, next: 'end' },
        { proverb: apple.slug, correct: false, next: 'end' },
      ],
    }),
    c: scene('c', { choices: [{ proverb: hurry.slug, correct: false, next: 'end' }, { proverb: apple.slug, correct: true, next: 'end' }] }),
    end: scene('end'),
    over: scene('over', { phase: 'gameover', heading: { en: 'Minh gave up…' } }),
  },
});

describe('lives', () => {
  it('starts full, loses one per wrong proverb, and gives up on the last', () => {
    const g = game();
    let s = startState(g);
    expect(livesOf(s)).toBe(MAX_LIVES);
    s = choose(s, g, 1); // wrong
    expect(livesOf(s)).toBe(1);
    s = advance(s, g);
    expect(s.sceneId).toBe('b');
    expect(s.lost).toBeFalsy();
    s = choose(s, g, 1); // wrong again
    expect(livesOf(s)).toBe(0);
    expect(s.reveal?.correct).toBe(false);
    s = advance(s, g);
    expect(s.lost).toBe(true);
    expect(s.sceneId).toBe('over');
    expect(isEnd(g, s)).toBe(true);
    expect(recapOf(s).revisit.map((p) => p.slug)).toEqual([hurry.slug, apple.slug]);
  });

  it('a right pick keeps the hearts', () => {
    const g = game();
    let s = choose(startState(g), g, 0);
    expect(livesOf(s)).toBe(MAX_LIVES);
    s = advance(s, g);
    expect(s.lost).toBeFalsy();
  });

  it('treats a save from before lives as full', () => {
    const s = { ...startState(game()), lives: undefined };
    expect(livesOf(s)).toBe(MAX_LIVES);
  });

  it('still ends the run without a game-over screen', () => {
    const g = game();
    delete g.scenes.over;
    let s = advance(choose(startState(g), g, 1), g);
    s = advance(choose(s, g, 1), g);
    expect(s.lost).toBe(true);
    expect(isEnd(g, s)).toBe(true);
  });
});

describe('segments', () => {
  it('opens with the preview once, then the story', () => {
    const g = game();
    g.scenes.a.phase = undefined;
    let s = begin(startState(g), g, 2);
    expect(s.segment).toBe('preview');
    s = finishPreview(s, g);
    expect(s.segment).toBeUndefined();
    expect(s.previewed).toBe(true);
    expect(begin({ ...s, segment: undefined }, g, 2)).toEqual(advance(s, g));
  });

  it('skips the preview when the game teaches nothing', () => {
    const g = game();
    expect(begin(startState(g), g, 0).segment).toBeUndefined();
  });

  it('opens and closes the review', () => {
    const s = openReview(startState(game()));
    expect(s.segment).toBe('review');
    expect(closeReview(s).segment).toBeUndefined();
  });
});

describe('review helpers', () => {
  it('lists the taught proverbs in story order, once each', () => {
    const g = game();
    expect(taughtProverbs(g, { [apple.slug]: apple, [hurry.slug]: hurry }).map((e) => e.term)).toEqual([apple.term, hurry.term]);
  });

  it('blanks the longest word unless the proverb names one', () => {
    expect(blankOf(apple)).toEqual({ before: 'An apple a day keeps the ', answer: 'doctor', after: ' away' });
    expect(blankOf(entry('An apple a day keeps the doctor away', { blank: 'apple' }))).toEqual({
      before: 'An ',
      answer: 'apple',
      after: ' a day keeps the doctor away',
    });
  });

  it('checks the typed word loosely', () => {
    expect(isRightBlank('  Doctor ', apple)).toBe(true);
    expect(isRightBlank('nurse', apple)).toBe(false);
  });

  it('hints with the authored text, else the first letter and length', () => {
    expect(hintOf(apple, 'en')).toBe('Starts with “D” · 6 letters');
    expect(hintOf(entry('x doctor', { hint: { en: 'A healthy red fruit' } }), 'en')).toBe('A healthy red fruit');
  });

  it('pages and shuffles deterministically', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]);
    const a = shuffled([1, 2, 3, 4, 5], 'x');
    expect(shuffled([1, 2, 3, 4, 5], 'x')).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
