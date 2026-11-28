<script lang="ts">
  import { untrack } from 'svelte';
  import ScenePreview from './ScenePreview.svelte';
  import type { EditorData, ProverbRow } from '../lib/remote';
  import type { Lang, UiStyle } from '../lib/types';
  import { orderScenes } from '../lib/scene-list';
  import {
    SIZE_MAX, SIZE_MIN, UI_ELEMENTS, UI_GROUPS, cleanUi, hasStyle, pickScreen,
    type ShowKind, type UiControl, type UiElement,
  } from '../lib/ui-style';

  let {
    data,
    words = [],
    saving = false,
    onSave,
  }: {
    data: EditorData;
    words?: ProverbRow[];
    saving?: boolean;
    onSave: (ui: Record<string, UiStyle>) => void | Promise<void>;
  } = $props();

  const saved = $derived(cleanUi(data.game.presentation?.ui));
  let draft = $state<Record<string, UiStyle>>(untrack(() => structuredClone($state.snapshot(cleanUi(data.game.presentation?.ui)))));
  // a save (or switching game) hands us a new saved copy
  $effect(() => {
    draft = structuredClone(saved);
  });

  const current = $derived(cleanUi($state.snapshot(draft)));
  const dirty = $derived(JSON.stringify(current) !== JSON.stringify(saved));
  const changedCount = $derived(Object.keys(current).length);

  const KIND_LABELS: Record<ShowKind, string> = {
    title: 'Opening card',
    divider: 'Chapter card',
    story: 'Story screen',
    hover: 'Hover cards',
    choices: 'Answer cards',
    reveal: 'Result card',
    'quiz-preview': 'Match quiz',
    'quiz-review': 'Missing-word quiz',
    ending: 'Ending',
    gameover: 'Game over',
  };
  const KIND_TIPS: Partial<Record<ShowKind, string>> = {
    hover: 'Point at an underlined word or proverb in the text to open its card.',
    choices: 'Point at an answer card to see its meaning bubble.',
    reveal: 'This is the card the player sees after picking the first proverb.',
    'quiz-preview': 'Pick an answer in each row, then press the green button to see the right and wrong rows.',
    'quiz-review': 'Type a word in each gap, click a light bulb for the hint, then press the green button.',
    ending: 'A made-up run: one proverb used well and one to revisit, so both headings show.',
    gameover: 'The screen shown when the hearts run out.',
  };
  const PLAYER_SHOW = { reveal: 'reveal', 'quiz-preview': 'quiz-preview', 'quiz-review': 'quiz-review', ending: 'ending', gameover: 'gameover' } as const;

  let kind = $state<ShowKind>('story');
  /** A screen picked by hand to preview on, instead of the first one that suits the piece. */
  let pinned = $state('');
  const setKind = (next: ShowKind) => {
    kind = next;
    pinned = '';
  };
  let lang = $state<Lang>('en');
  let stageEl = $state<HTMLElement | null>(null);

  const ordered = $derived(orderScenes(data.scenes));
  const linkTerms = $derived(words.flatMap((w) => [w.term, ...(w.forms ?? [])]));
  const screen = $derived((pinned && ordered.find((s) => s.id === pinned)) || pickScreen(kind, ordered, linkTerms));
  const show = $derived(PLAYER_SHOW[kind as keyof typeof PLAYER_SHOW] ?? 'story');

  const elementsOf = (group: string) => UI_ELEMENTS.filter((e) => e.group === group);
  const countIn = (group: string) => elementsOf(group).filter((e) => hasStyle(current[e.id])).length;

  /** Changes some settings of one piece; `undefined` puts a setting back to the designed look. */
  function patch(id: string, change: Partial<Record<keyof UiStyle, UiStyle[keyof UiStyle]>>) {
    const next: Record<string, unknown> = { ...(draft[id] ?? {}), ...change };
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
    if (change.underline !== undefined && change.underline === 'none') delete next.underlineColor;
    if (Object.keys(next).length) draft[id] = next as UiStyle;
    else delete draft[id];
  }

  const reset = (id: string) => delete draft[id];
  const resetAll = () => {
    if (!changedCount || !confirm('Put every piece of the interface back to its designed look? (Nothing is saved until you press Save.)')) return;
    draft = {};
  };

  // ---- colours: start the picker from what the piece looks like now ----
  const FALLBACK = { color: '#1b1a26', background: '#ffffff', border: '#3b3953', underlineColor: '#7a5538' } as const;
  type ColorKey = keyof typeof FALLBACK;
  const hex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  function toHex(css: string): string | null {
    const m = css.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const n = m[1].match(/[\d.]+/g)?.map(Number) ?? [];
    if (n.length < 3 || (n[3] !== undefined && n[3] < 0.05)) return null;
    return `#${hex2(n[0])}${hex2(n[1])}${hex2(n[2])}`;
  }
  function currentColor(el: UiElement, key: ColorKey): string {
    const selector = ((key === 'background' || key === 'border' ? el.box : el.text) ?? el.selector).split(',')[0].trim();
    const node = stageEl?.querySelector(`.scene ${selector}`);
    if (node) {
      const style = getComputedStyle(node);
      const css = key === 'background' ? style.backgroundColor : key === 'border' ? style.borderTopColor : style.color;
      const hex = toHex(css);
      if (hex) return hex;
    }
    return FALLBACK[key];
  }
  /** `<input type="color">` only takes #rrggbb. */
  function six(value: string): string {
    if (/^#[0-9a-f]{3,4}$/i.test(value)) return `#${[...value.slice(1, 4)].map((c) => c + c).join('')}`;
    return value.length > 7 ? value.slice(0, 7) : value;
  }

  const can = (el: UiElement, control: UiControl) => el.can.includes(control);
  const labelFor: Record<ColorKey, (el: UiElement) => string> = {
    color: () => 'Text colour',
    background: () => 'Background',
    border: () => 'Outline colour',
    underlineColor: () => 'Line colour',
  };
</script>

{#snippet colourField(el: UiElement, key: ColorKey)}
  {@const value = draft[el.id]?.[key]}
  <div class="field">
    <span class="name">{labelFor[key](el)}</span>
    <div class="inline">
      {#if value === 'transparent'}
        <span class="note">See-through</span>
      {:else if value}
        <input type="color" aria-label={labelFor[key](el)} value={six(value)} oninput={(e) => patch(el.id, { [key]: e.currentTarget.value })} />
      {:else}
        <button type="button" class="chip" onclick={() => patch(el.id, { [key]: currentColor(el, key) })}>Designed · change…</button>
      {/if}
      {#if key === 'background' && value !== 'transparent'}
        <button type="button" class="link" onclick={() => patch(el.id, { background: 'transparent' })}>Make see-through</button>
      {/if}
      {#if value}
        <button type="button" class="link" onclick={() => patch(el.id, { [key]: undefined })}>Back to designed</button>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet choice(el: UiElement, key: 'weight' | 'italic' | 'caps', name: string, options: [string | undefined, string][])}
  {@const value = draft[el.id]?.[key]}
  <div class="field">
    <span class="name">{name}</span>
    <div class="seg" role="group" aria-label={name}>
      {#each options as [option, text] (text)}
        <button type="button" class:on={value === option} aria-pressed={value === option} onclick={() => patch(el.id, { [key]: option })}>{text}</button>
      {/each}
    </div>
  </div>
{/snippet}

<section class="style-tab">
  <div class="controls">
    <header>
      <h2>Style of the game</h2>
      <p class="hint">
        Change how the parts of the game look that are not set screen by screen: the hover cards, buttons, quizzes,
        the ending and more. Open a group, then pick a piece. The preview on the right jumps to a screen that
        shows it. Anything you leave on <strong>Designed look</strong> stays exactly as it is now, and nothing reaches
        players until you press <strong>Save style</strong>.
      </p>
    </header>

    {#each UI_GROUPS as group, index (group.id)}
      {@const n = countIn(group.id)}
      <details open={index === 0} ontoggle={(e) => e.currentTarget.open && setKind(elementsOf(group.id)[0].show)}>
        <summary>
          <span>{group.label}</span>
          {#if n}<span class="count">{n} changed</span>{/if}
        </summary>
        <p class="hint">{group.hint}</p>

        {#each elementsOf(group.id) as el (el.id)}
          {@const style = current[el.id]}
          <details class="piece" class:changed={hasStyle(style)} ontoggle={(e) => e.currentTarget.open && setKind(el.show)} onfocusin={() => setKind(el.show)}>
            <summary>
              <span class="title">{el.label}</span>
              {#if hasStyle(style)}<span class="count">changed</span>{/if}
            </summary>
            <p class="hint">{el.hint}</p>
            <div class="piece-actions">
              <button type="button" class="link" onclick={() => setKind(el.show)}>Show it in the preview</button>
              {#if hasStyle(style)}<button type="button" class="link" onclick={() => reset(el.id)}>Reset this piece</button>{/if}
            </div>

            <div class="fields">
              {#if can(el, 'size')}
                <div class="field">
                  <span class="name">Size</span>
                  <div class="inline">
                    <input
                      type="range"
                      min={SIZE_MIN}
                      max={SIZE_MAX}
                      step="5"
                      aria-label="Size in percent of the designed size"
                      value={draft[el.id]?.size ?? 100}
                      oninput={(e) => patch(el.id, { size: Number(e.currentTarget.value) === 100 ? undefined : Number(e.currentTarget.value) })}
                    />
                    <output>{draft[el.id]?.size ?? 100}%</output>
                    {#if draft[el.id]?.size}<button type="button" class="link" onclick={() => patch(el.id, { size: undefined })}>Back to designed</button>{/if}
                  </div>
                </div>
              {/if}
              {#if can(el, 'color')}{@render colourField(el, 'color')}{/if}
              {#if can(el, 'background')}{@render colourField(el, 'background')}{/if}
              {#if can(el, 'border')}{@render colourField(el, 'border')}{/if}
              {#if can(el, 'weight')}{@render choice(el, 'weight', 'Bold', [[undefined, 'Designed'], ['bold', 'Bold'], ['normal', 'Not bold']])}{/if}
              {#if can(el, 'italic')}{@render choice(el, 'italic', 'Slanted', [[undefined, 'Designed'], ['italic', 'Italic'], ['normal', 'Upright']])}{/if}
              {#if can(el, 'caps')}{@render choice(el, 'caps', 'Capitals', [[undefined, 'Designed'], ['upper', 'ALL CAPS'], ['normal', 'Normal']])}{/if}
              {#if can(el, 'underline')}
                <div class="field">
                  <span class="name">Underline</span>
                  <div class="inline">
                    <select aria-label="Underline" value={draft[el.id]?.underline ?? ''} onchange={(e) => patch(el.id, { underline: (e.currentTarget.value || undefined) as UiStyle['underline'] })}>
                      <option value="">Designed look</option>
                      <option value="none">No underline</option>
                      <option value="solid">Solid line ———</option>
                      <option value="dotted">Dotted line ·····</option>
                      <option value="dashed">Dashed line - - -</option>
                      <option value="wavy">Wavy line ∿∿∿</option>
                      <option value="double">Double line ═══</option>
                    </select>
                  </div>
                </div>
                {#if draft[el.id]?.underline && draft[el.id]?.underline !== 'none'}
                  {@render colourField(el, 'underlineColor')}
                {/if}
              {/if}
            </div>
          </details>
        {/each}
      </details>
    {/each}

    <div class="actions">
      <button class="btn small" onclick={() => onSave(current)} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save style'}</button>
      <button class="btn secondary small" onclick={() => (draft = structuredClone(saved))} disabled={saving || !dirty}>Undo unsaved changes</button>
      <button class="btn secondary small" onclick={resetAll} disabled={saving || !changedCount}>Reset everything</button>
      {#if dirty}<span class="unsaved">Unsaved changes</span>{/if}
    </div>
  </div>

  <aside class="preview" aria-label="Preview">
    <div class="bar">
      <div class="kinds" role="group" aria-label="What to preview">
        {#each Object.entries(KIND_LABELS) as [id, label] (id)}
          <button type="button" class:on={kind === id} onclick={() => setKind(id as ShowKind)}>{label}</button>
        {/each}
      </div>
      <label class="screen-pick">
        <span>Screen</span>
        <select value={screen?.id ?? ''} onchange={(e) => (pinned = e.currentTarget.value)}>
          {#each ordered as s (s.id)}<option value={s.id}>{s.key}</option>{/each}
        </select>
      </label>
      <div class="seg" role="group" aria-label="Preview language">
        <button type="button" class:on={lang === 'en'} onclick={() => (lang = 'en')}>EN</button>
        <button type="button" class:on={lang === 'vi'} onclick={() => (lang = 'vi')}>VI</button>
      </div>
    </div>

    {#if screen}
      <div class="stage game-world bare" bind:this={stageEl}>
        <ScenePreview {data} sceneId={screen.id} {words} {lang} ui={current} {show} />
      </div>
      <p class="hint">
        Showing the screen <strong>{screen.key}</strong>. {KIND_TIPS[kind] ?? 'This is a live preview of your unsaved changes.'}
      </p>
    {:else}
      <p class="empty">This game has no screen that shows “{KIND_LABELS[kind]}” yet. Add one under Screens and it will appear here.</p>
    {/if}
  </aside>
</section>

<style>
  .style-tab { display: grid; grid-template-columns: minmax(20rem, 30rem) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .controls { display: grid; gap: .7rem; min-width: 0; }
  .controls > header h2 { font-size: 1.15rem; text-transform: uppercase; margin: 0 0 .2rem; }
  .hint { margin: 0; font-size: .86rem; opacity: .8; }
  .controls > details { border: 2px dashed var(--brown); border-radius: .9rem; padding: .5rem .8rem .8rem; display: grid; gap: .6rem; }
  summary { cursor: pointer; display: flex; gap: .6rem; align-items: baseline; justify-content: space-between; font-size: .95rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .count { font-size: .72rem; padding: .05rem .5rem; border-radius: 999px; background: var(--brown); color: var(--cream); letter-spacing: 0; text-transform: none; }
  .piece { border: 2px solid rgb(59 57 83 / .25); border-radius: .7rem; padding: .45rem .7rem; display: grid; gap: .45rem; background: var(--cream); }
  .piece[open] { padding-bottom: .7rem; }
  .piece.changed { border-color: var(--brown); }
  .piece summary { text-transform: none; letter-spacing: 0; font-size: .95rem; }
  .piece-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .6rem .9rem; }
  .field { display: grid; gap: .2rem; font-size: .82rem; }
  .name { font-weight: 700; }
  .inline { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
  .inline input[type='range'] { flex: 1 1 8rem; min-width: 6rem; accent-color: var(--brown); }
  output { font-weight: 700; min-width: 3.2ch; }
  input[type='color'] { width: 2.8rem; height: 2rem; padding: 0; border: 2px solid var(--brown); border-radius: .4rem; background: #fff; cursor: pointer; }
  select { font: inherit; font-size: .9rem; padding: .3rem .5rem; border: 2px solid var(--brown); border-radius: .45rem; background: #fff; color: var(--ink); }
  .note { font-style: italic; opacity: .8; }
  .chip { font: inherit; font-size: .82rem; padding: .2rem .7rem; border: 2px dashed var(--brown); border-radius: 999px; background: #fff; color: var(--ink); cursor: pointer; }
  .chip:hover { background: var(--cream); }
  .link { background: none; border: 0; padding: 0; font: inherit; font-size: .8rem; text-decoration: underline; cursor: pointer; color: inherit; }
  .seg { display: inline-flex; flex-wrap: wrap; border: 2px solid var(--brown); border-radius: .5rem; overflow: hidden; width: fit-content; }
  .seg button { font: inherit; font-size: .8rem; font-weight: 700; padding: .2rem .65rem; border: 0; background: #fff; color: var(--ink); cursor: pointer; }
  .seg button + button { border-left: 2px solid var(--brown); }
  .seg button.on { background: var(--brown); color: var(--cream); }
  .actions { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; position: sticky; bottom: 0; padding: .6rem 0; background: linear-gradient(transparent, #fff 30%); }
  .small { font-size: .85rem; padding: .35rem .8rem; }
  .unsaved { color: var(--danger); font-weight: 700; font-size: .85rem; }

  .preview { position: sticky; top: 6.5rem; display: grid; gap: .6rem; min-width: 0; border: 2px solid rgba(0,0,0,.14); border-radius: .8rem; padding: .7rem; background: #e9e8f7; }
  .bar { display: flex; gap: .6rem; justify-content: space-between; align-items: start; flex-wrap: wrap; }
  .kinds { display: flex; gap: .3rem; flex-wrap: wrap; }
  .kinds button { font: inherit; font-size: .78rem; padding: .15rem .6rem; border: 2px solid var(--brown); border-radius: 999px; background: #fff; color: var(--ink); cursor: pointer; }
  .kinds button.on { background: var(--brown); color: var(--cream); }
  .screen-pick { display: flex; gap: .4rem; align-items: center; font-size: .8rem; font-weight: 700; }
  .screen-pick select { max-width: 11rem; }
  .stage { border: 3px solid #3b3953; border-radius: .5rem; overflow: hidden; background: #c8c6f2; box-shadow: 0 .3rem 0 rgba(59,57,83,.35); }
  .empty { margin: 0; padding: 2rem 1rem; text-align: center; opacity: .8; }

  @media (max-width: 70rem) {
    .style-tab { grid-template-columns: 1fr; }
    .preview { position: static; order: -1; }
  }
</style>
