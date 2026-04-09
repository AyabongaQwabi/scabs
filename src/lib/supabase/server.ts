import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function createSupabaseServerClient() {
  throw new Error(
    "createSupabaseServerClient is async in this Next.js version. Use createSupabaseServerClientAsync()."
  );
}

export async function createSupabaseServerClientAsync() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't set cookies; middleware/route handlers can.
          }
        },
      },
    }
  );
}

