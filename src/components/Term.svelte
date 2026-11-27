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
  /** Height the popup may use when neither side of the word has room for all of it. */
  let room = $state<number | undefined>(undefined);
  const open = $derived(hovered || pinned);
  const anchor = $derived(withBase(`/glossary/#${entry.kind === 'word' ? 'word-' : ''}${entry.slug}`));

  /** The visible box the popup must stay inside: the viewport, narrowed by every clipping ancestor (like the game stage). */
  function visibleBox(el: HTMLElement) {
    let top = 0;
    let left = 0;
    let right = window.innerWidth;
    let bottom = window.innerHeight;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(hidden|clip|auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY)) {
        const r = node.getBoundingClientRect();
        top = Math.max(top, r.top);
        left = Math.max(left, r.left);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    return { top, left, right, bottom };
  }

  // Keep the popup inside what the player can actually see: slide sideways at the edges and open
  // upwards when there is more room above the word than below it.
  $effect(() => {
    if (!open || !pop) return;
    const margin = 8;
    const box = visibleBox(wrap);
    const r = pop.getBoundingClientRect();
    const left = r.left - shift;
    const right = r.right - shift;
    let next = 0;
    if (left < box.left + margin) next = box.left + margin - left;
    else if (right > box.right - margin) next = box.right - margin - right;
    if (next !== shift) shift = next;

    const w = wrap.getBoundingClientRect();
    const below = box.bottom - w.bottom;
    const above = w.top - box.top;
    // measure the card's full height, so a squeezed popup does not shrink its own estimate
    const full = (pop.querySelector('.card')?.scrollHeight ?? pop.offsetHeight) + 8;
    const needed = full + margin;
    flip = below < needed && above > below;
    const available = (flip ? above : below) - margin;
    room = needed > (flip ? above : below) ? Math.max(available - 8, 96) : undefined;
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
    <span class="pop" class:up={flip} role="tooltip" {id} bind:this={pop} style:--shift="{shift}px" style:--room={room !== undefined ? `${room}px` : undefined}>
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
    max-height: var(--room, none);
    overflow-y: auto;
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