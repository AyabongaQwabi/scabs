import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { AddDriverForm } from "./add-driver-form";

export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: drivers, error: dErr }, { data: shifts }, { data: trips }] = await Promise.all([
    supabaseAdmin.from("drivers").select("id,name,vehicle_reg,is_active").order("name"),
    supabaseAdmin.from("shifts").select("driver_id,goal_amount,total_earned,date").eq("date", today),
    supabaseAdmin
      .from("trips")
      .select("driver_id,actual_price,created_at")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`),
  ]);

  if (dErr) throw new Error(dErr.message);

  const shiftByDriver = new Map<string, { goal: number; earned: number }>();
  for (const s of shifts ?? []) {
    shiftByDriver.set(s.driver_id, {
      goal: s.goal_amount != null ? Number(s.goal_amount) : 500,
      earned: s.total_earned != null ? Number(s.total_earned) : 0,
    });
  }

  const tripsByDriver = new Map<string, { trips: number; revenue: number }>();
  for (const t of trips ?? []) {
    const cur = tripsByDriver.get(t.driver_id) ?? { trips: 0, revenue: 0 };
    tripsByDriver.set(t.driver_id, {
      trips: cur.trips + 1,
      revenue: cur.revenue + (t.actual_price ? Number(t.actual_price) : 0),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-sm text-muted-foreground">Today’s activity, goals, and revenue.</p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium">Add driver</div>
        <p className="mt-1 text-xs text-muted-foreground">
          New drivers appear on the driver app login screen when marked active.
        </p>
        <div className="mt-4 max-w-md">
          <AddDriverForm />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Goal %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!(drivers ?? []).length ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No drivers yet. Create one above.
                </TableCell>
              </TableRow>
            ) : null}
            {(drivers ?? []).map((d) => {
              const t = tripsByDriver.get(d.id) ?? { trips: 0, revenue: 0 };
              const s = shiftByDriver.get(d.id);
              const goal = s?.goal ?? 500;
              const earned = s?.earned ?? t.revenue;
              const pct = goal > 0 ? (earned / goal) * 100 : 0;
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.vehicle_reg ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? "secondary" : "destructive"}>
                      {d.is_active ? "active" : "suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{t.trips}</TableCell>
                  <TableCell className="text-right">R{t.revenue.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{pct.toFixed(0)}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

