<script lang="ts">
  import { untrack } from 'svelte';
  import type { Presentation } from '../lib/types';
  import { uploadArt } from '../lib/remote';
  import { emptyPresentation, keyFrom, withCharacter, withStage, withoutCharacter, withoutStage } from '../lib/look';

  let {
    presentation,
    gameSlug = 'game',
    saving = false,
    onSave,
  }: {
    presentation: Presentation | null;
    gameSlug?: string;
    saving?: boolean;
    onSave: (next: Presentation) => void | Promise<void>;
  } = $props();

  // Edit a copy; the panel writes once, on Save.
  const snapshot = (p: Presentation | null): Presentation => ({
    ...emptyPresentation(),
    ...(p ?? {}),
    stages: { ...(p?.stages ?? {}) },
    characters: { ...(p?.characters ?? {}) },
    props: { ...(p?.props ?? {}) },
    items: { ...(p?.items ?? {}) },
    scenes: [...(p?.scenes ?? [])],
  });

  let draft = $state<Presentation>(untrack(() => snapshot(presentation)));
  $effect(() => {
    draft = snapshot(presentation);
  });

  let uploading = $state('');
  let uploadError = $state('');
  let stageKeyInput = $state('');
  let characterKeyInput = $state('');
  const stages = $derived(Object.entries(draft.stages ?? {}));
  const characters = $derived(Object.entries(draft.characters ?? {}));

  const upload = async (event: Event, apply: (url: string) => void) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = file.name;
    uploadError = '';
    try {
      apply(await uploadArt(file, gameSlug));
    } catch (e) {
      uploadError = (e as Error).message;
    } finally {
      uploading = '';
    }
  };

  const addStage = () => {
    const key = keyFrom(stageKeyInput, Object.keys(draft.stages), 'stage');
    draft.stages = { ...draft.stages, [key]: { background: '', ground: 90, dialogue: 'bottom' } };
    stageKeyInput = '';
  };

  const renameStage = (from: string, to: string) => {
    if (!to.trim() || (to !== from && to in draft.stages)) return;
    draft = withStage(draft, from, to.trim(), draft.stages[from]);
  };

  const addCharacter = () => {
    const key = keyFrom(characterKeyInput, Object.keys(draft.characters), 'character');
    draft.characters = { ...draft.characters, [key]: { image: '', width: 34 } };
    characterKeyInput = '';
  };

  const renameCharacter = (from: string, to: string) => {
    if (!to.trim() || (to !== from && to in draft.characters)) return;
    draft = withCharacter(draft, from, to.trim(), draft.characters[from]);
  };

  const setDialogue = (id: string, value: string) => {
    const stage = draft.stages[id];
    if (!stage) return;
    draft.stages = {
      ...draft.stages,
      [id]: { ...stage, dialogue: (value === 'top' || value === 'center' ? value : 'bottom') as 'top' | 'center' | 'bottom' },
    };
  };
</script>

<section class="design">
  <header>
    <h2>Look of the game</h2>
    <p class="hint">
      Stages are the artwork behind a group of screens. Characters are the sprites that stand on it.
      Set a character's <strong>Left</strong> and <strong>Top</strong> to place it like the design deck: a large sprite
      that runs past the bottom edge, so only the upper body shows, standing in front of the dialogue box.
      Leave them empty to stand the sprite on the ground line. Which screen uses which stage, and which sprite
      is on screen (swap Minh's outfit or mood per screen), is set in the Story tab.
    </p>
  </header>

  <fieldset>
    <legend>Stages</legend>
    {#if !stages.length}
      <p class="hint">No stages yet: every screen falls back to the green placeholder landscape.</p>
    {/if}
    {#each stages as [id, stage] (id)}
      <div class="card">
        <div class="row">
          <label class="grow">
            <span>Name</span>
            <input value={id} onchange={(e) => renameStage(id, e.currentTarget.value)} />
          </label>
          <label>
            <span>Where characters stand (% from top)</span>
            <input type="number" min="40" max="100" value={stage.ground ?? 90} oninput={(e) => (stage.ground = Number(e.currentTarget.value) || 90)} />
          </label>
          <label>
            <span>Text position</span>
            <select value={stage.dialogue ?? 'bottom'} onchange={(e) => setDialogue(id, e.currentTarget.value)}>
              <option value="bottom">Bottom</option>
              <option value="center">Middle</option>
              <option value="top">Top</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label class="grow">
            <span>Artwork address</span>
            <input bind:value={stage.background} placeholder="/games/my-game/room.webp" />
          </label>
          <label class="upload">
            <span>…or upload</span>
            <input type="file" accept="image/*" onchange={(e) => upload(e, (url) => (stage.background = url))} />
          </label>
          <button type="button" class="btn secondary small" onclick={() => (draft = withoutStage(draft, id))}>Remove</button>
        </div>
        <label>
          <span>Description for screen readers</span>
          <input bind:value={stage.alt} placeholder="Minh's bedroom: shelves, a window and a desk" />
        </label>
        {#if stage.background}
          <img class="thumb wide" src={stage.background} alt="" />
        {/if}
      </div>
    {/each}
    <div class="add">
      <input bind:value={stageKeyInput} placeholder="New stage name (e.g. campus)" />
      <button type="button" class="btn secondary small" onclick={addStage} disabled={!stageKeyInput.trim()}>Add stage</button>
    </div>
  </fieldset>

  <fieldset>
    <legend>Characters</legend>
    {#if !characters.length}
      <p class="hint">No characters yet. Add Minh and Dr. Bird, then place them screen by screen.</p>
    {/if}
    {#each characters as [id, character] (id)}
      <div class="card">
        <div class="row">
          <label class="grow">
            <span>Name</span>
            <input value={id} onchange={(e) => renameCharacter(id, e.currentTarget.value)} />
          </label>
          <label>
            <span>Width (% of the stage)</span>
            <input type="number" min="5" max="150" value={character.width} oninput={(e) => (character.width = Number(e.currentTarget.value) || 30)} />
          </label>
          <label>
            <span>Left (% of stage)</span>
            <input type="number" step="0.1" value={character.left ?? ''} placeholder="auto" oninput={(e) => (character.left = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} />
          </label>
          <label>
            <span>Top (% of stage)</span>
            <input type="number" step="0.1" value={character.top ?? ''} placeholder="on the ground" oninput={(e) => (character.top = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} />
          </label>
          <label>
            <span>Text keeps clear at (% of stage)</span>
            <input type="number" step="0.1" value={character.clear ?? ''} placeholder="auto" oninput={(e) => (character.clear = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} />
          </label>
          <button type="button" class="btn secondary small" onclick={() => (draft = withoutCharacter(draft, id))}>Remove</button>
        </div>
        <div class="row">
          <label class="grow">
            <span>Sprite address</span>
            <input bind:value={character.image} placeholder="/games/my-game/minh.webp" />
          </label>
          <label class="upload">
            <span>…or upload</span>
            <input type="file" accept="image/*" onchange={(e) => upload(e, (url) => (character.image = url))} />
          </label>
        </div>
        <label>
          <span>Description for screen readers</span>
          <input bind:value={character.alt} placeholder="Minh, pleased" />
        </label>
        {#if character.image}
          <img class="thumb" src={character.image} alt="" />
        {/if}
      </div>
    {/each}
    <div class="add">
      <input bind:value={characterKeyInput} placeholder="New character name (e.g. minh)" />
      <button type="button" class="btn secondary small" onclick={addCharacter} disabled={!characterKeyInput.trim()}>Add character</button>
    </div>
  </fieldset>

  {#if uploading}<p class="hint">Uploading {uploading}…</p>{/if}
  {#if uploadError}<p class="bad">{uploadError}</p>{/if}

  <div class="actions">
    <button class="btn" onclick={() => onSave(draft)} disabled={saving}>{saving ? 'Saving…' : 'Save design'}</button>
    <button class="btn secondary" onclick={() => (draft = snapshot(presentation))} disabled={saving}>Reset</button>
  </div>
</section>

<style>
  .design { display: grid; gap: 1rem; }
  header h2 { font-size: 1.15rem; text-transform: uppercase; margin: 0 0 .2rem; }
  .hint { margin: 0; font-size: .88rem; opacity: .8; }
  fieldset { border: 2px dashed var(--brown); border-radius: .9rem; padding: .9rem; display: grid; gap: .7rem; }
  legend { font-size: .9rem; letter-spacing: .06em; text-transform: uppercase; padding: 0 .4rem; }
  .card { border: 2px solid rgb(59 57 83 / .25); border-radius: .7rem; padding: .7rem; display: grid; gap: .5rem; background: var(--cream); }
  .row { display: flex; gap: .6rem; flex-wrap: wrap; align-items: end; }
  .row > label { flex: 0 1 10rem; }
  .row > label.grow { flex: 1 1 14rem; }
  label { display: grid; gap: .2rem; font-size: .82rem; font-weight: 600; }
  input, select { font: inherit; font-size: .95rem; padding: .35rem .5rem; border: 2px solid var(--brown); border-radius: .45rem; background: var(--cream); color: var(--ink); width: 100%; }
  .upload input { border: none; background: none; padding: 0; }
  .thumb { width: 6rem; height: auto; border-radius: .4rem; border: 2px solid rgb(59 57 83 / .3); }
  .thumb.wide { width: 100%; max-width: 26rem; }
  .add { display: flex; gap: .5rem; flex-wrap: wrap; }
  .add input { flex: 1 1 14rem; }
  .actions { display: flex; gap: .6rem; }
  .small { font-size: .85rem; padding: .3rem .8rem; }
  .bad { color: var(--danger); font-weight: 600; margin: 0; }
</style>