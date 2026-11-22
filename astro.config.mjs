import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// SITE and BASE are only set to serve the site under a sub-path (e.g. https://example.com and /probirdia).
// Locally they are unset, so the site runs at http://localhost:4321/.
export default defineConfig({
  site: process.env.SITE,
  base: process.env.BASE ?? '/',
  integrations: [svelte()],
});