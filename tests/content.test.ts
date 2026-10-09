import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentError, loadAllGames, loadGame, loadGlossary, loadWords } from '../src/lib/content';
import { parseMarkup } from '../src/lib/markup';
import { advance, choose, isEnd, startState } from '../src/lib/engine';

const glossary = loadGlossary();
const demo = loadAllGames(glossary).find((g) => g.slug === 'slay-the-demon-king')!;

function fixture(scenes: string, glossaryCsv = 'proverb,meaning\nBetter late than never,Late is fine.\n') {
  const dir = mkdtempSync(path.join(tmpdir(), 'probirdia-'));
  mkdirSync(path.join(dir, 'games', 'g'), { recursive: true });
  writeFileSync(path.join(dir, 'glossary.csv'), glossaryCsv);
  writeFileSync(path.join(dir, 'games', 'g', 'game.json'), '{"title":"G"}');
  writeFileSync(path.join(dir, 'games', 'g', 'scenes.csv'), scenes);
  return dir;
}
const problemsOf = (scenes: string) => {
  const dir = fixture(scenes);
  try {
    loadGame('g', loadGlossary(dir), dir);
    return [];
  } catch (e) {
    return (e as ContentError).problems;
  }
};

describe('markup', () => {
  it('parses plain and aliased proverb references', () => {
    expect(parseMarkup('a [[Better late than never]] b [[too late|Better late than never]]')).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'proverb', display: 'Better late than never', slug: 'better-late-than-never' },
      { kind: 'text', value: ' b ' },
      { kind: 'proverb', display: 'too late', slug: 'better-late-than-never' },
    ]);
  });
});

describe('validation', () => {
  it('accepts the demo game', () => {
    expect(Object.keys(demo.scenes)).toHaveLength(17);
    expect(demo.start).toBe('intro1');
  });

  it('reports a broken link with its spreadsheet row', () => {
    const p = problemsOf('id,text,next\na,Hello,nowhere\n');
    expect(p[0]).toContain('row 2');
    expect(p[0]).toContain('"nowhere"');
  });

  it('reports unknown proverbs in choices and in [[markup]]', () => {
    const p = problemsOf(
      'id,text,choice_1_proverb,choice_1_next,choice_2_proverb,choice_2_next\na,See [[Nope]],Made up,b,Better late than never,b\nb,End,,,,\n',
    );
    expect(p.some((x) => x.includes('"Made up"'))).toBe(true);
    expect(p.some((x) => x.includes('[[Nope]]'))).toBe(true);
  });

  it('reports unreachable scenes and duplicate ids', () => {
    const p = problemsOf('id,text,next\na,One,\nb,Two,\na,Three,\n');
    expect(p.some((x) => x.includes('never be reached'))).toBe(true);
    expect(p.some((x) => x.includes('already used'))).toBe(true);
  });

  it('rejects a scene with both next and choices', () => {
    const p = problemsOf('id,text,next,choice_1_label,choice_1_next\na,One,b,Go,b\nb,Two,,,\n');
    expect(p.some((x) => x.includes('both "next" and choices'))).toBe(true);
  });
});

describe('engine: demo playthroughs', () => {
  const run = (...picks: number[]) => {
    let s = startState(demo);
    for (let guard = 0; guard < 50 && !isEnd(demo, s); guard++) {
      if (s.reveal || demo.scenes[s.sceneId].choices.length === 0) s = advance(s, demo);
      else s = choose(s, demo, picks.shift() ?? 0);
    }
    return s;
  };

  it('patient path: breastplate, shield, no injury', () => {
    const s = run(0, 1);
    expect(s.items).toEqual(['Breastplate of Earth', 'Shield of Frost']);
    expect(s.status).toEqual([]);
    expect(s.chosen).toEqual(['a-little-knowledge-is-a-dangerous-thing', 'good-things-come-to-those-who-wait']);
  });

  it('hasty path: trap, no breastplate, injury', () => {
    const s = run(1, 0);
    expect(s.items).toEqual(['Shield of Frost']);
    expect(s.status).toEqual(['Injury']);
  });

  it('shows the proverb reveal before moving on', () => {
    let s = startState(demo);
    while (demo.scenes[s.sceneId].choices.length === 0) s = advance(s, demo);
    s = choose(s, demo, 0);
    expect(s.reveal?.proverb).toBe('a-little-knowledge-is-a-dangerous-thing');
    expect(s.sceneId).toBe('advice1');
    expect(advance(s, demo).sceneId).toBe('search2');
  });
});
describe('presentation', () => {
  it('loads the demo presentation and resolves layered rules per scene', async () => {
    const { resolveScene } = await import('../src/lib/presentation');
    const p = demo.presentation!;
    const intro = resolveScene(p, 'intro1');
    expect(intro.stage?.background).toContain('bg-meadow');
    expect(intro.characters.map((c) => c.slot)).toEqual(['left', 'right']);
    expect(intro.dialogue).toBe('center');

    const gate = resolveScene(p, 'barrier2');
    expect(gate.stage?.background).toContain('bg-mountain');
    expect(gate.dialogue).toBe('top');
    expect(gate.props.map((x) => x.id)).toEqual(['pedestal', 'signpost']);
    expect(gate.noteOn).toBe('signpost');

    expect(resolveScene(p, 'hay').props.map((x) => x.id)).toEqual(['pedestal']);
    expect(resolveScene(p, 'hay').noteOn).toBeUndefined();
    expect(resolveScene(undefined, 'x').dialogue).toBe('bottom');
  });

  it('reports presentation mistakes with friendly messages', () => {
    const dir = fixture('id,text,next\na,Hello,\n');
    const pdir = mkdtempSync(path.join(tmpdir(), 'probirdia-pres-'));
    writeFileSync(
      path.join(pdir, 'g.json'),
      JSON.stringify({
        stages: { s: { background: '/missing.svg' } },
        characters: {},
        scenes: [{ ids: ['nope'], stage: 'zzz', characters: { left: 'ghost', middle: null } }],
      }),
    );
    let problems: string[] = [];
    try {
      loadGame('g', loadGlossary(dir), dir, { presentationDir: pdir, publicDir: pdir });
    } catch (e) {
      problems = (e as ContentError).problems;
    }
    const all = problems.join('\n');
    expect(all).toContain('"/missing.svg" is not in public/');
    expect(all).toContain('no scene "nope"');
    expect(all).toContain('unknown stage "zzz"');
    expect(all).toContain('unknown character "ghost"');
    expect(all).toContain('unknown slot "middle"');
  });
});

describe('hard words', () => {
  it('generates common inflections and links the first use of each word', async () => {
    const { generateForms, buildMatcher, linkWords } = await import('../src/lib/words');
    expect(generateForms('hesitate')).toEqual(expect.arrayContaining(['hesitated', 'hesitating', 'hesitates']));
    expect(generateForms('slip')).toEqual(expect.arrayContaining(['slipped', 'slipping']));
    expect(generateForms('carry')).toEqual(expect.arrayContaining(['carried', 'carries']));
    expect(generateForms('go', ['went'])).toContain('went');

    const words = loadWords();
    const matcher = buildMatcher(words);
    const segs = linkWords(parseMarkup('The relics were sealed. A relic! Skedaddled, the summit.'), matcher);
    const linked = segs.filter((s) => s.kind === 'word').map((s) => (s.kind === 'word' ? s.display : ''));
    expect(linked).toEqual(['relics', 'sealed', 'Skedaddled', 'summit']);
  });

  it('does not link inside proverb markup or inside longer words', async () => {
    const { buildMatcher, linkWords } = await import('../src/lib/words');
    const matcher = buildMatcher(loadWords());
    const segs = linkWords(parseMarkup('[[the relic|better late than never]] and a sealant, foolish'), matcher);
    expect(segs.some((s) => s.kind === 'word')).toBe(false);
  });
});

describe('base path', () => {
  it('prefixes root-relative paths only', async () => {
    const { joinBase } = await import('../src/lib/url');
    expect(joinBase('/probirdia', '/games/')).toBe('/probirdia/games/');
    expect(joinBase('/probirdia/', '/games/')).toBe('/probirdia/games/');
    expect(joinBase('/', '/games/')).toBe('/games/');
    expect(joinBase('/probirdia', 'https://example.com/x')).toBe('https://example.com/x');
    expect(joinBase('/probirdia', '//cdn.example.com/x')).toBe('//cdn.example.com/x');
    expect(joinBase('/probirdia', 'relative.png')).toBe('relative.png');
  });
});
