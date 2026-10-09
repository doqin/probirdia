<script lang="ts">
  import { getContext } from 'svelte';
  import { parseMarkup } from '../lib/markup';
  import { linkWords, type WordMatcher } from '../lib/words';
  import type { GlossaryEntry, Lang } from '../lib/types';
  import Term from './Term.svelte';

  let {
    text,
    glossary,
    lang = 'en',
  }: { text: string; glossary: Record<string, GlossaryEntry>; lang?: Lang } = $props();

  /** Hard words are shared by the whole player through context, so every text block gets them for free. */
  const vocab = getContext<{ matcher: WordMatcher; map: Record<string, GlossaryEntry> } | undefined>('vocab');

  const segments = $derived(vocab ? linkWords(parseMarkup(text), vocab.matcher) : parseMarkup(text));
</script>

{#each segments as seg}{#if seg.kind === 'text'}{seg.value}{:else if seg.kind === 'proverb'}{#if glossary[seg.slug]}<Term display={seg.display} entry={glossary[seg.slug]} {lang} />{:else}{seg.display}{/if}{:else if vocab?.map[seg.slug]}<Term display={seg.display} entry={vocab.map[seg.slug]} {lang} />{:else}{seg.display}{/if}{/each}