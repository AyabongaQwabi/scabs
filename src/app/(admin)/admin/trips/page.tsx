import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let req = supabaseAdmin
    .from("trips")
    .select(
      "id,created_at,driver_id,start_location_id,end_location_id,actual_price,recommended_price,discount_amount,customer_phone,total_distance_km"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) req = req.ilike("customer_phone", `%${query}%`);

  const { data: trips, error } = await req;
  if (error) throw new Error(error.message);

  const driverIds = Array.from(new Set((trips ?? []).map((t) => t.driver_id)));
  const locationIds = Array.from(
    new Set((trips ?? []).flatMap((t) => [t.start_location_id, t.end_location_id]).filter(Boolean))
  ) as string[];

  const [{ data: drivers }, { data: locs }] = await Promise.all([
    driverIds.length ? supabaseAdmin.from("drivers").select("id,name").in("id", driverIds) : { data: [] },
    locationIds.length ? supabaseAdmin.from("locations").select("id,name").in("id", locationIds) : { data: [] },
  ]);

  const driverName = new Map<string, string>();
  for (const d of drivers ?? []) driverName.set(d.id, d.name);
  const locName = new Map<string, string>();
  for (const l of locs ?? []) locName.set(l.id, l.name);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">Filter and export trip history.</p>
        </div>
        <Link className="text-sm underline underline-offset-4" href="/admin/trips/export.csv">
          Export CSV
        </Link>
      </div>

      <Card className="p-4">
        <form className="flex gap-2" action="/admin/trips" method="get">
          <Input name="q" defaultValue={query} placeholder="Search by customer phone..." />
        </form>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Recommended</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead>Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(trips ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{driverName.get(t.driver_id) ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {(locName.get(t.start_location_id) ?? "—") + " → " + (locName.get(t.end_location_id) ?? "—")}
                </TableCell>
                <TableCell className="text-right">
                  {t.total_distance_km != null ? Number(t.total_distance_km).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {t.recommended_price != null ? `R${Number(t.recommended_price).toFixed(0)}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {t.actual_price != null ? `R${Number(t.actual_price).toFixed(0)}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {t.discount_amount ? `R${Number(t.discount_amount).toFixed(0)}` : "—"}
                </TableCell>
                <TableCell className="text-sm">{t.customer_phone ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!trips?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No trips found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

