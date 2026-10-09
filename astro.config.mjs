import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// SITE and BASE are set by the deploy workflow (e.g. https://user.github.io and /probirdia).
// Locally they are unset, so the site runs at http://localhost:4321/.
export default defineConfig({
  site: process.env.SITE,
  base: process.env.BASE ?? '/',
  integrations: [svelte()],
});