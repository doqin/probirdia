<script lang="ts">
  import type { ProverbRow, SceneRow } from '../lib/remote';
  import { uploadArt } from '../lib/remote';
  import { slugify } from '../lib/slug';
  import type { SceneLook } from '../lib/look';
  import { untrack } from 'svelte';

  let {
    scene,
    scenes,
    proverbs,
    chapters = [],
    stages = [],
    characters = [],
    look = { stage: '', left: null, right: null },
    gameSlug = 'game',
    saving = false,
    onSave,
    onDelete,
  }: {
    scene: SceneRow;
    scenes: SceneRow[];
    proverbs: ProverbRow[];
    chapters?: string[];
    stages?: string[];
    characters?: string[];
    look?: SceneLook;
    gameSlug?: string;
    saving?: boolean;
    onSave: (scene: SceneRow, look: SceneLook) => void | Promise<void>;
    onDelete: (scene: SceneRow) => void | Promise<void>;
  } = $props();

  // Edit a copy, so a half-finished change never leaks into the list.
  // `scene` arrives as a Svelte $state proxy, which structuredClone refuses to
  // clone, so take a plain snapshot first.
  let draft = $state<SceneRow>(untrack(() => $state.snapshot(scene)));
  let draftLook = $state<SceneLook>(untrack(() => ({ ...look })));
  $effect(() => {
    draft = $state.snapshot(scene);
  });
  $effect(() => {
    draftLook = { ...look };
  });

  let uploading = $state(false);
  let uploadError = $state('');

  const targets = $derived(scenes.map((s) => s.key).filter((k) => k !== draft.key));

  const addChoice = () => {
    if (draft.choices.length < 4) {
      draft.choices = [...draft.choices, { label: '', next_key: targets[0] ?? '' }];
    }
  };
  const removeChoice = (index: number) => {
    draft.choices = draft.choices.filter((_, i) => i !== index);
  };
  const markCorrect = (index: number) => {
    draft.choices = draft.choices.map((c, i) => ({ ...c, correct: i === index }));
  };

  /** Turns the heading or the first words of the text into a unique screen name. */
  const keyFromText = () => {
    const source = draft.heading || draft.text || 'screen';
    const base = slugify(source).split('-').slice(0, 4).join('-') || 'screen';
    const taken = new Set(scenes.map((s) => s.key).filter((k) => k !== scene.key));
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) candidate = `${base}-${n++}`;
    draft.key = candidate;
  };

  const upload = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    uploadError = '';
    try {
      draft.image = await uploadArt(file, gameSlug);
    } catch (e) {
      uploadError = (e as Error).message;
    } finally {
      uploading = false;
    }
  };
</script>

<form class="scene" onsubmit={(e) => { e.preventDefault(); onSave(draft, draftLook); }}>
  <div class="row">
    <label class="wide">
      <span>Name of this screen</span>
      <span class="with-button">
        <input bind:value={draft.key} required pattern="[a-z0-9_-]+" />
        <button type="button" class="btn secondary small" onclick={keyFromText}>From text</button>
      </span>
      <small>Other screens point to this name. Short and lowercase: <code>intro1</code>, <code>scam</code>.</small>
    </label>
    <label>
      <span>Kind of screen</span>
      <select bind:value={draft.phase}>
        <option value="game">Story (the game)</option>
        <option value="title">Title — the opening card with PLAY</option>
        <option value="divider">Chapter divider</option>
        <option value="preview">Preview (learn the proverbs)</option>
        <option value="review">Review (fill in the blanks)</option>
        <option value="gameover">Game over — shown when the hearts run out</option>
      </select>
    </label>
    <label>
      <span>Chapter</span>
      <input bind:value={draft.chapter} list="chapter-list" placeholder="Finding the Campus" />
      <datalist id="chapter-list">
        {#each chapters as chapter (chapter)}
          <option value={chapter}></option>
        {/each}
      </datalist>
    </label>
  </div>

  <label>
    <span>Text the player reads</span>
    <textarea bind:value={draft.text} rows="3"></textarea>
    <small>Wrap a proverb in double brackets to make it hoverable: <code>[[better late than never]]</code>.</small>
  </label>
  <label>
    <span>Text (Vietnamese, optional)</span>
    <textarea bind:value={draft.text_vi} rows="2"></textarea>
  </label>

  <div class="row">
    <label>
      <span>Who is speaking / heading (optional)</span>
      <input bind:value={draft.heading} placeholder="Minh" />
    </label>
    <label>
      <span>Heading (Vietnamese)</span>
      <input bind:value={draft.heading_vi} />
    </label>
  </div>

  <div class="row">
    <label>
      <span>Note (optional)</span>
      <input bind:value={draft.note} />
    </label>
    <label>
      <span>Note in plain words (optional)</span>
      <input bind:value={draft.note_simple} />
    </label>
  </div>

  <fieldset class="art">
    <legend>Stage</legend>
    <div class="row">
      <label>
        <span>Artwork behind this screen</span>
        <select bind:value={draftLook.stage}>
          <option value="">(the game's default)</option>
          {#each stages as key (key)}
            <option value={key}>{key}</option>
          {/each}
        </select>
      </label>
      <label>
        <span>On the left</span>
        <select bind:value={draftLook.left}>
          <option value={null}>(nobody)</option>
          {#each characters as key (key)}
            <option value={key}>{key}</option>
          {/each}
        </select>
      </label>
      <label>
        <span>On the right</span>
        <select bind:value={draftLook.right}>
          <option value={null}>(nobody)</option>
          {#each characters as key (key)}
            <option value={key}>{key}</option>
          {/each}
        </select>
      </label>
    </div>
    <small>Stages and characters are listed in the Look tab.</small>
  </fieldset>

  <fieldset class="art">
    <legend>Picture for this screen</legend>
    <div class="art-row">
      {#if draft.image}
        <img class="thumb" src={draft.image} alt={draft.image_alt ?? ''} />
      {:else}
        <div class="thumb empty">no picture</div>
      {/if}
      <div class="art-fields">
        <label>
          <span>Image address</span>
          <input bind:value={draft.image} placeholder="https://… or /games/my-game/art.webp" />
        </label>
        <label>
          <span>Description (for screen readers)</span>
          <input bind:value={draft.image_alt} />
        </label>
        <label class="upload">
          <span>…or upload a file</span>
          <input type="file" accept="image/*" onchange={upload} disabled={uploading} />
        </label>
        {#if uploading}<small>Uploading…</small>{/if}
        {#if uploadError}<small class="bad">{uploadError}</small>{/if}
      </div>
    </div>
    <small>Uploaded pictures go to the public <code>art</code> bucket. Without one, the screen uses the game's default landscape.</small>
  </fieldset>

  <div class="row">
    <label>
      <span>Continue to</span>
      <select bind:value={draft.next_key}>
        <option value={null}>(no Continue button)</option>
        {#each targets as key (key)}
          <option value={key}>{key}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Position</span>
      <input type="number" bind:value={draft.position} min="0" />
    </label>
  </div>

  <fieldset class="choices">
    <legend>Choices</legend>
    {#if draft.choices.length === 0}
      <p class="hint">No choices: this is a story screen, the player just reads it.</p>
    {/if}
    {#each draft.choices as choice, index (index)}
      <div class="choice">
        <label class="wide">
          <span>Button text</span>
          <input bind:value={choice.label} placeholder="leave empty to use a proverb" />
        </label>
        <label class="wide">
          <span>…or a proverb</span>
          <select bind:value={choice.proverb_id}>
            <option value={undefined}>(none)</option>
            {#each proverbs as p (p.id)}
              <option value={p.id}>{p.term}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>Goes to</span>
          <select bind:value={choice.next_key}>
            {#each targets as key (key)}
              <option value={key}>{key}</option>
            {/each}
          </select>
        </label>
        <label class="correct">
          <input type="radio" name="correct-{draft.key}" checked={choice.correct === true} onchange={() => markCorrect(index)} />
          <span>Right answer</span>
        </label>
        <button type="button" class="btn secondary small" onclick={() => removeChoice(index)}>Remove</button>
      </div>
    {/each}
    {#if draft.choices.length < 4}
      <button type="button" class="btn secondary small" onclick={addChoice}>Add a choice</button>
    {/if}
  </fieldset>

  <div class="actions">
    <button class="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save screen'}</button>
    <button type="button" class="btn secondary" onclick={() => onDelete(draft)}>Delete screen</button>
    {#if draft.next_key === null && draft.choices.length === 0}
      <span class="hint">Ending: the story stops here and shows the recap.</span>
    {/if}
  </div>
</form>

<style>
  .scene { display: grid; gap: .9rem; }
  .row { display: flex; flex-wrap: wrap; gap: .9rem; }
  .row > label { flex: 1 1 12rem; }
  label { display: grid; gap: .25rem; font-weight: 600; }
  label > span { font-size: .85rem; }
  input, select, textarea { font: inherit; padding: .45rem .55rem; border: 2px solid var(--brown); border-radius: .5rem; background: var(--cream); color: var(--ink); width: 100%; }
  textarea { resize: vertical; }
  small, .hint { font-weight: 400; font-size: .78rem; opacity: .75; }
  small.bad { color: var(--danger); opacity: 1; font-weight: 600; }
  code { background: rgba(0,0,0,.08); padding: 0 .2rem; border-radius: .2rem; }
  .with-button { display: flex; gap: .4rem; align-items: center; }
  .with-button input { flex: 1; }
  .choices, .art { border: 2px dashed var(--brown); border-radius: .75rem; padding: .75rem; display: grid; gap: .6rem; }
  legend { font-weight: 700; padding: 0 .4rem; }
  .choice { display: flex; flex-wrap: wrap; align-items: end; gap: .6rem; padding-bottom: .6rem; border-bottom: 1px solid rgba(0,0,0,.12); }
  .choice .wide { flex: 1 1 14rem; }
  .correct { flex-direction: row; align-items: center; gap: .35rem; font-weight: 600; }
  .correct input { width: auto; }
  .art-row { display: flex; gap: .8rem; align-items: start; flex-wrap: wrap; }
  .art-fields { flex: 1 1 16rem; display: grid; gap: .5rem; }
  .thumb { width: 9rem; height: 5.1rem; object-fit: cover; border-radius: .4rem; border: 2px solid rgba(0,0,0,.15); background: var(--parchment); }
  .thumb.empty { display: grid; place-items: center; font-size: .75rem; opacity: .6; }
  .upload input { border: none; background: none; padding: 0; }
  .actions { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
  .small { font-size: .85rem; padding: .35rem .7rem; }
</style>
