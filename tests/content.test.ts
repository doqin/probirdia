import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ContentError, loadGame, loadGlossary, loadWords, usedProverbSlugs } from '../src/lib/content';
import { resolveScene } from '../src/lib/presentation';
import { parseMarkup } from '../src/lib/markup';
import { advance, choose, isEnd, isValidState, recapOf, startState, type PlayState } from '../src/lib/engine';
import { evaluate, parseCondition } from '../src/lib/condition';

const glossary = loadGlossary();
// The old branching game now lives only as a test fixture: the site no longer ships it.
const FIXTURES = path.resolve(process.cwd(), 'tests', 'fixtures');
const demo = loadGame('slay-the-demon-king', glossary, FIXTURES);

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
    expect(Object.keys(demo.scenes)).toHaveLength(101);
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

describe('conditions', () => {
  const facts = { items: ['Ring of Light'], status: ["Villagers' respect", 'Injured'], relics: 3 };
  const ok = (src: string) => evaluate(parseCondition(src), facts);

  it('evaluates atoms, not, and, or', () => {
    expect(ok("status:Villagers' respect")).toBe(true);
    expect(ok('status:injured')).toBe(true);
    expect(ok('status:Exhausted')).toBe(false);
    expect(ok('has:Ring of Light and not status:Exhausted')).toBe(true);
    expect(ok('status:Exhausted or relics>=3')).toBe(true);
    expect(ok('relics>3')).toBe(false);
    expect(ok('relics=3 and relics<=3 and relics<4')).toBe(true);
  });

  it('rejects things it cannot understand', () => {
    expect(() => parseCondition('')).toThrow();
    expect(() => parseCondition('injured')).toThrow(/cannot understand/);
    expect(() => parseCondition('relics>=many')).toThrow();
  });
});

describe('simple notes', () => {
  it('loads the plain-words version of both poems', () => {
    for (const id of ['note1', 'advice1', 'note2', 'mtn5', 'advice2']) {
      expect(demo.scenes[id].noteSimple?.en, id).toBeTruthy();
    }
    expect(demo.scenes.note2.noteSimple?.en).toContain('only an idiot would blindly trust');
    expect(demo.scenes.mtn5.noteSimple?.en).toContain('moonlight');
  });

  it('rejects a simple note without a note', () => {
    const p = problemsOf('id,text,note_simple\na,Hello,Plain words\n');
    expect(p.some((x) => x.includes('"note_simple" but no "note"'))).toBe(true);
  });
});

describe('routes', () => {
  const head = 'id,text,gives,status,clears,next,route_1_if,route_1_next,route_2_if,route_2_next\n';

  it('rejects routes without a final fallback, with bad conditions, or with unknown names', () => {
    const noFallback = problemsOf(head + 'a,,,,,,status:Hurt,b,,\nb,B,,Hurt,,,,,,\n');
    expect(noFallback.some((x) => x.includes('fallback'))).toBe(true);
    const bad = problemsOf(head + 'a,,,,,,whatever,b,,b\nb,B,,Hurt,,,,,,\n');
    expect(bad.some((x) => x.includes('cannot understand'))).toBe(true);
    const unknown = problemsOf(head + 'a,,,,,,status:Cursed,b,,b\nb,B,,Hurt,,,,,,\n');
    expect(unknown.some((x) => x.includes('no scene sets the status "Cursed"'))).toBe(true);
    const missing = problemsOf(head + 'a,,,,,,,nowhere,,\n');
    expect(missing.some((x) => x.includes('"nowhere"'))).toBe(true);
  });

  const gameWith = (scenes: string) => {
    const dir = fixture(scenes);
    return loadGame('g', loadGlossary(dir), dir);
  };

  it('sends the player down the first branch that fits, and clears statuses', () => {
    const game = gameWith(
      head +
        'a,Start,,Hurt,,r,,,,\n' +
        'r,,,,,,status:Hurt,hurt,,ok\n' +
        'hurt,You are hurt,,Worse,Hurt,,,,,\n' +
        'ok,You are fine,,,,,,,,\n',
    );
    const st = startState(game);
    expect(st.sceneId).toBe('a');
    const after = advance(st, game);
    expect(after.sceneId).toBe('hurt');
    expect(after.status).toEqual(['Worse']);
  });

  it('uses the fallback when nothing else fits', () => {
    const game = gameWith(
      head + 'a,Start,,,,r,,,,\nr,,,,,,status:Hurt,hurt,,ok\nhurt,Hurt,,Hurt,,,,,,\nok,Fine,,,,,,,,\n',
    );
    expect(advance(startState(game), game).sceneId).toBe('ok');
  });
});

describe('engine: playthroughs of Slay the Demon King', () => {
  const ADV = {
    little: 'a-little-knowledge-is-a-dangerous-thing',
    hesitate: 'he-who-hesitates-is-lost',
    hay: 'make-hay-while-the-sun-shines',
    wait: 'good-things-come-to-those-who-wait',
    look: 'look-before-you-leap',
    virtue: 'virtue-is-its-own-reward',
    hands: 'many-hands-make-light-work',
    practise: 'practise-makes-perfect',
    bold: 'fortune-favors-the-bold',
    safe: 'better-safe-than-sorry',
  };
  /** Plays to the end, answering each proverb question with the named proverb. */
  const run = (...picks: (keyof typeof ADV)[]) => {
    // these runs are about items and status, so they start with hearts to spare
    let s: PlayState = { ...startState(demo), lives: 99 };
    const queue = [...picks];
    for (let guard = 0; guard < 300 && !isEnd(demo, s); guard++) {
      const choices = demo.scenes[s.sceneId].choices;
      if (s.reveal || choices.length === 0) s = advance(s, demo);
      else {
        const want = ADV[queue.shift()!];
        s = choose(s, demo, choices.findIndex((c) => c.proverb === want));
      }
    }
    return s;
  };
  const RESPECT = "Villagers' respect";

  it('Ending 4: the perfect run ends in marriage', () => {
    const s = run('little', 'wait', 'virtue', 'hands', 'bold');
    expect(s.sceneId).toBe('end4h');
    expect(s.items).toHaveLength(5);
    expect(s.status).toEqual([RESPECT]);
  });

  it('Ending 3: four relics or more wins', () => {
    const s = run('little', 'wait', 'virtue', 'practise', 'safe');
    expect(s.sceneId).toBe('end3');
    expect(s.items).toHaveLength(4);
  });

  it('Ending 2: three relics or fewer loses', () => {
    const s = run('hesitate', 'wait', 'look', 'hands', 'safe');
    expect(s.sceneId).toBe('end2');
    expect(s.items).toEqual(['Shield of Frost', 'Sword of Flame']);
    expect(s.status).toEqual(["Villagers' contempt"]);
  });

  it('being severely injured alone does not stop a win', () => {
    const s = run('little', 'hay', 'virtue', 'practise', 'safe');
    expect(s.status).toEqual(expect.arrayContaining(['Severely injured', RESPECT]));
    expect(s.sceneId).toBe('end3');
  });

  it('Ending 1 needs both exhaustion and severe injury', () => {
    // contempt makes practising exhausting; being hurt twice makes the injury severe
    const s = run('little', 'hay', 'look', 'practise', 'bold');
    expect(s.status).toEqual(expect.arrayContaining(['Severely injured', 'Exhausted']));
    expect(s.sceneId).toBe('end1');
  });

  it('Ending 0: crossing the bridge when already severely injured is fatal', () => {
    const s = run('little', 'hay', 'virtue', 'hands', 'bold');
    expect(s.status).toEqual(['Severely injured', RESPECT]);
    expect(s.sceneId).toBe('end0');
  });

  it('crossing while only injured gives the boots but a severe injury', () => {
    const s = run('little', 'hay', 'look', 'hands', 'bold');
    expect(s.items).toContain('Boots of Wind');
    expect(s.status).toEqual(expect.arrayContaining(['Severely injured', "Villagers' contempt"]));
    expect(s.status).not.toContain('Injured');
  });

  it('shows the proverb reveal before moving on', () => {
    let s = startState(demo);
    while (demo.scenes[s.sceneId].choices.length === 0) s = advance(s, demo);
    s = choose(s, demo, 0);
    expect(s.reveal?.proverb).toBe(ADV.little);
    expect(s.sceneId).toBe('advice1');
    expect(advance(s, demo).sceneId).toBe('search2');
  });

  it('never accepts a saved game resting on a route scene', () => {
    for (const scene of Object.values(demo.scenes)) {
      if (scene.routes) expect(isValidState(demo, { ...startState(demo), sceneId: scene.id })).toBe(false);
    }
  });
});

describe('the teaching loop', () => {
  const lesson = loadGame('starting-university', glossary);
  const at = (id: string) => ({ ...startState(lesson), sceneId: id });

  it('marks a wrong pick and names the proverb that fitted', () => {
    const scene = lesson.scenes.ch1choice;
    const wrong = scene.choices.findIndex((c) => !c.correct);
    const right = scene.choices.find((c) => c.correct)!;
    const s = choose(at('ch1choice'), lesson, wrong);
    expect(s.reveal?.correct).toBe(false);
    expect(s.reveal?.intended).toBe(right.proverb);
    expect(s.reveal?.why?.en).toMatch(/waiting|speak|letter/i);
    expect(s.picks).toEqual([{ slug: scene.choices[wrong].proverb, correct: false, intended: right.proverb }]);
  });

  it('confirms a right pick without offering an alternative', () => {
    const scene = lesson.scenes.ch1choice;
    const s = choose(at('ch1choice'), lesson, scene.choices.findIndex((c) => c.correct));
    expect(s.reveal?.correct).toBe(true);
    expect(s.reveal?.intended).toBeUndefined();
  });

  it('splits the recap so a wrong pick is never shown as learned', () => {
    let s = at('ch1choice');
    s = choose(s, lesson, lesson.scenes.ch1choice.choices.findIndex((c) => !c.correct));
    s = advance(s, lesson);
    while (lesson.scenes[s.sceneId].choices.length === 0) s = advance(s, lesson);
    s = choose(s, lesson, lesson.scenes[s.sceneId].choices.findIndex((c) => c.correct));

    const recap = recapOf(s);
    expect(recap.well).toHaveLength(1);
    expect(recap.revisit).toHaveLength(1);
    expect(recap.revisit[0].intended).toBe(lesson.scenes.ch1choice.choices.find((c) => c.correct)!.proverb);
  });

  it('treats an old save with no verdicts as all-met rather than all-wrong', () => {
    const { picks, ...old } = startState(lesson);
    const recap = recapOf({ ...old, picks: [], chosen: ['time-will-tell'] });
    expect(recap.well).toEqual(['time-will-tell']);
    expect(recap.revisit).toEqual([]);
  });

  it('needs one right answer and a reason for every choice once correctness is declared', () => {
    const rows = [
      'id,text,choice_1_proverb,choice_1_correct,choice_1_why,choice_1_next,choice_2_proverb,choice_2_correct,choice_2_why,choice_2_next',
      'a,Which fits?,Better late than never,yes,,b,Better safe than sorry,no,,b',
      'b,Done.,,,,,,,,,',
    ].join('\n');
    const problemsOfTwo = (scenes: string) => {
      const dir = fixture(
        scenes,
        'proverb,meaning\nBetter late than never,Late is fine.\nBetter safe than sorry,Be careful.\n',
      );
      try {
        loadGame('g', loadGlossary(dir), dir);
        return [];
      } catch (e) {
        return (e as ContentError).problems;
      }
    };
    const problems = problemsOfTwo(rows);
    expect(problems.join(' ')).toMatch(/choice 1: add "choice_1_why"/);
    expect(problems.join(' ')).toMatch(/choice 2: add "choice_2_why"/);

    const twoRights = rows.replace('Better safe than sorry,no', 'Better safe than sorry,yes');
    expect(problemsOfTwo(twoRights).join(' ')).toMatch(/one choice must be the right one/);
  });
});

describe('presentation', () => {
  it('merges rules in order and falls back to the stage position', () => {
    const dir = fixture('id,text,next\na,Hello,b\nb,Bye,\n');
    const publicDir = mkdtempSync(path.join(tmpdir(), 'probirdia-art-'));
    const art = (name: string) => {
      const file = path.join(publicDir, 'games', 'g', name);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'x');
      return `/games/g/${name}`;
    };
    const pdir = mkdtempSync(path.join(tmpdir(), 'probirdia-pres-'));
    writeFileSync(
      path.join(pdir, 'g.json'),
      JSON.stringify({
        stages: {
          sky: { background: art('sky.webp'), dialogue: 'center' },
          cave: { background: art('cave.webp'), dialogue: 'top' },
        },
        characters: { hero: { image: art('hero.webp'), width: 30 }, bird: { image: art('bird.webp'), width: 10 } },
        props: {
          cloud: { image: art('cloud.webp'), x: 10, y: 20, width: 5 },
          sign: { image: art('sign.webp'), x: 50, y: 80, width: 10 },
        },
        music: { bgm: { file: art('bgm.mp3'), loop: true } },
        scenes: [
          { ids: '*', stage: 'sky', characters: { left: 'hero' }, props: ['cloud'], music: 'bgm' },
          { ids: ['b'], stage: 'cave', characters: { left: null, right: 'bird' }, props: ['sign'], noteOn: 'sign', headingInArt: true },
        ],
      }),
    );

    const game = loadGame('g', loadGlossary(dir), dir, { presentationDir: pdir, publicDir });
    const p = game.presentation!;

    const first = resolveScene(p, 'a');
    expect(first.stage?.background).toBe('/games/g/sky.webp');
    expect(first.dialogue).toBe('center');
    expect(first.characters.map((c) => `${c.slot}:${c.id}`)).toEqual(['left:hero']);
    expect(first.props.map((x) => x.id)).toEqual(['cloud']);
    expect(first.music).toBe('bgm');

    const second = resolveScene(p, 'b');
    expect(second.stage?.background).toBe('/games/g/cave.webp');
    expect(second.dialogue).toBe('top');
    expect(second.characters.map((c) => `${c.slot}:${c.id}`)).toEqual(['right:bird']);
    expect(second.props.map((x) => x.id)).toEqual(['sign']);
    expect(second.noteOn).toBe('sign');
    expect(second.headingInArt).toBe(true);

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
        music: { m: { file: '/missing.mp3' } },
        scenes: [{ ids: ['nope'], stage: 'zzz', music: 'nomusic', characters: { left: 'ghost', middle: null } }],
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
    expect(all).toContain('"/missing.mp3" is not in public/');
    expect(all).toContain('unknown music "nomusic"');
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

describe('usedProverbSlugs', () => {
  it('lists proverbs offered as choices or linked in text, and nothing else', () => {
    const dir = fixture(
      'id,text,next,choice_1_proverb,choice_1_next\nstart,"Remember [[Better late than never]].",end,,\nend,Done,,,\n',
      'proverb,meaning\nBetter late than never,Late is fine.\nHe who hesitates is lost,Do not wait.\n',
    );
    const g = loadGame('g', loadGlossary(dir), dir);
    expect([...usedProverbSlugs([g])]).toEqual(['better-late-than-never']);
  });
});
