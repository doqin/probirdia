/** Joins a site base ("/", "/probirdia" or "/probirdia/") and a root-relative path. External and relative URLs are left alone. */
export function joinBase(base: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const prefix = base.replace(/\/+$/, '');
  return prefix + path;
}

/** Use for every link or file path that starts with "/", so the site also works under a sub-path like GitHub Pages. */
export function withBase(path: string): string {
  return joinBase(import.meta.env.BASE_URL, path);
}

/** The current page path with the site base removed, e.g. "/probirdia/games/" -> "/games/". */
export function stripBase(pathname: string): string {
  const prefix = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
}