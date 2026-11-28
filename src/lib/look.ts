import type { OptionsBox, DialoguePosition, Presentation, Slot, TextKind } from './types';

/**
 * What one screen looks like, in the shape the editor edits and the player
 * understands. Kept pure so it can be unit tested without a database.
 */
export interface SceneLook {
  stage: string;
  left: string | null;
  right: string | null;
  /** Background music key (a key of the game's `music`), or '' for none. */
  music: string;
  /** Text size in percent of the default, per kind of text; absent = default. */
  size: Partial<Record<TextKind, number>>;
  /** Where the answer cards sit; absent values use the default place. */
  options: OptionsBox;
}

export const emptyPresentation = (): Presentation => ({
  stages: {},
  characters: {},
  props: {},
  items: {},
  scenes: [],
});

const blank = (p: Presentation | null | undefined): Presentation => ({
  ...emptyPresentation(),
  ...(p ?? {}),
  stages: { ...(p?.stages ?? {}) },
  characters: { ...(p?.characters ?? {}) },
  props: { ...(p?.props ?? {}) },
  items: { ...(p?.items ?? {}) },
  scenes: [...(p?.scenes ?? [])],
  ...(p?.music ? { music: { ...p.music } } : {}),
  ...(p?.sfx ? { sfx: { ...p.sfx } } : {}),
  ...(p?.font ? { font: { ...p.font } } : {}),
});

/** Every rule that names this screen, later rules winning. */
export function sceneLook(presentation: Presentation | null | undefined, key: string): SceneLook {
  const out: SceneLook = { stage: '', left: null, right: null, music: '', size: {}, options: {} };
  for (const rule of presentation?.scenes ?? []) {
    if (rule.ids !== '*' && !rule.ids.includes(key)) continue;
    if (rule.stage) out.stage = rule.stage;
    if (rule.music !== undefined) out.music = rule.music;
    if (rule.size) out.size = { ...out.size, ...rule.size };
    if (rule.options) out.options = { ...out.options, ...rule.options };
    const slots = rule.characters ?? {};
    if (slots.left !== undefined) out.left = slots.left;
    if (slots.right !== undefined) out.right = slots.right;
    if (slots.center !== undefined) out.left = slots.center;
  }
  return out;
}

/** Replaces this screen's rule, leaving every other rule untouched. */
export function withSceneLook(
  presentation: Presentation | null | undefined,
  key: string,
  look: SceneLook,
): Presentation {
  const next = blank(presentation);
  // Keep what this screen's own rule says besides the look (dialogue position, props, ...).
  const own = next.scenes.find((rule) => rule.ids !== '*' && rule.ids.length === 1 && rule.ids[0] === key);
  next.scenes = next.scenes.filter((rule) => rule.ids === '*' || !rule.ids.includes(key) || rule.ids.length > 1);
  next.scenes.push({
    ...own,
    ids: [key],
    stage: look.stage || undefined,
    characters: { left: look.left, right: look.right },
    music: look.music || undefined,
    size: Object.fromEntries(Object.entries(look.size ?? {}).filter(([, v]) => v && v !== 100)) as SceneLook['size'],
    options: Object.fromEntries(
      Object.entries(look.options ?? {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)),
    ) as OptionsBox,
  });
  return next;
}

/** Adds or replaces a stage; renaming keeps every screen that pointed at it. */
export function withStage(
  presentation: Presentation | null | undefined,
  from: string,
  to: string,
  stage: Presentation['stages'][string],
): Presentation {
  const next = blank(presentation);
  if (from && from !== to) {
    delete next.stages[from];
    next.scenes = next.scenes.map((rule) => (rule.stage === from ? { ...rule, stage: to } : rule));
  }
  next.stages[to] = stage;
  return next;
}

export function withoutStage(presentation: Presentation | null | undefined, id: string): Presentation {
  const next = blank(presentation);
  delete next.stages[id];
  next.scenes = next.scenes.map((rule) => (rule.stage === id ? { ...rule, stage: undefined } : rule));
  return next;
}

export function withCharacter(
  presentation: Presentation | null | undefined,
  from: string,
  to: string,
  character: Presentation['characters'][string],
): Presentation {
  const next = blank(presentation);
  if (from && from !== to) {
    delete next.characters[from];
    next.scenes = next.scenes.map((rule) => {
      if (!rule.characters) return rule;
      const characters = { ...rule.characters };
      for (const slot of Object.keys(characters) as Slot[]) {
        if (characters[slot] === from) characters[slot] = to;
      }
      return { ...rule, characters };
    });
  }
  next.characters[to] = character;
  return next;
}

export function withoutCharacter(presentation: Presentation | null | undefined, id: string): Presentation {
  const next = blank(presentation);
  delete next.characters[id];
  next.scenes = next.scenes.map((rule) => {
    if (!rule.characters) return rule;
    const characters: Partial<Record<Slot, string | null>> = { ...rule.characters };
    for (const slot of Object.keys(characters) as Slot[]) {
      if (characters[slot] === id) characters[slot] = null;
    }
    return { ...rule, characters };
  });
  return next;
}

const DIALOGUE: DialoguePosition[] = ['top', 'center', 'bottom'];
export const isDialoguePosition = (value: string): value is DialoguePosition =>
  DIALOGUE.includes(value as DialoguePosition);

/** A key that is safe in JSON, a URL and a select option. */
export function keyFrom(label: string, taken: string[], fallback = 'stage'): string {
  const base =
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || fallback;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
/** Drops a music track and everything that pointed at it. */
export function withoutMusic(presentation: Presentation | null | undefined, key: string): Presentation {
  const next = blank(presentation);
  const { [key]: _gone, ...rest } = next.music ?? {};
  next.music = rest;
  next.scenes = next.scenes.map((rule) => (rule.music === key ? { ...rule, music: undefined } : rule));
  if (next.proverbSting === key) next.proverbSting = undefined;
  if (next.sfx) next.sfx = Object.fromEntries(Object.entries(next.sfx).filter(([, v]) => v !== key));
  return next;
}
