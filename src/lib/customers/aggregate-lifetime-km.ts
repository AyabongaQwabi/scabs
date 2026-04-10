import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { computeEndedTripRouteKm } from "@/lib/trips/compute-trip-route-km";

/**
 * For each phone: load all ended trips with `trips.customer_phone` = phone, compute route km per trip
 * (location chain Mapbox + haversine fallback, else GPS chain), then sum.
 */
export async function sumLifetimeKmByCustomerPhone(
  supabase: SupabaseClient,
  customerPhones: readonly string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const phoneSet = new Set(customerPhones);
  for (const p of customerPhones) result.set(p, 0);

  if (customerPhones.length === 0) return result;

  const { data: trips, error } = await supabase
    .from("trips")
    .select(
      "customer_phone,start_location_id,end_location_id,stops,start_lat,start_lng,end_lat,end_lng",
    )
    .not("ended_at", "is", null)
    .not("customer_phone", "is", null)
    .in("customer_phone", [...phoneSet]);

  if (error) throw new Error(error.message);
  if (!trips?.length) return result;

  for (const trip of trips) {
    const phone = trip.customer_phone?.trim();
    if (!phone || !phoneSet.has(phone)) continue;

    const elat = trip.end_lat != null ? Number(trip.end_lat) : NaN;
    const elng = trip.end_lng != null ? Number(trip.end_lng) : NaN;
    if (!Number.isFinite(elat) || !Number.isFinite(elng)) continue;

    const km = await computeEndedTripRouteKm(supabase, trip, { lat: elat, lng: elng });
    result.set(phone, (result.get(phone) ?? 0) + km);
  }

  return result;
}
