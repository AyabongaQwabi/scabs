/**
 * If `lat` / `lng` were saved with longitude in the latitude field and latitude in the
 * longitude field (common when copying “lng, lat” or map URLs), distance math is wrong.
 *
 * For South Africa, correct points look like: latitude negative (~-22 to -35), longitude
 * positive (~16–33). A swapped pair often looks like lat ≈ 27, lng ≈ -32.
 */
export function normalizeLatLngSouthernAfrica(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  const looksLikeLngLatSwapped =
    lat >= 15 && lat <= 35 && lng <= -18 && lng >= -37;
  if (looksLikeLngLatSwapped) return { lat: lng, lng: lat };
  return { lat, lng };
}
