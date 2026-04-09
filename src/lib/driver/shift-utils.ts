import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/** South Africa (SAST); IANA has no DST for Africa/Johannesburg. */
export const DRIVER_TIME_ZONE = "Africa/Johannesburg";

/** YYYY-MM-DD in the driver business timezone (for `shifts.date`, `daily_goals.date`, etc.). */
export function driverCalendarDateISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DRIVER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * UTC half-open interval [start, end) for the full calendar day in DRIVER_TIME_ZONE
 * that contains `d`. Uses fixed UTC+2 offset for Johannesburg (SAST).
 */
export function driverLocalDayUtcRange(d: Date = new Date()): { startIso: string; endExclusiveIso: string } {
  const ymd = driverCalendarDateISO(d);
  const [y, m, day] = ymd.split("-").map(Number);
  const startMs = Date.UTC(y, m - 1, day, 0, 0, 0) - 2 * 60 * 60 * 1000;
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return { startIso: new Date(startMs).toISOString(), endExclusiveIso: new Date(endMs).toISOString() };
}

/** Active shift row: `end_time` is null (business day may differ from `shifts.date` if the shift spans midnight). */
export async function getOpenShiftForDriver<R extends Record<string, unknown> = Record<string, unknown>>(
  client: SupabaseClient,
  driverId: string,
  columns: string,
): Promise<{ data: R | null; error: PostgrestError | null }> {
  const res = await client
    .from("shifts")
    .select(columns)
    .eq("driver_id", driverId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  return res as { data: R | null; error: PostgrestError | null };
}
