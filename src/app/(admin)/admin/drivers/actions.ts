"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createDriverAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const vehicleReg = String(formData.get("vehicle_reg") ?? "").trim() || null;
  const activeRaw = String(formData.get("is_active") ?? "on");

  if (!name) throw new Error("Driver name is required.");

  const is_active = activeRaw === "on";

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("drivers").insert({
    name,
    vehicle_reg: vehicleReg,
    is_active,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/drivers");
  revalidatePath("/driver/select");
}
