<script lang="ts">
  import { pick, type GlossaryEntry, type Lang } from '../lib/types';
  import { t } from '../i18n/ui';
  import { withBase } from '../lib/url';

  let {
    display,
    entry,
    lang = 'en',
  }: { display: string; entry: GlossaryEntry; lang?: Lang } = $props();

  const id = $props.id();
  let wrap: HTMLElement;
  let pop = $state<HTMLElement>();
  let hovered = $state(false);
  let pinned = $state(false);
  let shift = $state(0);
  let flip = $state(false);
  const open = $derived(hovered || pinned);
  const anchor = $derived(withBase(`/glossary/#${entry.kind === 'word' ? 'word-' : ''}${entry.slug}`));

  // Keep the popup inside the viewport: slide sideways on narrow screens, open upwards near the bottom.
  $effect(() => {
    if (!open || !pop) return;
    const margin = 8;
    const r = pop.getBoundingClientRect();
    const left = r.left - shift;
    const right = r.right - shift;
    let next = 0;
    if (left < margin) next = margin - left;
    else if (right > window.innerWidth - margin) next = window.innerWidth - margin - right;
    if (next !== shift) shift = next;

    const w = wrap.getBoundingClientRect();
    const below = window.innerHeight - w.bottom;
    const needed = pop.offsetHeight + margin;
    flip = below < needed && w.top > below;
  });

  function close() {
    hovered = false;
    pinned = false;
  }
</script>

<svelte:window
  onclick={(e) => {
    if (open && !wrap.contains(e.target as Node)) close();
  }}
/>

<span
  class="wrap"
  bind:this={wrap}
  role="presentation"
  onpointerenter={(e) => { if (e.pointerType === 'mouse') hovered = true; }}
  onpointerleave={() => (hovered = false)}
  onkeydown={(e) => { if (e.key === 'Escape') close(); }}
>
  <button
    type="button"
    class="term {entry.kind}"
    aria-expanded={open}
    aria-describedby={open ? id : undefined}
    onclick={() => (pinned = !pinned)}
    onfocus={(e) => { if (e.currentTarget.matches(':focus-visible')) pinned = true; }}
    onblur={() => (pinned = false)}
  >{display}</button>

  {#if open}
    <span class="pop" class:up={flip} role="tooltip" {id} bind:this={pop} style:--shift="{shift}px">
      <span class="card">
        <strong>{entry.term}</strong>
        <span class="meaning">{pick(entry.meaning, lang)}</span>
        {#if entry.example}<em class="example">{pick(entry.example, lang)}</em>{/if}
        <a href={anchor} target="_blank" rel="noopener">{t('see_glossary', lang)}</a>
      </span>
    </span>
  {/if}
</span>

<style>
  .wrap { position: relative; display: inline; }


  .term {
    font: inherit;
    color: inherit;
    border: 0;
    padding: 0;
    cursor: help;
    text-decoration: underline dotted var(--brown);
    text-decoration-thickness: .12em;
    text-underline-offset: .2em;
    background: none;
  }
  .term.proverb { background: rgb(122 85 56 / .12); border-radius: .2em; }



  .pop {
    position: absolute;
    z-index: 20;
    top: 100%;
    left: 50%;
    width: min(21rem, calc(100vw - 2rem));
    transform: translateX(calc(-50% + var(--shift, 0px)));
    padding-top: .4rem;
    font-size: 1rem;
    line-height: 1.4;
    text-align: left;
    font-style: normal;
    font-weight: 400;
    text-transform: none;
  }
  .pop.up { top: auto; bottom: 100%; padding-top: 0; padding-bottom: .4rem; }
  .card {
    display: block;
    padding: .8rem 1rem;
    border-radius: .8rem;
    background: #fffaf0;
    color: var(--ink);
    border: 2px solid var(--brown);
    box-shadow: 0 .4rem 1rem rgb(0 0 0 / .2);
  }
  .card > * { display: block; }
  .meaning { margin: .25rem 0; }
  .example { color: #5a4630; margin-bottom: .35rem; }
  a { color: var(--brown); font-weight: 600; }
</style>