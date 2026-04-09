import { Card } from "@/components/ui/card";

import { requireDriverId } from "@/lib/driver-session/require-driver";
import { driverCalendarDateISO, getOpenShiftForDriver } from "@/lib/driver/shift-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { estimateCostPerKm } from "@/lib/fuel/cost";
import { FuelFillupClient } from "./fuel-fillup-client";

export const dynamic = "force-dynamic";

export default async function DriverFuelPage() {
  const driverId = await requireDriverId();
  const supabaseAdmin = getSupabaseAdmin();
  const calDate = driverCalendarDateISO();

  const [{ data: shift }, { data: fillups }, costPerKm] = await Promise.all([
    getOpenShiftForDriver<{ id: string; end_time: string | null }>(supabaseAdmin, driverId, "id,end_time"),
    supabaseAdmin
      .from("petrol_fillups")
      .select("id,litres,rand_amount,odometer_km,created_at")
      .eq("driver_id", driverId)
      .eq("date", calDate)
      .order("created_at", { ascending: false }),
    estimateCostPerKm(driverId),
  ]);

  const activeShift = !!shift?.id && !shift.end_time;
  const spentToday =
    fillups?.reduce((sum, f) => sum + (f.rand_amount ? Number(f.rand_amount) : 0), 0) ?? 0;
  const litresToday =
    fillups?.reduce((sum, f) => sum + (f.litres ? Number(f.litres) : 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fuel</h1>
        <p className="text-sm text-muted-foreground">Log today’s fill-ups.</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Spent today</div>
            <div className="mt-1 text-xl font-semibold">R{spentToday.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Litres today</div>
            <div className="mt-1 text-xl font-semibold">{litresToday.toFixed(1)} L</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Estimated cost/km (last 7 days): {costPerKm != null ? `R${costPerKm.toFixed(2)}` : "—"}
        </div>
      </Card>

      <Card className="p-4">
        <FuelFillupClient disabled={!activeShift} />
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium">Today’s fill-ups</div>
        <div className="mt-3 space-y-2">
          {(fillups ?? []).length ? (
            fillups!.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{Number(f.litres).toFixed(1)} L</div>
                  <div className="text-xs text-muted-foreground">
                    {f.odometer_km != null ? `${Number(f.odometer_km).toFixed(0)} km` : "—"}
                  </div>
                </div>
                <div className="text-sm font-semibold">R{Number(f.rand_amount).toFixed(0)}</div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
              No fill-ups logged today.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

