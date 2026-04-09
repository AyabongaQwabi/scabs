import "server-only";

import { cookies } from "next/headers";
import crypto from "crypto";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DRIVER_SESSION_COOKIE, DRIVER_SESSION_TTL_MS } from "./constants";

export type DriverSession = {
  driverId: string;
  sessionToken: string;
  expiresAt: string;
};

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createDriverSession(driverId: string): Promise<DriverSession> {
  const sessionToken = createSessionToken();
  const expiresAt = new Date(Date.now() + DRIVER_SESSION_TTL_MS).toISOString();

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("sessions").insert({
    driver_id: driverId,
    session_token: sessionToken,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(DRIVER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return { driverId, sessionToken, expiresAt };
}

export async function getDriverIdFromRequestCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const nowIso = new Date().toISOString();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("driver_id, expires_at")
    .eq("session_token", token)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.driver_id ?? null;
}

export async function clearDriverSession() {
  const cookieStore = await cookies();
  cookieStore.set(DRIVER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

