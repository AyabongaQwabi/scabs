import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DEADHEAD_ZAR_PER_KM } from "@/lib/pricing/deadhead";

export const dynamic = "force-dynamic";

export default async function AdminDriverLossesPage() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: rows, error } = await supabaseAdmin
    .from("driver_losses")
    .select(
      "id,created_at,distance_km,estimated_loss_zar,zar_per_km_applied,driver_id,shift_id,trip_id,from_location_id,to_location_id",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const locIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const r of rows ?? []) {
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

  const totalKm = (rows ?? []).reduce((s, r) => s + Number(r.distance_km), 0);
  const totalLoss = (rows ?? []).reduce((s, r) => s + Number(r.estimated_loss_zar), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Driver pre-trip losses</h1>
        <p className="text-sm text-muted-foreground">
          Unpaid deadhead before pickup (road km via Mapbox when configured, else straight-line, × R
          {DEADHEAD_ZAR_PER_KM}/km). Captured when drivers start a trip from the driver app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Records shown</div>
          <div className="mt-1 text-xl font-semibold">{(rows ?? []).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total deadhead km (sum)</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{totalKm.toFixed(1)} km</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Estimated lost revenue (sum)</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            R{totalLoss.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
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
            {(rows ?? []).map((r) => (
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
                <TableCell className="text-right tabular-nums">{Number(r.distance_km).toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  R{Number(r.estimated_loss_zar).toFixed(0)}
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
            ))}
            {!rows?.length ? (
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
