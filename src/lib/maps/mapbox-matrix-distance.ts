import "server-only";

type Coord = { lat: number; lng: number };

type MatrixResponse = {
  code: string;
  message?: string;
  distances?: Array<Array<number | null>>;
};

/**
 * Mapbox Matrix API (driving distances on the road network).
 * @see https://docs.mapbox.com/api/navigation/matrix/
 *
 * Env: `MAPBOX_ACCESS_TOKEN` (secret token with Matrix API enabled; do not use `NEXT_PUBLIC_` unless you accept exposure).
 */
export function getMapboxAccessToken(): string | undefined {
  const t =
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.MAPBOX_SECRET_TOKEN?.trim();
  return t || undefined;
}

/**
 * Driving distance in meters between two points using profile `mapbox/driving`.
 * Uses a 1×2 matrix: source = first coordinate, destinations = both (we read index [0][1]).
 */
export async function fetchMapboxDrivingDistanceMeters(
  origin: Coord,
  destination: Coord,
): Promise<number | null> {
  const token = getMapboxAccessToken();
  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[mapbox-matrix] No token. Set MAPBOX_ACCESS_TOKEN (see https://docs.mapbox.com/api/navigation/matrix/).",
      );
    }
    return null;
  }

  // Mapbox expects longitude,latitude; semicolon-separated (see Matrix API docs).
  const coordPath = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordPath}`,
  );
  url.searchParams.set("sources", "0");
  url.searchParams.set("destinations", "all");
  url.searchParams.set("annotations", "distance");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[mapbox-matrix] HTTP", res.status, await res.text().catch(() => ""));
    }
    return null;
  }

  const data = (await res.json()) as MatrixResponse;

  if (data.code !== "Ok") {
    if (process.env.NODE_ENV === "development") {
      console.warn("[mapbox-matrix] code:", data.code, data.message ?? "");
    }
    return null;
  }

  const meters = data.distances?.[0]?.[1];
  if (meters == null || !Number.isFinite(meters)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[mapbox-matrix] No distance for pair (null or unroutable).");
    }
    return null;
  }

  return meters;
}

/** Driving distance in km. Not cached so config/token fixes apply on the next request. */
export async function getDrivingDistanceKm(origin: Coord, destination: Coord): Promise<number | null> {
  const meters = await fetchMapboxDrivingDistanceMeters(origin, destination);
  return meters == null ? null : meters / 1000;
}
