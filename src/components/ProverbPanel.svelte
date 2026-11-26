<script lang="ts">
  import type { GameProverbRow, ProverbRow } from '../lib/remote';

  let {
    proverbs,
    used,
    onAttach,
    onDetach,
    onUpdate,
    onSaveWhy,
    onCreate,
  }: {
    proverbs: ProverbRow[];
    used: GameProverbRow[];
    onAttach: (proverbId: string) => void | Promise<void>;
    onDetach: (proverbId: string) => void | Promise<void>;
    onUpdate: (proverbId: string, patch: Partial<ProverbRow>) => void | Promise<void>;
    onSaveWhy: (proverbId: string, why: { why_it_fits: string; why_it_fits_vi: string }) => void | Promise<void>;
    onCreate: (values: { term: string; meaning: string; meaning_vi: string }) => void | Promise<void>;
  } = $props();

  const byId = $derived(new Map(proverbs.map((p) => [p.id, p])));
  const ordered = $derived([...used].sort((a, b) => a.position - b.position));
  const unused = $derived(proverbs.filter((p) => p.kind === 'proverb' && !used.some((u) => u.proverb_id === p.id)));

  let pick = $state('');
  let term = $state('');
  let meaning = $state('');
  let meaningVi = $state('');
  let showNew = $state(false);

  const attach = async () => {
    if (!pick) return;
    await onAttach(pick);
    pick = '';
  };

  const create = async () => {
    if (!term.trim() || !meaning.trim()) return;
    await onCreate({ term: term.trim(), meaning: meaning.trim(), meaning_vi: meaningVi.trim() });
    term = meaning = meaningVi = '';
    showNew = false;
  };
</script>

<section class="proverbs">
  <header>
    <h2>Proverbs in this game</h2>
    <p class="hint">
      The {ordered.length} proverbs the preview teaches and the review tests, in order.
      {#if ordered.length !== 10}
        <strong class="warn">The lesson format uses 10.</strong>
      {/if}
    </p>
  </header>

  <ol>
    {#each ordered as slot, index (slot.proverb_id)}
      {@const p = byId.get(slot.proverb_id)}
      <li>
        <div class="head">
          <strong>{index + 1}. {p?.term ?? 'unknown proverb'}</strong>
          <button class="btn secondary small" onclick={() => onDetach(slot.proverb_id)}>Remove</button>
        </div>

        <div class="fields">
          <label>
            <span>Proverb</span>
            <input
              value={p?.term ?? ''}
              onchange={(e) => onUpdate(slot.proverb_id, { term: e.currentTarget.value.trim() })}
            />
          </label>
          <label>
            <span>Meaning (English)</span>
            <input
              value={p?.meaning ?? ''}
              onchange={(e) => onUpdate(slot.proverb_id, { meaning: e.currentTarget.value.trim() })}
            />
          </label>
          <label>
            <span>Meaning (Vietnamese)</span>
            <input
              value={p?.meaning_vi ?? ''}
              placeholder="nghĩa tiếng Việt"
              onchange={(e) => onUpdate(slot.proverb_id, { meaning_vi: e.currentTarget.value.trim() })}
            />
          </label>
        </div>

        <div class="fields">
          <label>
            <span>Word to blank out (review)</span>
            <input
              value={p?.blank ?? ''}
              placeholder="defaults to the longest word"
              onchange={(e) => onUpdate(slot.proverb_id, { blank: e.currentTarget.value.trim() || null })}
            />
          </label>
          <label>
            <span>Hint for that word (review)</span>
            <input
              value={p?.hint ?? ''}
              placeholder="e.g. A small, light boat"
              onchange={(e) => onUpdate(slot.proverb_id, { hint: e.currentTarget.value.trim() || null })}
            />
          </label>
        </div>

        {#if p && !p.meaning_vi}
          <p class="warn">No Vietnamese meaning yet — the recap table needs one.</p>
        {/if}

        <label>
          <span>Why it fits where the story uses it (review screen)</span>
          <textarea
            rows="2"
            value={slot.why_it_fits ?? ''}
            onchange={(e) =>
              onSaveWhy(slot.proverb_id, {
                why_it_fits: e.currentTarget.value,
                why_it_fits_vi: slot.why_it_fits_vi ?? '',
              })}
          ></textarea>
        </label>
      </li>
    {/each}
  </ol>

  <div class="add">
    <label>
      <span>Add an existing proverb</span>
      <select bind:value={pick}>
        <option value="">(choose)</option>
        {#each unused as p (p.id)}
          <option value={p.id}>{p.term}</option>
        {/each}
      </select>
    </label>
    <button class="btn" onclick={attach} disabled={!pick}>Add to this game</button>
    <button class="btn secondary" onclick={() => (showNew = !showNew)}>New proverb…</button>
  </div>

  {#if showNew}
    <div class="new">
      <label><span>Proverb</span><input bind:value={term} placeholder="Better safe than sorry" /></label>
      <label><span>Meaning (English)</span><input bind:value={meaning} /></label>
      <label><span>Meaning (Vietnamese)</span><input bind:value={meaningVi} /></label>
      <button class="btn" onclick={create} disabled={!term.trim() || !meaning.trim()}>Create and add</button>
    </div>
  {/if}
</section>

<style>
  .proverbs { display: grid; gap: 1rem; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; }
  li { border: 2px solid var(--brown); border-radius: .75rem; padding: .7rem .8rem; display: grid; gap: .5rem; background: rgba(255,255,255,.35); }
  .head { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .5rem; }
  .warn { margin: 0; font-size: .8rem; color: var(--danger); font-weight: 600; }
  label { display: grid; gap: .25rem; font-weight: 600; font-size: .85rem; }
  input, select, textarea { font: inherit; padding: .45rem .55rem; border: 2px solid var(--brown); border-radius: .5rem; background: var(--cream); color: var(--ink); width: 100%; }
  .add, .new { display: flex; flex-wrap: wrap; gap: .6rem; align-items: end; }
  .add label, .new label { flex: 1 1 12rem; }
  .hint { font-weight: 400; font-size: .85rem; opacity: .75; margin: 0; }
  .small { font-size: .8rem; padding: .3rem .6rem; }
</style>
