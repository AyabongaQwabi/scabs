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
