<script lang="ts">
  import type { ProverbRow } from '../lib/remote';

  type Values = { term: string; meaning: string; meaning_vi: string; example: string; forms: string[] };

  let {
    words,
    busy = false,
    onCreate,
    onUpdate,
    onDelete,
  }: {
    words: ProverbRow[];
    busy?: boolean;
    onCreate: (values: Values) => void | Promise<void>;
    onUpdate: (id: string, patch: Partial<ProverbRow>) => void | Promise<void>;
    onDelete: (word: ProverbRow) => void | Promise<void>;
  } = $props();

  let term = $state('');
  let meaning = $state('');
  let meaningVi = $state('');
  let example = $state('');
  let forms = $state('');
  let query = $state('');

  const splitForms = (text: string) =>
    text
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return words;
    return words.filter((w) => w.term.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q));
  });

  const create = async () => {
    if (!term.trim() || !meaning.trim()) return;
    await onCreate({
      term: term.trim(),
      meaning: meaning.trim(),
      meaning_vi: meaningVi.trim(),
      example: example.trim(),
      forms: splitForms(forms),
    });
    term = meaning = meaningVi = example = forms = '';
  };
</script>

<section class="words">
  <header>
    <h2>Hard words</h2>
    <p class="hint">
      One list for every game. Whenever one of these words appears in a game's dialogue, notes or
      explanations, the player underlines it and shows the definition on hover (or tap).
      Common endings (<em>-s, -ed, -ing, -ly</em>) are matched automatically, so only list an unusual
      spelling under “Other spellings”.
    </p>
  </header>

  <form
    class="card add"
    onsubmit={(e) => {
      e.preventDefault();
      create();
    }}
  >
    <h3>Add a word</h3>
    <div class="fields">
      <label>
        <span>Word or phrase</span>
        <input bind:value={term} placeholder="skedaddle" required />
      </label>
      <label>
        <span>Definition (English)</span>
        <input bind:value={meaning} placeholder="To run away quickly" required />
      </label>
      <label>
        <span>Definition (Vietnamese)</span>
        <input bind:value={meaningVi} placeholder="nghĩa tiếng Việt" />
      </label>
      <label>
        <span>Example sentence (optional)</span>
        <input bind:value={example} placeholder="The kids skedaddled when the teacher came." />
      </label>
      <label>
        <span>Other spellings (comma-separated, optional)</span>
        <input bind:value={forms} placeholder="skedaddling, skedaddled" />
      </label>
    </div>
    <button class="btn small" type="submit" disabled={busy || !term.trim() || !meaning.trim()}>Add word</button>
  </form>

  <input class="find" bind:value={query} placeholder={`Find a word (${words.length})`} />

  {#if !words.length}
    <p class="hint">No words yet.</p>
  {/if}

  <ul>
    {#each shown as w (w.id)}
      <li class="card">
        <div class="head">
          <strong>{w.term}</strong>
          <button
            type="button"
            class="btn secondary small"
            onclick={() => confirm(`Delete “${w.term}” from the word list? Every game stops linking it.`) && onDelete(w)}
          >
            Delete
          </button>
        </div>
        <div class="fields">
          <label>
            <span>Word or phrase</span>
            <input value={w.term} onchange={(e) => e.currentTarget.value.trim() && onUpdate(w.id, { term: e.currentTarget.value.trim() })} />
          </label>
          <label>
            <span>Definition (English)</span>
            <input value={w.meaning} onchange={(e) => e.currentTarget.value.trim() && onUpdate(w.id, { meaning: e.currentTarget.value.trim() })} />
          </label>
          <label>
            <span>Definition (Vietnamese)</span>
            <input value={w.meaning_vi ?? ''} placeholder="nghĩa tiếng Việt" onchange={(e) => onUpdate(w.id, { meaning_vi: e.currentTarget.value.trim() || null })} />
          </label>
          <label>
            <span>Example sentence</span>
            <input value={w.example ?? ''} onchange={(e) => onUpdate(w.id, { example: e.currentTarget.value.trim() || null })} />
          </label>
          <label>
            <span>Other spellings</span>
            <input value={(w.forms ?? []).join(', ')} onchange={(e) => onUpdate(w.id, { forms: splitForms(e.currentTarget.value) })} />
          </label>
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .words { display: grid; gap: .8rem; }
  header h2 { font-size: 1.15rem; text-transform: uppercase; margin: 0 0 .2rem; }
  h3 { font-size: .95rem; text-transform: uppercase; margin: 0; }
  .hint { margin: 0; font-size: .88rem; opacity: .8; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .7rem; }
  .card { border: 2px solid rgb(59 57 83 / .25); border-radius: .7rem; padding: .7rem; display: grid; gap: .5rem; background: var(--cream); }
  .add { border-style: dashed; border-color: var(--brown); }
  .head { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .5rem; }
  label { display: grid; gap: .2rem; font-size: .82rem; font-weight: 600; }
  input { font: inherit; font-size: .95rem; padding: .35rem .5rem; border: 2px solid var(--brown); border-radius: .45rem; background: var(--cream); color: var(--ink); width: 100%; min-width: 0; }
  .find { max-width: 24rem; }
  .small { font-size: .85rem; padding: .3rem .8rem; justify-self: start; }
</style>
