import type { Game, Localized, Scene } from './types';
import { evaluate, parseCondition } from './condition';

/** One proverb taken at a branch, and whether it was the one the situation wanted. */
export interface Pick {
  slug: string;
  correct: boolean;
  /** The proverb that did fit here, when the pick was wrong. */
  intended?: string;
}

/** What the reveal card shows right after a proverb is picked. */
export interface Reveal {
  proverb: string;
  next: string;
  correct: boolean;
  /** Why this pick does or does not fit, written for this branch. */
  why?: Localized;
  /** The proverb that would have fitted, when the pick was wrong. */
  intended?: string;
}

/** Everything needed to resume a game. Plain JSON so it can live in localStorage. */
export interface PlayState {
  sceneId: string;
  items: string[];
  status: string[];
  /** Proverb slugs the player picked, in order. */
  chosen: string[];
  /** The same picks with their verdict, used by the reveal card and the recap. */
  picks: Pick[];
  /** Set after picking a proverb choice: the proverb card shown before moving on. */
  reveal: Reveal | null;
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export function currentScene(game: Game, state: PlayState): Scene {
  return game.scenes[state.sceneId];
}

const norm = (s: string) => s.trim().toLowerCase();

function pickRoute(state: PlayState, game: Game, scene: Scene): string {
  const facts = {
    items: state.items,
    status: state.status,
    relics: state.items.filter((i) => game.relics.some((r) => norm(r) === norm(i))).length,
  };
  for (const route of scene.routes ?? []) {
    if (!route.if || evaluate(parseCondition(route.if), facts)) return route.next;
  }
  throw new Error(`Route scene "${scene.id}" has no branch that fits (add a fallback with an empty condition).`);
}

/** Moves into a scene, applying what it gives; route scenes are passed straight through. */
function enter(state: PlayState, game: Game, id: string, hops = 0): PlayState {
  const scene = game.scenes[id];
  if (hops > 50) throw new Error(`Routes starting at "${id}" loop forever.`);
  const clears = scene.clears.map(norm);
  const next: PlayState = {
    ...state,
    sceneId: id,
    reveal: null,
    items: union(state.items, scene.gives),
    status: union(
      state.status.filter((s) => !clears.includes(norm(s))),
      scene.status,
    ),
  };
  return scene.routes ? enter(next, game, pickRoute(next, game, scene), hops + 1) : next;
}

export function startState(game: Game): PlayState {
  return enter({ sceneId: game.start, items: [], status: [], chosen: [], picks: [], reveal: null }, game, game.start);
}

/** The proverb that fits this branch, if the scene says which one it is. */
function intendedOf(scene: Scene): string | undefined {
  return scene.choices.find((c) => c.proverb && c.correct)?.proverb;
}

export function choose(state: PlayState, game: Game, index: number): PlayState {
  const scene = currentScene(game, state);
  const choice = scene.choices[index];
  if (!choice || state.reveal) return state;
  if (choice.proverb) {
    const correct = choice.correct === true;
    const intended = correct ? undefined : intendedOf(scene);
    return {
      ...state,
      chosen: [...state.chosen, choice.proverb],
      picks: [...(state.picks ?? []), { slug: choice.proverb, correct, intended }],
      reveal: { proverb: choice.proverb, next: choice.next, correct, why: choice.why, intended },
    };
  }
  return enter(state, game, choice.next);
}

/** Splits the run's picks for the ending recap, so a wrong pick is never shown as learned. */
export function recapOf(state: PlayState): { well: string[]; revisit: Pick[] } {
  const picks = state.picks ?? [];
  if (!picks.length) return { well: [...new Set(state.chosen)], revisit: [] };
  const well = [...new Set(picks.filter((p) => p.correct).map((p) => p.slug))];
  const seen = new Set<string>();
  const revisit = picks.filter((p) => {
    if (p.correct || seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
  return { well, revisit };
}

/** Moves on from a plain scene or from a proverb reveal. */
export function advance(state: PlayState, game: Game): PlayState {
  if (state.reveal) return enter(state, game, state.reveal.next);
  const next = currentScene(game, state).next;
  return next ? enter(state, game, next) : state;
}

export function isEnd(game: Game, state: PlayState): boolean {
  const scene = currentScene(game, state);
  return !state.reveal && !scene.next && scene.choices.length === 0;
}

/** Saved games can go stale when a teacher edits the sheet; discard them if they no longer fit. */
export function isValidState(game: Game, value: unknown): value is PlayState {
  const s = value as PlayState;
  return (
    !!s &&
    typeof s.sceneId === 'string' &&
    s.sceneId in game.scenes &&
    !game.scenes[s.sceneId].routes &&
    Array.isArray(s.items) &&
    Array.isArray(s.status) &&
    Array.isArray(s.chosen) &&
    // saves written before the reveal learned about verdicts have no picks yet
    (s.picks === undefined || Array.isArray(s.picks)) &&
    (s.reveal === null || (typeof s.reveal === 'object' && s.reveal.next in game.scenes))
  );
}
