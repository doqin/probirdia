import type { Game, Scene } from './types';
import { evaluate, parseCondition } from './condition';

/** Everything needed to resume a game. Plain JSON so it can live in localStorage. */
export interface PlayState {
  sceneId: string;
  items: string[];
  status: string[];
  /** Proverb slugs the player picked, in order (used for the end-of-game recap). */
  chosen: string[];
  /** Set after picking a proverb choice: the proverb card shown before moving on. */
  reveal: { proverb: string; next: string } | null;
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
  return enter({ sceneId: game.start, items: [], status: [], chosen: [], reveal: null }, game, game.start);
}

export function choose(state: PlayState, game: Game, index: number): PlayState {
  const choice = currentScene(game, state).choices[index];
  if (!choice || state.reveal) return state;
  if (choice.proverb) {
    return {
      ...state,
      chosen: [...state.chosen, choice.proverb],
      reveal: { proverb: choice.proverb, next: choice.next },
    };
  }
  return enter(state, game, choice.next);
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
    (s.reveal === null || (typeof s.reveal === 'object' && s.reveal.next in game.scenes))
  );
}
