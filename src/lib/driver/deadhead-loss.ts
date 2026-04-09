import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { haversineKm } from "@/lib/distance/haversine";
import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";
import { getDrivingDistanceKm } from "@/lib/maps/mapbox-matrix-distance";
import { DEADHEAD_ZAR_PER_KM } from "@/lib/pricing/deadhead";

/**
 * Records one pre-trip deadhead row after the trip row exists (links `trip_id`).
 * No-op if either location missing, same id, coordinates missing, or lookup fails.
 */
export async function recordPreTripDeadheadIfNeeded(
  supabase: SupabaseClient,
  params: {
    driverId: string;
    shiftId: string;
    tripId: string;
    preTripFromLocationId: string | null | undefined;
    preTripToLocationId: string | null | undefined;
  },
): Promise<void> {
  const from = params.preTripFromLocationId?.trim();
  const to = params.preTripToLocationId?.trim();
  if (!from || !to || from === to) return;

  const { data: rows, error } = await supabase.from("locations").select("id,lat,lng").in("id", [from, to]);
  if (error || !rows || rows.length !== 2) return;

  const locA = rows.find((r) => r.id === from);
  const locB = rows.find((r) => r.id === to);
  if (!locA || !locB) return;

  const alat = locA.lat != null ? Number(locA.lat) : null;
  const alng = locA.lng != null ? Number(locA.lng) : null;
  const blat = locB.lat != null ? Number(locB.lat) : null;
  const blng = locB.lng != null ? Number(locB.lng) : null;
  if (alat == null || alng == null || blat == null || blng == null) return;

  const pa = normalizeLatLngSouthernAfrica(alat, alng);
  const pb = normalizeLatLngSouthernAfrica(blat, blng);
  let km = await getDrivingDistanceKm(pa, pb);
  if (km == null || km <= 0) {
    km = haversineKm(pa, pb);
  }
  const estimatedLoss = Math.round(km * DEADHEAD_ZAR_PER_KM);

  const { error: insErr } = await supabase.from("driver_losses").insert({
    driver_id: params.driverId,
    shift_id: params.shiftId,
    trip_id: params.tripId,
    from_location_id: from,
    to_location_id: to,
    distance_km: km,
    estimated_loss_zar: estimatedLoss,
    zar_per_km_applied: DEADHEAD_ZAR_PER_KM,
  });

  if (insErr && process.env.NODE_ENV === "development") {
    console.error("driver_losses insert:", insErr.message);
  }
}
