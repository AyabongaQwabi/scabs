import { Card } from "@/components/ui/card";
import { CollapsibleTableSection } from "@/components/ui/collapsible-table-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { computeDrivingKmByRouteId } from "@/lib/maps/admin-route-driving-distances";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { addLocationAction } from "./actions";
import { LocationsAdminTable } from "./locations-admin-table";
import { PricingForm } from "./pricing-form";
import { TravelRoutesTable } from "./travel-routes-table";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPricingPage() {
  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: locations, error: locErr }, { data: pricing, error: priceErr }] = await Promise.all([
    supabaseAdmin.from("locations").select("id,name,lat,lng").order("name"),
    supabaseAdmin
      .from("travel_routes")
      .select("id,from_location_id,to_location_id,recommended_price,min_price,max_price")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (locErr) throw new Error(locErr.message);
  if (priceErr) throw new Error(priceErr.message);

  const existingRoutePairKeys = (pricing ?? []).map(
    (p) => `${p.from_location_id}:${p.to_location_id}`,
  );

  const maxMatrixLookupsRaw =
    process.env.MAPBOX_ADMIN_MAX_ROUTE_LOOKUPS ?? process.env.GOOGLE_MAPS_ADMIN_MAX_ROUTE_LOOKUPS;
  let maxMatrixRouteLookups = 400;
  if (maxMatrixLookupsRaw !== undefined && String(maxMatrixLookupsRaw).trim() !== "") {
    const n = Number(maxMatrixLookupsRaw);
    maxMatrixRouteLookups = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 400;
  }

  const drivingKmByRouteId = await computeDrivingKmByRouteId(pricing ?? [], locations ?? []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations & Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Manage locations and travel routes (directed from → to pricing). Saving a route between two
          different places also upserts the return direction with the same prices.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-medium">Add location</div>
          <form action={addLocationAction} className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Komani Central" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat">Lat (optional)</Label>
                <Input id="lat" name="lat" inputMode="decimal" placeholder="-31.89" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Lng (optional)</Label>
                <Input id="lng" name="lng" inputMode="decimal" placeholder="26.87" />
              </div>
            </div>
            <Button type="submit" variant="secondary">
              Add location
            </Button>
          </form>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium">Add new route</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick one origin and one or more destinations with the same price; return legs are created
            automatically. Skip pairs that already exist in Travel Routes — edit those in the table below.
          </p>
          <PricingForm
            locations={locations ?? []}
            existingRoutePairKeys={existingRoutePairKeys}
          />
        </Card>
      </div>

      <CollapsibleTableSection title="All locations">
        <div className="overflow-x-auto">
          <LocationsAdminTable locations={locations ?? []} />
        </div>
      </CollapsibleTableSection>

      <CollapsibleTableSection title="Travel Routes">
        <TravelRoutesTable
          routes={pricing ?? []}
          locations={locations ?? []}
          drivingKmByRouteId={drivingKmByRouteId}
          maxMatrixRouteLookups={maxMatrixRouteLookups}
        />
      </CollapsibleTableSection>
    </div>
  );
}

