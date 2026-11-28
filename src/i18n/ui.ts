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
    'simple_hint': 'Simple words',
    'simple_label': 'In simple words',
    'music_on': 'Music: on',
    'music_off': 'Music: off',
    'the_end': 'The End',
    'preview_title': 'Proverbs preview',
    'review_title': 'Post-game review',
    'choose_definition': 'Choose the definition',
    'missing_word': 'Missing word of proverb',
    'hint': 'Hint',
    'check_answers': 'Check answers',
    'review_redo': 'Try the missed ones again',
    'review_redo_note': 'until every answer is right',
    'redo_missed': 'Redo the missed ones',
    'start_story': 'Start the story',
    'finish_review': 'Done',
    'correct': 'Correct',
    'incorrect': 'Not quite',
    'review_proverbs': 'Review the proverbs',
    'try_again': 'Try again',
    'lives': 'Confidence',
    'proverb_you_used_well': 'Proverb you used well',
    'proverbs_you_got_wrong': 'Proverbs you got wrong',
    'nothing_yet': 'None yet',
    'recap': 'Proverbs you met on this journey',
    'recap_well': 'Proverbs you used well',
    'recap_revisit': 'Proverbs to try again',
    'fits': 'That fits',
    'not_quite': 'Not quite',
    'called_for': 'The situation called for',
    'what_advice': 'What advice do you give?',
    'glossary.title': 'Glossary',
    'glossary.search': 'Search proverbs…',
    'glossary.empty': 'No proverbs match your search.',
    'meaning': 'Meaning',
    'example': 'Example',
    'see_glossary': 'See in glossary',

    'tab.proverbs': 'Proverbs',
    'tab.words': 'Words',
  },
  vi: {} as Record<string, string>,
} satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof (typeof ui)['en'];

export function t(key: UiKey, lang: Lang = 'en'): string {
  return ui[lang][key] ?? ui.en[key];
}
