"use server";

import { revalidatePath } from "next/cache";

import { normalizeCustomerPhone } from "@/lib/customers/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function addCustomerAction(formData: FormData) {
  const phone = normalizeCustomerPhone(String(formData.get("phone") ?? ""));
  if (!phone || phone.length < 8) {
    throw new Error("Enter a valid phone number (e.g. +27712345678).");
  }

  const totalTripsRaw = String(formData.get("total_trips") ?? "").trim();
  let totalTrips = 0;
  if (totalTripsRaw) {
    const n = Number(totalTripsRaw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error("Trip count must be a whole number ≥ 0.");
    }
    totalTrips = n;
  }

  const loyaltyTier = String(formData.get("loyalty_tier") ?? "").trim() || "bronze";

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("customers").insert({
    phone,
    total_trips: totalTrips,
    loyalty_tier: loyaltyTier,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A customer with this phone number already exists.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/overview");
}

export async function updateCustomerAction(formData: FormData) {
  const originalPhone = normalizeCustomerPhone(String(formData.get("original_phone") ?? ""));
  if (!originalPhone) {
    throw new Error("Missing customer.");
  }

  const phone = normalizeCustomerPhone(String(formData.get("phone") ?? ""));
  if (!phone || phone.length < 8) {
    throw new Error("Enter a valid phone number (e.g. +27712345678).");
  }

  const totalTripsRaw = String(formData.get("total_trips") ?? "").trim();
  const n = Number(totalTripsRaw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error("Trip count must be a whole number ≥ 0.");
  }

  const loyaltyTier = String(formData.get("loyalty_tier") ?? "").trim() || "bronze";

  const lastRaw = String(formData.get("last_trip_date") ?? "").trim();
  let lastTripDate: string | null = null;
  if (lastRaw) {
    const parsed = new Date(lastRaw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid last trip date.");
    }
    lastTripDate = parsed.toISOString();
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (phone !== originalPhone) {
    const { data: clash } = await supabaseAdmin.from("customers").select("phone").eq("phone", phone).maybeSingle();
    if (clash) {
      throw new Error("Another customer already uses this phone number.");
    }

    const { error: tripErr } = await supabaseAdmin
      .from("trips")
      .update({ customer_phone: phone })
      .eq("customer_phone", originalPhone);
    if (tripErr) throw new Error(tripErr.message);
  }

  const { error } = await supabaseAdmin
    .from("customers")
    .update({
      phone,
      total_trips: n,
      loyalty_tier: loyaltyTier,
      last_trip_date: lastTripDate,
    })
    .eq("phone", originalPhone);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A customer with this phone number already exists.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/trips");
  revalidatePath("/admin/marketing/whatsapp");
}
