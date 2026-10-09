/** Languages the site can show. Add a code here (e.g. 'vi') and a `_vi` column is picked up everywhere. */
export const LANGS = ['en', 'vi'] as const;
export type Lang = (typeof LANGS)[number];

/** English is required; other languages are optional and fall back to English. */
export type Localized = { en: string } & Partial<Record<Lang, string>>;

export function pick(value: Localized | undefined, lang: Lang): string {
  if (!value) return '';
  return value[lang] || value.en;
}

export interface GlossaryEntry {
  slug: string;
  kind: 'proverb' | 'word';
  /** The proverb or the hard word, as shown to learners. */
  term: string;
  /** Every spelling that should be linked in story text (words only). */
  forms?: string[];
  letter: string;
  meaning: Localized;
  example?: Localized;
}

export interface Choice {
  /** Plain choice label. Absent when the choice is a proverb. */
  label?: Localized;
  /** Glossary slug. When set, the proverb is shown as the choice and revealed after picking. */
  proverb?: string;
  next: string;
}

export interface Scene {
  id: string;
  heading?: Localized;
  text: Localized;
  /** Persistent parchment note (riddles, signs, letters). */
  note?: Localized;
  gives: string[];
  status: string[];
  choices: Choice[];
  next?: string;
}

// ---- Presentation (dev-owned; teachers never edit this) ----

export type Slot = 'left' | 'center' | 'right';
export type DialoguePosition = 'top' | 'center' | 'bottom';

export interface StageDef {
  /** Path under /public, e.g. /games/my-game/bg-temple.webp */
  background: string;
  /** Where characters stand, as % from the top of the stage. */
  ground?: number;
  dialogue?: DialoguePosition;
  alt?: string;
}
export interface CharacterDef {
  image: string;
  /** Width as % of the stage. */
  width: number;
  alt?: string;
}
export interface PropDef {
  image: string;
  /** Bottom-centre anchor and width, as % of the stage. */
  x: number;
  y: number;
  width: number;
  alt?: string;
  /** Area (in % of the prop image) where the scene note is printed, e.g. the face of a signpost. */
  text?: { x: number; y: number; width: number; height: number };
}
export interface SceneRule {
  /** Scene ids this rule applies to, or "*" for all. Later rules override earlier ones. */
  ids: string[] | '*';
  stage?: string;
  dialogue?: DialoguePosition;
  /** Replaces the characters of earlier rules; use null to empty a slot. */
  characters?: Partial<Record<Slot, string | null>>;
  /** Replaces the props of earlier rules. */
  props?: string[];
  /** Print the scene note on this prop instead of in the dialogue box. */
  noteOn?: string;
  /** Show the scene heading as a title inside the artwork. */
  headingInArt?: boolean;
}
export interface Presentation {
  stages: Record<string, StageDef>;
  characters: Record<string, CharacterDef>;
  props: Record<string, PropDef>;
  /** Keyed by the item name used in the `gives` column. */
  items: Record<string, { image: string }>;
  scenes: SceneRule[];
}

export interface Game {
  slug: string;
  title: Localized;
  summary: Localized;
  description: Localized;
  thumbnail?: string;
  start: string;
  scenes: Record<string, Scene>;
  presentation?: Presentation;
}
