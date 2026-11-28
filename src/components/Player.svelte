<script lang="ts">
  import { onDestroy, onMount, setContext, untrack } from 'svelte';
  import { pick, type SfxName, type Game, type GlossaryEntry, type Lang } from '../lib/types';
  import {
    MAX_LIVES, advance, begin, choose, closeReview, currentScene, finishPreview, isEnd, isValidState,
    livesOf, openReview, recapOf, startState, type PlayState,
  } from '../lib/engine';
  import { taughtProverbs } from '../lib/review';
  import { typewriter } from '../lib/typewriter';
  import { SLOT_X, resolveScene } from '../lib/presentation';
  import { t } from '../i18n/ui';
  import { withBase } from '../lib/url';
  import { buildMatcher } from '../lib/words';
  import { CUSTOM_FAMILY, fontStack } from '../lib/fonts';
  import { assetUrls, preloadAssets } from '../lib/preload';
  import RichText from './RichText.svelte';
  import Quiz from './Quiz.svelte';


  let {
    game,
    glossary,
    words = [],
    lang = 'en',
    previewScene,
  }: {
    game: Game;
    glossary: Record<string, GlossaryEntry>;
    words?: GlossaryEntry[];
    lang?: Lang;
    /**
     * The editor's live preview: show this one screen as the player would see it, with no save
     * file, no sound, no site links and no way to wander off it (clicks leave it where it is).
     */
    previewScene?: string;
  } = $props();

  const embedded = $derived(previewScene !== undefined);
  const stateFor = (id: string): PlayState => ({ sceneId: id, items: [], status: [], chosen: [], picks: [], reveal: null, lives: MAX_LIVES });

  // Hard words are linked automatically in every text block (see RichText).
  setContext('vocab', untrack(() => ({
    matcher: buildMatcher(words),
    map: Object.fromEntries(words.map((w) => [w.slug, w])),
  })));

  // The game's text face, set in the editor; every font-size rule below is unaffected.
  const fontFamily = $derived(fontStack(game.presentation?.font));
  $effect(() => {
    const font = game.presentation?.font;
    if (font?.family !== 'custom' || !font.url) return;
    const face = new FontFace(CUSTOM_FAMILY, `url(${font.url})`);
    face.load().then(() => document.fonts.add(face)).catch(() => {});
    return () => {
      document.fonts.delete(face);
    };
  });

  // Download every picture and sound up front, so a screen never waits on its own artwork.
  onMount(() =>
    untrack(() => previewScene) !== undefined ? undefined : preloadAssets(
      assetUrls(
        untrack(() => game.presentation),
        untrack(() => Object.values(game.scenes)),
        untrack(() => game.start),
      ),
      withBase,
    ),
  );

  const storageKey = `probirdia:v1:${untrack(() => game.slug)}`;

  let play = $state<PlayState>(untrack(() => (previewScene !== undefined ? stateFor(previewScene) : startState(game))));
  let loaded = $state(false);
  let simpleOpen = $state(false);

  // in the editor the selection decides the screen, so a rebuilt game never meets a stale save
  const scene = $derived(embedded ? game.scenes[previewScene as string] : currentScene(game, play));
  const view = $derived(resolveScene(game.presentation, scene.id));
  const ground = $derived(view.stage?.ground ?? 90);
  const noteProp = $derived(
    scene.note && view.noteOn ? view.props.find((p) => p.id === view.noteOn && p.def.text) : undefined,
  );
  const ended = $derived(isEnd(game, embedded ? stateFor(previewScene as string) : play));
  const revealed = $derived(play.reveal ? glossary[play.reveal.proverb] : undefined);
  /** The run split by verdict: proverbs taken well, and the ones to try again. */
  const recap = $derived(recapOf(play));
  const well = $derived(recap.well.map((slug) => glossary[slug]).filter(Boolean));
  const revisit = $derived(
    recap.revisit
      .map((p) => ({ picked: glossary[p.slug], intended: p.intended ? glossary[p.intended] : undefined }))
      .filter((p) => p.picked),
  );
  /** The proverbs this story teaches: the preview quiz before it and the review after it use them. */
  const taught = $derived(taughtProverbs(game, glossary));
  const lives = $derived(livesOf(play));
  const lost = $derived(!!play.lost);
  // typewriter: while a line is being printed, Continue first shows the rest of it
  let typing = $state(false);
  let finishTyping: (() => void) | null = null;
  const onTyping = (now: boolean, finish: () => void) => {
    typing = now;
    typingSound(now);
    finishTyping = now ? finish : null;
  };
  const next = () => {
    if (typing) finishTyping?.();
    else play = advance(play, game);
  };
  const hasGains = $derived(scene.gives.length > 0 || scene.status.length > 0);
  /** A choice screen is drawn as cards beside the character, not as dialogue. */
  const isChoice = $derived(!revealed && !ended && scene.choices.length > 0);
  /** The deck gives the opening and every chapter cut their own full-screen card. */
  const isTitle = $derived(scene.phase === 'title');
  const isDivider = $derived(scene.phase === 'divider');
  /** The speech bubble hangs on the side where the speaker stands. */
  const speakerSide = $derived(
    view.characters.some((c) => c.slot === 'left')
      ? 'left'
      : view.characters.some((c) => c.slot === 'right')
        ? 'right'
        : 'center',
  );
  const isGood = (s: string) => game.positiveStatus.some((g) => g.toLowerCase() === s.toLowerCase());
  /**
   * The speaking sprite stands in front of the box, so the text starts beyond its solid edge:
   * --inset is how far (in stage widths) the text is pushed in from the box's own edge.
   * The box spans 24.5%→95% for a left speaker and 3.5%→95% for a right one.
   */
  const inset = $derived.by(() => {
    const speaker = view.characters.find((c) => c.slot === speakerSide);
    const clear = speaker?.def.clear;
    if (clear === undefined || speakerSide === 'center') return undefined;
    const gap = 2;
    return speakerSide === 'left' ? Math.max(2.6, clear - 24.5 + gap) : Math.max(2.2, 95 - clear + gap);
  });
  const itemImage = (name: string) => {
    const image = game.presentation?.items[name]?.image;
    return image ? withBase(image) : undefined;
  };

  onMount(() => {
    if (untrack(() => previewScene) !== undefined) return;
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

  // Preview mode: follow the editor's selection, and snap back if a click tries to move on.
  $effect(() => {
    if (previewScene !== undefined && game) play = stateFor(previewScene);
  });
  $effect(() => {
    if (previewScene !== undefined && (play.sceneId !== previewScene || play.reveal || play.segment || play.lost)) {
      play = stateFor(previewScene);
    }
  });

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

  /** A short effect for the choice cards; plays over the music, and stays silent when muted or before the first click. */
  const playSfx = (name: SfxName) => {
    const key = game.presentation?.sfx?.[name];
    const def = key ? musicDefs?.[key] : undefined;
    if (!started || muted || !def) return;
    const el = new Audio(withBase(def.file));
    el.volume = name === 'hover' ? 0.35 : 0.7;
    el.play().catch(() => {});
  };

  // typing: one clip plays while a line is being printed and stops the moment it is done
  let typingEl: HTMLAudioElement | null = null;
  const typingSound = (on: boolean) => {
    if (!on) {
      typingEl?.pause();
      typingEl = null;
      return;
    }
    const key = game.presentation?.sfx?.typing;
    const def = key ? musicDefs?.[key] : undefined;
    if (!started || muted || !def || typingEl) return;
    typingEl = new Audio(withBase(def.file));
    typingEl.loop = true;
    typingEl.volume = 0.5;
    typingEl.play().catch(() => {});
  };

  let lastVerdict: object | null = null;
  $effect(() => {
    const verdict = play.reveal ?? null;
    if (verdict && verdict !== lastVerdict) playSfx(verdict.correct ? 'correct' : 'wrong');
    lastVerdict = verdict;
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
    typingSound(false);
    clearInterval(fade);
    stopTrack();
  });
</script>

<svelte:window onpointerdown={() => !embedded && (started = true)} />

<section
  class="scene"
  aria-live="polite"
  class:intro={isTitle || isDivider}
  class:embedded
  style:--display={fontFamily}
  style:--body={fontFamily}
  style:font-family={fontFamily}
  style:--s-heading={view.size.heading}
  style:--s-text={view.size.text}
  style:--s-note={view.size.note}
  style:--opt-x="{view.options.x}%"
  style:--opt-y="{view.options.y}%"
  style:--opt-w="{view.options.width}%"
>
  <div class="frame">
    <div
      class="art"
      class:landscape={!view.stage}
      class:clickable={!isChoice && !revealed && !ended && !isTitle && !isDivider}
      style:background-image={view.stage ? `url(${withBase(view.stage.background)})` : undefined}
      role={view.stage?.alt ? 'img' : undefined}
      aria-label={view.stage?.alt}
      onclick={() => {
        if (!isChoice && !revealed && !ended && !isTitle && !isDivider) play = advance(play, game);
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
          class:placed={c.def.top !== undefined}
          src={withBase(c.def.image)}
          alt={c.def.alt ?? ''}
          style={c.def.top !== undefined
            ? `left:${c.def.left ?? 0}%; top:${c.def.top}%; width:${c.def.width}%`
            : `left:${SLOT_X[c.slot]}%; top:${ground}%; width:${c.def.width}%`}
        />
      {/each}

      {#if view.headingInArt && scene.heading && !revealed}
        <h2 class="art-heading">{pick(scene.heading, lang)}</h2>
      {/if}
    </div>

    <!-- The game's own chrome: it lives on the stage, not in a site header. -->
    <div class="hud">
      <div class="hud-left">
        {#if !embedded}<a class="chip-btn" href={withBase('/')} aria-label={t('nav.home', lang)}>← {t('nav.home', lang)}</a>{/if}
        {#if !isTitle}<span class="hud-tag">{pick(game.title, lang)}</span>{/if}
        {#if !isTitle && !play.segment}
          <span class="hearts" role="img" aria-label={`${t('lives', lang)}: ${Math.min(lives, MAX_LIVES)} / ${MAX_LIVES}`}>
            {#each Array.from({ length: MAX_LIVES }) as _, i}
              {#if game.presentation?.heart}
                <img class="heart" class:lost={i >= lives} src={withBase(game.presentation.heart)} alt="" />
              {:else}
              <svg class="heart" class:lost={i >= lives} viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">
                <path fill="#3b3953" d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z" />
                <path class="fill" d="M1 1h2v1h1v1H3V2H2v1H1zM5 2h1V1h2v3H7v1H6v1H5V5h1V4H5z" />
                <path class="fill" d="M1 1h2v2H1zM2 3h5v1H2zM3 4h3v1H3zM4 5h1v1H4zM6 1h2v2H6z" />
              </svg>
              {/if}
            {/each}
          </span>
        {/if}
      </div>
      <div class="hud-actions">
        {#if musicDefs && !embedded}
          <button class="chip-btn" onclick={toggleMusic} aria-pressed={!muted}>
            {muted ? t('music_off', lang) : t('music_on', lang)}
          </button>
        {/if}
        {#if !ended && !isTitle && !embedded}
          <button class="chip-btn" onclick={restart}>{t('start_over', lang)}</button>
        {/if}
      </div>
    </div>

    {#if play.segment}
      <Quiz
        mode={play.segment}
        entries={taught}
        {lang}
        onDone={() => (play = play.segment === 'preview' ? finishPreview(play, game) : closeReview(play))}
      />
    {:else if isTitle}
      <!-- The deck's opening: a white card on the room, ending in PLAY. -->
      <div class="title-card">
        {#if scene.heading}<p class="kicker">{pick(scene.heading, lang)}</p>{/if}
        <h1 class="title-name">{pick(game.title, lang)}</h1>
        {#if scene.text.en}<p class="title-sub">{pick(scene.text, lang)}</p>{/if}
        <button class="btn play" onclick={() => (play = begin(play, game, taught.length))}>{t('play', lang)}</button>
      </div>
    {:else if isDivider}
      <div class="divider-card">
        <h2>{pick(scene.heading ?? scene.text, lang)}</h2>
        {#if scene.heading && scene.text.en}<p>{pick(scene.text, lang)}</p>{/if}
        <button class="btn play" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
      </div>
    {:else if isChoice}
      <ul class="choice-cards">
        {#each scene.choices as c, i}
          <li>
            <button
              class="btn choice"
              aria-describedby={c.proverb ? `def-${i}` : undefined}
              onpointerenter={() => playSfx('hover')}
              onfocus={() => playSfx('hover')}
              onclick={() => {
                playSfx('select');
                play = choose(play, game, i);
              }}
            >
              {c.proverb ? glossary[c.proverb].term : pick(c.label, lang)}
            </button>
            {#if c.proverb && glossary[c.proverb]}
              <!-- hovering (or tabbing to) a proverb shows what it means, as the PM asked -->
              <span class="def" role="tooltip" id={`def-${i}`}>{pick(glossary[c.proverb].meaning, lang)}</span>
            {/if}
          </li>
        {/each}
      </ul>
      <div class="bubble {speakerSide} ask" style:--inset={inset !== undefined ? `${inset}cqw` : undefined}>
        {#if scene.heading}<span class="plate">{pick(scene.heading, lang)}</span>{/if}
        {#key scene.id}<p class="text" use:typewriter={{ onTyping, instant: embedded }}>{pick(scene.text, lang) || t('what_advice', lang)}</p>{/key}
      </div>
    {:else if !ended}
      <div class="bubble {speakerSide}" class:revealed={!!revealed} style:--inset={inset !== undefined ? `${inset}cqw` : undefined}>
        {#if scene.heading && !view.headingInArt && !revealed}<span class="plate">{pick(scene.heading, lang)}</span>{/if}

        {#if revealed}
          <div class="reveal-head">
            <h3 class="reveal-term">{revealed.term}</h3>
            {#if play.reveal}
              <span class="chip status" class:good={play.reveal.correct}>{play.reveal.correct ? t('fits', lang) : t('not_quite', lang)}</span>
            {/if}
          </div>

          {#if play.reveal?.why}
            <p class="why" class:vi={lang === 'vi'}><RichText text={pick(play.reveal.why, lang)} {glossary} {lang} /></p>
          {/if}
          {#if play.reveal?.intended && glossary[play.reveal.intended]}
            <p class="why"><strong>{t('called_for', lang)}:</strong> {glossary[play.reveal.intended].term}</p>
          {/if}

          <p class="text meaning" class:vi={lang === 'vi'}>{pick(revealed.meaning, lang)}</p>
          {#if lang === 'en' && revealed.meaning.vi}
            <p class="aside vi"><span class="aside-tag">VI</span> {revealed.meaning.vi}</p>
          {/if}
          {#if revealed.example}
            <p class="aside example vi"><span class="aside-tag">{t('example', lang)}</span> {pick(revealed.example, lang)}</p>
          {/if}

          <button class="btn" onclick={() => (play = advance(play, game))}>{t('continue', lang)}</button>
        {:else}
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

          {#key scene.id}
            <p class="text" use:typewriter={{ onTyping, instant: embedded }}><RichText text={pick(scene.text, lang)} {glossary} {lang} /></p>
          {/key}

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
            <button class="btn" onclick={next}>{t('continue', lang)}</button>
          {/if}
        {/if}
      </div>
    {/if}

    {#if ended && !revealed && !play.segment}
      {#if lost}
        <h2 class="gave-up">{pick(scene.heading, lang) || t('the_end', lang)}</h2>
      {/if}
      <section class="finale" class:over={lost}>
        <h2 class="the-end">{t('the_end', lang)}</h2>
        {#if scene.text.en}<p class="epilogue"><RichText text={pick(scene.text, lang)} {glossary} {lang} /></p>{/if}
        {#if well.length || lost}
          <h3 class="well">{lost ? t('proverb_you_used_well', lang) : t('recap_well', lang)}</h3>
          {#if well.length}
            <ul class="recap">
              {#each well as e}<li><strong>{e.term}</strong>: {pick(e.meaning, lang)}</li>{/each}
            </ul>
          {:else}
            <p class="none">{t('nothing_yet', lang)}</p>
          {/if}
        {/if}
        {#if revisit.length || lost}
          <h3 class="retry">{lost ? t('proverbs_you_got_wrong', lang) : t('recap_revisit', lang)}</h3>
          {#if revisit.length}
            <ul class="recap revisit">
              {#each revisit as m}
                <li>
                  <strong>{m.picked.term}</strong>
                  {#if m.intended} — {t('called_for', lang).toLowerCase()} <em>{m.intended.term}</em>{/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="none">{t('nothing_yet', lang)}</p>
          {/if}
        {/if}
        <div class="finale-actions">
          <button class="btn play" onclick={restart}>{lost ? t('try_again', lang) : t('restart', lang)}</button>
          {#if taught.length}
            <button class="btn secondary" onclick={() => (play = openReview(play))}>{t('review_proverbs', lang)}</button>
          {/if}
          <a class="btn secondary" href={withBase('/')}>{t('nav.home', lang)}</a>
        </div>
      </section>
    {/if}

    {#if play.items.length || play.status.length}
      <ul class="bag" aria-label={t('inventory', lang)}>
        {#each play.items as item}<li>{item}</li>{/each}
        {#each play.status as s}<li class="status" class:good={isGood(s)}>{s}</li>{/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  /* ---- the screen: the artwork owns the viewport, as in the deck ---- */
  .scene {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    background: var(--wall-deep);
  }
  /* In the editor the stage fills its column instead of the window. */
  .scene.embedded { min-height: 0; display: block; background: transparent; }
  .scene.embedded .frame { width: 100%; }
  .frame {
    position: relative;
    width: min(100vw, calc(100dvh * 16 / 9));
    aspect-ratio: 16 / 9;
    container-type: inline-size;
    overflow: hidden;
  }

  .art {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background-size: cover;
    background-position: center;
  }
  .art.clickable { cursor: pointer; }

  .char, .prop { position: absolute; transform: translate(-50%, -100%); }
  /* Characters stand in front of the dialogue box, as in the deck, and never swallow its clicks. */
  .char { z-index: 3; pointer-events: none; }
  .char.placed { transform: none; }
  .char, .prop img { display: block; width: 100%; height: auto; }
  .prop img.stretch { height: 100%; object-fit: fill; }
  .prop-label {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding-bottom: 12%;
    text-align: center;
    font-family: var(--display);
    font-weight: 700;
    line-height: 1.1;
    white-space: pre-line;
    color: var(--ink);
  }
  .prop-text {
    position: absolute;
    display: grid;
    place-items: center;
    text-align: center;
    font-weight: 400;
    font-size: calc(1.7cqw * var(--s-note, 1));
    line-height: 1.2;
    white-space: pre-line;
    color: var(--ink);
    overflow: visible;
  }
  .art-heading {
    position: absolute;
    left: 40%;
    top: 45%;
    margin: 0;
    font-family: var(--display);
    font-size: calc(3.4cqw * var(--s-heading, 1));
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--cyan);
    text-shadow: 0 0 .3em rgb(27 26 38 / .75);
  }

  /* ---- game chrome, drawn inside the stage ---- */
  .hud {
    position: absolute;
    inset: 2.2% 2.2% auto 2.2%;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    pointer-events: none;
  }
  .hud-tag {
    padding: .25em 1em;
    font-family: var(--display);
    font-size: max(1.4cqw, .8rem);
    font-weight: 600;
    letter-spacing: var(--label-track);
    text-transform: uppercase;
    color: var(--ink);
    background: rgb(255 255 255 / .88);
    border: 2px solid var(--outline);
    border-radius: 999px;
    box-shadow: var(--lift-1);
  }
  .hud-left { display: flex; align-items: flex-start; gap: .5rem; flex-wrap: wrap; pointer-events: auto; }
  .hud-actions { display: flex; gap: .5rem; pointer-events: auto; }
  .chip-btn {
    display: inline-flex;
    align-items: center;
    min-height: max(2.4cqw, 2rem);
    text-decoration: none;
    font-family: var(--display);
    font-size: max(1.4cqw, .8rem);
    font-weight: 600;
    letter-spacing: var(--label-track);
    text-transform: uppercase;
    padding: .25em 1em;
    color: var(--ink);
    background: rgb(255 255 255 / .88);
    border: 2px solid var(--outline);
    border-radius: 999px;
    cursor: pointer;
    box-shadow: var(--lift-1);
  }
  .chip-btn:hover { background: var(--paper); }

  /* ---- the signature: a wide white bubble with a name pill on its edge ---- */
  /*
   * The dialogue box, measured from the deck's 1600x900 frames: it spans 66.5%→91.5% of the
   * height, starts right of Minh's shoulder (24.5%) and ends at 95%. Frosted white, no
   * outline. The speaker stands IN FRONT of its edge (z-index on .char), with the name tag
   * straddling its top edge beside the shoulder.
   */
  .bubble {
    position: absolute;
    z-index: 2;
    left: 24.5%;
    right: 5%;
    /* Anchored to the bottom and as tall as its content: the deck's 25% height is the
       minimum, so a long line grows the box upward instead of scrolling it. */
    top: auto;
    bottom: 8.5%;
    min-height: 25%;
    max-height: 86%;
    overflow: auto;
    display: flex;
    flex-direction: column;
    padding: 1.1cqw 2.2cqw 1cqw var(--inset, 2.6cqw);
    background: rgb(255 255 255 / .82);
    border: 2px solid rgb(255 255 255 / .95);
    border-radius: 1.6cqw;
    box-shadow: var(--lift-2);
    font-size: calc(2.6cqw * var(--s-text, 1));
    line-height: 1.15;
    overflow: visible;
  }
  /* The name tag overhangs the box, so it only clips when the content truly exceeds 86%. */
  .bubble:not(.revealed) { overflow: visible; }
  /* A verdict carries term, why, meaning, translation and example: smaller type, wider use of the box. */
  .bubble.revealed { font-size: calc(1.95cqw * var(--s-text, 1)); bottom: 6%; padding-top: 1.6cqw; padding-bottom: 1.6cqw; overflow: auto; }
  .bubble.revealed .reveal-term { font-size: 1.35em; }
  .bubble.revealed .btn { margin-top: .5em; }
  .bubble.center { left: 12%; right: 12%; }
  /* Dr. Bird stands on the right: the box runs left and its text stops short of his solid edge. */
  .bubble.right { left: 3.5%; right: 5%; padding-left: 2.6cqw; padding-right: var(--inset, 31cqw); }
  .bubble.ask { min-height: 21%; bottom: 7%; justify-content: center; text-align: center; }
  .bubble.ask .text { margin: 0; }
  .plate {
    position: absolute;
    top: -3.1cqw;
    left: var(--inset, 4.6cqw);
    min-width: 12.5cqw;
    padding: .25cqw 1.4cqw;
    text-align: center;
    font-family: var(--display);
    font-size: calc(2.25cqw * var(--s-heading, 1));
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: var(--label-track);
    color: var(--ink);
    background: var(--paper);
    border: var(--pixel) solid var(--outline);
    border-radius: .8cqw;
    white-space: nowrap;
  }
  .bubble.right .plate { left: 2.6cqw; right: auto; }
  .bubble.revealed .plate { display: none; }

  /* ---- reveal card: the verdict leads, the explanation follows ---- */
  .reveal-head { display: flex; align-items: center; gap: .6em; flex-wrap: wrap; margin-bottom: .2em; }
  .reveal-term {
    margin: 0;
    font-family: var(--display);
    font-size: 1.5em;
    line-height: 1.15;
    text-transform: uppercase;
    letter-spacing: .02em;
  }
  .why { font-size: 1em; line-height: 1.25; margin: .3em 0; }
  .aside { font-size: .92em; line-height: 1.25; margin: .2em 0; opacity: .85; }
  .aside.example { font-style: italic; }
  /* Vietnamese translation and explanation read in blue, apart from the English. */
  .vi { color: var(--vi-blue); opacity: 1; }
  .vi .aside-tag { color: inherit; }
  .aside-tag {
    display: inline-block;
    margin-right: .35em;
    font-family: var(--display);
    font-size: .72em;
    font-weight: 600;
    font-style: normal;
    letter-spacing: var(--label-track);
    text-transform: uppercase;
  }

  /* ---- choices: the deck's two big pixel cards, stacked flush at the left, above the box ---- */
  .choice-cards {
    position: absolute;
    z-index: 2;
    left: var(--opt-x, 3.9%);
    top: var(--opt-y, 40%);
    width: var(--opt-w, 36.6%);
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: .5cqw;
  }
  .choice-cards .btn {
    width: 100%;
    min-height: 7.4cqw;
    display: grid;
    place-items: center;
    padding: .5cqw 1.6cqw;
    font-size: 1.9cqw;
    line-height: 1.15;
    text-align: center;
    background: var(--teal);
    color: var(--ink);
    border-radius: 1.6cqw;
    box-shadow: var(--lift-2);
  }
  .choice-cards .btn:hover { background: var(--cyan); }
  .choice-cards li { position: relative; }
  /* the proverb's meaning, in the deck's speech-bubble style, beside the card */
  .def {
    position: absolute;
    z-index: 8;
    left: calc(100% + 1cqw);
    top: 50%;
    width: 28cqw;
    padding: .9cqw 1.4cqw;
    transform: translateY(-50%);
    font-size: 1.6cqw;
    line-height: 1.2;
    color: var(--ink);
    background: #fff;
    border: .3cqw solid var(--ink);
    border-radius: 1.4cqw;
    box-shadow: var(--lift-1);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity .12s steps(3, end);
  }
  .choice-cards li:hover .def, .choice-cards li:focus-within .def { opacity: 1; visibility: visible; }
  /* touch-only devices have no hover, and a tap picks the answer, so the bubble stays off there */
  @media (any-hover: none) { .def { display: none; } }

  /* confidence hearts */
  .hearts { display: inline-flex; align-items: center; gap: .35rem; padding: .2em .6em; background: rgb(255 255 255 / .88); border: 2px solid var(--outline); border-radius: 999px; box-shadow: var(--lift-1); }
  .heart { width: max(2cqw, 1.1rem); height: auto; display: block; }
  .heart .fill { fill: #ee3b4a; }
  .heart.lost .fill { fill: #d9d7e8; }
  img.heart.lost { filter: grayscale(1) brightness(1.4) opacity(.55); }

  /* ---- opening card and chapter dividers ---- */
  .title-card, .divider-card {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 2.4cqw 2.6cqw;
    text-align: center;
    background: var(--paper);
    border: var(--pixel) solid var(--outline);
    border-radius: 2cqw;
    box-shadow: var(--lift-3);
  }
  .title-card { width: 58%; }
  .title-card .kicker {
    margin: 0 0 .4em;
    font-family: var(--display);
    font-size: calc(1.5cqw * var(--s-heading, 1));
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    opacity: .8;
  }
  .title-name {
    margin: 0 0 .4em;
    font-family: var(--display);
    font-size: calc(4.2cqw * var(--s-heading, 1));
    line-height: 1.05;
    text-transform: uppercase;
    letter-spacing: .01em;
  }
  .title-sub { margin: 0 0 1.3em; font-size: calc(2.4cqw * var(--s-text, 1)); line-height: 1.25; }
  .title-card .btn.play, .divider-card .btn.play {
    font-size: 1.5cqw;
    padding: .4em 2.4em;
    background: var(--cyan);
  }
  .divider-card { width: 46%; background: var(--paper-dim); }
  .divider-card h2 {
    margin: 0 0 .3em;
    font-family: var(--display);
    font-size: calc(2.6cqw * var(--s-heading, 1));
    text-transform: uppercase;
    letter-spacing: .02em;
  }
  .divider-card p { margin: 0 0 1.2em; font-size: calc(1.4cqw * var(--s-text, 1)); }
  .divider-card .btn.play { font-size: 1.2cqw; }

  /* ---- ink: body copy in the bubble ---- */
  .bubble .btn {
    display: block;
    margin-left: auto;
    margin-top: .7em;
    font-size: .82em;
    padding: .35em 1.4em;
  }

  .text { font-size: 1.02em; margin: .2em 0 .7em; }
  .meaning { font-style: italic; }
  .note {
    margin: 0 auto .7em;
    max-width: 34em;
    padding: .5em 1em;
    background: var(--cream);
    border: 2px solid var(--outline);
    border-radius: .5em;
    font-style: italic;
    font-size: calc(1em * var(--s-note, 1));
    white-space: pre-line;
  }
  .simple-capable { position: relative; }
  .simple-wrap { position: relative; margin-top: .4em; }
  .simple-btn {
    font-family: var(--display);
    font-size: .74em;
    font-weight: 600;
    font-style: normal;
    letter-spacing: var(--label-track);
    text-transform: uppercase;
    padding: .1em .9em;
    border: 2px solid var(--outline);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    cursor: help;
  }
  .simple-btn:hover, .simple-wrap.open .simple-btn { background: var(--cyan); }
  .simple-pop {
    display: none;
    position: absolute;
    z-index: 5;
    top: 100%;
    left: 0;
    right: 0;
    padding: .6em 1em;
    background: var(--paper);
    border: 2px solid var(--outline);
    border-radius: .5em;
    box-shadow: var(--lift-3);
    font-style: normal;
    text-align: center;
  }
  /* the wrap is the hover target, so the pointer can travel from the button into the popover */
  .simple-wrap:hover .simple-pop, .simple-btn:focus-visible + .simple-pop, .simple-wrap.open .simple-pop { display: block; }
  .simple-label {
    display: block;
    margin-bottom: .2em;
    font-family: var(--display);
    font-size: .72em;
    font-weight: 600;
    letter-spacing: var(--label-track);
    text-transform: uppercase;
  }
  .mobile-only { display: none; }

  .gains { margin: 0 0 .7em; display: flex; flex-wrap: wrap; gap: .5em; align-items: center; }
  .chip, .bag li {
    display: inline-block;
    padding: .02em .7em;
    border-radius: 999px;
    background: var(--paper);
    border: 2px solid var(--outline);
    font-size: .85em;
    font-weight: 600;
  }
  .status { border-color: var(--bad) !important; color: var(--bad); }
  .status.good { border-color: var(--good) !important; color: var(--good); }
  .item { margin: 0; display: grid; justify-items: center; gap: .1em; font-weight: 600; font-size: .85em; }
  .item img { width: 3.5em; height: auto; }

  /* ---- the ending: a panel over the stage ---- */
  .finale {
    position: absolute;
    z-index: 4;
    /* Minh keeps the left of the stage; the panel takes the rest, so neither covers the other. */
    left: 36%;
    right: 4%;
    top: 50%;
    transform: translateY(-50%);
    max-height: 90%;
    overflow: auto;
    padding: 1.8cqw 2.4cqw;
    background: var(--paper);
    border: var(--pixel) solid var(--outline);
    border-radius: 1.8cqw;
    box-shadow: var(--lift-3);
    font-size: 1.5cqw;
    line-height: 1.2;
  }
  .the-end { margin: 0 0 .15em; font-size: 2.2em; text-transform: uppercase; text-align: center; }
  .epilogue { margin: 0 0 .5em; text-align: center; font-size: 1.12em; }
  /* game over: the deck's dark room with the heading on the left and a frosted panel on the right */
  .gave-up {
    position: absolute;
    z-index: 4;
    left: 5%;
    top: 33%;
    margin: 0;
    max-width: 36%;
    font-size: 4cqw;
    line-height: 1.1;
    color: #fff;
    text-shadow: 0 .3cqw 0 rgb(0 0 0 / .45);
  }
  .finale.over { left: 49%; right: 3%; background: rgb(255 255 255 / .9); }
  .none { margin: 0 0 .5em; opacity: .65; }
  .finale h3 { font-size: 1.1em; margin: .5em 0 .15em; text-transform: uppercase; }
  .recap { text-align: left; padding-left: 1.2em; margin: 0 0 .5em; }
  .recap li { margin-bottom: .15em; }
  /* The game font ships one weight, so the browser cannot make it bolder: thicken the strokes by hand. */
  .recap strong, .finale h3 { font-weight: 800; -webkit-text-stroke: .035em currentColor; }
  .finale h3.well { color: var(--good); }
  .finale h3.retry { color: var(--bad); }
  .finale .btn.play { font-size: 1.05em; background: var(--cyan); }
  .finale .btn.secondary { font-size: 1.05em; }
  .finale .btn { white-space: nowrap; }
  .finale-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .8em; margin-top: .4em; }

  .bag {
    position: absolute;
    right: 2.2%;
    bottom: 2.4%;
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: .3em;
    max-width: 40%;
    font-size: 1.2cqw;
  }

  /* ---- phones: the artwork is 16:9, so the dialogue sits under it ---- */
  @media (max-width: 40rem) {
    /* Portrait phones letterbox the 16:9 art, so the stack centres in the
       viewport instead of hugging the top and leaving dead wall below. */
    .scene {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 100dvh;
    }
    .frame {
      width: 100%;
      aspect-ratio: auto;
      container-type: normal;
      overflow: visible;
    }
    .art { position: relative; aspect-ratio: 16 / 9; }
    .hud { inset: .5rem .5rem auto .5rem; }
    .hud-tag, .chip-btn { font-size: .78rem; }
    .chip-btn { padding: .4rem .9rem; min-height: 2.25rem; }
    .bubble, .choice-cards, .finale, .title-card, .divider-card {
      position: static;
      transform: none;
      width: auto;
      max-height: none;
      margin: .75rem;
      font-size: calc(1.15rem * var(--s-text, 1));
    }
    /* cqw has no container on a phone, so the stage paddings are reset in rem */
    .bubble, .bubble.right, .bubble.revealed, .bubble.ask {
      min-height: 0;
      padding: 1rem;
      border-radius: .8rem;
      font-size: calc(1.15rem * var(--s-text, 1));
      overflow: visible;
    }
    .plate, .bubble.right .plate {
      position: static;
      display: inline-block;
      min-width: 0;
      margin: 0 0 .5rem;
      padding: .1rem .8rem;
      font-size: calc(.85rem * var(--s-heading, 1));
    }
    .choice-cards .btn { min-height: 3rem; font-size: 1.05rem; padding: .5rem 1rem; border-radius: 1rem; }
    .title-card .kicker { font-size: calc(.85rem * var(--s-heading, 1)); }
    .title-name { font-size: calc(2rem * var(--s-heading, 1)); }
    .title-sub { font-size: calc(1.2rem * var(--s-text, 1)); }
    .title-card .btn.play, .divider-card .btn.play { font-size: 1rem; }
    .divider-card h2 { font-size: calc(1.5rem * var(--s-heading, 1)); }
    .divider-card p { font-size: calc(.95rem * var(--s-text, 1)); }
    .the-end { font-size: 1.8rem; }
    .gave-up { position: static; max-width: none; margin: .75rem; font-size: 1.8rem; }
    .finale.over { left: auto; right: auto; }
    .def { display: none; }
    .heart { width: 1.1rem; }
    .prop-text { display: none; }
    .mobile-only { display: block; }
    .art-heading { font-size: calc(1.1rem * var(--s-heading, 1)); }
    .bag { position: static; margin: .5rem .75rem 1rem; font-size: .9rem; max-width: none; }
  }
</style>
