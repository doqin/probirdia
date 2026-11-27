import type { GameFont } from './types';

export const FONT_CHOICES = ['default', 'zilla', 'serif', 'sans', 'mono', 'custom'] as const;
export type FontChoice = (typeof FONT_CHOICES)[number];

export const FONT_LABELS: Record<FontChoice, string> = {
  default: 'Partita 1990 (the game font)',
  zilla: 'Zilla Slab (the website font)',
  serif: 'Classic serif',
  sans: 'Clean sans-serif',
  mono: 'Typewriter / monospace',
  custom: 'My own font file…',
};

/** The CSS family the player registers for an uploaded font. */
export const CUSTOM_FAMILY = 'Probirdia Custom';

const FALLBACK = "'Partita 1990', 'Zilla Slab', system-ui, sans-serif";

const STACKS: Record<Exclude<FontChoice, 'default' | 'custom'>, string> = {
  zilla: "'Zilla Slab', Rockwell, Georgia, serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  sans: "system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace",
};

/** The font-family value for the game's text, or undefined when the game keeps the default face. */
export function fontStack(font: GameFont | undefined): string | undefined {
  if (!font || font.family === 'default') return undefined;
  if (font.family === 'custom') return font.url ? `'${CUSTOM_FAMILY}', ${FALLBACK}` : undefined;
  return STACKS[font.family];
}
