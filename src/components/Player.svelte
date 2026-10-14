<script lang="ts">
  import { onDestroy, onMount, setContext, untrack } from 'svelte';
  import { pick, type Game, type GlossaryEntry, type Lang } from '../lib/types';
  import { advance, choose, currentScene, isEnd, isValidState, startState, type PlayState } from '../lib/engine';
  import { SLOT_X, resolveScene } from '../lib/presentation';
  import { t } from '../i18n/ui';
  import { withBase } from '../lib/url';
  import { buildMatcher } from '../lib/words';
  import RichText from './RichText.svelte';


  let {
    game,
    glossary,
    words = [],
    lang = 'en',
  }: { game: Game; glossary: Record<string, GlossaryEntry>; words?: GlossaryEntry[]; lang?: Lang } = $props();

  // Hard words are linked automatically in every text block (see RichText).
  setContext('vocab', untrack(() => ({
    matcher: buildMatcher(words),
    map: Object.fromEntries(words.map((w) => [w.slug, w])),
  })));

  const storageKey = `probirdia:v1:${untrack(() => game.slug)}`;

  let play = $state<PlayState>(startState(untrack(() => game)));
  let loaded = $state(false);

  const scene = $derived(currentScene(game, play));
  const view = $derived(resolveScene(game.presentation, scene.id));
  const ground = $derived(view.stage?.ground ?? 90);
  const noteProp = $derived(
    scene.note && view.noteOn ? view.props.find((p) => p.id === view.noteOn && p.def.text) : undefined,
  );
  const ended = $derived(isEnd(game, play));
  const revealed = $derived(play.reveal ? glossary[play.reveal.proverb] : undefined);
  const recap = $derived([...new Set(play.chosen)].map((slug) => glossary[slug]).filter(Boolean));
  const hasGains = $derived(scene.gives.length > 0 || scene.status.length > 0);
  const isGood = (s: string) => game.positiveStatus.some((g) => g.toLowerCase() === s.toLowerCase());
  const itemImage = (name: string) => {
    const image = game.presentation?.items[name]?.image;
    return image ? withBase(image) : undefined;
  };

  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (isValidState(game, saved)) play = saved;
    } catch {
      /* private mode or corrupt save: just start fresh */
    }
    loaded = true;
  });

  $effect(() => {
    const snapshot = $state.snapshot(play);
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      /* saving is best-effort */
    }
  });

  const restart = () => (play = startState(game));

  // ---- music: starts after the first click (browsers block autoplay), can be muted ----
  const musicDefs = untrack(() => game.presentation?.music);
  const mutedKey = 'probirdia:muted';
  let started = $state(false);
  let muted = $state(false);
  let track: { key: string; el: HTMLAudioElement } | null = null;
  let lastRevealed: string | null = null;

  onMount(() => {
    try {
      muted = localStorage.getItem(mutedKey) === '1';
    } catch {
      /* ignore */
    }
  });

  const toggleMusic = () => {
    muted = !muted;
    try {
      localStorage.setItem(mutedKey, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const BGM_VOLUME = 0.6;
  const DUCKED_VOLUME = 0.12;
  let fade: ReturnType<typeof setInterval> | undefined;

  /** Quiets the background music while a sting plays, then fades it back up. */
  const duckTrack = (down: boolean) => {
    clearInterval(fade);
    const from = track?.el.volume ?? BGM_VOLUME;
    const target = down ? DUCKED_VOLUME : BGM_VOLUME;
    const t0 = performance.now();
    const duration = down ? 150 : 1200;
    fade = setInterval(() => {
      const el = track?.el;
      const t = Math.min(1, (performance.now() - t0) / duration);
      if (el) el.volume = from + (target - from) * t;
      if (!el || t >= 1) clearInterval(fade);
    }, 50);
  };

  const stopTrack = () => {
    track?.el.pause();
    track = null;
  };

  $effect(() => {
    const key = view.music;
    const def = key ? musicDefs?.[key] : undefined;
    if (!started || muted || !key || !def) return stopTrack();
    if (track?.key === key) {
      if (track.el.paused && !track.el.ended) track.el.play().catch(() => {});
      return;
    }
    stopTrack();
    const el = new Audio(withBase(def.file));
    el.loop = !!def.loop;
    el.volume = BGM_VOLUME;
    track = { key, el };
    el.play().catch(() => {});
  });

  $effect(() => {
    const proverb = play.reveal?.proverb ?? null;
    const sting = game.presentation?.proverbSting;
    if (proverb && proverb !== lastRevealed && started && !muted && sting && musicDefs?.[sting]) {
      const el = new Audio(withBase(musicDefs[sting].file));
      el.volume = 0.8;
      duckTrack(true);
      const restore = () => duckTrack(false);
      el.addEventListener('ended', restore, { once: true });
      el.addEventListener('error', restore, { once: true });
      el.play().catch(restore);
    }
    lastRevealed = proverb;
  });

  onDestroy(() => {
    clearInterval(fade);
    stopTrack();
  });
</script>

<svelte:window onpointerdown={() => (started = true)} />

<section class="scene" aria-live="polite">
  <div
    class="art"
    class:landscape={!view.stage}
    style:background-image={view.stage ? `url(${withBase(view.stage.background)})` : undefined}
    role={view.stage?.alt ? 'img' : undefined}
    aria-label={view.stage?.alt}
  >
    {#each view.props as p (p.id)}
      <div
        class="prop"
        style="left:{p.def.x}%; top:{p.def.y}%; width:{p.def.width}%{p.def.rotate ? `; transform: translate(-50%, -50%) rotate(${p.def.rotate}deg)` : ''}"
      >
        <img src={withBase(p.def.image)} alt={p.def.alt ?? ''} />
        {#if p.def.label}
          <div class="prop-label" style="font-size:{p.def.labelSize ?? 1.5}cqw">{p.def.label}</div>
        {/if}
        {#if noteProp?.id === p.id && p.def.text}
          <div
            class="prop-text"
            style="left:{p.def.text.x}%; top:{p.def.text.y}%; width:{p.def.text.width}%; height:{p.def.text.height}%"
          >
            <RichText text={pick(scene.note, lang)} {glossary} {lang} />
          </div>
        {/if}
      </div>
    {/each}

    {#each view.characters as c (c.slot)}
      <img
        class="char"
        src={withBase(c.def.image)}
        alt={c.def.alt ?? ''}
        style="left:{SLOT_X[c.slot]}%; top:{ground}%; width:{c.def.width}%"
      />
    {/each}

    {#if view.headingInArt && scene.heading && !revealed}
      <h2 class="art-heading">{pick(scene.heading, lang)}</h2>
    {/if}
  </div>

  <div class="dialogue {view.dialogue}">
    {#if revealed}
      <div class="reveal">
        <h2>{revealed.term}</h2>
        <p>{pick(revealed.meaning, lang)}</p>
        <button class="btn" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
      </div>
    {:else}
      {#if scene.heading && !view.headingInArt}<h2 class="heading">{pick(scene.heading, lang)}</h2>{/if}

      {#if scene.note}
        <blockquote class="note" class:mobile-only={!!noteProp}>
          <RichText text={pick(scene.note, lang)} {glossary} {lang} />
        </blockquote>
      {/if}

      <p class="text"><RichText text={pick(scene.text, lang)} {glossary} {lang} /></p>

      {#if hasGains}
        <div class="gains">
          <strong>{t('you_got', lang)}:</strong>
          {#each scene.gives as item}
            {#if itemImage(item)}
              <figure class="item"><img src={itemImage(item)} alt="" /><figcaption>{item}</figcaption></figure>
            {:else}
              <span class="chip">{item}</span>
            {/if}
          {/each}
          {#each scene.status as s}<span class="chip status" class:good={isGood(s)}>{s}</span>{/each}
        </div>
      {/if}

      {#if scene.choices.length}
        <ul class="choices">
          {#each scene.choices as c, i}
            <li>
              <button class="btn choice" onclick={() => (play = choose(play, game, i))}>
                {c.proverb ? glossary[c.proverb].term : pick(c.label, lang)}
              </button>
            </li>
          {/each}
        </ul>
      {:else if ended}
        <h2 class="the-end">{t('the_end', lang)}</h2>
        {#if recap.length}
          <h3>{t('recap', lang)}</h3>
          <ul class="recap">
            {#each recap as e}<li><strong>{e.term}</strong>: {pick(e.meaning, lang)}</li>{/each}
          </ul>
        {/if}
        <button class="btn" onclick={restart}>{t('restart', lang)}</button>
      {:else}
        <button class="btn" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
      {/if}
    {/if}
  </div>
</section>

<div class="bar">
  {#if play.items.length || play.status.length}
    <ul class="hud" aria-label={t('inventory', lang)}>
      {#each play.items as item}<li>{item}</li>{/each}
      {#each play.status as s}<li class="status" class:good={isGood(s)}>{s}</li>{/each}
    </ul>
  {/if}
  {#if musicDefs}
    <button class="btn secondary" onclick={toggleMusic} aria-pressed={!muted}>{muted ? t('music_off', lang) : t('music_on', lang)}</button>
  {/if}
  {#if !ended}
    <button class="btn secondary startover" onclick={restart}>{t('start_over', lang)}</button>
  {/if}
</div>

<style>
  .scene { position: relative; }

  /* The artwork is always 16:9; everything inside is positioned in % of it. */
  .art {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--radius);
    background-size: cover;
    background-position: center;
    container-type: inline-size;
  }
  .char, .prop { position: absolute; transform: translate(-50%, -100%); }
  .char, .prop img { display: block; width: 100%; height: auto; }
  .prop-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding-bottom: 12%;
    text-align: center;
    font-weight: 800;
    line-height: 1.1;
    white-space: pre-line;
    color: var(--ink);
  }
  .prop-text {
    position: absolute;
    display: grid;
    place-items: center;
    text-align: center;
    font-weight: 700;
    font-size: 1.7cqw;
    line-height: 1.25;
    white-space: pre-line;
    color: var(--ink);
    overflow: visible;
  }
  .art-heading {
    position: absolute;
    left: 40%;
    top: 45%;
    margin: 0;
    font-size: 3.4cqw;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #c4631f;
    text-shadow: 0 0 .3em #fff6e6;
  }

  .dialogue {
    position: absolute;
    left: 50%;
    width: min(46rem, 66%);
    transform: translateX(-50%);
    background: rgb(197 187 171 / .96);
    border: 2px solid rgb(26 18 8 / .6);
    border-radius: var(--radius);
    padding: 1rem 1.4rem 1.2rem;
    text-align: center;
  }
  .dialogue.top { top: 4%; }
  .dialogue.center { top: 50%; transform: translate(-50%, -50%); }
  .dialogue.bottom { bottom: 4%; }

  .heading { text-transform: uppercase; letter-spacing: .06em; font-size: 1.2rem; }
  .text { font-size: 1.3rem; margin: .4rem 0 .8rem; }
  .note {
    margin: 0 auto .8rem;
    max-width: 28rem;
    padding: .7rem 1.1rem;
    background: #f6e9cc;
    border: 1px solid #b89c66;
    border-radius: .5rem;
    font-style: italic;
    white-space: pre-line;
  }
  .mobile-only { display: none; }
  .gains { margin: 0 0 .8rem; display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; align-items: center; }
  .chip, .hud li {
    display: inline-block;
    padding: .1em .8em;
    border-radius: 999px;
    background: #fffaf0;
    border: 2px solid var(--brown);
    font-size: .95rem;
    font-weight: 600;
  }
  .status { border-color: var(--danger) !important; color: var(--danger); }
  .status.good { border-color: #2f7d3a !important; color: #2f7d3a; }
  .item { margin: 0; display: grid; justify-items: center; gap: .15rem; font-weight: 600; }
  .item img { width: 4.5rem; height: auto; }
  .choices { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; }
  .choice { text-transform: none; font-size: 1.1rem; border-radius: 1rem; }
  .reveal h2 { font-size: 1.6rem; }

  .the-end { font-size: 2rem; text-transform: uppercase; }
  .recap { text-align: left; padding-left: 1.2rem; margin: 0 0 1rem; }

  .bar { display: flex; flex-wrap: wrap; gap: .5rem 1rem; justify-content: space-between; align-items: center; margin-top: .75rem; }
  .hud { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
  .startover { font-size: .9rem; }
  .bar :global(.btn.secondary) { font-size: .9rem; }
  .bar > :last-child { margin-left: auto; }

  /* Phones: the 16:9 artwork is too small to hold text, so the dialogue sits underneath it. */
  @media (max-width: 40rem) {
    .dialogue { position: static; width: auto; transform: none !important; margin-top: .75rem; }
    .prop-text { display: none; }
    .mobile-only { display: block; }
    .art-heading { font-size: 1.1rem; }
  }
</style>