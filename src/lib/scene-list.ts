import type { SceneRow } from './remote';

/**
 * The scene list in the editor: playing order, a search filter, and chapters.
 * Pure so it can be tested without a database.
 */

export const NO_CHAPTER = 'No chapter';

export function orderScenes(scenes: SceneRow[]): SceneRow[] {
  return [...scenes].sort((a, b) => a.position - b.position);
}

export function filterScenes(scenes: SceneRow[], query: string): SceneRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return scenes;
  return scenes.filter((scene) =>
    `${scene.key} ${scene.chapter ?? ''} ${scene.heading ?? ''} ${scene.text} ${scene.note_simple ?? ''}`
      .toLowerCase()
      .includes(q),
  );
}

export interface SceneGroup {
  chapter: string;
  scenes: SceneRow[];
}

/** Groups in the order the chapters first appear, which is playing order. */
export function groupByChapter(scenes: SceneRow[]): SceneGroup[] {
  const map = new Map<string, SceneRow[]>();
  for (const scene of scenes) {
    const chapter = scene.chapter?.trim() || NO_CHAPTER;
    map.set(chapter, [...(map.get(chapter) ?? []), scene]);
  }
  return [...map.entries()].map(([chapter, list]) => ({ chapter, scenes: list }));
}

/** A position that sits between two neighbours, so lists never need renumbering. */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
