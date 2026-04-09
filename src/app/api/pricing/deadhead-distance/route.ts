import { NextResponse } from "next/server";

import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";
import { getDrivingDistanceKm } from "@/lib/maps/mapbox-matrix-distance";

/**
 * Road distance (km) for pre-trip deadhead preview on the driver app.
 * Requires `MAPBOX_ACCESS_TOKEN` on the server; returns null drivingKm when unavailable.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    fromLat?: unknown;
    fromLng?: unknown;
    toLat?: unknown;
    toLng?: unknown;
  };
  const nums = [body.fromLat, body.fromLng, body.toLat, body.toLng].map((v) =>
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN,
  );
  if (!nums.every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const [fromLat, fromLng, toLat, toLng] = nums as [number, number, number, number];
  const o = normalizeLatLngSouthernAfrica(fromLat, fromLng);
  const d = normalizeLatLngSouthernAfrica(toLat, toLng);
  const drivingKm = await getDrivingDistanceKm(o, d);

  return NextResponse.json({ drivingKm });
}
