/**
 * Reveals an element's text one character at a time, the way a visual novel prints a line.
 *
 * The whole line stays in the layout from the first frame (the unrevealed part is only made
 * invisible), so the box never reflows or grows while it types. Links and other elements inside
 * the text are left in place; popups (role="tooltip") are skipped. Screen readers see the full
 * text throughout, because nothing is removed from the accessibility tree.
 */
export interface TypeOptions {
  /** Called when typing starts (with a `finish` that shows the rest at once) and when it ends. */
  onTyping?: (typing: boolean, finish: () => void) => void;
  /** Milliseconds per character; long lines are sped up so no line takes longer than ~3 seconds. */
  speed?: number;
}

const MAX_MS = 3000;

export function typewriter(node: HTMLElement, options: TypeOptions = {}) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts: { text: Text; full: string; rest: HTMLElement }[] = [];
  let total = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    if (timer) clearInterval(timer);
    for (const p of parts) {
      p.text.data = p.full;
      p.rest.remove();
    }
    options.onTyping?.(false, finish);
  };

  const show = (count: number) => {
    let left = count;
    for (const p of parts) {
      const take = Math.max(0, Math.min(p.full.length, left));
      p.text.data = p.full.slice(0, take);
      p.rest.textContent = p.full.slice(take);
      left -= take;
    }
  };

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[role="tooltip"]') || !(n as Text).data.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const found: Text[] = [];
  while (walker.nextNode()) found.push(walker.currentNode as Text);

  if (reduced || !found.length) {
    options.onTyping?.(false, finish);
    return { destroy: finish };
  }

  for (const text of found) {
    const rest = document.createElement('span');
    rest.style.visibility = 'hidden';
    rest.setAttribute('data-typewriter-rest', '');
    text.after(rest);
    parts.push({ text, full: text.data, rest });
    total += text.data.length;
  }
  show(0);

  const per = Math.min(options.speed ?? 26, MAX_MS / Math.max(total, 1));
  const started = performance.now();
  options.onTyping?.(true, finish);
  timer = setInterval(() => {
    const count = Math.floor((performance.now() - started) / per);
    if (count >= total) finish();
    else show(count);
  }, 16);

  return { destroy: finish };
}
