/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  /** The publishable key (formerly called the "anon" key). */
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Older name for the same key; still accepted. */
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
