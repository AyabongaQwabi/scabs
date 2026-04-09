import { Card } from "@/components/ui/card";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { RealtimeRefresh } from "./realtime-refresh";
import { RevenueChart } from "./revenue-chart";
import { ActiveDriversMap } from "./active-drivers-map";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: trips }, { data: drivers }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from("trips")
      .select(
        "id,actual_price,total_distance_km,created_at,customer_phone,discount_amount,start_lat,start_lng,driver_id"
      )
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`),
    supabaseAdmin.from("drivers").select("id,name,is_active").eq("is_active", true),
    supabaseAdmin.from("customers").select("phone,total_trips"),
  ]);

  const todayRevenue =
    trips?.reduce((sum, t) => sum + (t.actual_price ? Number(t.actual_price) : 0), 0) ?? 0;
  const tripsToday = trips?.length ?? 0;
  const avgKm =
    tripsToday > 0
      ? (trips?.reduce((s, t) => s + (t.total_distance_km ? Number(t.total_distance_km) : 0), 0) ?? 0) /
        tripsToday
      : 0;

  const repeatCustomers =
    (customers ?? []).filter((c) => (c.total_trips ?? 0) >= 2).length;
  const repeatPercent =
    (customers ?? []).length > 0 ? (repeatCustomers / (customers ?? []).length) * 100 : 0;

  const byHour = new Map<number, number>();
  for (const t of trips ?? []) {
    const h = new Date(t.created_at).getHours();
    byHour.set(h, (byHour.get(h) ?? 0) + (t.actual_price ? Number(t.actual_price) : 0));
  }
  const chartData = Array.from({ length: 24 }).map((_, h) => ({
    label: String(h).padStart(2, "0"),
    revenue: byHour.get(h) ?? 0,
  }));

  const pins = (trips ?? [])
    .filter((t) => t.created_at && t.start_lat != null && t.start_lng != null)
    .slice(0, 25)
    .map((t) => ({
      id: t.id,
      lat: Number(t.start_lat),
      lng: Number(t.start_lng),
      label: `${drivers?.find((d) => d.id === t.driver_id)?.name ?? "Driver"} • Trip ${t.id.slice(0, 6)}…`,
    }));

  return (
    <div className="space-y-4">
      <RealtimeRefresh />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Realtime KPIs, trips, and active drivers.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Today revenue</div>
          <div className="mt-2 text-2xl font-semibold">R{todayRevenue.toFixed(0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Trips today</div>
          <div className="mt-2 text-2xl font-semibold">{tripsToday}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Repeat customers %</div>
          <div className="mt-2 text-2xl font-semibold">{repeatPercent.toFixed(0)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg km/trip</div>
          <div className="mt-2 text-2xl font-semibold">{avgKm.toFixed(1)}</div>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden p-4">
          <div className="text-sm font-medium">Revenue trend</div>
          <div className="mt-3 min-w-0">
            <RevenueChart data={chartData} />
          </div>
        </Card>
        <Card className="min-w-0 overflow-hidden p-4">
          <div className="text-sm font-medium">Active drivers map</div>
          <div className="mt-3">
            <ActiveDriversMap pins={pins} />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium">Active drivers</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(drivers ?? []).map((d) => (
            <div key={d.id} className="rounded-lg border p-3">
              <div className="text-sm font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          ))}
          {!drivers?.length ? (
            <div className="text-sm text-muted-foreground">No active drivers.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

