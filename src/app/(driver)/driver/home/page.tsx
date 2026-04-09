import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { requireDriverId } from "@/lib/driver-session/require-driver";
import { getOpenShiftForDriver, driverLocalDayUtcRange } from "@/lib/driver/shift-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { StartShiftClient } from "./start-shift-client";

export const dynamic = "force-dynamic";

export default async function DriverHomePage() {
  const driverId = await requireDriverId();
  const supabaseAdmin = getSupabaseAdmin();
  const { startIso, endExclusiveIso } = driverLocalDayUtcRange();

  const [{ data: driver }, { data: shift }, { data: trips }, { data: activeTrips }] = await Promise.all([
    supabaseAdmin.from("drivers").select("id,name").eq("id", driverId).maybeSingle(),
    getOpenShiftForDriver<{
      id: string;
      goal_amount: number | null;
      total_earned: number | null;
      start_km: number | null;
      end_km: number | null;
      end_time: string | null;
    }>(supabaseAdmin, driverId, "id,goal_amount,total_earned,start_km,end_km,end_time"),
    supabaseAdmin
      .from("trips")
      .select("id,actual_price,created_at")
      .eq("driver_id", driverId)
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso),
    supabaseAdmin
      .from("trips")
      .select("id,created_at,start_location_id,end_location_id,customer_phone,recommended_price")
      .eq("driver_id", driverId)
      .is("ended_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const locIds = Array.from(
    new Set(
      (activeTrips ?? []).flatMap((t) => [t.start_location_id, t.end_location_id]).filter(Boolean)
    )
  ) as string[];

  const { data: locRows } = locIds.length
    ? await supabaseAdmin.from("locations").select("id,name").in("id", locIds)
    : { data: [] as { id: string; name: string }[] };

  const locName = new Map((locRows ?? []).map((l) => [l.id, l.name]));

  const tripsToday = trips?.length ?? 0;
  const revenueToday =
    trips?.reduce((sum, t) => sum + (t.actual_price ? Number(t.actual_price) : 0), 0) ?? 0;

  const goalAmount = shift?.goal_amount != null ? Number(shift.goal_amount) : 500;
  const earned = shift?.total_earned != null ? Number(shift.total_earned) : revenueToday;
  const shiftActive = !!shift?.id && !shift.end_time;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {driver?.name ? `Hi, ${driver.name}` : "Driver Home"}
        </h1>
        <p className="text-sm text-muted-foreground">Start your shift and track today’s goal.</p>
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Today’s goal</div>
        <div className="mt-1 text-2xl font-semibold">
          R{earned.toFixed(0)} / R{goalAmount.toFixed(0)}
        </div>
        {!shiftActive ? <StartShiftClient shiftActive={shiftActive} /> : (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
            Shift is active.
            {shift?.start_km != null ? ` Start km: ${Number(shift.start_km).toFixed(0)}.` : ""}{" "}
            {shift?.end_km != null ? ` End km: ${Number(shift.end_km).toFixed(0)}.` : ""}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Trips today", value: String(tripsToday) },
          { label: "Revenue today", value: `R${revenueToday.toFixed(0)}` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-xl font-semibold">{s.value}</div>
          </Card>
        ))}
      </div>

      {(activeTrips ?? []).length > 0 ? (
        <Card className="border-primary/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Trips to finish</div>
              <div className="text-xs text-muted-foreground">
                {activeTrips!.length === 1
                  ? "You have an open trip — end it when you’re done."
                  : `${activeTrips!.length} open trips — tap one to end it.`}
              </div>
            </div>
            <div className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              {activeTrips!.length}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {activeTrips!.map((t) => {
              const from = t.start_location_id ? locName.get(t.start_location_id) ?? "Start" : "Start";
              const to = t.end_location_id ? locName.get(t.end_location_id) ?? "End" : "End";
              const rec =
                t.recommended_price != null ? `R${Number(t.recommended_price).toFixed(0)}` : "Manual price";
              const time = new Date(t.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li key={t.id}>
                  <Link
                    href={`/driver/trips/active?tripId=${t.id}`}
                    className="flex flex-col gap-1 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40 active:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">
                        {from} → {to}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Rec. {rec}</span>
                      {t.customer_phone ? <span>{t.customer_phone}</span> : null}
                    </div>
                    <span className="text-xs font-medium text-primary">Open to end trip →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Link href="/driver/trips/new" className="block">
        <Button variant="secondary" className="w-full" size="lg">
          Create Trip
        </Button>
      </Link>
    </div>
  );
}

