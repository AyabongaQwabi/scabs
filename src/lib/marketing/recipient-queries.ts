import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export type WhatsappRecipientInput = {
  customer_phone: string;
  last_location_label: string;
  total_trips: number;
  trips_until_25: number;
};

function marketing25MinTripsFallback(): number {
  const raw = process.env.MARKETING_25_MIN_TRIPS;
  if (raw === undefined || raw === "") return 5;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 5;
}

export async function fetch25PercentTripThreshold(supabaseAdmin: SupabaseAdmin): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("discount_rules")
    .select("min_repeat_trips")
    .eq("discount_percent", 25)
    .order("min_repeat_trips", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.min_repeat_trips) {
    return marketing25MinTripsFallback();
  }
  return Math.max(1, Number(data.min_repeat_trips));
}

/** Latest ended trip end location name per customer_phone (end_location_id → locations.name). */
export async function fetchLastTripLocationByPhone(supabaseAdmin: SupabaseAdmin): Promise<Map<string, string>> {
  const { data: trips, error } = await supabaseAdmin
    .from("trips")
    .select("customer_phone, end_location_id, ended_at")
    .not("ended_at", "is", null)
    .not("customer_phone", "is", null)
    .order("ended_at", { ascending: false });

  if (error) throw new Error(error.message);

  const firstByPhone = new Map<string, string | null>();
  for (const row of trips ?? []) {
    const phone = row.customer_phone as string;
    if (!firstByPhone.has(phone)) {
      firstByPhone.set(phone, row.end_location_id as string | null);
    }
  }

  const locIds = [...new Set([...firstByPhone.values()].filter(Boolean))] as string[];
  const locNames = new Map<string, string>();
  if (locIds.length) {
    const { data: locs, error: locErr } = await supabaseAdmin
      .from("locations")
      .select("id,name")
      .in("id", locIds);
    if (locErr) throw new Error(locErr.message);
    for (const l of locs ?? []) {
      locNames.set(l.id as string, l.name as string);
    }
  }

  const out = new Map<string, string>();
  for (const [phone, endId] of firstByPhone) {
    const label =
      endId && locNames.has(endId) ? locNames.get(endId)! : "your drop-off / indawo yakho";
    out.set(phone, label);
  }
  return out;
}

export async function buildWhatsappCampaignRecipients(supabaseAdmin: SupabaseAdmin): Promise<WhatsappRecipientInput[]> {
  const threshold = await fetch25PercentTripThreshold(supabaseAdmin);
  const lastLocByPhone = await fetchLastTripLocationByPhone(supabaseAdmin);

  const { data: customers, error } = await supabaseAdmin
    .from("customers")
    .select("phone,total_trips")
    .gt("total_trips", 0)
    .order("phone");

  if (error) throw new Error(error.message);

  const rows: WhatsappRecipientInput[] = [];
  for (const c of customers ?? []) {
    const phone = c.phone as string;
    const total = Number(c.total_trips ?? 0);
    const tripsUntil25 = Math.max(0, threshold - total);
    rows.push({
      customer_phone: phone,
      last_location_label: lastLocByPhone.get(phone) ?? "your drop-off / indawo yakho",
      total_trips: total,
      trips_until_25: tripsUntil25,
    });
  }
  return rows;
}
