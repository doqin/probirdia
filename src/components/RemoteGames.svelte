<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPublishedGames } from '../lib/remote';
  import type { Game } from '../lib/types';
  import { withBase } from '../lib/url';

  /** Slugs of the spreadsheet games already on the page, so a game that exists in both places shows once. */
  let { skip = [] }: { skip?: string[] } = $props();

  /** Games published from the content studio. Rendered after the spreadsheet games. */
  let games = $state<Game[]>([]);
  let failed = $state(false);
  let loaded = $state(false);

  onMount(async () => {
    try {
      games = (await fetchPublishedGames()).filter((game) => !skip.includes(game.slug));
    } catch {
      failed = true;
    } finally {
      loaded = true;
    }
  });
</script>

{#if games.length}
  {#each games as game (game.slug)}
    <li>
      <a
        class="card landscape"
        href={withBase(`/play/?g=${game.slug}`)}
        style={game.thumbnail ? `background-image: url(${withBase(game.thumbnail)})` : undefined}
      >
        <span class="pill name">{game.title.en}</span>
        <span class="pill play">Play</span>
      </a>
    </li>
  {/each}
{:else if failed}
  <li class="notice">Could not load the online games right now.</li>
{:else if loaded && !skip.length}
  <li class="notice">No games are published yet.</li>
{/if}

<style>
  .card { position: relative; display: block; aspect-ratio: 16 / 10; text-align: center; text-decoration: none; overflow: hidden; border-radius: .4rem; background: var(--parchment); }
  .name { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%); font-size: 1.4rem; white-space: nowrap; max-width: 92%; overflow: hidden; text-overflow: ellipsis; }
  .play { position: absolute; left: 50%; bottom: .6rem; transform: translateX(-50%); }
  .card:hover .name, .card:focus-visible .name { filter: brightness(1.08); }
  .card:hover .play { background: var(--brown); color: #fff6e6; }
  .notice { font-size: .9rem; opacity: .75; }
</style>
