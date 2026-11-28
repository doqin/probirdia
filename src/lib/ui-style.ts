import type { UiStyle } from './types';

/**
 * The game's interface pieces a teacher can restyle in the editor's Style tab: hover cards, buttons,
 * quiz rows, the ending panel and so on. Each piece is one entry below; `uiCss` turns the saved
 * choices into CSS that the player injects. Everything is pure so it is unit tested.
 *
 * Adding a piece: add an entry here (the selector is written relative to the player's `.scene`).
 * A `size: 'var'` piece must read `var(--ui-<id>, 1)` in its component's font-size, because that size
 * is written in cqw/rem and cannot be scaled from outside; `size: 'em'` pieces inherit their size,
 * so the generated rule scales them directly.
 */

export const UI_CONTROLS = ['size', 'color', 'background', 'border', 'weight', 'italic', 'caps', 'underline'] as const;
export type UiControl = (typeof UI_CONTROLS)[number];

export const UNDERLINES = ['none', 'solid', 'dotted', 'dashed', 'wavy', 'double'] as const;

/** What the preview should show so the piece is on screen. */
export const SHOW_KINDS = ['title', 'divider', 'story', 'hover', 'choices', 'reveal', 'quiz-preview', 'quiz-review', 'ending', 'gameover'] as const;
export type ShowKind = (typeof SHOW_KINDS)[number];

export interface UiElement {
  id: string;
  group: string;
  label: string;
  /** Where the player meets it, in plain words. */
  hint: string;
  /** Which kind of screen shows it in the preview. */
  show: ShowKind;
  /** CSS selector under `.scene` (comma lists allowed). */
  selector: string;
  /** Selector for text settings when the text is not the box itself. */
  text?: string;
  /** Selector for background and outline when the box is not the text itself. */
  box?: string;
  /** Appended to the background selector so hover/disabled looks keep working (e.g. `:not(:hover)`). */
  guard?: string;
  size?: 'var' | 'em';
  can: UiControl[];
}

export interface UiGroup {
  id: string;
  label: string;
  hint: string;
}

export const UI_GROUPS: UiGroup[] = [
  { id: 'story', label: 'Story text', hint: 'The dialogue box, the speaker’s name tag and the parchment note.' },
  { id: 'links', label: 'Highlighted words and hover cards', hint: 'Proverbs and hard words underlined in the story, and the card that opens when you point at them.' },
  { id: 'choices', label: 'Answer cards', hint: 'The proverb cards the player picks from, and the meaning that pops up beside them.' },
  { id: 'reveal', label: 'After picking a proverb', hint: 'The card that says whether the proverb fits, and why.' },
  { id: 'buttons', label: 'Buttons and top bar', hint: 'Continue, Play and Try again buttons, and the game title strip at the top.' },
  { id: 'cards', label: 'Opening and chapter cards', hint: 'The first screen with the game name, and the cards between chapters.' },
  { id: 'ending', label: 'Ending and game over', hint: 'The recap at the end of the story, and the screen shown when the hearts run out.' },
  { id: 'quiz', label: 'Proverb quizzes', hint: 'The “match the proverb” quiz before the story and the “type the missing word” quiz after it.' },
];

const TEXT: UiControl[] = ['color', 'weight', 'italic', 'caps'];
const TEXT_U: UiControl[] = [...TEXT, 'underline'];
const BOX: UiControl[] = ['background', 'border'];

export const UI_ELEMENTS: UiElement[] = [
  // ---- story ----
  { id: 'dialogue-box', group: 'story', label: 'Dialogue box', hint: 'The white box the story text is written in.', show: 'story', selector: '.bubble', can: ['color', ...BOX] },
  { id: 'speaker-tag', group: 'story', label: 'Speaker name tag', hint: 'The small label on the edge of the dialogue box (“Minh”).', show: 'story', selector: '.plate', can: [...TEXT, ...BOX] },
  { id: 'story-text', group: 'story', label: 'Story text', hint: 'The words in the dialogue box. Its size is set per screen in Screens.', show: 'story', selector: '.bubble .text:not(.meaning)', can: TEXT },
  { id: 'note', group: 'story', label: 'Parchment note', hint: 'Riddles, signs and letters shown on a note.', show: 'story', selector: '.note', can: [...TEXT, ...BOX] },
  { id: 'note-help', group: 'story', label: '“In plain words” button', hint: 'The small button under a note that explains it simply.', show: 'story', selector: '.simple-btn', size: 'var', can: ['size', ...TEXT, ...BOX] },
  { id: 'note-help-card', group: 'story', label: '“In plain words” popup', hint: 'The card that opens from that button.', show: 'story', selector: '.simple-pop', can: ['color', 'italic', ...BOX] },
  { id: 'art-heading', group: 'story', label: 'Heading inside the artwork', hint: 'Only on screens set to show their heading in the picture.', show: 'story', selector: '.art-heading', size: 'var', can: ['size', ...TEXT_U] },

  // ---- highlighted words and hover cards ----
  { id: 'proverb-link', group: 'links', label: 'Highlighted proverb', hint: 'A proverb written inside the story text.', show: 'hover', selector: '.term.proverb', size: 'em', can: ['size', ...TEXT_U, 'background'] },
  { id: 'word-link', group: 'links', label: 'Highlighted hard word', hint: 'A hard word that has a meaning card.', show: 'hover', selector: '.term.word', size: 'em', can: ['size', ...TEXT_U, 'background'] },
  { id: 'hover-card', group: 'links', label: 'Hover card', hint: 'The card that opens when the player points at a highlighted word. Size scales everything in it.', show: 'hover', selector: '.pop .card', size: 'var', can: ['size', 'color', ...BOX] },
  { id: 'hover-title', group: 'links', label: 'Hover card: the word', hint: 'The bold word or proverb at the top of the card.', show: 'hover', selector: '.pop .card strong', size: 'em', can: ['size', ...TEXT_U] },
  { id: 'hover-meaning', group: 'links', label: 'Hover card: the meaning', hint: 'The explanation.', show: 'hover', selector: '.pop .meaning', size: 'em', can: ['size', ...TEXT_U] },
  { id: 'hover-example', group: 'links', label: 'Hover card: the example', hint: 'The example sentence.', show: 'hover', selector: '.pop .example', size: 'em', can: ['size', ...TEXT_U] },
  { id: 'hover-link', group: 'links', label: 'Hover card: glossary link', hint: 'The “See in glossary” link at the bottom.', show: 'hover', selector: '.pop .card a', size: 'em', can: ['size', ...TEXT_U] },

  // ---- answer cards ----
  { id: 'choice-card', group: 'choices', label: 'Answer card', hint: 'One proverb the player can pick. Where the cards sit is set per screen in Screens.', show: 'choices', selector: '.choice-cards .btn', guard: ':not(:hover)', size: 'var', can: ['size', ...TEXT, ...BOX] },
  { id: 'choice-meaning', group: 'choices', label: 'Meaning beside an answer card', hint: 'The bubble that appears when the player points at a card (computers only).', show: 'choices', selector: '.choice-cards .def', size: 'var', can: ['size', 'color', 'weight', 'italic', ...BOX] },

  // ---- after picking ----
  { id: 'reveal-term', group: 'reveal', label: 'Proverb title', hint: 'The proverb shown big on the result card.', show: 'reveal', selector: '.reveal-term', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'verdict-good', group: 'reveal', label: '“It fits” label', hint: 'The pill shown when the player picked the right proverb.', show: 'reveal', selector: '.reveal-head .chip.status.good', can: [...TEXT, ...BOX] },
  { id: 'verdict-bad', group: 'reveal', label: '“Not quite” label', hint: 'The pill shown when the proverb does not fit.', show: 'reveal', selector: '.reveal-head .chip.status:not(.good)', can: [...TEXT, ...BOX] },
  { id: 'reveal-why', group: 'reveal', label: 'Why it fits', hint: 'The explanation under the title.', show: 'reveal', selector: '.bubble.revealed .why', size: 'em', can: ['size', ...TEXT_U] },
  { id: 'reveal-meaning', group: 'reveal', label: 'Meaning of the proverb', hint: 'The definition line.', show: 'reveal', selector: '.bubble.revealed .meaning', size: 'em', can: ['size', ...TEXT_U] },
  { id: 'translation', group: 'reveal', label: 'Vietnamese text', hint: 'Translations and explanations in Vietnamese (blue by default).', show: 'reveal', selector: '.vi', can: ['color', 'weight', 'italic'] },

  // ---- buttons ----
  { id: 'continue-button', group: 'buttons', label: 'Continue button', hint: 'The button at the bottom of the dialogue box.', show: 'story', selector: '.bubble .btn', guard: ':not(:hover)', size: 'var', can: ['size', ...TEXT, ...BOX] },
  { id: 'play-button', group: 'buttons', label: 'Play and Try again buttons', hint: 'The big cyan buttons on the opening card, chapter cards and the ending.', show: 'title', selector: '.btn.play', guard: ':not(:hover)', can: [...TEXT, ...BOX] },
  { id: 'secondary-button', group: 'buttons', label: 'Secondary buttons', hint: 'The white buttons on the ending (“Review proverbs”, “Home”).', show: 'ending', selector: '.btn.secondary', guard: ':not(:hover)', can: [...TEXT, ...BOX] },
  { id: 'top-bar', group: 'buttons', label: 'Top bar', hint: 'The game title and the Home, Sound and Start over buttons along the top.', show: 'story', selector: '.hud-tag, .chip-btn', size: 'var', can: ['size', ...TEXT, ...BOX] },

  // ---- opening and chapter cards ----
  { id: 'title-card', group: 'cards', label: 'Opening card', hint: 'The white card on the first screen.', show: 'title', selector: '.title-card', can: ['color', ...BOX] },
  { id: 'title-kicker', group: 'cards', label: 'Opening card: small line above the name', hint: 'The little heading above the game name.', show: 'title', selector: '.title-card .kicker', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'title-name', group: 'cards', label: 'Opening card: game name', hint: 'The big title.', show: 'title', selector: '.title-name', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'title-sub', group: 'cards', label: 'Opening card: subtitle', hint: 'The line under the game name.', show: 'title', selector: '.title-sub', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'divider-card', group: 'cards', label: 'Chapter card', hint: 'The card shown between chapters.', show: 'divider', selector: '.divider-card', can: ['color', ...BOX] },
  { id: 'divider-title', group: 'cards', label: 'Chapter card: title', hint: 'The chapter name.', show: 'divider', selector: '.divider-card h2', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'divider-text', group: 'cards', label: 'Chapter card: text', hint: 'The line under the chapter name.', show: 'divider', selector: '.divider-card p', size: 'var', can: ['size', ...TEXT_U] },

  // ---- ending ----
  { id: 'ending-panel', group: 'ending', label: 'Ending panel', hint: 'The white panel with the recap. Size scales everything in it.', show: 'ending', selector: '.finale', size: 'var', can: ['size', 'color', ...BOX] },
  { id: 'ending-title', group: 'ending', label: '“The end” title', hint: 'The big heading at the top of the panel.', show: 'ending', selector: '.the-end', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'ending-epilogue', group: 'ending', label: 'Closing paragraph', hint: 'The story text shown on the last screen.', show: 'ending', selector: '.epilogue', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'recap-good', group: 'ending', label: 'Recap heading: proverbs used well', hint: 'Green by default.', show: 'ending', selector: '.finale h3.well', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'recap-bad', group: 'ending', label: 'Recap heading: proverbs to revisit', hint: 'Red by default.', show: 'ending', selector: '.finale h3.retry', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'recap-list', group: 'ending', label: 'Recap list', hint: 'The lines under each recap heading.', show: 'ending', selector: '.recap', size: 'em', can: ['size', ...TEXT] },
  { id: 'recap-proverb', group: 'ending', label: 'Proverb names in the recap', hint: 'The bold proverb at the start of each line.', show: 'ending', selector: '.recap strong', can: TEXT_U },
  { id: 'gameover-title', group: 'ending', label: 'Game over heading', hint: 'The big white words on the left when the hearts run out.', show: 'gameover', selector: '.gave-up', size: 'var', can: ['size', ...TEXT_U] },

  // ---- quizzes ----
  { id: 'quiz-panel', group: 'quiz', label: 'Quiz panel', hint: 'The big white card both quizzes are drawn on.', show: 'quiz-preview', selector: '.quiz', can: ['color', ...BOX] },
  { id: 'quiz-title', group: 'quiz', label: 'Quiz title', hint: 'The heading at the top.', show: 'quiz-preview', selector: '.quiz h2', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'quiz-counter', group: 'quiz', label: 'Page counter', hint: 'The “1 / 2” under the title.', show: 'quiz-preview', selector: '.quiz .count', size: 'var', can: ['size', 'color', 'weight', 'italic'] },
  { id: 'quiz-proverb', group: 'quiz', label: 'Match quiz: proverb', hint: 'The proverb on the left of each row.', show: 'quiz-preview', selector: '.quiz .term strong', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'quiz-answer', group: 'quiz', label: 'Match quiz: answer button', hint: 'The button that opens the list of meanings.', show: 'quiz-preview', selector: '.quiz .pick', size: 'var', can: ['size', 'color', 'weight', 'italic', ...BOX] },
  { id: 'quiz-options', group: 'quiz', label: 'Match quiz: list of meanings', hint: 'The list that opens under the answer button.', show: 'quiz-preview', selector: '.quiz .options', text: '.quiz .options button', box: '.quiz .options', size: 'var', can: ['size', 'color', 'weight', 'italic', ...BOX] },
  { id: 'quiz-sentence', group: 'quiz', label: 'Missing-word quiz: sentence', hint: 'The proverb with a gap in it.', show: 'quiz-review', selector: '.quiz .sentence', size: 'var', can: ['size', ...TEXT_U] },
  { id: 'quiz-blank', group: 'quiz', label: 'Missing-word quiz: the gap', hint: 'The box the player types the word in.', show: 'quiz-review', selector: '.quiz .gap', can: ['color', 'weight', 'italic', ...BOX] },
  { id: 'quiz-hint', group: 'quiz', label: 'Missing-word quiz: hint bubble', hint: 'Click the light bulb in the preview to see it.', show: 'quiz-review', selector: '.quiz .tip', size: 'var', can: ['size', 'color', 'weight', 'italic', ...BOX] },
  { id: 'quiz-right', group: 'quiz', label: 'Row marked right', hint: 'After “Check answers”, rows that are correct.', show: 'quiz-preview', selector: '.quiz .row.ok', box: '.quiz .row.ok', text: '.quiz .row.ok .mark', can: ['background', 'color'] },
  { id: 'quiz-wrong', group: 'quiz', label: 'Row marked wrong', hint: 'After “Check answers”, rows that are not correct.', show: 'quiz-preview', selector: '.quiz .row.bad', box: '.quiz .row.bad', text: '.quiz .row.bad .mark', can: ['background', 'color'] },
  { id: 'quiz-score', group: 'quiz', label: 'Score', hint: 'The “3 / 5” after checking.', show: 'quiz-preview', selector: '.quiz .score', size: 'em', can: ['size', ...TEXT] },
  { id: 'quiz-check', group: 'quiz', label: '“Check answers” / “Next” button', hint: 'The green button at the bottom.', show: 'quiz-preview', selector: '.quiz .btn.go', guard: ':not(:hover):not(:disabled)', size: 'var', can: ['size', ...TEXT, ...BOX] },
];

const BY_ID = new Map(UI_ELEMENTS.map((e) => [e.id, e]));
export const uiElement = (id: string) => BY_ID.get(id);

/** The CSS variable a `size: 'var'` piece reads in its component. */
export const sizeVar = (id: string) => `--ui-${id}`;

export const SIZE_MIN = 40;
export const SIZE_MAX = 300;

const COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|transparent)$/i;
export const isColor = (value: unknown): value is string => typeof value === 'string' && COLOR.test(value);

const oneOf = <T extends string>(value: unknown, list: readonly T[]): value is T => typeof value === 'string' && (list as readonly string[]).includes(value);

/** Keeps only the settings a piece supports and that hold a safe value; the player trusts the result. */
export function cleanStyle(raw: unknown, can: readonly UiControl[]): UiStyle {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: UiStyle = {};
  const allow = (c: UiControl) => can.includes(c);
  if (allow('size') && typeof r.size === 'number' && Number.isFinite(r.size) && r.size !== 100) {
    out.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(r.size)));
  }
  if (allow('color') && isColor(r.color)) out.color = r.color;
  if (allow('background') && isColor(r.background)) out.background = r.background;
  if (allow('border') && isColor(r.border)) out.border = r.border;
  if (allow('weight') && oneOf(r.weight, ['bold', 'normal'])) out.weight = r.weight;
  if (allow('italic') && oneOf(r.italic, ['italic', 'normal'])) out.italic = r.italic;
  if (allow('caps') && oneOf(r.caps, ['upper', 'normal'])) out.caps = r.caps;
  if (allow('underline')) {
    if (oneOf(r.underline, UNDERLINES)) out.underline = r.underline;
    if (out.underline && out.underline !== 'none' && isColor(r.underlineColor)) out.underlineColor = r.underlineColor;
  }
  return out;
}

/** Every known piece with at least one setting; unknown ids and unsafe values are dropped. */
export function cleanUi(raw: unknown): Record<string, UiStyle> {
  const out: Record<string, UiStyle> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const element = BY_ID.get(id);
    if (!element) continue;
    const style = cleanStyle(value, element.can);
    if (Object.keys(style).length) out[id] = style;
  }
  return out;
}

/** For game files written by hand: the reasons a `ui` block would be (partly) ignored. */
export function validateUi(raw: unknown): string[] {
  if (raw === undefined) return [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['ui must be an object keyed by piece id'];
  const problems: string[] = [];
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const element = BY_ID.get(id);
    if (!element) {
      problems.push(`ui: unknown piece "${id}"`);
      continue;
    }
    const given = value && typeof value === 'object' ? Object.keys(value) : [];
    const kept = Object.keys(cleanStyle(value, element.can));
    for (const key of given) {
      if (!kept.includes(key) && key !== 'underlineColor') problems.push(`ui "${id}": "${key}" is not a valid setting for this piece`);
    }
  }
  return problems;
}

export const hasStyle = (style: UiStyle | undefined) => !!style && Object.keys(style).length > 0;

const scope = (selector: string, extra = '') =>
  selector
    .split(',')
    .map((part) => `.scene ${part.trim()}${extra}`)
    .join(', ');

/**
 * The game's font ships one weight, so "bold" thickens the strokes by hand (as the ending recap does),
 * and "not bold" has to cancel that.
 */
const BOLD = 'font-weight:800 !important;-webkit-text-stroke:.035em currentColor !important';
const NOT_BOLD = 'font-weight:400 !important;-webkit-text-stroke:0 !important';

/** The CSS for the saved choices. Empty when nothing is set. */
export function uiCss(raw: Record<string, UiStyle> | undefined): string {
  const ui = cleanUi(raw);
  const rules: string[] = [];
  const vars: string[] = [];

  for (const element of UI_ELEMENTS) {
    const style = ui[element.id];
    if (!style) continue;

    const text: string[] = [];
    if (style.size) {
      const k = Math.round(style.size * 10) / 1000;
      if (element.size === 'var') vars.push(`${sizeVar(element.id)}:${k}`);
      else text.push(`font-size:calc(1em * ${k}) !important`);
    }
    if (style.color) text.push(`color:${style.color} !important`);
    if (style.weight) text.push(style.weight === 'bold' ? BOLD : NOT_BOLD);
    if (style.italic) text.push(`font-style:${style.italic === 'italic' ? 'italic' : 'normal'} !important`);
    if (style.caps) text.push(`text-transform:${style.caps === 'upper' ? 'uppercase' : 'none'} !important`);
    if (style.underline) {
      if (style.underline === 'none') text.push('text-decoration-line:none !important');
      else {
        text.push('text-decoration-line:underline !important', `text-decoration-style:${style.underline} !important`);
        if (style.underlineColor) text.push(`text-decoration-color:${style.underlineColor} !important`);
      }
    }
    if (text.length) rules.push(`${scope(element.text ?? element.selector)}{${text.join(';')}}`);

    const box = element.box ?? element.selector;
    if (style.background) rules.push(`${scope(box, element.guard ?? '')}{background-color:${style.background} !important}`);
    if (style.border) rules.push(`${scope(box)}{border-color:${style.border} !important}`);
  }

  if (vars.length) rules.unshift(`.scene{${vars.join(';')}}`);
  return rules.join('\n');
}

// ---- which screen shows a piece in the preview ----

/** The parts of a screen the picker needs; a `SceneRow` fits. */
export interface ScreenLike {
  id: string;
  phase: string;
  text: string;
  next_key: string | null;
  choices: { proverb_id?: string }[];
  routes?: unknown[];
}

const SPECIAL = ['title', 'divider', 'preview', 'review', 'gameover'];
const isStory = (s: ScreenLike) => !SPECIAL.includes(s.phase) && !!s.text.trim() && !s.choices.length && !!s.next_key;
const isEnding = (s: ScreenLike) => !SPECIAL.includes(s.phase) && !s.next_key && !s.choices.length && !s.routes?.length;

/**
 * The first screen (in playing order) on which this kind of piece can be seen, if the game has one.
 * `linkTerms` are the hard words that get linked in story text, so a screen that has one can show a hover card.
 */
export function pickScreen<T extends ScreenLike>(kind: ShowKind, ordered: readonly T[], linkTerms: readonly string[] = []): T | undefined {
  const first = (test: (s: T) => boolean) => ordered.find(test);
  switch (kind) {
    case 'title':
      return first((s) => s.phase === 'title');
    case 'divider':
      return first((s) => s.phase === 'divider');
    case 'hover':
    {
      const needles = linkTerms.map((t) => t.trim().toLowerCase()).filter(Boolean);
      const linked = (s: T) => s.text.includes('[[') || needles.some((n) => s.text.toLowerCase().includes(n));
      return first((s) => !SPECIAL.includes(s.phase) && linked(s)) ?? first(isStory);
    }
    case 'choices':
    case 'reveal':
      return first((s) => s.choices.some((c) => c.proverb_id)) ?? first((s) => s.choices.length > 0);
    case 'ending':
      return first(isEnding);
    case 'gameover':
      return first((s) => s.phase === 'gameover') ?? first(isEnding);
    case 'quiz-preview':
    case 'quiz-review':
      return first(isStory) ?? ordered[0];
    default:
      return first(isStory) ?? first((s) => !SPECIAL.includes(s.phase));
  }
}
