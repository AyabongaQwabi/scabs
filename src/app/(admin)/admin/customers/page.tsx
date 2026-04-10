import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sumLifetimeKmByCustomerPhone } from "@/lib/customers/aggregate-lifetime-km";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { AddCustomerForm } from "./add-customer-form";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: customers, error } = await supabaseAdmin
    .from("customer_trip_metrics")
    .select(
      "phone,total_trips,last_trip_date,loyalty_tier,first_seen,lifetime_revenue_zar,lifetime_discounts_zar",
    )
    .order("lifetime_revenue_zar", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const phones = (customers ?? []).map((c) => c.phone);
  const lifetimeKmByPhone = await sumLifetimeKmByCustomerPhone(supabaseAdmin, phones);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Phone-only loyalty and repeat rate.</p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium">Add customer</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Create a record before their first trip, or backfill trip count / tier from another system.
        </p>
        <div className="mt-4 max-w-md">
          <AddCustomerForm />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead className="text-right">Revenue (R)</TableHead>
              <TableHead className="text-right">Discounts (R)</TableHead>
              <TableHead className="text-right">Distance (km)</TableHead>
              <TableHead>Last trip</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customers ?? []).map((c) => (
              <TableRow key={c.phone}>
                <TableCell className="font-medium">{c.phone}</TableCell>
                <TableCell className="text-right">{c.total_trips ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(c.lifetime_revenue_zar ?? 0).toLocaleString("en-ZA", {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(c.lifetime_discounts_zar ?? 0).toLocaleString("en-ZA", {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(lifetimeKmByPhone.get(c.phone) ?? 0).toFixed(1)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.last_trip_date ? new Date(c.last_trip_date).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-sm">{c.loyalty_tier ?? "bronze"}</TableCell>
              </TableRow>
            ))}
            {!customers?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
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

