import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { haversineKm } from "@/lib/distance/haversine";
import { getDrivingDistanceKm } from "@/lib/maps/mapbox-matrix-distance";

type Coord = { lat: number; lng: number };

type StopJson = {
  location_id?: string;
  order?: number;
  lat?: unknown;
  lng?: unknown;
};

export type TripForRouteKm = {
  start_location_id?: string | null;
  end_location_id?: string | null;
  stops?: unknown;
  start_lat?: unknown;
  start_lng?: unknown;
};

function toCoord(lat: unknown, lng: unknown): Coord | null {
  const la = lat != null ? Number(lat) : NaN;
  const ln = lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

/**
 * One leg: Mapbox driving distance when configured and routable; otherwise Haversine (great-circle).
 */
export async function legDrivingOrHaversineKm(a: Coord, b: Coord): Promise<number> {
  const driving = await getDrivingDistanceKm(a, b);
  if (driving != null && driving > 0 && Number.isFinite(driving)) return driving;
  return haversineKm(a, b);
}

async function sumLegsKm(points: Coord[]): Promise<number> {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    sum += await legDrivingOrHaversineKm(points[i]!, points[i + 1]!);
  }
  return sum;
}

/**
 * Ordered coordinates from location rows: start → stops (by order) → end.
 * Returns null if any required id or coordinate is missing.
 */
async function coordsFromLocationChain(
  supabase: SupabaseClient,
  startLocationId: string,
  endLocationId: string,
  stops: StopJson[],
): Promise<Coord[] | null> {
  const orderedStops = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const s of orderedStops) {
    if (!s.location_id?.trim()) return null;
  }

  const ids = [startLocationId, ...orderedStops.map((s) => s.location_id!), endLocationId];
  const unique = [...new Set(ids)];

  const { data: rows, error } = await supabase.from("locations").select("id,lat,lng").in("id", unique);
  if (error || !rows?.length) return null;

  const byId = new Map<string, { lat: unknown; lng: unknown }>();
  for (const r of rows) byId.set(r.id, { lat: r.lat, lng: r.lng });

  const out: Coord[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    const c = row ? toCoord(row.lat, row.lng) : null;
    if (!c) return null;
    out.push(c);
  }
  return out;
}

/** GPS + embedded stop coords + end GPS (legacy path when location chain is incomplete). */
function buildGpsFallbackChain(trip: TripForRouteKm, endGps: Coord): Coord[] | null {
  const start = toCoord(trip.start_lat, trip.start_lng);
  if (!start) return null;

  const points: Coord[] = [start];
  const stops = Array.isArray(trip.stops) ? (trip.stops as StopJson[]) : [];
  const ordered = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const s of ordered) {
    const c = toCoord(s.lat, s.lng);
    if (c) points.push(c);
  }
  points.push(endGps);
  return points;
}

/**
 * Total route km for an ended trip: prefer Mapbox (cached) / Haversine per leg along **named locations**
 * (start → stops → end). If that chain cannot be resolved, use the GPS + stop snapshot chain instead.
 */
export async function computeEndedTripRouteKm(
  supabase: SupabaseClient,
  trip: TripForRouteKm,
  endGps: Coord,
): Promise<number> {
  const stops = Array.isArray(trip.stops) ? (trip.stops as StopJson[]) : [];
  const startId = trip.start_location_id?.trim() ?? "";
  const endId = trip.end_location_id?.trim() ?? "";

  if (startId && endId) {
    const fromLocs = await coordsFromLocationChain(supabase, startId, endId, stops);
    if (fromLocs && fromLocs.length >= 2) {
      return sumLegsKm(fromLocs);
    }
  }

  const fallback = buildGpsFallbackChain(trip, endGps);
  if (!fallback || fallback.length < 2) return 0;
  return sumLegsKm(fallback);
}
