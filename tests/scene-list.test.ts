import { describe, expect, it } from 'vitest';
import { NO_CHAPTER, filterScenes, groupByChapter, orderScenes, positionBetween } from '../src/lib/scene-list';
import type { SceneRow } from '../src/lib/remote';

const row = (over: Partial<SceneRow>): SceneRow => ({
  id: 's1',
  game_id: 'g1',
  key: 'intro',
  phase: 'game',
  position: 0,
  chapter: null,
  chapter_vi: null,
  heading: null,
  heading_vi: null,
  text: '',
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

describe('the editor scene list', () => {
  it('orders screens by position, including the fractional ones', () => {
    const scenes = [row({ id: 'c', key: 'c', position: 2.5 }), row({ id: 'a', key: 'a', position: 0 }), row({ id: 'b', key: 'b', position: 1 })];
    expect(orderScenes(scenes).map((s) => s.key)).toEqual(['a', 'b', 'c']);
  });

  it('finds screens by name, chapter, speaker or text', () => {
    const scenes = [
      row({ key: 'campus', chapter: 'Finding the Campus' }),
      row({ id: 's2', key: 'room', heading: 'Minh', text: 'It has air conditioning' }),
    ];
    expect(filterScenes(scenes, 'camp').map((s) => s.key)).toEqual(['campus']);
    expect(filterScenes(scenes, 'MINH').map((s) => s.key)).toEqual(['room']);
    expect(filterScenes(scenes, 'air').map((s) => s.key)).toEqual(['room']);
    expect(filterScenes(scenes, '   ')).toHaveLength(2);
  });

  it('groups by chapter in the order the chapters appear', () => {
    const scenes = [
      row({ key: 'a', chapter: 'Finding the Campus' }),
      row({ id: 's2', key: 'b', chapter: 'Finding a Room' }),
      row({ id: 's3', key: 'c', chapter: 'Finding the Campus' }),
      row({ id: 's4', key: 'd' }),
    ];
    const groups = groupByChapter(scenes);
    expect(groups.map((g) => g.chapter)).toEqual(['Finding the Campus', 'Finding a Room', NO_CHAPTER]);
    expect(groups[0].scenes.map((s) => s.key)).toEqual(['a', 'c']);
  });

  it('puts a screen between two neighbours without renumbering', () => {
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(undefined, 5)).toBe(4);
    expect(positionBetween(5, undefined)).toBe(6);
    expect(positionBetween(undefined, undefined)).toBe(0);
    // a second insert between the same pair still lands in the right place
    expect(positionBetween(1, 1.5)).toBe(1.25);
  });
});
