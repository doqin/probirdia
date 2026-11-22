import type { Game, Scene } from './types';
import { parseMarkup } from './markup';
import { parseCondition } from './condition';

/**
 * Checks a game held in memory, with messages written for content creators.
 * The spreadsheet loader in content.ts reports the same kinds of problems by
 * CSV row; this one is what the web editor shows before it lets you publish.
 */
export function validateGame(game: Game, knownProverbs: Set<string>): string[] {
  const problems: string[] = [];
  const scenes = game.scenes;
  const ids = Object.keys(scenes);

  if (!game.title.en.trim()) problems.push('The game needs a title.');
  if (!ids.length) {
    problems.push('The game has no screens yet. Add the first one.');
    return problems;
  }
  if (!scenes[game.start]) problems.push(`The first screen "${game.start}" does not exist.`);

  const targetsOf = (scene: Scene) =>
    [scene.next, ...scene.choices.map((c) => c.next), ...(scene.routes ?? []).map((r) => r.next)].filter(
      (t): t is string => Boolean(t),
    );

  for (const scene of Object.values(scenes)) {
    const where = `Screen "${scene.id}"`;
    for (const target of targetsOf(scene)) {
      if (!scenes[target]) problems.push(`${where} goes to "${target}", which does not exist.`);
    }

    if (scene.next && scene.choices.length) problems.push(`${where} has both a Continue button and choices; use one.`);

    if (scene.routes?.length) {
      if (scene.next || scene.choices.length) {
        problems.push(`${where} uses routes, so it cannot also have choices or a Continue button.`);
      }
      if (scene.text.en.trim()) problems.push(`${where} uses routes, so players never see it: leave the text empty.`);
      const fallbacks = scene.routes.filter((r) => !r.if);
      if (fallbacks.length !== 1) problems.push(`${where}: exactly one route must have no condition (the fallback).`);
      if (scene.routes[scene.routes.length - 1]?.if) problems.push(`${where}: the last route must be the fallback.`);
      for (const route of scene.routes) {
        if (!route.if) continue;
        try {
          parseCondition(route.if);
        } catch (e) {
          problems.push(`${where}: ${(e as Error).message}`);
        }
      }
    }

    scene.choices.forEach((choice, index) => {
      const at = `${where}, choice ${index + 1}`;
      if (!choice.next) problems.push(`${at}: choose where it goes.`);
      if (choice.proverb && choice.label) problems.push(`${at}: use either a button label or a proverb.`);
      if (!choice.proverb && !choice.label?.en.trim()) problems.push(`${at}: give it a button label or pick a proverb.`);
      if (choice.proverb && !knownProverbs.has(choice.proverb)) {
        problems.push(`${at}: that proverb is not in the glossary.`);
      }
    });

    if (scene.phase !== 'review' && scene.choices.length >= 2) {
      const correct = scene.choices.filter((c) => c.correct).length;
      if (correct !== 1) {
        problems.push(`${where}: mark exactly one choice as the right answer (currently ${correct}).`);
      }
    }

    if (scene.noteSimple && !scene.note) problems.push(`${where} has a plain-words note but no note to explain.`);

    for (const field of [scene.text, scene.note, scene.noteSimple, scene.heading]) {
      for (const value of Object.values(field ?? {})) {
        for (const segment of parseMarkup(value ?? '')) {
          if (segment.kind === 'proverb' && !knownProverbs.has(segment.slug)) {
            problems.push(`${where}: [[${segment.display}]] refers to a proverb that is not in the glossary.`);
          }
        }
      }
    }
  }

  // Every screen has to be reachable from the first one.
  if (scenes[game.start]) {
    const reached = new Set([game.start]);
    const queue = [game.start];
    while (queue.length) {
      for (const target of targetsOf(scenes[queue.pop()!])) {
        if (scenes[target] && !reached.has(target)) {
          reached.add(target);
          queue.push(target);
        }
      }
    }
    for (const id of ids) {
      if (!reached.has(id)) problems.push(`Screen "${id}" can never be reached from the first screen.`);
    }
  }

  return problems;
}
