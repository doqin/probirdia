import type { Game, Scene } from './types';

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

function enter(state: PlayState, game: Game, id: string): PlayState {
  const scene = game.scenes[id];
  return {
    ...state,
    sceneId: id,
    reveal: null,
    items: union(state.items, scene.gives),
    status: union(state.status, scene.status),
  };
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
    Array.isArray(s.items) &&
    Array.isArray(s.status) &&
    Array.isArray(s.chosen) &&
    (s.reveal === null || (typeof s.reveal === 'object' && s.reveal.next in game.scenes))
  );
}
