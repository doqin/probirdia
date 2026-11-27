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
  /** Review segment: the word of the proverb the learner types back. Defaults to its longest word. */
  blank?: string;
  /** Review segment: a nudge toward the blank word. Defaults to its first letter and length. */
  hint?: Localized;
}

export interface Choice {
  /** Plain choice label. Absent when the choice is a proverb. */
  label?: Localized;
  /** Glossary slug. When set, the proverb is shown as the choice and revealed after picking. */
  proverb?: string;
  next: string;
  /** The right answer. A wrong pick costs the player one confidence heart. */
  correct?: boolean;
  /** Why this proverb does or does not fit the situation, shown on the reveal card. */
  why?: Localized;
}

/** One branch of a route scene: the first whose condition holds is taken (no condition = fallback). */
export interface Route {
  if?: string;
  next: string;
}

export interface Scene {
  id: string;
  heading?: Localized;
  text: Localized;
  /** Persistent parchment note (riddles, signs, letters). */
  note?: Localized;
  /** The note in plain words, shown when the player hovers over or taps the note. */
  noteSimple?: Localized;
  /** The chapter/section this screen belongs to; the editor groups by it. */
  chapter?: Localized;
  /** Artwork for this screen (public URL). Turns into a stage when the game is loaded. */
  image?: string;
  imageAlt?: string;
  /**
   * Which screen this is. `title` opens the game, `divider` cuts a chapter,
   * `preview`/`review` are the lesson's two other phases. `gameover` is the screen shown when
   * the player runs out of confidence hearts; it is never linked to, so it is exempt from reachability.
   */
  phase?: 'title' | 'divider' | 'preview' | 'game' | 'review' | 'gameover';
  /** Review segment: why this proverb does or does not suit the scene. */
  explanation?: Localized;
  gives: string[];
  status: string[];
  /** Statuses removed on entry (e.g. "Injured" is replaced by "Severely injured"). */
  clears: string[];
  choices: Choice[];
  next?: string;
  /** A route scene shows nothing: it sends the player on to the first branch whose condition holds. */
  routes?: Route[];
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
  /**
   * Visual-novel placement, as in the design deck: the image box's top-left corner as
   * % of the stage. The image may run past the stage edges, which is what crops the
   * character to the upper body. Without `top` the sprite stands on the stage's ground
   * line instead (the older bottom-anchored placement).
   */
  left?: number;
  top?: number;
  /**
   * Where the sprite's solid edge is, as % of the stage, within the dialogue box's height:
   * its right edge for a left-hand character, its left edge for a right-hand one. The box
   * starts its text beyond it so a sprite never covers the words. Measured from the image.
   */
  clear?: number;
  alt?: string;
}
export interface PropDef {
  image: string;
  /** Bottom-centre anchor and width, as % of the stage. */
  x: number;
  y: number;
  width: number;
  /** Stretches the image to this height (% of the stage height) instead of keeping its proportions. */
  height?: number;
  alt?: string;
  /** Fixed text printed on the prop (e.g. a speech bubble), centred in `text` or over the whole image. */
  label?: string;
  /** Size of the label in % of the stage width (default 1.5). */
  labelSize?: number;
  /** Degrees clockwise, e.g. 90 for a hero lying on the ground. When set, x/y is the centre of the image, not the bottom. */
  rotate?: number;
  /** Area (in % of the prop image) where the scene note is printed, e.g. the face of a signpost. */
  text?: { x: number; y: number; width: number; height: number };
}
export const TEXT_KINDS = ['heading', 'text', 'note'] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

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
  /** Text size in percent of the default (100). Absent kinds keep the default. */
  size?: Partial<Record<TextKind, number>>;
  /** Background music for these scenes (a key of `music`); stays playing across scenes with the same track. */
  music?: string;
}
export const SFX_NAMES = ['hover', 'select', 'correct', 'wrong', 'typing'] as const;
export type SfxName = (typeof SFX_NAMES)[number];

export interface Presentation {
  stages: Record<string, StageDef>;
  characters: Record<string, CharacterDef>;
  props: Record<string, PropDef>;
  /** Keyed by the item name used in the `gives` column. */
  items: Record<string, { image: string }>;
  /** Audio files under /public. `loop` tracks repeat; others play once (stingers). */
  music?: Record<string, { file: string; loop?: boolean }>;
  /** Short sound played when a proverb is revealed (a key of `music`). */
  proverbSting?: string;
  /** Short sounds for the choice cards (each a key of `music`): hovered, picked, the verdict on a proverb, and the typing that plays while a line is printed (a looping clip). */
  sfx?: Partial<Record<SfxName, string>>;
  /** Image for one confidence heart (a path under /public). Without it the player draws a small pixel heart. */
  heart?: string;
  scenes: SceneRule[];
}

export interface Game {
  slug: string;
  title: Localized;
  summary: Localized;
  description: Localized;
  thumbnail?: string;
  start: string;
  /** Item names that count as relics for `relics>=N` conditions. */
  relics: string[];
  /** Statuses that are good news (shown green instead of red). */
  positiveStatus: string[];
  scenes: Record<string, Scene>;
  presentation?: Presentation;
}
