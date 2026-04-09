"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireDriverId } from "@/lib/driver-session/require-driver";
import { haversineKm } from "@/lib/distance/haversine";
import { calculateRecommendedTotal } from "@/lib/pricing/recommended";
import { recordPreTripDeadheadIfNeeded } from "@/lib/driver/deadhead-loss";
import { getOpenShiftForDriver } from "@/lib/driver/shift-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { estimateCostPerKm } from "@/lib/fuel/cost";

const StartTripSchema = z.object({
  startLocationId: z.string().uuid(),
  endLocationId: z.string().uuid(),
  stopLocationIds: z.array(z.string().uuid()).default([]),
  startLat: z.number(),
  startLng: z.number(),
  customerPhone: z.string().trim().optional().nullable(),
  preTripFromLocationId: z.string().uuid().optional().nullable(),
  preTripToLocationId: z.string().uuid().optional().nullable(),
});

export async function startTripAction(input: unknown) {
  const driverId = await requireDriverId();
  const parsed = StartTripSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid trip start payload.");

  const supabaseAdmin = getSupabaseAdmin();

  const { data: shift, error: shiftErr } = await getOpenShiftForDriver<{
    id: string;
    end_time: string | null;
  }>(supabaseAdmin, driverId, "id,end_time");

  if (shiftErr) throw new Error(shiftErr.message);
  if (!shift?.id || shift.end_time) throw new Error("Start your shift first.");

  const locationIds = [
    parsed.data.startLocationId,
    ...parsed.data.stopLocationIds,
    parsed.data.endLocationId,
  ];
  const recommended = await calculateRecommendedTotal({ locationIds });

  const { data: stopLocations, error: stopErr } = parsed.data.stopLocationIds.length
    ? await supabaseAdmin
        .from("locations")
        .select("id,lat,lng")
        .in("id", parsed.data.stopLocationIds)
    : { data: [], error: null as any };

  if (stopErr) throw new Error(stopErr.message);

  const stopById = new Map<string, { lat: number | null; lng: number | null }>();
  for (const s of stopLocations ?? []) {
    stopById.set(s.id, {
      lat: s.lat != null ? Number(s.lat) : null,
      lng: s.lng != null ? Number(s.lng) : null,
    });
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
      shift_id: shift.id,
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
    shiftId: shift.id,
    tripId: inserted.id,
    preTripFromLocationId: parsed.data.preTripFromLocationId,
    preTripToLocationId: parsed.data.preTripToLocationId,
  });

  revalidatePath("/admin/overview");
  revalidatePath("/admin/trips");
  revalidatePath("/admin/driver-losses");
  redirect(`/driver/trips/active?tripId=${inserted.id}`);
}

const EndTripSchema = z.object({
  tripId: z.string().uuid(),
  endLat: z.number(),
  endLng: z.number(),
  actualPrice: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().default(0),
  discountReason: z.string().trim().optional().nullable(),
});

export async function endTripAction(input: unknown) {
  const driverId = await requireDriverId();
  const parsed = EndTripSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid trip end payload.");

  const supabaseAdmin = getSupabaseAdmin();

  const { data: trip, error: tripErr } = await supabaseAdmin
    .from("trips")
    .select(
      "id,driver_id,shift_id,start_lat,start_lng,stops,end_lat,end_lng,recommended_price,customer_phone"
    )
    .eq("id", parsed.data.tripId)
    .maybeSingle();

  if (tripErr) throw new Error(tripErr.message);
  if (!trip?.id || trip.driver_id !== driverId) throw new Error("Trip not found.");

  const startLat = trip.start_lat != null ? Number(trip.start_lat) : null;
  const startLng = trip.start_lng != null ? Number(trip.start_lng) : null;
  if (startLat == null || startLng == null) throw new Error("Trip is missing start GPS.");

  // Stops are stored as JSON objects with optional lat/lng. We'll use them if present.
  const points: Array<{ lat: number; lng: number }> = [{ lat: startLat, lng: startLng }];
  const stops = Array.isArray(trip.stops) ? trip.stops : [];
  for (const s of stops) {
    const lat = typeof s?.lat === "number" ? s.lat : s?.lat != null ? Number(s.lat) : null;
    const lng = typeof s?.lng === "number" ? s.lng : s?.lng != null ? Number(s.lng) : null;
    if (lat != null && lng != null) points.push({ lat, lng });
  }
  points.push({ lat: parsed.data.endLat, lng: parsed.data.endLng });

  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalKm += haversineKm(points[i]!, points[i + 1]!);
  }

  const costPerKm = await estimateCostPerKm(driverId);
  if (parsed.data.discountAmount > 0) {
    if (costPerKm == null) {
      throw new Error("Discounts are locked until you log fuel + end at least one shift.");
    }
    const estCost = costPerKm * totalKm;
    const net = parsed.data.actualPrice - parsed.data.discountAmount - estCost;
    const margin = parsed.data.actualPrice > 0 ? net / parsed.data.actualPrice : 0;
    if (margin < 0.25) {
      throw new Error("Discount blocked: estimated margin would drop below 25%.");
    }
  }

  const { error: updateErr } = await supabaseAdmin
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

  if (updateErr) throw new Error(updateErr.message);

  // Update customer counters (phone-only).
  const phone = trip.customer_phone?.trim();
  if (phone) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("customers")
      .upsert(
        {
          phone,
          first_seen: now,
          total_trips: 0,
          last_trip_date: now,
        },
        { onConflict: "phone" }
      );

    await supabaseAdmin
      .from("customers")
      .update({ last_trip_date: now })
      .eq("phone", phone);

    const { data: customerRow } = await supabaseAdmin
      .from("customers")
      .select("total_trips")
      .eq("phone", phone)
      .maybeSingle();

    const newTotal = (customerRow?.total_trips ?? 0) + 1;
    await supabaseAdmin.from("customers").update({ total_trips: newTotal }).eq("phone", phone);
  }

  // Update shift totals (simple sum of actual_price for the shift)
  if (trip.shift_id) {
    const { data: allTrips } = await supabaseAdmin
      .from("trips")
      .select("actual_price")
      .eq("shift_id", trip.shift_id);

    const totalEarned =
      allTrips?.reduce((s, t) => s + (t.actual_price ? Number(t.actual_price) : 0), 0) ?? 0;

    await supabaseAdmin.from("shifts").update({ total_earned: totalEarned }).eq("id", trip.shift_id);
  }

  revalidatePath("/driver/home");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/trips");
  redirect("/driver/home");
}

