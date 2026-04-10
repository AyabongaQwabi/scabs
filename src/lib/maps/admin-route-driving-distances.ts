import "server-only";

import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";

import { getDrivingDistanceKm, getMapboxAccessToken } from "./mapbox-matrix-distance";

type RouteRow = {
  id: string;
  from_location_id: string;
  to_location_id: string;
};
type LocRow = { id: string; lat: unknown; lng: unknown };

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function coordForLocation(loc: LocRow | undefined): { lat: number; lng: number } | null {
  if (!loc) return null;
  const lat = toNum(loc.lat);
  const lng = toNum(loc.lng);
  if (lat == null || lng == null) return null;
  return normalizeLatLngSouthernAfrica(lat, lng);
}

/**
 * Parallel Mapbox lookups for unique coordinate pairs (default 4).
 * Pair results are cached via `getDrivingDistanceKm` (see MAPBOX_DISTANCE_CACHE_SECONDS), so repeat
 * page loads usually do not hit Mapbox at all. Lower this if you see 429s on cold cache.
 */
function adminMatrixConcurrency(): number {
  const raw = process.env.MAPBOX_ADMIN_MATRIX_CONCURRENCY;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(1, Math.min(12, Math.floor(n)));
  }
  return 4;
}

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const c = Math.max(1, Math.min(16, Math.floor(concurrency)));
  let next = 0;
  async function runWorker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(c, items.length) }, () => runWorker()));
}

/**
 * Cap how many travel_routes rows participate in Mapbox lookups per request.
 * Default is conservative to avoid 429s; raise via MAPBOX_ADMIN_MAX_ROUTE_LOOKUPS when needed.
 */
export function maxRouteLookups(): number {
  const raw =
    process.env.MAPBOX_ADMIN_MAX_ROUTE_LOOKUPS ?? process.env.GOOGLE_MAPS_ADMIN_MAX_ROUTE_LOOKUPS;
  let max = 36;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    max = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 36;
  }
  return max;
}

/**
 * Driving km per route id via Mapbox Matrix when `MAPBOX_ACCESS_TOKEN` is set.
 * Unique coordinate pairs are resolved concurrently (see MAPBOX_ADMIN_MATRIX_CONCURRENCY); each pair
 * is cached across requests by `getDrivingDistanceKm`.
 * @see https://docs.mapbox.com/api/navigation/matrix/
 */
export async function computeDrivingKmByRouteId(
  routes: RouteRow[],
  locations: LocRow[],
): Promise<Record<string, number>> {
  if (!getMapboxAccessToken()) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[admin-route-driving-distances] Set MAPBOX_ACCESS_TOKEN for road distances.");
    }
    return {};
  }

  const max = maxRouteLookups();
  const locById = new Map(locations.map((l) => [l.id, l]));
  const slice = max > 0 ? routes.slice(0, max) : [];

  const results: Record<string, number> = {};
  const pairToRouteIds = new Map<string, string[]>();

  for (const r of slice) {
    if (r.from_location_id === r.to_location_id) {
      results[r.id] = 0;
      continue;
    }
    const o = coordForLocation(locById.get(r.from_location_id));
    const d = coordForLocation(locById.get(r.to_location_id));
    if (!o || !d) continue;

    const pk = `${o.lat.toFixed(6)},${o.lng.toFixed(6)}|${d.lat.toFixed(6)},${d.lng.toFixed(6)}`;
    if (!pairToRouteIds.has(pk)) pairToRouteIds.set(pk, []);
    pairToRouteIds.get(pk)!.push(r.id);
  }

  const entries = [...pairToRouteIds.entries()];
  const concurrency = adminMatrixConcurrency();

  await runWithConcurrency(entries, concurrency, async ([pk, routeIds]) => {
    try {
      const [origStr, destStr] = pk.split("|");
      const [oLat, oLng] = origStr.split(",").map(Number);
      const [dLat, dLng] = destStr.split(",").map(Number);
      const km = await getDrivingDistanceKm(
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng },
      );
      if (km == null) return;
      for (const id of routeIds) results[id] = km;
    } catch {
      /* getDrivingDistanceKm should not throw; guard so admin pages never 500 */
    }
  });

  return results;
}
