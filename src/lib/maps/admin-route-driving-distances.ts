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

/** Min delay between Matrix API calls when bulk-loading admin route distances (ms). */
function minIntervalBetweenMatrixMs(): number {
  const raw = process.env.MAPBOX_MATRIX_MIN_INTERVAL_MS;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 1100;
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
 * Requests are serialized with a small delay so a single page load does not burst past Mapbox limits.
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
  const gapMs = minIntervalBetweenMatrixMs();

  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && gapMs > 0) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
    const [pk, routeIds] = entries[i]!;
    try {
      const [origStr, destStr] = pk.split("|");
      const [oLat, oLng] = origStr.split(",").map(Number);
      const [dLat, dLng] = destStr.split(",").map(Number);
      const km = await getDrivingDistanceKm(
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng },
      );
      if (km == null) continue;
      for (const id of routeIds) results[id] = km;
    } catch {
      /* getDrivingDistanceKm should not throw; guard so admin pages never 500 */
    }
  }

  return results;
}
