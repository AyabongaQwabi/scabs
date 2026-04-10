import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { normalizeCustomerPhone } from "@/lib/customers/phone";
import { DriverNotAuthenticatedError, requireDriverIdForApi } from "@/lib/driver-session/require-driver";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    await requireDriverIdForApi();
    const url = new URL(req.url);
    const q = (url.searchParams.get("search") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ customers: [] as { phone: string }[] });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("phone,total_trips,last_trip_date")
      .ilike("phone", `%${q}%`)
      .order("last_trip_date", { ascending: false, nullsFirst: false })
      .limit(25);

    if (error) throw new Error(error.message);
    return NextResponse.json({ customers: data ?? [] });
  } catch (e) {
    if (e instanceof DriverNotAuthenticatedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load customers." },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireDriverIdForApi();
    const body = (await req.json().catch(() => null)) as { phone?: string } | null;
    const raw = String(body?.phone ?? "").trim();
    if (!raw) throw new Error("Phone is required.");
    const phone = normalizeCustomerPhone(raw);
    if (phone.length < 8) throw new Error("Enter a valid phone number.");

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("customers").insert({
      phone,
      total_trips: 0,
      loyalty_tier: "bronze",
    });

    if (error?.code === "23505") {
      revalidatePath("/admin/customers");
      revalidatePath("/admin/overview");
      return NextResponse.json({ ok: true as const, existing: true as const });
    }
    if (error) throw new Error(error.message);
    revalidatePath("/admin/customers");
    revalidatePath("/admin/overview");
    return NextResponse.json({ ok: true as const, existing: false as const });
  } catch (e) {
    if (e instanceof DriverNotAuthenticatedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save customer." },
      { status: 400 },
    );
  }
}
