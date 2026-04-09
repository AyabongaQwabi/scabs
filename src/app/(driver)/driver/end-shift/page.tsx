import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { requireDriverId } from "@/lib/driver-session/require-driver";
import { getOpenShiftForDriver } from "@/lib/driver/shift-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EndShiftClient } from "./end-shift-client";

export const dynamic = "force-dynamic";

export default async function DriverEndShiftPage() {
  const driverId = await requireDriverId();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: shift } = await getOpenShiftForDriver<{
    id: string;
    end_time: string | null;
    start_km: number | null;
  }>(supabaseAdmin, driverId, "id,end_time,start_km");

  const active = !!shift?.id && !shift.end_time;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">End shift</h1>
        <p className="text-sm text-muted-foreground">Record end km and finish the day.</p>
      </div>

      <Card className="p-4">
        {shift?.start_km != null ? (
          <div className="mb-3 text-xs text-muted-foreground">
            Start km: {Number(shift.start_km).toFixed(0)}.
          </div>
        ) : null}
        <EndShiftClient disabled={!active} />
      </Card>
    </div>
  );
}

