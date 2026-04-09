import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { requireDriverId } from "@/lib/driver-session/require-driver";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ActiveTripClient } from "./trip-client";

export const dynamic = "force-dynamic";

export default async function ActiveTripPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string }>;
}) {
  const driverId = await requireDriverId();
  const supabaseAdmin = getSupabaseAdmin();
  const { tripId } = await searchParams;

  const id = tripId?.trim();
  if (!id) redirect("/driver/home");

  const { data: trip, error } = await supabaseAdmin
    .from("trips")
    .select(
      "id,driver_id,created_at,ended_at,customer_phone,recommended_price,start_lat,start_lng,start_location_id,end_location_id,stops"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!trip?.id || trip.driver_id !== driverId) redirect("/driver/home");
  if (trip.ended_at != null) redirect("/driver/home");

  const locationIds = [
    trip.start_location_id,
    ...(Array.isArray(trip.stops) ? trip.stops.map((s: any) => s?.location_id).filter(Boolean) : []),
    trip.end_location_id,
  ].filter(Boolean);

  const { data: locs } = locationIds.length
    ? await supabaseAdmin.from("locations").select("id,name").in("id", locationIds as string[])
    : { data: [] as any[] };

  const nameById = new Map<string, string>();
  for (const l of locs ?? []) nameById.set(l.id, l.name);

  const stopNames =
    Array.isArray(trip.stops) && trip.stops.length
      ? trip.stops
          .map((s: any) => (s?.location_id ? nameById.get(s.location_id) : null))
          .filter(Boolean)
      : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active trip</h1>
        <p className="text-sm text-muted-foreground">Live distance updates every 30 seconds.</p>
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Route</div>
        <div className="mt-1 text-sm">
          <div className="font-medium">{nameById.get(trip.start_location_id) ?? "Start"}</div>
          {stopNames.length ? (
            <div className="mt-1 text-muted-foreground">Stops: {stopNames.join(", ")}</div>
          ) : null}
          <div className="mt-1 font-medium">{nameById.get(trip.end_location_id) ?? "End"}</div>
        </div>
      </Card>

      <ActiveTripClient
        tripId={trip.id}
        startLat={trip.start_lat != null ? Number(trip.start_lat) : null}
        startLng={trip.start_lng != null ? Number(trip.start_lng) : null}
        customerPhone={trip.customer_phone}
        recommendedTotal={trip.recommended_price != null ? Number(trip.recommended_price) : null}
      />
    </div>
  );
}

