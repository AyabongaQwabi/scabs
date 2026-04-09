"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function setDailyGoalAction(formData: FormData) {
  const driverId = String(formData.get("driverId") ?? "");
  const date = String(formData.get("date") ?? "");
  const targetAmount = Number(String(formData.get("targetAmount") ?? ""));

  if (!driverId) throw new Error("Missing driverId");
  if (!date) throw new Error("Missing date");
  if (!Number.isFinite(targetAmount) || targetAmount < 0) throw new Error("Invalid target amount");

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("daily_goals").upsert({
    driver_id: driverId,
    date,
    target_amount: targetAmount,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/goals");
}

export async function setMonthlyTeamGoalAction(formData: FormData) {
  const year = Number(String(formData.get("year") ?? ""));
  const month = Number(String(formData.get("month") ?? ""));
  const targetAmount = Number(String(formData.get("targetAmount") ?? ""));

  if (!Number.isFinite(year) || year < 2000) throw new Error("Invalid year");
  if (!Number.isFinite(month) || month < 1 || month > 12) throw new Error("Invalid month");
  if (!Number.isFinite(targetAmount) || targetAmount < 0) throw new Error("Invalid target amount");

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("monthly_team_goals").upsert({
    year,
    month,
    target_amount: targetAmount,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/goals");
}

