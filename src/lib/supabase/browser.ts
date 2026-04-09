"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Next.js only replaces NEXT_PUBLIC_* in client bundles when accessed with
 * static property names. Dynamic access like process.env[name] stays undefined in the browser.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, key);
}
