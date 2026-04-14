/** Local calendar week: Monday 00:00–Sunday 23:59 (browser/server local timezone when Date is parsed from ISO). */

export function startOfLocalWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekIntervalLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${weekStart.toLocaleDateString("en-ZA", opts)} – ${end.toLocaleDateString("en-ZA", opts)}`;
}

export type DriverLossRow = {
  id: string;
  created_at: string;
  distance_km: number;
  estimated_loss_zar: number;
  driver_id: string;
  shift_id: string | null;
  trip_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
};

export type WeekBucket = {
  weekKey: string;
  weekStart: Date;
  label: string;
  rows: DriverLossRow[];
  totalKm: number;
  totalLossZar: number;
};

export function groupDriverLossesByWeek(rows: DriverLossRow[]): WeekBucket[] {
  const map = new Map<string, DriverLossRow[]>();
  for (const r of rows) {
    const dt = new Date(r.created_at);
    const weekStart = startOfLocalWeek(dt);
    const key = localDateKey(weekStart);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const keys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return keys.map((weekKey) => {
    const [y, m, d] = weekKey.split("-").map(Number);
    const weekStart = new Date(y, m - 1, d);
    const list = map.get(weekKey)!;
    const totalKm = list.reduce((s, x) => s + Number(x.distance_km), 0);
    const totalLossZar = list.reduce((s, x) => s + Number(x.estimated_loss_zar), 0);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      weekKey,
      weekStart,
      label: formatWeekIntervalLabel(weekStart),
      rows: list,
      totalKm,
      totalLossZar,
    };
  });
}
