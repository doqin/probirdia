<script lang="ts">
  import Player from './Player.svelte';
  import { toGame, toGlossary, slugById, type EditorData, type ProverbRow, type SceneRow } from '../lib/remote';
  import { emptyPresentation, withSceneLook, type SceneLook } from '../lib/look';
  import type { GlossaryEntry, Lang, UiStyle } from '../lib/types';

  /**
   * The editor's live stage: the selected screen drawn by the real player, from the screen's
   * unsaved edits, so what you see is what the game will show once you press Save.
   */
  let {
    data,
    sceneId,
    draft = null,
    words = [],
    lang = 'en',
    ui,
    show = 'story',
  }: {
    data: EditorData;
    sceneId: string;
    /** The screen as it is being edited (not saved yet). */
    draft?: { row: SceneRow; look: SceneLook } | null;
    words?: ProverbRow[];
    lang?: Lang;
    /** Interface styles that are being edited and not saved yet; replaces the saved ones. */
    ui?: Record<string, UiStyle>;
    /** Which part of the player to hold on screen (the Style tab shows quizzes, verdicts, the ending). */
    show?: 'story' | 'reveal' | 'quiz-preview' | 'quiz-review' | 'ending' | 'gameover';
  } = $props();

  const live = $derived(draft && draft.row.id === sceneId ? draft : null);

  const built = $derived.by(() => {
    try {
      const scenes = data.scenes.map((s) => (live && s.id === live.row.id ? live.row : s));
      const target = scenes.find((s) => s.id === sceneId);
      if (!target) return { error: 'Pick a screen to see it here.' };
      const saved = data.game.presentation ?? emptyPresentation();
      const base = ui ? { ...saved, ui } : saved;
      const presentation = live ? withSceneLook(base, target.key, live.look) : base;
      const game = toGame({ ...data.game, presentation }, scenes, slugById(data.proverbs));
      return { game, key: target.key };
    } catch (e) {
      return { error: `This screen cannot be previewed yet: ${(e as Error).message}` };
    }
  });

  const glossary = $derived(
    Object.fromEntries(toGlossary(data.proverbs.filter((p) => p.kind === 'proverb')).map((e) => [e.slug, e])) as Record<string, GlossaryEntry>,
  );
  const wordEntries = $derived(toGlossary(words));
  /** The hard-word matcher is built once per player, so a changed list needs a fresh one. */
  const wordsSignature = $derived(wordEntries.map((w) => `${w.slug}:${w.meaning.en}:${(w.forms ?? []).join('|')}`).join(';'));
</script>

{#if 'error' in built}
  <p class="empty">{built.error}</p>
{:else}
  {#key `${data.game.id}|${wordsSignature}`}
    <Player game={built.game} {glossary} words={wordEntries} {lang} previewScene={built.key} previewShow={show} />
  {/key}
{/if}

<style>
  .empty { margin: 0; padding: 2rem 1rem; text-align: center; opacity: .8; aspect-ratio: 16 / 9; display: grid; place-items: center; }
</style>
