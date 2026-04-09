export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  // Guard numeric drift at antipodes; harmless for short domestic legs.
  const root = Math.sqrt(Math.max(0, Math.min(1, h)));
  return 2 * R * Math.asin(root);
}

