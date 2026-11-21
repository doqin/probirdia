<script lang="ts">
  import { onDestroy, onMount, setContext, untrack } from 'svelte';
  import { pick, type Game, type GlossaryEntry, type Lang } from '../lib/types';
  import { advance, choose, currentScene, isEnd, isValidState, recapOf, startState, type PlayState } from '../lib/engine';
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
  let simpleOpen = $state(false);

  const scene = $derived(currentScene(game, play));
  const view = $derived(resolveScene(game.presentation, scene.id));
  const ground = $derived(view.stage?.ground ?? 90);
  const noteProp = $derived(
    scene.note && view.noteOn ? view.props.find((p) => p.id === view.noteOn && p.def.text) : undefined,
  );
  const ended = $derived(isEnd(game, play));
  const revealed = $derived(play.reveal ? glossary[play.reveal.proverb] : undefined);
  /** The run split by verdict: proverbs taken well, and the ones to try again. */
  const recap = $derived(recapOf(play));
  const well = $derived(recap.well.map((slug) => glossary[slug]).filter(Boolean));
  const revisit = $derived(
    recap.revisit
      .map((p) => ({ picked: glossary[p.slug], intended: p.intended ? glossary[p.intended] : undefined }))
      .filter((p) => p.picked),
  );
  const hasGains = $derived(scene.gives.length > 0 || scene.status.length > 0);
  /** A choice screen is drawn as cards beside the character, not as dialogue. */
  const isChoice = $derived(!revealed && !ended && scene.choices.length > 0);
  /** The speech bubble hangs on the side where the speaker stands. */
  const speakerSide = $derived(
    view.characters.some((c) => c.slot === 'left')
      ? 'left'
      : view.characters.some((c) => c.slot === 'right')
        ? 'right'
        : 'center',
  );
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

  // a new scene starts with the poem in its original wording
  $effect(() => {
    scene.id;
    simpleOpen = false;
  });

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
    class:clickable={!isChoice && !revealed && !ended}
    style:background-image={view.stage ? `url(${withBase(view.stage.background)})` : undefined}
    role={view.stage?.alt ? 'img' : undefined}
    aria-label={view.stage?.alt}
    onclick={() => {
      if (!isChoice && !revealed && !ended) play = advance(play, game);
    }}
  >
    {#each view.props as p (p.id)}
      <div
        class="prop"
        style="left:{p.def.x}%; top:{p.def.y}%; width:{p.def.width}%{p.def.height ? `; aspect-ratio: ${(p.def.width * 16) / (p.def.height * 9)}` : ''}{p.def.rotate ? `; transform: translate(-50%, -50%) rotate(${p.def.rotate}deg)` : ''}"
      >
        <img class:stretch={!!p.def.height} src={withBase(p.def.image)} alt={p.def.alt ?? ''} />
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

  {#if isChoice}
    <div class="choice-panel">
      <ul class="choice-cards">
        {#each scene.choices as c, i}
          <li>
            <button class="btn choice" onclick={() => (play = choose(play, game, i))}>
              {c.proverb ? glossary[c.proverb].term : pick(c.label, lang)}
            </button>
          </li>
        {/each}
      </ul>
      {#if scene.text.en}<p class="choice-hint">{pick(scene.text, lang)}</p>{/if}
    </div>
  {:else}
    <div class="bubble {speakerSide}" class:center={speakerSide === 'center'}>
      {#if revealed}
        <div class="reveal-head">
          <h3 class="reveal-term">{revealed.term}</h3>
          {#if play.reveal}
            <span class="chip status" class:good={play.reveal.correct}>{play.reveal.correct ? t('fits', lang) : t('not_quite', lang)}</span>
          {/if}
        </div>

        {#if play.reveal?.why}
          <p class="why"><RichText text={pick(play.reveal.why, lang)} {glossary} {lang} /></p>
        {/if}
        {#if play.reveal?.intended && glossary[play.reveal.intended]}
          <p class="why"><strong>{t('called_for', lang)}:</strong> {glossary[play.reveal.intended].term}</p>
        {/if}

        <p class="text meaning">{pick(revealed.meaning, lang)}</p>
        {#if lang === 'en' && revealed.meaning.vi}
          <p class="aside"><span class="aside-tag">VI</span> {revealed.meaning.vi}</p>
        {/if}
        {#if revealed.example}
          <p class="aside example"><span class="aside-tag">{t('example', lang)}</span> {pick(revealed.example, lang)}</p>
        {/if}

        <button class="btn" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
      {:else}
        {#if scene.heading && !view.headingInArt}<span class="plate">{pick(scene.heading, lang)}</span>{/if}

        {#if scene.note && scene.noteSimple}
          <!-- the poem stays as it is (its hard words keep their popups); the button beneath opens the plain-words version -->
          <div class="note simple-capable" class:mobile-only={!!noteProp}>
            <RichText text={pick(scene.note, lang)} {glossary} {lang} />
            <div class="simple-wrap" class:open={simpleOpen}>
              <button type="button" class="simple-btn" aria-expanded={simpleOpen} onclick={() => (simpleOpen = !simpleOpen)}>
                {t('simple_hint', lang)}
              </button>
              <div class="simple-pop">
                <span class="simple-label">{t('simple_label', lang)}</span>
                <RichText text={pick(scene.noteSimple, lang)} {glossary} {lang} />
              </div>
            </div>
          </div>
        {:else if scene.note}
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

        {#if !ended}
          <button class="btn" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
        {/if}
      {/if}
    </div>
  {/if}
</section>

{#if ended && !revealed}
  <section class="finale">
    <h2 class="the-end">{t('the_end', lang)}</h2>
    {#if well.length}
      <h3>{t('recap_well', lang)}</h3>
      <ul class="recap">
        {#each well as e}<li><strong>{e.term}</strong>: {pick(e.meaning, lang)}</li>{/each}
      </ul>
    {/if}
    {#if revisit.length}
      <h3>{t('recap_revisit', lang)}</h3>
      <ul class="recap revisit">
        {#each revisit as m}
          <li>
            <strong>{m.picked.term}</strong>
            {#if m.intended} — {t('called_for', lang).toLowerCase()} <em>{m.intended.term}</em>{/if}
          </li>
        {/each}
      </ul>
    {/if}
    <button class="btn" onclick={restart}>{t('restart', lang)}</button>
  </section>
{/if}

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
  .prop img.stretch { height: 100%; object-fit: fill; }
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

  /* A speech bubble that hangs beside whoever is talking, as in the design. */
  .bubble {
    position: absolute;
    width: min(40rem, 46%);
    padding: 1rem 1.3rem 1.1rem;
    background: rgb(255 250 240 / .97);
    border: 3px solid #1a1208;
    border-radius: 1rem;
    box-shadow: 0 .35rem 0 rgb(26 18 8 / .25);
  }
  .bubble.left { left: 31%; top: 15%; }
  .bubble.right { right: 31%; top: 15%; }
  .bubble.center { left: 50%; bottom: 5%; transform: translateX(-50%); width: min(46rem, 62%); }
  .bubble::after {
    content: '';
    position: absolute;
    top: 2.1rem;
    border: 14px solid transparent;
  }
  .bubble.left::after { left: -25px; border-right-color: #1a1208; }
  .bubble.right::after { right: -25px; border-left-color: #1a1208; }

  .plate {
    position: absolute;
    top: -1.15rem;
    left: 1.1rem;
    padding: .1rem .7rem .16rem;
    background: var(--brown);
    border: 3px solid #1a1208;
    border-radius: .5rem;
    color: #fff6e6;
    font-size: .8rem;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .bubble.right .plate { left: auto; right: 1.1rem; }

  /* Reveal card: the verdict leads, the explanation follows, the glossary last. */
  .reveal-head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .35rem; }
  .reveal-term { margin: 0; font-size: 1.35rem; line-height: 1.2; text-transform: uppercase; letter-spacing: .02em; }
  .why { font-size: 1.05rem; line-height: 1.45; margin: .35rem 0; }
  .aside { font-size: 1rem; line-height: 1.45; margin: .2rem 0; color: #5a4630; }
  .aside.example { font-style: italic; }
  .aside-tag {
    display: inline-block;
    margin-right: .35rem;
    font-size: .7rem;
    font-weight: 700;
    font-style: normal;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--brown);
  }

  /* Choice screens: stacked cards beside the character, instruction underneath. */
  .choice-panel {
    position: absolute;
    left: 3.5%;
    top: 13%;
    width: 42%;
    display: grid;
    gap: .7rem;
  }
  .choice-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: .7rem; }
  .choice-cards .btn {
    width: 100%;
    padding: .85rem 1rem;
    font-size: 1rem;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: .03em;
    text-align: center;
    /* light cards with dark lettering, as in the storyboard */
    background: #f2ecdd;
    color: var(--ink);
    border: 3px solid #1a1208;
    border-radius: .9rem;
    box-shadow: 0 .25rem 0 rgb(26 18 8 / .55);
  }
  .choice-cards .btn:hover { background: var(--brown); color: #fff6e6; filter: none; }
  .choice-hint {
    margin: 0;
    justify-self: center;
    padding: .35rem .7rem;
    background: rgb(255 250 240 / .92);
    border: 2px solid #1a1208;
    border-radius: .6rem;
    text-align: center;
    font-size: .76rem;
    font-weight: 800;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: #1a1208;
  }

  .art.clickable { cursor: pointer; }

  /* The click-anywhere advance is the main control; the button stays for keyboards. */
  .bubble .btn {
    display: block;
    margin-left: auto;
    padding: .35rem 1rem;
    font-size: .82rem;
    letter-spacing: .06em;
    opacity: .9;
  }

  .text { font-size: 1.25rem; margin: .35rem 0 .8rem; }
  .meaning { font-style: italic; }
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
  .simple-capable { position: relative; }
  .simple-wrap { position: relative; margin-top: .5rem; }
  .simple-btn {
    font: inherit;
    font-size: .8rem;
    font-weight: 700;
    font-style: normal;
    padding: .1em .8em;
    border: 2px solid var(--brown);
    border-radius: 999px;
    background: #fffaf0;
    color: var(--brown);
    cursor: help;
  }
  .simple-btn:hover, .simple-wrap.open .simple-btn { background: var(--brown); color: #fff6e6; }
  .simple-pop {
    display: none;
    position: absolute;
    z-index: 5;
    top: 100%;
    left: 0;
    right: 0;
    padding: .7rem 1rem .8rem;
    background: #fffdf3;
    border: 2px solid var(--brown);
    border-radius: .5rem;
    box-shadow: 0 .4rem 1rem rgb(26 18 8 / .3);
    font-style: normal;
    text-align: center;
  }
  /* the wrap is the hover target, so the pointer can travel from the button into the popover */
  .simple-wrap:hover .simple-pop, .simple-btn:focus-visible + .simple-pop, .simple-wrap.open .simple-pop { display: block; }
  .simple-label {
    display: block;
    margin-bottom: .2rem;
    font-size: .75rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #7a5a1e;
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
  .finale {
    margin-top: .75rem;
    padding: 1rem 1.4rem 1.2rem;
    text-align: center;
    background: rgb(197 187 171 / .96);
    border: 2px solid rgb(26 18 8 / .6);
    border-radius: var(--radius);
  }
  .the-end { font-size: 2rem; text-transform: uppercase; }
  .recap { text-align: left; padding-left: 1.2rem; margin: 0 0 1rem; }

  .bar { display: flex; flex-wrap: wrap; gap: .5rem 1rem; justify-content: space-between; align-items: center; margin-top: .75rem; }
  .hud { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
  .startover { font-size: .9rem; }
  .bar :global(.btn.secondary) { font-size: .9rem; }
  .bar > :last-child { margin-left: auto; }

  /* Phones: the 16:9 artwork is too small to hold text, so the dialogue sits underneath it. */
  @media (max-width: 40rem) {
    .bubble, .choice-panel {
      position: static;
      width: auto;
      transform: none !important;
      margin-top: .75rem;
    }
    .bubble::after { display: none; }
    .plate { position: static; display: inline-block; margin-bottom: .4rem; }
    .prop-text { display: none; }
    .mobile-only { display: block; }
    .art-heading { font-size: 1.1rem; }
  }
</style>