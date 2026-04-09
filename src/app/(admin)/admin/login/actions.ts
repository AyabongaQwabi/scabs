"use server";

import { redirect } from "next/navigation";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) throw new Error("Email and password are required.");

  const supabase = await createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  redirect("/admin/overview");
}

export async function adminLogoutAction() {
  const supabase = await createSupabaseAuthServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

