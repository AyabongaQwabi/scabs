import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  groupDriverLossesByWeek,
  type DriverLossRow,
} from "@/lib/driver-losses/group-by-week";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DEADHEAD_ZAR_PER_KM } from "@/lib/pricing/deadhead";

export const dynamic = "force-dynamic";

const FETCH_LIMIT = 3000;

export default async function AdminDriverLossesPage() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: rowsRaw, error } = await supabaseAdmin
    .from("driver_losses")
    .select(
      "id,created_at,distance_km,estimated_loss_zar,zar_per_km_applied,driver_id,shift_id,trip_id,from_location_id,to_location_id",
    )
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error) throw new Error(error.message);

  const rows: DriverLossRow[] = (rowsRaw ?? []).map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    distance_km: Number(r.distance_km),
    estimated_loss_zar: Number(r.estimated_loss_zar),
    driver_id: r.driver_id as string,
    shift_id: (r.shift_id as string | null) ?? null,
    trip_id: (r.trip_id as string | null) ?? null,
    from_location_id: (r.from_location_id as string | null) ?? null,
    to_location_id: (r.to_location_id as string | null) ?? null,
  }));

  const locIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const r of rows) {
    if (r.from_location_id) locIds.add(r.from_location_id);
    if (r.to_location_id) locIds.add(r.to_location_id);
    if (r.driver_id) driverIds.add(r.driver_id);
  }

  const [{ data: locs }, { data: drivers }] = await Promise.all([
    locIds.size
      ? supabaseAdmin.from("locations").select("id,name").in("id", [...locIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    driverIds.size
      ? supabaseAdmin.from("drivers").select("id,name").in("id", [...driverIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const locName = new Map((locs ?? []).map((l) => [l.id, l.name]));
  const driverName = new Map((drivers ?? []).map((d) => [d.id, d.name]));

  const byWeek = groupDriverLossesByWeek(rows);
  const totalKm = rows.reduce((s, r) => s + r.distance_km, 0);
  const totalLoss = rows.reduce((s, r) => s + r.estimated_loss_zar, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Driver pre-trip losses</h1>
        <p className="text-sm text-muted-foreground">
          Unpaid deadhead before pickup (road km via Mapbox when configured, else straight-line, × R
          {DEADHEAD_ZAR_PER_KM}/km). Captured when drivers start a trip from the driver app. Figures below
          are grouped by calendar week (Mon–Sun, local time). Up to {FETCH_LIMIT} most recent records are
          loaded.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Records in view</div>
          <div className="mt-1 text-xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total deadhead km (all weeks shown)</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{totalKm.toFixed(1)} km</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estimated lost revenue (all weeks shown)</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            R{totalLoss.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">Totals by week</div>
          <p className="text-xs text-muted-foreground">Each row is one Monday–Sunday interval.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead className="text-right">Deadhead km</TableHead>
              <TableHead className="text-right">Est. loss (R)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byWeek.map((w) => (
              <TableRow key={w.weekKey}>
                <TableCell className="font-medium">{w.label}</TableCell>
                <TableCell className="text-right tabular-nums">{w.rows.length}</TableCell>
                <TableCell className="text-right tabular-nums">{w.totalKm.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  R{w.totalLossZar.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                </TableCell>
              </TableRow>
            ))}
            {!byWeek.length ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No pre-trip losses recorded yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">Detail by week</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Loss (R)</TableHead>
              <TableHead className="text-right">Trip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byWeek.flatMap((w) => [
              <TableRow key={`h-${w.weekKey}`} className="bg-muted/60 hover:bg-muted/60">
                <TableCell colSpan={6} className="py-2 text-sm font-medium">
                  {w.label} — {w.rows.length} record(s), {w.totalKm.toFixed(2)} km, R
                  {w.totalLossZar.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                </TableCell>
              </TableRow>,
              ...w.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{driverName.get(r.driver_id) ?? "—"}</TableCell>
                  <TableCell>
                    {locName.get(r.from_location_id ?? "") ?? "—"} →{" "}
                    {locName.get(r.to_location_id ?? "") ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.distance_km.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    R{r.estimated_loss_zar.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.trip_id ? (
                      <span className="font-mono text-xs text-muted-foreground" title={r.trip_id}>
                        {r.trip_id.slice(0, 8)}…
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              )),
            ])}
            {!rows.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No pre-trip losses recorded yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
