<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { pick, type GlossaryEntry, type Lang } from '../lib/types';
  import { t } from '../i18n/ui';

  let {
    entries,
    words = [],
    lang = 'en',
  }: { entries: GlossaryEntry[]; words?: GlossaryEntry[]; lang?: Lang } = $props();

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  let tab = $state<'proverbs' | 'words'>('proverbs');
  let query = $state('');

  const current = $derived(tab === 'proverbs' ? entries : words);
  const idOf = (e: GlossaryEntry) => (e.kind === 'word' ? `word-${e.slug}` : e.slug);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return current;
    return current.filter(
      (e) => e.term.toLowerCase().includes(q) || pick(e.meaning, lang).toLowerCase().includes(q),
    );
  });

  const groups = $derived.by(() => {
    const map = new Map<string, GlossaryEntry[]>();
    for (const e of filtered) map.set(e.letter, [...(map.get(e.letter) ?? []), e]);
    return [...map.entries()];
  });
  const present = $derived(new Set(groups.map(([letter]) => letter)));

  // Links from a word popup arrive as /glossary/#word-<slug>.
  onMount(async () => {
    const hash = location.hash.slice(1);
    if (hash.startsWith('word-')) {
      tab = 'words';
      await tick();
      history.replaceState(null, '', location.pathname);
      location.hash = hash; // re-apply so the entry is scrolled to and highlighted
    }
  });
</script>

<h1 class="page-title">{t('glossary.title', lang)}</h1>

{#if words.length}
  <div class="tabs" role="group" aria-label={t('glossary.title', lang)}>
    <button class="btn" class:secondary={tab !== 'proverbs'} aria-pressed={tab === 'proverbs'} onclick={() => (tab = 'proverbs')}>
      {t('tab.proverbs', lang)}
    </button>
    <button class="btn" class:secondary={tab !== 'words'} aria-pressed={tab === 'words'} onclick={() => (tab = 'words')}>
      {t('tab.words', lang)}
    </button>
  </div>
{/if}

<div class="search">
  <label class="visually-hidden" for="glossary-search">{t('glossary.search', lang)}</label>
  <input id="glossary-search" type="search" placeholder={t('glossary.search', lang)} bind:value={query} />
</div>

<nav class="alphabet" aria-label="Jump to letter">
  {#each ALPHABET as letter}
    {#if present.has(letter)}
      <a href={`#letter-${letter}`}>{letter}</a>
    {:else}
      <span aria-hidden="true">{letter}</span>
    {/if}
  {/each}
</nav>

{#each groups as [letter, items] (letter)}
  <section>
    <h2 id={`letter-${letter}`}>{letter}</h2>
    <ul>
      {#each items as e (idOf(e))}
        <li id={idOf(e)}>
          <h3>{e.term}</h3>
          <p>{pick(e.meaning, lang)}</p>
          {#if e.example}<p class="example">{pick(e.example, lang)}</p>{/if}
        </li>
      {/each}
    </ul>
  </section>
{:else}
  <p class="empty">{t('glossary.empty', lang)}</p>
{/each}

<style>
  .tabs { display: flex; gap: .5rem; justify-content: center; margin-bottom: 1rem; }
  .search input {
    width: 100%;
    font: inherit;
    font-weight: 600;
    padding: .6rem 1.2rem;
    border: 0;
    border-radius: 999px;
    background: var(--pill);
    color: var(--ink);
  }
  .search input::placeholder { color: #fff; text-transform: uppercase; }
  .alphabet {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .15rem .9rem;
    margin: 1.5rem 0 2rem;
    padding: .5rem 1rem;
    border-radius: 999px;
    background: #fff;
    font-weight: 700;
  }
  .alphabet span { opacity: .3; }
  .alphabet a { text-decoration: none; }
  .alphabet a:hover { text-decoration: underline; }
  h2 { font-size: 2rem; border-bottom: 2px solid var(--ink); scroll-margin-top: 1rem; }
  ul { list-style: none; padding: 0; margin: 0 0 2rem; display: grid; gap: 1rem 3rem; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
  li { scroll-margin-top: 1rem; padding: .3rem .5rem; border-radius: .5rem; }
  li:target { background: rgb(122 85 56 / .18); }
  h3 { font-size: 1.25rem; text-transform: uppercase; margin-bottom: .1rem; }
  p { margin: 0; }
  .example { font-style: italic; color: #5a4630; margin-top: .25rem; }
  .empty { text-align: center; }
</style>