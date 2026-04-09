"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createDriverSession } from "@/lib/driver-session/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function selectDriverAction(formData: FormData) {
  const driverId = String(formData.get("driverId") ?? "");
  if (!driverId) throw new Error("Missing driverId");

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("drivers")
    .select("id,is_active")
    .eq("id", driverId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id || !data.is_active) throw new Error("Driver is not active.");

  await createDriverSession(driverId);
  revalidatePath("/driver/home");
  redirect("/driver/home");
}

