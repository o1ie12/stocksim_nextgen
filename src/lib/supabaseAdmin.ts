import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Never import this from a client component — it
// bypasses RLS entirely. All DB access in this app goes through server
// route handlers / server components using this client.
//
// Built lazily (on first real use) rather than at module load: Next.js
// imports every route module during `next build` to collect page data, even
// for fully dynamic routes like ours that never touch Supabase until an
// actual request comes in. Failing eagerly here would take down the whole
// build if env vars simply weren't loaded yet at that moment — instead we
// only throw when a request actually needs the client and the env vars
// still aren't set.
let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    // Bind methods to the real client, not the proxy — Supabase's own
    // methods reference internal state via `this`, which would otherwise
    // resolve to this empty proxy target when called as `supabaseAdmin.x()`.
    return typeof value === "function" ? value.bind(client) : value;
  },
});
