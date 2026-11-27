import type { Scene } from './types';
import type { Presentation } from './types';

/**
 * Every image and sound a game can show, most urgent first: the start screen's artwork, then the
 * rest of the pictures in the order the story reaches them, then the sounds. Duplicates are dropped.
 */
export function assetUrls(presentation: Presentation | undefined, scenes: Scene[], start?: string): { images: string[]; audio: string[] } {
  const images = new Set<string>();
  const audio = new Set<string>();
  const add = (set: Set<string>, url: string | undefined) => {
    if (url) set.add(url);
  };
  if (presentation) {
    const rules = presentation.scenes ?? [];
    const startRules = rules.filter((r) => r.ids === '*' || (start !== undefined && r.ids.includes(start)));
    for (const r of startRules) add(images, r.stage && presentation.stages[r.stage]?.background);
    for (const r of rules) add(images, r.stage && presentation.stages[r.stage]?.background);
    for (const s of Object.values(presentation.stages ?? {})) add(images, s.background);
    for (const c of Object.values(presentation.characters ?? {})) add(images, c.image);
    for (const p of Object.values(presentation.props ?? {})) add(images, p.image);
    for (const i of Object.values(presentation.items ?? {})) add(images, i.image);
    add(images, presentation.heart);
    for (const m of Object.values(presentation.music ?? {})) add(audio, m.file);
  }
  for (const s of scenes) add(images, s.image);
  return { images: [...images], audio: [...audio] };
}

/** Starts downloading (and decoding) the assets now, so a scene never waits on its own picture. */
export function preloadAssets(urls: { images: string[]; audio: string[] }, resolve: (url: string) => string = (u) => u): () => void {
  const keep: HTMLImageElement[] = [];
  let cancelled = false;
  for (const url of urls.images) {
    const img = new Image();
    img.decoding = 'async';
    img.src = resolve(url);
    img.decode?.().catch(() => {});
    keep.push(img);
  }
  // sounds come after the pictures so they do not compete for the first screen
  const startAudio = () => {
    if (cancelled) return;
    for (const url of urls.audio) {
      // fetch warms the HTTP cache (no-cors so files on another host, like storage, still count)
      fetch(resolve(url), { mode: 'no-cors' }).catch(() => {});
    }
  };
  const timer = setTimeout(startAudio, 300);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    keep.length = 0;
  };
}
