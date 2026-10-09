import { ContentError, loadAllGames, loadGlossary, loadWords } from '../src/lib/content';

try {
  const glossary = loadGlossary();
  const words = loadWords();
  const games = loadAllGames(glossary);
  console.log(
    `OK: ${glossary.length} proverbs, ${words.length} hard words, ${games.length} game(s): ${games.map((g) => g.slug).join(', ')}`,
  );
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}