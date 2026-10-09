import type { Lang } from '../lib/types';

/** Interface strings. To add Vietnamese, fill in `vi` below; missing keys fall back to English. */
const ui = {
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.games': 'Games',
    'nav.glossary': 'Glossary',
    'tagline': 'Learning Proverbs Through Narrative-driven Games',
    'play': 'Play',
    'continue': 'Continue',
    'restart': 'Play again',
    'start_over': 'Start over',
    'you_got': 'You got',
    'inventory': 'Inventory',
    'the_end': 'The End',
    'recap': 'Proverbs you met on this journey',
    'what_advice': 'What advice do you give?',
    'glossary.title': 'Glossary',
    'glossary.search': 'Search proverbs…',
    'glossary.empty': 'No proverbs match your search.',
    'meaning': 'Meaning',
    'example': 'Example',
    'see_glossary': 'See in glossary',
    'show_meaning': 'Show meaning',
    'tab.proverbs': 'Proverbs',
    'tab.words': 'Words',
  },
  vi: {} as Record<string, string>,
} satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)['en'];

export function t(key: UiKey, lang: Lang = 'en'): string {
  return ui[lang][key] ?? ui.en[key];
}
