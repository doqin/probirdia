import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { UI_ELEMENTS, UI_GROUPS, cleanUi, pickScreen, sizeVar, uiCss, validateUi, type ScreenLike } from '../src/lib/ui-style';

const components = ['Player', 'Quiz', 'Term', 'RichText']
  .map((name) => readFileSync(path.resolve(process.cwd(), 'src', 'components', `${name}.svelte`), 'utf8'))
  .join('\n');

describe('ui style catalogue', () => {
  it('has unique ids and known groups', () => {
    const ids = UI_ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of UI_ELEMENTS) expect(UI_GROUPS.map((g) => g.id)).toContain(e.group);
  });

  it('reads its size variable in the component that draws the piece', () => {
    for (const e of UI_ELEMENTS.filter((x) => x.size === 'var')) {
      expect(components, `${e.id} needs var(${sizeVar(e.id)}, 1)`).toContain(`var(${sizeVar(e.id)}, 1)`);
      expect(e.can).toContain('size');
    }
  });

  it('only offers a size on pieces that can be scaled', () => {
    for (const e of UI_ELEMENTS.filter((x) => x.can.includes('size'))) expect(e.size).toBeDefined();
  });

  it('targets classes that exist in the game components', () => {
    for (const e of UI_ELEMENTS) {
      for (const cls of [e.selector, e.text ?? '', e.box ?? ''].join(' ').match(/\.[a-z][\w-]*/g) ?? []) {
        expect(components, `${e.id}: ${cls}`).toContain(cls.slice(1));
      }
    }
  });
});

describe('uiCss', () => {
  it('is empty when nothing is set', () => {
    expect(uiCss(undefined)).toBe('');
    expect(uiCss({})).toBe('');
  });

  it('writes text, box and underline settings under .scene', () => {
    const css = uiCss({
      'proverb-link': { color: '#aa0000', background: '#ffee00', underline: 'dashed', underlineColor: '#00aa00', weight: 'bold' },
    });
    expect(css).toContain('.scene .term.proverb{color:#aa0000 !important');
    expect(css).toContain('text-decoration-line:underline !important;text-decoration-style:dashed !important;text-decoration-color:#00aa00 !important');
    expect(css).toContain('font-weight:800');
    expect(css).toContain('.scene .term.proverb{background-color:#ffee00 !important}');
  });

  it('scales a piece through its variable, or directly when it inherits its size', () => {
    expect(uiCss({ 'choice-card': { size: 120 } })).toBe('.scene{--ui-choice-card:1.2}');
    expect(uiCss({ 'hover-meaning': { size: 150 } })).toContain('font-size:calc(1em * 1.5) !important');
  });

  it('keeps hover and disabled looks alive on buttons', () => {
    expect(uiCss({ 'quiz-check': { background: '#112233' } })).toContain('.scene .quiz .btn.go:not(:hover):not(:disabled){background-color:#112233');
  });

  it('puts box and text settings on their own selectors', () => {
    const css = uiCss({ 'quiz-options': { background: '#ffffff', color: '#000000' } });
    expect(css).toContain('.scene .quiz .options button{color:#000000 !important}');
    expect(css).toContain('.scene .quiz .options{background-color:#ffffff !important}');
  });

  it('never lets an unsafe value into the stylesheet', () => {
    const css = uiCss({
      'hover-card': { color: 'red;} body{display:none', background: 'url(x)', border: '#12', size: 99999 },
      nope: { color: '#ffffff' },
    } as never);
    expect(css).not.toContain('body');
    expect(css).not.toContain('url');
    expect(css).not.toContain('#12 ');
    expect(css).toContain('--ui-hover-card:3');
  });
});

describe('cleanUi / validateUi', () => {
  it('drops settings a piece does not support', () => {
    expect(cleanUi({ 'story-text': { size: 150, color: '#123456' } })).toEqual({ 'story-text': { color: '#123456' } });
    expect(cleanUi({ 'story-text': {} })).toEqual({});
    expect(cleanUi('x')).toEqual({});
  });

  it('only keeps a line colour when there is a line', () => {
    expect(cleanUi({ 'proverb-link': { underline: 'none', underlineColor: '#ffffff' } })).toEqual({ 'proverb-link': { underline: 'none' } });
  });

  it('explains what a hand-written ui block gets wrong', () => {
    expect(validateUi(undefined)).toEqual([]);
    expect(validateUi({ 'hover-card': { color: '#fff' } })).toEqual([]);
    expect(validateUi({ ghost: {} })).toEqual(['ui: unknown piece "ghost"']);
    expect(validateUi({ 'hover-card': { color: 'tomato' } })[0]).toContain('"color"');
    expect(validateUi([])).toHaveLength(1);
  });
});

describe('pickScreen', () => {
  const s = (id: string, over: Partial<ScreenLike> = {}): ScreenLike => ({ id, phase: 'game', text: 'hi', next_key: null, choices: [], ...over });
  const game = [
    s('title', { phase: 'title', next_key: 'a' }),
    s('divider', { phase: 'divider', next_key: 'a' }),
    s('a', { next_key: 'b' }),
    s('b', { text: 'a [[Better late than never]] b', next_key: 'c' }),
    s('c', { choices: [{ proverb_id: 'p' }] }),
    s('end'),
    s('over', { phase: 'gameover' }),
  ];

  it('finds a screen for every kind', () => {
    expect(pickScreen('title', game)?.id).toBe('title');
    expect(pickScreen('divider', game)?.id).toBe('divider');
    expect(pickScreen('story', game)?.id).toBe('a');
    expect(pickScreen('hover', game)?.id).toBe('b');
    expect(pickScreen('choices', game)?.id).toBe('c');
    expect(pickScreen('reveal', game)?.id).toBe('c');
    expect(pickScreen('ending', game)?.id).toBe('end');
    expect(pickScreen('gameover', game)?.id).toBe('over');
    expect(pickScreen('quiz-review', game)?.id).toBe('a');
  });

  it('prefers a screen with a hard word for hover cards', () => {
    expect(pickScreen('hover', [s('a', { next_key: 'b', text: 'plain' }), s('b', { next_key: 'c', text: 'Your Enrollment is late' })], ['enrollment'])?.id).toBe('b');
  });

  it('says nothing when the game has no such screen', () => {
    expect(pickScreen('title', [s('a', { next_key: 'b' })])).toBeUndefined();
    expect(pickScreen('choices', [s('a', { next_key: 'b' })])).toBeUndefined();
  });
});

describe('persistence', () => {
  it('survives saving a screen look and reaches the player through toGame', async () => {
    const { emptyPresentation, sceneLook, withSceneLook } = await import('../src/lib/look');
    const { toGame } = await import('../src/lib/remote');
    const ui = { 'hover-card': { color: '#112233' } };
    const base = { ...emptyPresentation(), ui };
    const next = withSceneLook(base, 'a', sceneLook(base, 'a'));
    expect(next.ui).toEqual(ui);
    const game = toGame({ id: 'g', slug: 'g', title: 'G', title_vi: null, summary: '', summary_vi: null, description: '', description_vi: null, thumbnail: null, relics: [], positive_status: [], start_key: null, presentation: next, status: 'draft' }, [], new Map());
    expect(game.presentation?.ui).toEqual(ui);
  });
});
