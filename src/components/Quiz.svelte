<script lang="ts">
  import { pick, type GlossaryEntry, type Lang } from '../lib/types';
  import { PAGE_SIZE, blankOf, chunk, hintOf, isRightBlank, shuffled } from '../lib/review';
  import { t } from '../i18n/ui';

  /**
   * The lesson's two quiz segments, drawn over the stage:
   *  - preview (before the story): match each proverb to its definition;
   *  - review (after it): type the missing word of each proverb, with a hint bulb.
   * Nothing here costs a heart; it is practice, and wrong rows show the right answer.
   */
  let {
    mode,
    entries,
    lang = 'en',
    onDone,
  }: { mode: 'preview' | 'review'; entries: GlossaryEntry[]; lang?: Lang; onDone: () => void } = $props();

  const pages = $derived(chunk(entries, PAGE_SIZE));
  let page = $state(0);
  let checked = $state(false);
  /** preview: chosen definition slug per proverb; review: typed word per proverb. */
  let answers = $state<Record<string, string>>({});
  let openHint = $state<string | null>(null);

  const rows = $derived(pages[page] ?? []);
  const last = $derived(page >= pages.length - 1);
  const options = $derived(shuffled(rows, `${mode}:${page}`));
  const heading = $derived(mode === 'preview' ? t('preview_title', lang) : t('review_title', lang));

  const right = (e: GlossaryEntry) =>
    mode === 'preview' ? (answers[e.slug] ?? '') === e.slug : isRightBlank(answers[e.slug] ?? '', e);
  const score = $derived(rows.filter(right).length);

  function next() {
    if (last) return onDone();
    page += 1;
    checked = false;
    openHint = null;
  }
</script>

<section class="quiz" aria-labelledby="quiz-title">
  <h2 id="quiz-title">{heading}</h2>
  <p class="count">{page + 1} / {pages.length}</p>

  <ol class="rows" start={page * PAGE_SIZE + 1}>
    {#each rows as e, i (e.slug)}
      {@const ok = checked && right(e)}
      {@const bad = checked && !right(e)}
      <li class="row" class:review={mode === 'review'} class:ok class:bad>
        {#if mode === 'preview'}
          <div class="term">
            <strong>{e.term}</strong>
          </div>
          <div class="answer">
            <select
              aria-label={`${t('choose_definition', lang)}: ${e.term}`}
              bind:value={answers[e.slug]}
              disabled={checked}
            >
              <option value="">{t('choose_definition', lang)}</option>
              {#each options as o (o.slug)}<option value={o.slug}>{pick(o.meaning, lang)}</option>{/each}
            </select>
            {#if bad}<p class="fix">{pick(e.meaning, lang)}</p>{/if}
          </div>
        {:else}
          {@const blank = blankOf(e)}
          {@const hint = hintOf(e, lang)}
          <div class="sentence">
            <span class="num">{page * PAGE_SIZE + i + 1}.</span>
            <span>
              {blank.before}<input
                class="gap"
                size={Math.max(blank.answer.length, 4)}
                aria-label={`${t('missing_word', lang)} ${page * PAGE_SIZE + i + 1}`}
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                bind:value={answers[e.slug]}
                disabled={checked}
              />{blank.after}
            </span>
          </div>
          <div class="hint">
            {#if bad}<span class="fix">{blank.answer}</span>{/if}
            <button
              type="button"
              class="bulb"
              aria-label={t('hint', lang)}
              aria-expanded={openHint === e.slug}
              onclick={() => (openHint = openHint === e.slug ? null : e.slug)}
              onmouseenter={() => (openHint = e.slug)}
              onmouseleave={() => (openHint = null)}
              onfocus={() => (openHint = e.slug)}
              onblur={() => (openHint = null)}
            >
              <svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
                <path fill="#ffd21f" d="M5 3h6v1h1v5h-1v1h-1v2H6v-2H5V9H4V4h1z" />
                <path fill="#f0a800" d="M10 4h1v5h-1v1H9V4zM6 12h4v1H6z" />
                <path fill="#8a6a1f" d="M7 4h2v4H7zM7 9h2v1H7z" />
                <path fill="#c9b9a0" d="M6 13h4v1H6z" />
              </svg>
            </button>
            {#if openHint === e.slug}<span class="tip" role="tooltip">{hint}</span>{/if}
          </div>
        {/if}
        {#if checked}<span class="mark" aria-label={ok ? t('correct', lang) : t('incorrect', lang)}>{ok ? '✓' : '✗'}</span>{/if}
      </li>
    {/each}
  </ol>

  <div class="foot">
    {#if checked}<p class="score" role="status">{score} / {rows.length}</p>{/if}
    {#if !checked}
      <button class="btn go" onclick={() => (checked = true)}>{t('check_answers', lang)}</button>
    {:else}
      <button class="btn go" onclick={next}>
        {last ? (mode === 'preview' ? t('start_story', lang) : t('finish_review', lang)) : t('continue', lang)}
      </button>
    {/if}
  </div>
</section>

<style>
  /* the deck's panel: a big white card with a sand border, floating over the blurred room */
  .quiz {
    position: absolute;
    z-index: 6;
    inset: 5% 5.5% 5% 5.5%;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    padding: 1.6cqw 3cqw 1.4cqw;
    background: #fff;
    border: .55cqw solid #d6ccb5;
    border-radius: 3.6cqw;
    font-size: 1.9cqw;
    line-height: 1.15;
    color: var(--ink);
    box-shadow: 0 0 0 100vmax rgb(215 214 251 / .55);
    clip-path: inset(-100vmax);
  }
  h2 { margin: 0; text-align: center; font-size: 3.4cqw; letter-spacing: .03em; }
  .count { margin: 0 0 .6cqw; text-align: center; font-size: 1.4cqw; opacity: .6; }
  .rows { list-style: none; margin: 0; padding: 0; display: grid; align-content: space-evenly; gap: .6cqw; }
  .row {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    align-items: center;
    gap: 2cqw;
    min-height: 0;
    padding: .5cqw 1cqw;
    border-radius: 1.4cqw;
  }
  .row.review { grid-template-columns: 1fr auto; }
  .row.ok { background: #e6f5e8; }
  .row.bad { background: #fbe9e5; }
  .term strong, .sentence { font-family: var(--display); font-weight: 600; }
  .term strong { font-size: 2.1cqw; }
  .sentence { display: flex; gap: .6em; font-size: 2.1cqw; }
  .num { flex: none; }

  select, .gap {
    font-family: var(--display);
    font-weight: 600;
    color: var(--ink);
    background: #fff3cd;
    border: .35cqw solid #aaa;
    border-radius: 999px;
  }
  select {
    width: 100%;
    padding: .7cqw 1.6cqw;
    font-size: 1.7cqw;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .gap {
    padding: .1em .5em;
    margin: 0 .15em;
    font-size: inherit;
    text-align: center;
    border-radius: .6em;
    min-width: 4ch;
  }
  select:disabled, .gap:disabled { opacity: 1; }
  .fix { margin: .3cqw 0 0; font-size: 1.7cqw; font-weight: 700; color: var(--good); }
  .hint { position: relative; display: flex; align-items: center; justify-content: flex-end; gap: 1cqw; }
  .bulb { width: 4cqw; height: 4cqw; min-width: 2rem; min-height: 2rem; padding: 0; border: 0; background: none; cursor: help; }
  .bulb svg { width: 100%; height: 100%; display: block; }
  .tip {
    position: absolute;
    z-index: 2;
    right: 0;
    bottom: calc(100% - .4cqw);
    width: max-content;
    max-width: 26cqw;
    padding: .9cqw 1.6cqw;
    text-align: center;
    font-family: var(--display);
    font-weight: 600;
    font-size: 1.9cqw;
    background: #fff;
    border: .3cqw solid var(--ink);
    border-radius: 1.6cqw;
  }
  .mark { position: absolute; right: -2cqw; top: 50%; transform: translateY(-50%); font-size: 2.6cqw; font-weight: 700; }
  .ok .mark { color: var(--good); }
  .bad .mark { color: var(--bad); }
  .foot { display: flex; justify-content: flex-end; align-items: center; gap: 2cqw; padding-top: .8cqw; }
  .score { margin: 0; font-family: var(--display); font-weight: 600; }
  .btn.go {
    min-width: 28cqw;
    font-size: 2cqw;
    background: #4a9a63;
    color: #fff;
    border: .3cqw solid var(--ink);
    border-radius: 999px;
    box-shadow: none;
  }
  .btn.go:hover { background: #3f8a57; }

  @media (max-width: 40rem) {
    .quiz {
      position: static;
      inset: auto;
      margin: .75rem;
      padding: 1rem;
      border-width: 4px;
      border-radius: 1.2rem;
      font-size: 1rem;
      box-shadow: none;
      clip-path: none;
      display: block;
    }
    h2 { font-size: 1.6rem; }
    .count { font-size: .85rem; }
    .rows { gap: .6rem; }
    .row { grid-template-columns: 1fr; gap: .4rem; padding: .6rem .5rem; }
    .term strong, .sentence { font-size: 1.1rem; }
    select { font-size: 1rem; padding: .5rem 1rem; border-width: 2px; }
    .gap { border-width: 2px; }
    .fix { font-size: .95rem; }
    .hint { justify-content: flex-start; }
    .bulb { width: 2.2rem; height: 2.2rem; }
    .tip { position: static; margin: 0; font-size: 1rem; border-width: 2px; border-radius: .8rem; }
    .mark { position: static; transform: none; font-size: 1.4rem; justify-self: end; }
    .foot { padding-top: 1rem; }
    .btn.go { min-width: 0; width: 100%; font-size: 1.05rem; }
  }
</style>
