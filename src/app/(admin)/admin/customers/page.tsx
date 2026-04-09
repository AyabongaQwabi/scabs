import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: customers, error } = await supabaseAdmin
    .from("customers")
    .select("phone,total_trips,last_trip_date,loyalty_tier,first_seen")
    .order("total_trips", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Phone-only loyalty and repeat rate.</p>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead>Last trip</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customers ?? []).map((c) => (
              <TableRow key={c.phone}>
                <TableCell className="font-medium">{c.phone}</TableCell>
                <TableCell className="text-right">{c.total_trips ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.last_trip_date ? new Date(c.last_trip_date).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-sm">{c.loyalty_tier ?? "bronze"}</TableCell>
              </TableRow>
            ))}
            {!customers?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

