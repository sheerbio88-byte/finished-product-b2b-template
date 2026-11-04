/**
 * Inquiry inbox (Supabase contact_inquiries). Anon/publishable key only; protect rows with RLS.
 * Configure via .env (see .env.example).
 */
export const SUPABASE_URL = import.meta.env?.PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SOURCE_SITE = import.meta.env?.PUBLIC_SOURCE_SITE ?? 'example.com';
/** Turnstile site key (public). */
export const TURNSTILE_SITE_KEY = import.meta.env?.PUBLIC_TURNSTILE_SITE_KEY ?? '';
