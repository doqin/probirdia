import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser talks to Supabase directly. The key shipped to the browser is the
 * publishable key (the one Supabase used to call "anon"): it is public, and every
 * permission is enforced by row level security (see supabase/migrations).
 *
 * Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).
 * PUBLIC_SUPABASE_ANON_KEY is still accepted for older setups.
 */
const url = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined)?.trim();
const publishableKey = (
  (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY) as
    | string
    | undefined
)?.trim();

export const supabaseConfigured = Boolean(url && publishableKey);

export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
