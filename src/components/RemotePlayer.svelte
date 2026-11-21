<script lang="ts">
  import { onMount } from 'svelte';
  import Player from './Player.svelte';
  import { supabaseConfigured } from '../lib/supabase';
  import { fetchGameForPreview, fetchGlossary, fetchPublishedGame } from '../lib/remote';
  import type { Game, GlossaryEntry } from '../lib/types';

  /**
   * Plays a game straight from the content database, so a game published in the
   * editor is playable without rebuilding the site. The addresses are
   *   /play/?g=<slug>            published games, for players
   *   /play/?g=<slug>&draft=1    the draft, for an editor who is signed in
   */
  let game = $state<Game | null>(null);
  let glossary = $state<Record<string, GlossaryEntry>>({});
  let words = $state<GlossaryEntry[]>([]);
  let error = $state('');
  let loading = $state(true);
  let isDraft = $state(false);

  onMount(async () => {
    if (!supabaseConfigured) {
      error = 'The content database is not connected yet.';
      loading = false;
      return;
    }
    const params = new URL(location.href).searchParams;
    const slug = params.get('g') ?? '';
    const draft = params.get('draft') === '1';
    if (!slug) {
      error = 'No game chosen. Open a game from the games list.';
      loading = false;
      return;
    }
    try {
      const terms = await fetchGlossary();
      words = terms.words;
      glossary = Object.fromEntries(terms.proverbs.map((entry) => [entry.slug, entry]));

      if (draft) {
        const found = await fetchGameForPreview(slug);
        if (!found) {
          error = `There is no game called "${slug}".`;
        } else {
          game = found.game;
          isDraft = !found.published;
        }
      } else {
        const found = await fetchPublishedGame(slug);
        if (!found) {
          error = `There is no published game called "${slug}".`;
        } else {
          game = found;
        }
      }
    } catch (e) {
      const message = (e as Error).message ?? '';
      error = /failed to fetch|network/i.test(message)
        ? 'Could not reach the game server. Check your connection and try again.'
        : message;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p class="status">Loading the game…</p>
{:else if error}
  <p class="status error">{error}</p>
{:else if game}
  {#if isDraft}
    <p class="status draft">Draft preview — players cannot see this game until you publish it.</p>
  {/if}
  <h1 class="page-title">{game.title.en}</h1>
  {#key game.slug}
    <Player {game} {glossary} {words} lang="en" />
  {/key}
{/if}

<style>
  .status { max-width: 34rem; margin: 2rem auto; text-align: center; }
  .error { color: var(--danger); font-weight: 600; }
  .draft { margin-bottom: .5rem; padding: .5rem .8rem; border-radius: .5rem; background: #ffe08a; color: var(--ink); font-weight: 600; }
</style>
