import { Card } from "@/components/ui/card";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { selectDriverAction } from "./actions";
import { DriverSelectForm } from "./driver-select-form";

export const dynamic = "force-dynamic";

export default async function DriverSelectPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: drivers, error } = await supabaseAdmin
    .from("drivers")
    .select("id,name,vehicle_reg")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Select driver</h1>
        <p className="text-sm text-muted-foreground">Choose your name to start.</p>
      </div>

      <Card className="p-4">
        <DriverSelectForm drivers={drivers ?? []} action={selectDriverAction} />
      </Card>
    </div>
  );
}

