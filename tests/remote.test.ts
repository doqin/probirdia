import { describe, expect, it } from 'vitest';
import type { Game, Presentation } from '../src/lib/types';
import {
  proverbSlug,
  slugById,
  toGame,
  toGlossaryEntry,
  toScene,
  type GameRow,
  type ProverbRow,
  type SceneRow,
} from '../src/lib/remote';
import { validateGame } from '../src/lib/validate-game';
import { resolveScene } from '../src/lib/presentation';

const proverbRows: ProverbRow[] = [
  {
    id: 'p1',
    kind: 'proverb',
    term: 'Better safe than sorry',
    term_vi: null,
    meaning: 'Cautious is better than rash.',
    meaning_vi: 'Thà an toàn còn hơn hối tiếc',
    example: null,
    example_vi: null,
    forms: [],
  },
  {
    id: 'p2',
    kind: 'word',
    term: 'hesitate',
    term_vi: null,
    meaning: 'Pause before acting.',
    meaning_vi: null,
    example: null,
    example_vi: null,
    forms: ['hesitantly'],
  },
];

const sceneRow = (over: Partial<SceneRow>): SceneRow => ({
  id: 's1',
  game_id: 'g1',
  key: 'intro',
  phase: 'game',
  position: 0,
  chapter: null,
  chapter_vi: null,
  heading: null,
  heading_vi: null,
  text: 'Hello',
  text_vi: null,
  note: null,
  note_vi: null,
  note_simple: null,
  note_simple_vi: null,
  image: null,
  image_alt: null,
  gives: [],
  status: [],
  clears: [],
  next_key: null,
  choices: [],
  routes: [],
  ...over,
});

const gameRow = (over: Partial<GameRow> = {}): GameRow => ({
  id: 'g1',
  slug: 'demo',
  title: 'Demo',
  title_vi: '',
  summary: 'A demo',
  summary_vi: '',
  description: 'A longer demo',
  description_vi: '',
  thumbnail: null,
  relics: [],
  positive_status: [],
  start_key: null,
  presentation: null,
  status: 'draft',
  ...over,
});

describe('rows to the player model', () => {
  it('maps a stored choice with a proverb id to the glossary slug', () => {
    const scene = toScene(
      sceneRow({ choices: [{ proverb_id: 'p1', next_key: 'ending', correct: true }] }),
      slugById(proverbRows),
    );
    expect(scene.choices).toEqual([{ proverb: 'better-safe-than-sorry', next: 'ending', correct: true }]);
  });

  it('keeps plain labels and drops choices with no destination', () => {
    const scene = toScene(
      sceneRow({
        choices: [
          { label: 'Wait', label_vi: 'Chờ', next_key: 'wait' },
          { label: 'Orphan', next_key: '' },
        ],
      }),
      new Map(),
    );
    expect(scene.choices).toHaveLength(1);
    expect(scene.choices[0]).toEqual({ label: { en: 'Wait', vi: 'Chờ' }, next: 'wait', correct: undefined });
  });

  it('orders scenes by position and falls back to the first as the start', () => {
    const game = toGame(
      gameRow(),
      [sceneRow({ id: 'a', key: 'b', position: 2 }), sceneRow({ id: 'b', key: 'a', position: 1 })],
      new Map(),
    );
    expect(game.start).toBe('a');
    expect(Object.keys(game.scenes)).toEqual(['a', 'b']);
  });

  it('uses the declared start when the editor set one', () => {
    const game = toGame(gameRow({ start_key: 'b' }), [sceneRow({ key: 'a', position: 0 }), sceneRow({ id: 's2', key: 'b', position: 1 })], new Map());
    expect(game.start).toBe('b');
  });
});

describe('proverbs to glossary entries', () => {
  it('carries the Vietnamese meaning and slugifies the term', () => {
    const entry = toGlossaryEntry(proverbRows[0]);
    expect(entry.slug).toBe('better-safe-than-sorry');
    expect(entry.meaning).toEqual({ en: 'Cautious is better than rash.', vi: 'Thà an toàn còn hơn hối tiếc' });
    expect(entry.letter).toBe('B');
  });

  it('expands the forms of a hard word', () => {
    const entry = toGlossaryEntry(proverbRows[1]);
    expect(entry.kind).toBe('word');
    expect(entry.forms).toEqual(expect.arrayContaining(['hesitate', 'hesitated', 'hesitantly']));
  });

  it('matches the slug the story markup produces', () => {
    expect(proverbSlug('Better safe than sorry')).toBe('better-safe-than-sorry');
  });
});

describe('chapters and per-screen art', () => {
  it('carries the chapter and its Vietnamese twin', () => {
    const scene = toScene(sceneRow({ chapter: 'Finding the Campus', chapter_vi: 'Tìm trường' }), new Map());
    expect(scene.chapter).toEqual({ en: 'Finding the Campus', vi: 'Tìm trường' });
  });

  it('turns a screen picture into a stage that carries on until the next picture', () => {
    const game = toGame(
      gameRow(),
      [
        sceneRow({ key: 'campus', image: 'https://cdn.example.com/campus.webp', image_alt: 'A university gate' }),
        sceneRow({ id: 's2', key: 'next', position: 1 }),
        sceneRow({ id: 's3', key: 'room', position: 2, image: '/room.webp' }),
      ],
      new Map(),
    );
    expect(game.presentation?.stages['art-campus']).toEqual({
      background: 'https://cdn.example.com/campus.webp',
      alt: 'A university gate',
    });
    expect(game.presentation?.scenes).toEqual([
      { ids: ['campus'], stage: 'art-campus' },
      { ids: ['next'], stage: 'art-campus' },
      { ids: ['room'], stage: 'art-room' },
    ]);
    expect(resolveScene(game.presentation, 'campus').stage?.background).toBe('https://cdn.example.com/campus.webp');
    expect(resolveScene(game.presentation, 'next').stage?.background).toBe('https://cdn.example.com/campus.webp');
    expect(resolveScene(game.presentation, 'room').stage?.background).toBe('/room.webp');
  });

  it('leaves screens before the first picture with no stage', () => {
    const game = toGame(
      gameRow(),
      [sceneRow({ key: 'intro' }), sceneRow({ id: 's2', key: 'campus', position: 1, image: '/campus.webp' })],
      new Map(),
    );
    expect(game.presentation?.scenes).toEqual([{ ids: ['campus'], stage: 'art-campus' }]);
    expect(resolveScene(game.presentation, 'intro').stage).toBeUndefined();
  });

  it('lets developer presentation rules win over screen pictures', () => {
    const dev: Presentation = {
      stages: { sky: { background: '/sky.webp' } },
      characters: {},
      props: {},
      items: {},
      scenes: [{ ids: '*', stage: 'sky' }],
    };
    const game = toGame(gameRow({ presentation: dev }), [sceneRow({ key: 'campus', image: '/campus.webp' })], new Map());
    expect(game.presentation?.stages.sky).toEqual({ background: '/sky.webp' });
    expect(game.presentation?.stages['art-campus']).toBeDefined();
    // art rules first, then the developer's own rules, so the developer wins
    expect(game.presentation?.scenes).toEqual([
      { ids: ['campus'], stage: 'art-campus' },
      { ids: '*', stage: 'sky' },
    ]);
    expect(resolveScene(game.presentation, 'campus').stage?.background).toBe('/sky.webp');
  });

  it('has no presentation when no screen has a picture', () => {
    const game = toGame(gameRow(), [sceneRow({ key: 'a' })], new Map());
    expect(game.presentation).toBeUndefined();
  });

  it('keeps the right-answer flag through the mapping', () => {
    const scene = toScene(
      sceneRow({
        choices: [
          { proverb_id: 'p1', next_key: 'end', correct: true },
          { label: 'Wait', next_key: 'end' },
        ],
      }),
      slugById(proverbRows),
    );
    expect(scene.choices.map((c) => c.correct)).toEqual([true, undefined]);
  });
});

describe('editor validation', () => {
  const valid = (): Game =>
    toGame(
      gameRow(),
      [
        sceneRow({ key: 'intro', position: 0, next_key: 'choice' }),
        sceneRow({
          id: 's2',
          key: 'choice',
          position: 1,
          text: 'Pick one',
          choices: [
            { proverb_id: 'p1', next_key: 'ending', correct: true },
            { label: 'Something else', next_key: 'ending' },
          ],
        }),
        sceneRow({ id: 's3', key: 'ending', position: 2, text: 'Done' }),
      ],
      slugById(proverbRows),
    );

  const known = new Set(['better-safe-than-sorry']);

  it('accepts a tidy game', () => {
    expect(validateGame(valid(), known)).toEqual([]);
  });

  it('reports a screen that points nowhere', () => {
    const game = valid();
    game.scenes.intro.next = 'missing';
    expect(validateGame(game, known)).toContain('Screen "intro" goes to "missing", which does not exist.');
  });

  it('reports a scene with two right answers', () => {
    const game = valid();
    game.scenes.choice.choices[1].correct = true;
    expect(validateGame(game, known)).toContain(
      'Screen "choice": mark exactly one choice as the right answer (currently 2).',
    );
  });

  it('reports an unreachable screen', () => {
    const game = valid();
    game.scenes.orphan = { ...game.scenes.ending, id: 'orphan', text: { en: 'Lost' } };
    expect(validateGame(game, known)).toContain('Screen "orphan" can never be reached from the first screen.');
  });

  it('reports a proverb in the text that is not in the glossary', () => {
    const game = valid();
    game.scenes.intro.text = { en: 'You know what they say: [[time will tell]]' };
    expect(validateGame(game, known)).toContain(
      'Screen "intro": [[time will tell]] refers to a proverb that is not in the glossary.',
    );
  });

  it('reports a plain-words note with nothing to explain', () => {
    const game = valid();
    game.scenes.intro.noteSimple = { en: 'A sign' };
    expect(validateGame(game, known)).toContain('Screen "intro" has a plain-words note but no note to explain.');
  });

  it('reports a choice that points both ways', () => {
    const game = valid();
    game.scenes.choice.choices[1].next = '';
    expect(validateGame(game, known)).toContain('Screen "choice", choice 2: choose where it goes.');
  });
});
