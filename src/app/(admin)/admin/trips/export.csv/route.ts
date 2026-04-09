import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  const needs = /[",\n]/.test(s);
  return needs ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: trips, error } = await supabaseAdmin
    .from("trips")
    .select(
      "id,created_at,ended_at,driver_id,shift_id,start_location_id,end_location_id,recommended_price,actual_price,discount_amount,discount_reason,customer_phone,total_distance_km"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const header = [
    "id",
    "created_at",
    "ended_at",
    "driver_id",
    "shift_id",
    "start_location_id",
    "end_location_id",
    "total_distance_km",
    "recommended_price",
    "actual_price",
    "discount_amount",
    "discount_reason",
    "customer_phone",
  ];

  const rows = (trips ?? []).map((t) =>
    [
      t.id,
      t.created_at,
      t.ended_at,
      t.driver_id,
      t.shift_id,
      t.start_location_id,
      t.end_location_id,
      t.total_distance_km,
      t.recommended_price,
      t.actual_price,
      t.discount_amount,
      t.discount_reason,
      t.customer_phone,
    ].map(csvEscape).join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sunshine-cabs-trips.csv"`,
    },
  });
}

