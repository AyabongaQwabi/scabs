import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function estimateCostPerKm(driverId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select("id,start_km,end_km,date")
    .eq("driver_id", driverId)
    .gte("date", since)
    .not("end_km", "is", null)
    .not("start_km", "is", null);

  const km =
    shifts?.reduce((sum, s) => sum + (Number(s.end_km) - Number(s.start_km)), 0) ?? 0;

  if (!Number.isFinite(km) || km <= 0) return null;

  const shiftIds = (shifts ?? []).map((s) => s.id);
  if (!shiftIds.length) return null;

  const { data: fillups } = await supabaseAdmin
    .from("petrol_fillups")
    .select("rand_amount")
    .in("shift_id", shiftIds);

  const rand = fillups?.reduce((sum, f) => sum + (f.rand_amount ? Number(f.rand_amount) : 0), 0) ?? 0;
  if (!Number.isFinite(rand) || rand <= 0) return null;

  return rand / km;
}

