import { Card } from "@/components/ui/card";
import { sumLifetimeKmByCustomerPhone } from "@/lib/customers/aggregate-lifetime-km";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { AddCustomerForm } from "./add-customer-form";
import { CustomersTable, type CustomerTableRow } from "./customers-table";

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

  const tableRows: CustomerTableRow[] = (customers ?? []).map((c) => ({
    phone: c.phone as string,
    total_trips: c.total_trips as number | null,
    last_trip_date: (c.last_trip_date as string | null) ?? null,
    loyalty_tier: (c.loyalty_tier as string | null) ?? null,
    lifetime_revenue_zar: Number(c.lifetime_revenue_zar ?? 0),
    lifetime_discounts_zar: Number(c.lifetime_discounts_zar ?? 0),
    lifetime_km: lifetimeKmByPhone.get(c.phone as string) ?? 0,
  }));

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

      <CustomersTable customers={tableRows} />
    </div>
  );
}

