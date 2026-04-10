import "server-only";

import { z } from "zod";

import { requireDriverIdForApi } from "@/lib/driver-session/require-driver";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateRecommendedTotal } from "@/lib/pricing/recommended";
import { haversineKm } from "@/lib/distance/haversine";
import { estimateCostPerKm } from "@/lib/fuel/cost";
import { recordPreTripDeadheadIfNeeded } from "@/lib/driver/deadhead-loss";
import { driverCalendarDateISO, getOpenShiftForDriver } from "@/lib/driver/shift-utils";
import { revalidatePath } from "next/cache";

export async function startShiftMutation(input: unknown) {
  const driverId = await requireDriverIdForApi();
  const schema = z.object({
    startKm: z.number().nullable().optional(),
    goalAmount: z.number().nullable().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload.");

  const supabaseAdmin = getSupabaseAdmin();
  const calDate = driverCalendarDateISO();

  const { data: open } = await getOpenShiftForDriver<{ id: string }>(supabaseAdmin, driverId, "id");
  if (open?.id) return { ok: true, shiftId: open.id };

  let goal = parsed.data.goalAmount ?? 500;
  if (parsed.data.goalAmount == null) {
    const { data: dg } = await supabaseAdmin
      .from("daily_goals")
      .select("target_amount")
      .eq("driver_id", driverId)
      .eq("date", calDate)
      .maybeSingle();
    if (dg?.target_amount != null) goal = Number(dg.target_amount);
  }

  const { data: shift, error } = await supabaseAdmin
    .from("shifts")
    .insert({
      driver_id: driverId,
      date: calDate,
      start_km: parsed.data.startKm ?? null,
      goal_amount: goal,
      total_earned: 0,
      start_time: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { ok: true, shiftId: shift.id };
}

export async function endShiftMutation(input: unknown) {
  const driverId = await requireDriverIdForApi();
  const schema = z.object({ endKm: z.number().nullable().optional() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload.");

  const supabaseAdmin = getSupabaseAdmin();

  const { data: shift } = await getOpenShiftForDriver<{ id: string; end_time: string | null }>(
    supabaseAdmin,
    driverId,
    "id,end_time",
  );

  if (!shift?.id) return { ok: true };

  const { data: trips } = await supabaseAdmin.from("trips").select("actual_price").eq("shift_id", shift.id);
  const totalEarned = trips?.reduce((s, t) => s + (t.actual_price ? Number(t.actual_price) : 0), 0) ?? 0;

  const { error } = await supabaseAdmin
    .from("shifts")
    .update({ end_time: new Date().toISOString(), end_km: parsed.data.endKm ?? null, total_earned: totalEarned })
    .eq("id", shift.id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addFuelFillupMutation(input: unknown) {
  const driverId = await requireDriverIdForApi();
  const schema = z.object({
    litres: z.number().positive(),
    randAmount: z.number().nonnegative(),
    odometerKm: z.number().nonnegative().nullable().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload.");

  const supabaseAdmin = getSupabaseAdmin();
  const calDate = driverCalendarDateISO();

  const { data: shift } = await getOpenShiftForDriver<{ id: string; end_time: string | null }>(
    supabaseAdmin,
    driverId,
    "id,end_time",
  );

  if (!shift?.id || shift.end_time) throw new Error("Start your shift first.");

  const { error } = await supabaseAdmin.from("petrol_fillups").insert({
    driver_id: driverId,
    shift_id: shift.id,
    date: calDate,
    litres: parsed.data.litres,
    rand_amount: parsed.data.randAmount,
    odometer_km: parsed.data.odometerKm ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function startTripMutation(input: unknown) {
  const driverId = await requireDriverIdForApi();
  const schema = z.object({
    startLocationId: z.string().uuid(),
    endLocationId: z.string().uuid(),
    stopLocationIds: z.array(z.string().uuid()).default([]),
    startLat: z.number(),
    startLng: z.number(),
    customerPhone: z.string().trim().nullable().optional(),
    preTripFromLocationId: z.string().uuid().optional().nullable(),
    preTripToLocationId: z.string().uuid().optional().nullable(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload.");

  const supabaseAdmin = getSupabaseAdmin();

  const { data: shift } = await getOpenShiftForDriver<{ id: string; end_time: string | null }>(
    supabaseAdmin,
    driverId,
    "id,end_time",
  );

  if (!shift?.id || shift.end_time) throw new Error("Start your shift first.");
  const shiftId = shift.id;

  const locationIds = [parsed.data.startLocationId, ...parsed.data.stopLocationIds, parsed.data.endLocationId];
  const recommended = await calculateRecommendedTotal({ locationIds });

  const { data: stopLocations } = parsed.data.stopLocationIds.length
    ? await supabaseAdmin.from("locations").select("id,lat,lng").in("id", parsed.data.stopLocationIds)
    : { data: [] as any[] };

  const stopById = new Map<string, { lat: number | null; lng: number | null }>();
  for (const s of stopLocations ?? []) {
    stopById.set(s.id, { lat: s.lat != null ? Number(s.lat) : null, lng: s.lng != null ? Number(s.lng) : null });
  }

  const stops = parsed.data.stopLocationIds.map((id, idx) => ({
    location_id: id,
    lat: stopById.get(id)?.lat ?? null,
    lng: stopById.get(id)?.lng ?? null,
    order: idx + 1,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from("trips")
    .insert({
      shift_id: shiftId,
      driver_id: driverId,
      start_location_id: parsed.data.startLocationId,
      end_location_id: parsed.data.endLocationId,
      stops,
      start_lat: parsed.data.startLat,
      start_lng: parsed.data.startLng,
      recommended_price: recommended.totalRecommended,
      customer_phone: parsed.data.customerPhone || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await recordPreTripDeadheadIfNeeded(supabaseAdmin, {
    driverId,
    shiftId,
    tripId: inserted.id,
    preTripFromLocationId: parsed.data.preTripFromLocationId,
    preTripToLocationId: parsed.data.preTripToLocationId,
  });
  revalidatePath("/admin/driver-losses");
  revalidatePath("/admin/trips");
  revalidatePath("/admin/overview");

  return { ok: true, tripId: inserted.id };
}

export async function endTripMutation(input: unknown) {
  const driverId = await requireDriverIdForApi();
  const schema = z.object({
    tripId: z.string().uuid(),
    endLat: z.number(),
    endLng: z.number(),
    actualPrice: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().default(0),
    discountReason: z.string().trim().nullable().optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload.");

  const supabaseAdmin = getSupabaseAdmin();
  const { data: trip } = await supabaseAdmin
    .from("trips")
    .select("id,driver_id,shift_id,start_lat,start_lng,stops,customer_phone")
    .eq("id", parsed.data.tripId)
    .maybeSingle();

  if (!trip?.id || trip.driver_id !== driverId) throw new Error("Trip not found.");

  const startLat = trip.start_lat != null ? Number(trip.start_lat) : null;
  const startLng = trip.start_lng != null ? Number(trip.start_lng) : null;
  if (startLat == null || startLng == null) throw new Error("Trip is missing start GPS.");

  const points: Array<{ lat: number; lng: number }> = [{ lat: startLat, lng: startLng }];
  const stops = Array.isArray(trip.stops) ? trip.stops : [];
  for (const s of stops) {
    const lat = s?.lat != null ? Number(s.lat) : null;
    const lng = s?.lng != null ? Number(s.lng) : null;
    if (lat != null && lng != null) points.push({ lat, lng });
  }
  points.push({ lat: parsed.data.endLat, lng: parsed.data.endLng });

  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) totalKm += haversineKm(points[i]!, points[i + 1]!);

  const costPerKm = await estimateCostPerKm(driverId);
  if (parsed.data.discountAmount > 0) {
    if (costPerKm == null) throw new Error("Discounts are locked until you log fuel + end at least one shift.");
    const estCost = costPerKm * totalKm;
    const net = parsed.data.actualPrice - parsed.data.discountAmount - estCost;
    const margin = parsed.data.actualPrice > 0 ? net / parsed.data.actualPrice : 0;
    if (margin < 0.25) throw new Error("Discount blocked: estimated margin would drop below 25%.");
  }

  const { error } = await supabaseAdmin
    .from("trips")
    .update({
      end_lat: parsed.data.endLat,
      end_lng: parsed.data.endLng,
      ended_at: new Date().toISOString(),
      total_distance_km: totalKm,
      actual_price: parsed.data.actualPrice,
      discount_amount: parsed.data.discountAmount,
      discount_reason: parsed.data.discountReason || null,
    })
    .eq("id", parsed.data.tripId)
    .eq("driver_id", driverId);
  if (error) throw new Error(error.message);

  const phone = trip.customer_phone?.trim();
  if (phone) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("customers")
      .upsert({ phone, first_seen: now, total_trips: 0, last_trip_date: now }, { onConflict: "phone" });
    const { data: current } = await supabaseAdmin.from("customers").select("total_trips").eq("phone", phone).maybeSingle();
    await supabaseAdmin
      .from("customers")
      .update({ total_trips: (current?.total_trips ?? 0) + 1, last_trip_date: now })
      .eq("phone", phone);
  }

  if (trip.shift_id) {
    const { data: allTrips } = await supabaseAdmin.from("trips").select("actual_price").eq("shift_id", trip.shift_id);
    const totalEarned = allTrips?.reduce((s, t) => s + (t.actual_price ? Number(t.actual_price) : 0), 0) ?? 0;
    await supabaseAdmin.from("shifts").update({ total_earned: totalEarned }).eq("id", trip.shift_id);
  }

  return { ok: true, totalKm };
}

