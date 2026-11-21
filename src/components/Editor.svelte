<script lang="ts">
  import { onMount } from 'svelte';
  import type { Session } from '@supabase/supabase-js';
  import SceneEditor from './SceneEditor.svelte';
  import ProverbPanel from './ProverbPanel.svelte';
  import { supabase, supabaseConfigured } from '../lib/supabase';
  import {
    amAnEditor,
    attachProverb,
    createGame,
    deleteScene,
    detachProverb,
    fetchEditorData,
    fetchEditorGames,
    saveProverb,
    saveScene,
    saveWhyItFits,
    setGameStatus,
    signInWithEmail,
    signOut,
    slugById,
    toGame,
    updateGame,
    proverbSlug,
    type EditorData,
    type GameRow,
    type SceneRow,
  } from '../lib/remote';
  import { validateGame } from '../lib/validate-game';
  import { slugify } from '../lib/slug';
  import { NO_CHAPTER, filterScenes, groupByChapter, orderScenes, positionBetween } from '../lib/scene-list';

  let session = $state<Session | null>(null);
  let checking = $state(true);
  let isEditor = $state(false);
  let email = $state('');
  let linkSent = $state(false);
  let error = $state('');
  let busy = $state(false);

  let games = $state<GameRow[]>([]);
  let data = $state<EditorData | null>(null);
  let tab = $state<'story' | 'proverbs' | 'settings' | 'check'>('story');
  let sceneId = $state<string | null>(null);
  let notice = $state('');
  let search = $state('');
  let bulkText = $state('');
  let bulkChapter = $state('');
  let bulkPhase = $state<'preview' | 'game' | 'review'>('game');

  let newSlug = $state('');
  let newTitle = $state('');

  const game = $derived(data ? toGame(data.game, data.scenes, slugById(data.proverbs)) : null);
  const known = $derived(new Set((data?.proverbs ?? []).map((p) => proverbSlug(p.term))));
  const problems = $derived(game ? validateGame(game, known) : []);
  const scene = $derived(
    data ? (data.scenes.find((s) => s.id === sceneId) ?? data.scenes[0] ?? null) : null,
  );
  const counts = $derived({
    preview: data?.scenes.filter((s) => s.phase === 'preview').length ?? 0,
    game: data?.scenes.filter((s) => s.phase === 'game').length ?? 0,
    review: data?.scenes.filter((s) => s.phase === 'review').length ?? 0,
  });

  /** Screens in playing order. */
  const ordered = $derived(orderScenes(data?.scenes ?? []));

  /** Chapter names, in the order they first appear. */
  const chapters = $derived([
    ...new Set(
      ordered.map((s) => s.chapter?.trim()).filter((name): name is string => Boolean(name)),
    ),
  ]);

  const visibleScenes = $derived(filterScenes(ordered, search));

  /** The scene list, grouped by chapter, in playing order. */
  const groups = $derived(groupByChapter(visibleScenes));

  const nextPosition = () => (ordered.length ? Math.max(...ordered.map((s) => s.position)) + 1 : 0);

  const uniqueKey = (base: string) => {
    const clean = base || 'screen';
    const taken = new Set(ordered.map((s) => s.key));
    if (!taken.has(clean)) return clean;
    let n = 2;
    while (taken.has(`${clean}-${n}`)) n++;
    return `${clean}-${n}`;
  };

  const say = (message: string) => {
    notice = message;
    setTimeout(() => (notice = ''), 4000);
  };

  async function loadGames() {
    games = await fetchEditorGames();
    if (!data && games.length) await openGame(games[0].id);
  }

  async function openGame(id: string) {
    busy = true;
    try {
      data = await fetchEditorData(id);
      sceneId = data.scenes[0]?.id ?? null;
      tab = 'story';
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function refresh() {
    if (data) {
      const key = scene?.key;
      data = await fetchEditorData(data.game.id);
      sceneId = data.scenes.find((s) => s.key === key)?.id ?? data.scenes[0]?.id ?? null;
    }
    games = await fetchEditorGames();
  }

  async function guard(action: () => Promise<void>) {
    busy = true;
    error = '';
    try {
      await action();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function saveSceneRow(row: SceneRow) {
    await guard(async () => {
      await saveScene(row);
      await refresh();
      say('Screen saved.');
    });
  }

  async function removeSceneRow(row: SceneRow) {
    if (!confirm(`Delete the screen "${row.key}"? Any screen pointing to it will need a new target.`)) return;
    await guard(async () => {
      await deleteScene(row.id);
      sceneId = null;
      await refresh();
      say('Screen deleted.');
    });
  }

  async function addScene(chapter = '') {
    if (!data) return;
    const key = uniqueKey(chapter ? slugify(chapter).slice(0, 24) : 'screen');
    const position = nextPosition();
    await guard(async () => {
      const created = await saveScene({
        game_id: data!.game.id,
        key,
        phase: 'game',
        position,
        chapter: chapter.trim() || null,
        chapter_vi: null,
        heading: null,
        heading_vi: null,
        text: '',
        text_vi: null,
        note: null,
        note_vi: null,
        note_simple: null,
        note_simple_vi: null,
        image: null,
        image_alt: null,
        gives: [],
        status: [],
        clears: [],
        next_key: null,
        choices: [],
        routes: [],
      });
      await refresh();
      sceneId = created.id;
      tab = 'story';
      say('Screen added — give it some text and a picture.');
    });
  }

  /** Copies a screen, placing the copy directly after it in the list. */
  async function duplicateScene(row: SceneRow) {
    const list = ordered;
    const index = list.findIndex((s) => s.id === row.id);
    const position = positionBetween(row.position, list[index + 1]?.position);
    await guard(async () => {
      const { id: _id, ...rest } = $state.snapshot(row);
      const created = await saveScene({ ...rest, key: uniqueKey(`${row.key}-copy`), position });
      await refresh();
      sceneId = created.id;
      say('Screen duplicated.');
    });
  }

  /** Moves a screen one place up or down. Half-way positions keep it a single write. */
  async function moveScene(row: SceneRow, direction: -1 | 1) {
    const list = ordered;
    const index = list.findIndex((s) => s.id === row.id);
    const neighbour = list[index + direction];
    if (!neighbour) return;
    const beyond = list[index + direction * 2];
    const position =
      direction === -1
        ? positionBetween(beyond?.position, neighbour.position)
        : positionBetween(neighbour.position, beyond?.position);
    await guard(async () => {
      await saveScene({ ...$state.snapshot(row), position });
      await refresh();
    });
  }

  /**
   * Bulk authoring: one line per screen. A line may be written as
   * "Minh: I can't find the campus" to set the speaker.
   * The screens are created in order and chained with Continue buttons.
   */
  async function bulkAdd() {
    if (!data) return;
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    await guard(async () => {
      const used = new Set(ordered.map((s) => s.key));
      const created: SceneRow[] = [];
      const startPosition = nextPosition();

      for (const [index, line] of lines.entries()) {
        const match = line.match(/^([A-Z][^:]{0,30}):\s*(.+)$/);
        const heading = match ? match[1].trim() : null;
        const body = match ? match[2].trim() : line;

        const base = slugify(body).split('-').slice(0, 5).join('-') || `screen-${index + 1}`;
        let key = base;
        let n = 2;
        while (used.has(key)) key = `${base}-${n++}`;
        used.add(key);

        created.push(
          await saveScene({
            game_id: data!.game.id,
            key,
            phase: bulkPhase,
            position: startPosition + index,
            chapter: bulkChapter.trim() || null,
            chapter_vi: null,
            heading,
            heading_vi: null,
            text: body,
            text_vi: null,
            note: null,
            note_vi: null,
            note_simple: null,
            note_simple_vi: null,
            image: null,
            image_alt: null,
            gives: [],
            status: [],
            clears: [],
            next_key: null,
            choices: [],
            routes: [],
          }),
        );
      }

      // Chain them: each screen continues to the next, the last one ends.
      for (let i = 0; i < created.length - 1; i++) {
        await saveScene({ ...created[i], next_key: created[i + 1].key });
      }

      await refresh();
      sceneId = created[0]?.id ?? sceneId;
      bulkText = '';
      say(`${created.length} screens added to ${bulkChapter || 'no chapter'}.`);
    });
  }

  async function publish() {
    if (!data) return;
    if (problems.length) {
      tab = 'check';
      say('Fix the problems first — publishing is blocked while they exist.');
      return;
    }
    await guard(async () => {
      await setGameStatus(data!.game.id, data!.game.status === 'published' ? 'draft' : 'published');
      await refresh();
      say(data!.game.status === 'published' ? 'Unpublished — players no longer see it.' : 'Published — players see it now.');
    });
  }

  async function makeGame() {
    if (!newSlug.trim() || !newTitle.trim()) return;
    await guard(async () => {
      const created = await createGame(newSlug.trim(), newTitle.trim());
      newSlug = newTitle = '';
      await loadGames();
      await openGame(created.id);
    });
  }

  onMount(() => {
    if (!supabase) {
      checking = false;
      return;
    }
    supabase.auth.onAuthStateChange(async (_event, next) => {
      session = next;
      if (next) {
        try {
          isEditor = await amAnEditor();
          if (isEditor) await loadGames();
        } catch (e) {
          error = (e as Error).message;
        }
      } else {
        isEditor = false;
        data = null;
      }
      checking = false;
    });
    supabase.auth.getSession().then(async ({ data: current }) => {
      session = current.session;
      if (current.session) {
        try {
          isEditor = await amAnEditor();
          if (isEditor) await loadGames();
        } catch (e) {
          error = (e as Error).message;
        }
      }
      checking = false;
    });
  });

  const sendLink = async () => {
    error = '';
    try {
      await signInWithEmail(email.trim());
      linkSent = true;
    } catch (e) {
      error = (e as Error).message;
    }
  };
</script>

<section class="editor">
  {#if !supabaseConfigured}
    <div class="panel">
      <h1 class="page-title">Content studio</h1>
      <p>The content database is not connected yet. Once it is, this page is where the team writes games:</p>
      <ol>
        <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
        <li>Open <strong>SQL Editor</strong> and run <code>supabase/migrations/0001_init.sql</code>, then <code>0002_scene_chapter_and_art.sql</code>.</li>
        <li>Copy <code>Project URL</code> and the <code>publishable</code> key (formerly <code>anon</code>) from Settings → API keys into <code>.env</code>.</li>
        <li>Reload this page, sign in with your email, then add yourself to the <code>editor</code> table (SQL is at the bottom of the migration).</li>
      </ol>
    </div>
  {:else if checking}
    <p>Checking your session…</p>
  {:else if !session}
    <div class="panel login">
      <h1 class="page-title">Content studio</h1>
      {#if linkSent}
        <p>Check your email — the sign-in link is on its way.</p>
      {:else}
        <p>Sign in with the email your team lead added to the editor list.</p>
        <label>
          <span>Email</span>
          <input type="email" bind:value={email} placeholder="you@example.com" onkeydown={(e) => e.key === 'Enter' && sendLink()} />
        </label>
        <button class="btn" onclick={sendLink} disabled={!email.includes('@')}>Email me a sign-in link</button>
      {/if}
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {:else if !isEditor}
    <div class="panel">
      <p>You are signed in as {session.user.email}, but this account is not on the editor list yet.</p>
      <p>Ask whoever set up the content database to run the “make somebody an editor” SQL at the bottom of the migration.</p>
      <button class="btn secondary" onclick={() => signOut()}>Sign out</button>
    </div>
  {:else}
    <header class="topbar">
      <div>
        <h1 class="page-title">Content studio</h1>
        <p class="who">{session.user.email} · <button class="link" onclick={() => signOut()}>sign out</button></p>
      </div>
      <div class="top-actions">
        {#if data}
          <span class="badge" class:live={data.game.status === 'published'}>
            {data.game.status === 'published' ? 'Live' : 'Draft'}
          </span>
          <a class="btn secondary small" href={`./play/?g=${data.game.slug}&draft=1`} target="_blank" rel="noreferrer">Preview draft</a>
          {#if data.game.status === 'published'}
            <a class="btn secondary small" href={`./play/?g=${data.game.slug}`} target="_blank" rel="noreferrer">Play</a>
          {/if}
          <button class="btn" onclick={publish} disabled={busy}>
            {data.game.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        {/if}
      </div>
    </header>

    {#if notice}<p class="notice">{notice}</p>{/if}
    {#if error}<p class="error">{error}</p>{/if}

    <div class="layout">
      <aside>
        <h2>Games</h2>
        <ul class="games">
          {#each games as row (row.id)}
            <li>
              <button class="game" class:active={row.id === data?.game.id} onclick={() => openGame(row.id)}>
                {row.title || row.slug}
                <small>{row.status === 'published' ? 'live' : 'draft'}</small>
              </button>
            </li>
          {/each}
        </ul>
        <div class="new-game">
          <input bind:value={newTitle} placeholder="New game title" />
          <input bind:value={newSlug} placeholder="web-address (lowercase-dashes)" />
          <button class="btn small" onclick={makeGame} disabled={!newTitle.trim() || !newSlug.trim()}>Create</button>
        </div>
      </aside>

      <div class="pane">
        {#if !data}
          <p>Pick a game, or create one.</p>
        {:else}
          <nav class="tabs">
            <button class:on={tab === 'story'} onclick={() => (tab = 'story')}>Story ({counts.game})</button>
            <button class:on={tab === 'proverbs'} onclick={() => (tab = 'proverbs')}>Proverbs ({data.used.length})</button>
            <button class:on={tab === 'settings'} onclick={() => (tab = 'settings')}>Settings</button>
            <button class:on={tab === 'check'} onclick={() => (tab = 'check')}>
              Check {problems.length ? `(${problems.length})` : '✓'}
            </button>
          </nav>

          {#if tab === 'story'}
            <div class="story">
              <div class="scenes">
                <input class="find" bind:value={search} placeholder={`Find a screen (${ordered.length})`} />
                {#each groups as group (group.chapter)}
                  <h3>
                    <span>{group.chapter} · {group.scenes.length}</span>
                    <button class="link" onclick={() => addScene(group.chapter === NO_CHAPTER ? '' : group.chapter)}>
                      + screen
                    </button>
                  </h3>
                  <ol>
                    {#each group.scenes as row (row.id)}
                      <li class:chosen={row.id === scene?.id}>
                        <button class="scene-link" class:active={row.id === scene?.id} onclick={() => (sceneId = row.id)}>
                          <span class="key">{row.key}</span>
                          <span class="preview">{row.text || row.heading || '(empty)'}</span>
                          {#if row.phase !== 'game'}<span class="tag">{row.phase}</span>{/if}
                          {#if row.image}<span class="tag art">art</span>{/if}
                        </button>
                        <span class="row-actions">
                          <button class="icon" title="Move up" onclick={() => moveScene(row, -1)}>↑</button>
                          <button class="icon" title="Move down" onclick={() => moveScene(row, 1)}>↓</button>
                          <button class="icon" title="Duplicate this screen" onclick={() => duplicateScene(row)}>⧉</button>
                        </span>
                      </li>
                    {/each}
                  </ol>
                {/each}
                {#if !visibleScenes.length}
                  <p class="hint">No screens match “{search}”.</p>
                {/if}
                <button class="btn secondary small" onclick={() => addScene()}>Add a screen</button>

                <details class="bulk">
                  <summary>Paste a script</summary>
                  <p class="hint">One screen per line. Write <code>Minh: …</code> to set who is speaking. The screens are chained with Continue buttons.</p>
                  <textarea bind:value={bulkText} rows="6" placeholder="Minh: I applied to UFLS weeks ago…&#10;Minh: All my friends have received theirs…&#10;Minh: What do I do, Prof. Bird?"></textarea>
                  <div class="bulk-row">
                    <label>
                      <span>Chapter</span>
                      <input bind:value={bulkChapter} placeholder="Finding the Campus" />
                    </label>
                    <label>
                      <span>Part</span>
                      <select bind:value={bulkPhase}>
                        <option value="preview">Preview</option>
                        <option value="game">Game</option>
                        <option value="review">Review</option>
                      </select>
                    </label>
                  </div>
                  <button class="btn small" onclick={bulkAdd} disabled={!bulkText.trim() || busy}>
                    Add {bulkText.split('\n').filter((line) => line.trim()).length} screens
                  </button>
                </details>
              </div>
              <div class="scene-form">
                {#if scene}
                  <SceneEditor
                    scene={scene}
                    scenes={data.scenes}
                    proverbs={data.proverbs}
                    chapters={chapters}
                    gameSlug={data.game.slug}
                    saving={busy}
                    onSave={saveSceneRow}
                    onDelete={removeSceneRow}
                  />
                {:else}
                  <p>No screens yet. Add the first one.</p>
                {/if}
              </div>
            </div>
          {:else if tab === 'proverbs'}
            <ProverbPanel
              proverbs={data.proverbs}
              used={data.used}
              onAttach={async (proverbId) => {
                await guard(async () => {
                  await attachProverb(data!.game.id, proverbId, data!.used.length);
                  await refresh();
                });
              }}
              onDetach={async (proverbId) => {
                await guard(async () => {
                  await detachProverb(data!.game.id, proverbId);
                  await refresh();
                });
              }}
              onUpdate={async (proverbId, patch) => {
                await guard(async () => {
                  await saveProverb({ id: proverbId, ...patch });
                  await refresh();
                  say('Proverb saved.');
                });
              }}
              onSaveWhy={async (proverbId, why) => {
                await guard(async () => {
                  await saveWhyItFits(data!.game.id, proverbId, why);
                  await refresh();
                  say('Explanation saved.');
                });
              }}
              onCreate={async (values) => {
                await guard(async () => {
                  const created = await saveProverb({ ...values, kind: 'proverb', forms: [] });
                  await attachProverb(data!.game.id, created.id, data!.used.length);
                  await refresh();
                  say('Proverb created and added.');
                });
              }}
            />
          {:else if tab === 'settings'}
            <form
              class="settings"
              onsubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget as HTMLFormElement);
                guard(async () => {
                  await updateGame(data!.game.id, {
                    title: String(form.get('title') ?? ''),
                    title_vi: String(form.get('title_vi') ?? '') || null,
                    summary: String(form.get('summary') ?? ''),
                    description: String(form.get('description') ?? ''),
                    thumbnail: String(form.get('thumbnail') ?? '') || null,
                    start_key: String(form.get('start_key') ?? '') || null,
                  });
                  await refresh();
                  say('Settings saved.');
                });
              }}
            >
              <label><span>Title</span><input name="title" value={data.game.title} required /></label>
              <label><span>Title (Vietnamese)</span><input name="title_vi" value={data.game.title_vi ?? ''} /></label>
              <label><span>One-line summary</span><input name="summary" value={data.game.summary} /></label>
              <label><span>Description</span><textarea name="description" rows="3">{data.game.description}</textarea></label>
              <label><span>Thumbnail address</span><input name="thumbnail" value={data.game.thumbnail ?? ''} placeholder="/games/my-game/thumbnail.webp" /></label>
              <label>
                <span>First screen</span>
                <select name="start_key">
                  <option value="">(the top of the list)</option>
                  {#each data.scenes as s (s.id)}
                    <option value={s.key} selected={s.key === data.game.start_key}>{s.key}</option>
                  {/each}
                </select>
              </label>
              <button class="btn" type="submit" disabled={busy}>Save settings</button>
            </form>
          {:else}
            <div class="check">
              {#if problems.length}
                <p class="hint">Publishing is blocked until these are fixed:</p>
                <ul>
                  {#each problems as problem, i (i)}<li>{problem}</li>{/each}
                </ul>
              {:else}
                <p class="ok">No problems found. This game is ready to publish.</p>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .editor { display: grid; gap: 1rem; }
  .panel { max-width: 40rem; margin: 2rem auto; display: grid; gap: .8rem; }
  .login label { display: grid; gap: .25rem; font-weight: 600; }
  .login input { font: inherit; width: 100%; padding: .5rem .6rem; border: 2px solid var(--brown); border-radius: .5rem; background: var(--cream); color: var(--ink); }
  .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
  .topbar h1 { text-align: left; margin: 0; }
  .who { margin: .2rem 0 0; font-size: .85rem; opacity: .8; }
  .top-actions { display: flex; gap: .5rem; align-items: center; }
  .badge { font-size: .8rem; font-weight: 700; text-transform: uppercase; padding: .25rem .55rem; border-radius: 999px; background: var(--pill); }
  .badge.live { background: var(--hill); color: var(--ink); }
  .layout { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); gap: 1.2rem; align-items: start; }
  aside { border-right: 2px solid rgba(0,0,0,.12); padding-right: 1rem; display: grid; gap: .6rem; min-width: 0; }
  aside h2 { font-size: 1rem; text-transform: uppercase; margin: 0; }
  .games { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; min-width: 0; }
  .game { width: 100%; min-width: 0; text-align: left; background: none; border: 2px solid transparent; border-radius: .5rem; padding: .35rem .5rem; font: inherit; cursor: pointer; display: flex; justify-content: space-between; gap: .5rem; }
  .game:hover { background: rgba(0,0,0,.05); }
  .game.active { border-color: var(--brown); background: rgba(0,0,0,.06); font-weight: 700; }
  .game small { opacity: .7; text-transform: uppercase; font-size: .7rem; }
  .new-game { display: grid; gap: .35rem; min-width: 0; }
  .new-game input { font: inherit; min-width: 0; width: 100%; padding: .35rem .45rem; border: 2px solid var(--brown); border-radius: .4rem; background: var(--cream); color: var(--ink); }
  .pane { min-width: 0; display: grid; gap: .8rem; }
  .tabs { display: flex; gap: .4rem; flex-wrap: wrap; }
  .tabs button { font: inherit; padding: .35rem .7rem; border-radius: .5rem; border: 2px solid var(--brown); background: var(--cream); color: var(--ink); cursor: pointer; }
  .tabs button.on { background: var(--brown); color: var(--cream); }
  .story { display: grid; grid-template-columns: minmax(0, 17rem) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .scenes { display: grid; gap: .4rem; max-height: 70vh; overflow-y: auto; overflow-x: hidden; padding-right: .3rem; min-width: 0; }
  .find { font: inherit; min-width: 0; padding: .4rem .5rem; border: 2px solid var(--brown); border-radius: .45rem; background: var(--cream); color: var(--ink); }
  .scenes h3 { font-size: .8rem; text-transform: uppercase; margin: .6rem 0 .2rem; opacity: .8; display: flex; justify-content: space-between; gap: .5rem; align-items: baseline; }
  .scenes h3 .link { font-size: .8rem; }
  .scenes ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .2rem; }
  .scenes > button, .bulk { justify-self: start; width: 100%; }
  .scene-link { display: grid; text-align: left; width: 100%; min-width: 0; background: none; border: 2px solid transparent; border-radius: .45rem; padding: .3rem .45rem; font: inherit; cursor: pointer; }
  .scene-link:hover { background: rgba(0,0,0,.05); }
  .scene-link.active { border-color: var(--brown); background: rgba(0,0,0,.06); }
  .scenes li { display: flex; align-items: center; gap: .2rem; min-width: 0; }
  .scenes li.chosen .row-actions { opacity: 1; }
  .row-actions { display: flex; gap: .1rem; opacity: 0; transition: opacity .1s; flex: 0 0 auto; }
  .scenes li:hover .row-actions, .scenes li:focus-within .row-actions { opacity: 1; }
  .icon { background: none; border: 2px solid transparent; border-radius: .35rem; padding: 0 .25rem; font-size: .85rem; cursor: pointer; color: inherit; line-height: 1.4; }
  .icon:hover { border-color: var(--brown); background: var(--cream); }
  .tag { font-size: .65rem; text-transform: uppercase; letter-spacing: .04em; opacity: .8; border: 1px solid currentColor; border-radius: 999px; padding: 0 .3rem; justify-self: start; }
  .tag.art { opacity: .55; }
  .bulk { border: 2px dashed var(--brown); border-radius: .6rem; padding: .5rem .6rem; display: grid; gap: .4rem; min-width: 0; }
  .bulk summary { cursor: pointer; font-weight: 700; font-size: .85rem; }
  .bulk textarea, .bulk input, .bulk select { font: inherit; min-width: 0; padding: .4rem .5rem; border: 2px solid var(--brown); border-radius: .45rem; background: var(--cream); color: var(--ink); width: 100%; }
  .bulk-row { display: flex; gap: .4rem; flex-wrap: wrap; }
  .bulk-row label { flex: 1 1 8rem; display: grid; gap: .2rem; font-size: .8rem; font-weight: 600; }
  .key { font-weight: 700; font-size: .82rem; }
  .preview { font-size: .78rem; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .scene-form { border: 2px solid rgba(0,0,0,.14); border-radius: .8rem; padding: .9rem; background: rgba(255,255,255,.35); }
  .settings { display: grid; gap: .7rem; max-width: 34rem; }
  .settings label { display: grid; gap: .25rem; font-weight: 600; font-size: .85rem; }
  .settings input, .settings textarea, .settings select { font: inherit; padding: .45rem .55rem; border: 2px solid var(--brown); border-radius: .5rem; background: var(--cream); color: var(--ink); }
  .check ul { margin: 0; padding-left: 1.2rem; display: grid; gap: .3rem; }
  .check li { font-size: .9rem; }
  .hint { opacity: .8; font-size: .85rem; margin: 0; }
  .ok { color: var(--hill); font-weight: 700; }
  .notice { margin: 0; padding: .5rem .8rem; border-radius: .5rem; background: var(--hill-light); color: var(--ink); }
  .error { margin: 0; padding: .5rem .8rem; border-radius: .5rem; background: #f3c9c0; color: var(--danger); }
  .link { background: none; border: none; padding: 0; font: inherit; text-decoration: underline; cursor: pointer; color: inherit; }
  .small { font-size: .85rem; padding: .35rem .7rem; }
  @media (max-width: 60rem) {
    .layout, .story { grid-template-columns: 1fr; }
    aside { border-right: none; border-bottom: 2px solid rgba(0,0,0,.12); padding: 0 0 .8rem; }
  }
</style>
