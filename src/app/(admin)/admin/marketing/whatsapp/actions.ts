"use server";

import { revalidatePath } from "next/cache";

import { toE164ForWhatsapp } from "@/lib/marketing/phone-e164";
import {
  buildWhatsappCampaignRecipients,
  fetch25PercentTripThreshold,
} from "@/lib/marketing/recipient-queries";
import { applyWhatsappTemplate, buildLoyaltyLine } from "@/lib/marketing/template";
import { sendWasenderText, WASENDER_MIN_INTERVAL_MS } from "@/lib/marketing/wasender";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type WhatsappRecipientPreview = {
  customer_phone: string;
  last_location_label: string;
  total_trips: number;
  trips_until_25: number;
};

export async function prepareWhatsappRecipientsAction(): Promise<{
  recipients: WhatsappRecipientPreview[];
}> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  const recipients = await buildWhatsappCampaignRecipients(admin);
  return { recipients };
}

export async function startWhatsappCampaignAction(template: string): Promise<{ batchId: string }> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = template.trim();
  if (!trimmed) throw new Error("Template is empty");

  const admin = getSupabaseAdmin();
  const threshold = await fetch25PercentTripThreshold(admin);
  const rows = await buildWhatsappCampaignRecipients(admin);
  if (!rows.length) throw new Error("No customers with trips to message");

  const { data: batch, error: batchErr } = await admin
    .from("whatsapp_campaign_batches")
    .insert({
      template: trimmed,
      created_by: user.email ?? user.id,
      status: "active",
      threshold_trips: threshold,
    })
    .select("id")
    .single();

  if (batchErr || !batch) throw new Error(batchErr?.message ?? "Failed to create batch");

  const batchId = batch.id as string;

  const insertRows = rows.map((r) => ({
    batch_id: batchId,
    customer_phone: r.customer_phone,
    last_location_label: r.last_location_label,
    total_trips: r.total_trips,
    trips_until_25: r.trips_until_25,
  }));

  const { error: recErr } = await admin.from("whatsapp_campaign_recipients").insert(insertRows);
  if (recErr) throw new Error(recErr.message);

  revalidatePath("/admin/marketing/whatsapp");
  return { batchId };
}

export type WhatsappRecipientRow = {
  id: string;
  customer_phone: string;
  last_location_label: string;
  total_trips: number;
  trips_until_25: number;
  status: string;
  error: string | null;
  sent_at: string | null;
};

export async function fetchWhatsappCampaignAction(batchId: string): Promise<{
  batch: { id: string; status: string; template: string; threshold_trips: number };
  recipients: WhatsappRecipientRow[];
  pendingCount: number;
}> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  const { data: batch, error: bErr } = await admin
    .from("whatsapp_campaign_batches")
    .select("id,status,template,threshold_trips")
    .eq("id", batchId)
    .single();

  if (bErr || !batch) throw new Error(bErr?.message ?? "Batch not found");

  const { data: recipients, error: rErr } = await admin
    .from("whatsapp_campaign_recipients")
    .select("id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (rErr) throw new Error(rErr.message);

  const list = (recipients ?? []) as WhatsappRecipientRow[];
  const pendingCount = list.filter((r) => r.status === "pending").length;

  return {
    batch: {
      id: batch.id as string,
      status: batch.status as string,
      template: batch.template as string,
      threshold_trips: Number(batch.threshold_trips ?? 5),
    },
    recipients: list,
    pendingCount,
  };
}

export async function sendNextWhatsappMessageAction(batchId: string): Promise<
  | {
      ok: true;
      recipient: WhatsappRecipientRow | null;
      pendingCount: number;
      batchCompleted: boolean;
    }
  | { ok: false; rateLimited: true; retryAfterMs: number }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();

  const { data: batch, error: bErr } = await admin
    .from("whatsapp_campaign_batches")
    .select("id,status,template,threshold_trips,last_wasender_request_at")
    .eq("id", batchId)
    .single();

  if (bErr || !batch) return { ok: false, error: "Batch not found" };
  if ((batch.status as string) !== "active") {
    return { ok: false, error: "Batch is not active" };
  }

  const lastAt = batch.last_wasender_request_at as string | null;
  if (lastAt) {
    const elapsed = Date.now() - new Date(lastAt).getTime();
    if (elapsed < WASENDER_MIN_INTERVAL_MS) {
      return {
        ok: false,
        rateLimited: true,
        retryAfterMs: WASENDER_MIN_INTERVAL_MS - elapsed,
      };
    }
  }

  const { data: next, error: nErr } = await admin
    .from("whatsapp_campaign_recipients")
    .select(
      "id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at",
    )
    .eq("batch_id", batchId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nErr) return { ok: false, error: nErr.message };
  if (!next) {
    await admin
      .from("whatsapp_campaign_batches")
      .update({ status: "completed" })
      .eq("id", batchId);
    revalidatePath("/admin/marketing/whatsapp");
    return {
      ok: true,
      recipient: null,
      pendingCount: 0,
      batchCompleted: true,
    };
  }

  const recipientId = next.id as string;

  const { data: claimed, error: claimErr } = await admin
    .from("whatsapp_campaign_recipients")
    .update({ status: "sending" })
    .eq("id", recipientId)
    .eq("status", "pending")
    .select(
      "id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at",
    )
    .maybeSingle();

  if (claimErr) return { ok: false, error: claimErr.message };
  if (!claimed) {
    const { count } = await admin
      .from("whatsapp_campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .eq("status", "pending");
    return {
      ok: true,
      recipient: null,
      pendingCount: count ?? 0,
      batchCompleted: false,
    };
  }

  const template = batch.template as string;
  const threshold = Number(batch.threshold_trips ?? 5);
  const totalTrips = Number(claimed.total_trips);
  const tripsUntil25 = Number(claimed.trips_until_25);
  const loyaltyLine = buildLoyaltyLine(totalTrips, threshold, tripsUntil25);

  const text = applyWhatsappTemplate(template, {
    lastLocation: claimed.last_location_label as string,
    totalTrips,
    tripsUntil25,
    loyaltyLine,
  });

  const phoneResult = toE164ForWhatsapp(claimed.customer_phone as string);
  const nowIso = new Date().toISOString();

  await admin
    .from("whatsapp_campaign_batches")
    .update({ last_wasender_request_at: nowIso })
    .eq("id", batchId);

  if (!phoneResult.ok) {
    const { data: failed } = await admin
      .from("whatsapp_campaign_recipients")
      .update({
        status: "failed",
        error: phoneResult.reason,
        rendered_message: text,
      })
      .eq("id", recipientId)
      .select(
        "id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at",
      )
      .single();

    const { count } = await admin
      .from("whatsapp_campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .eq("status", "pending");

    const pending = count ?? 0;
    if (pending === 0) {
      await admin.from("whatsapp_campaign_batches").update({ status: "completed" }).eq("id", batchId);
    }
    revalidatePath("/admin/marketing/whatsapp");
    return {
      ok: true,
      recipient: (failed as WhatsappRecipientRow) ?? null,
      pendingCount: pending,
      batchCompleted: pending === 0,
    };
  }

  const sendResult = await sendWasenderText(phoneResult.e164, text);

  if (!sendResult.ok) {
    const { data: failed } = await admin
      .from("whatsapp_campaign_recipients")
      .update({
        status: "failed",
        error: sendResult.message,
        rendered_message: text,
      })
      .eq("id", recipientId)
      .select(
        "id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at",
      )
      .single();

    const { count } = await admin
      .from("whatsapp_campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .eq("status", "pending");

    const pendingFail = count ?? 0;
    if (pendingFail === 0) {
      await admin.from("whatsapp_campaign_batches").update({ status: "completed" }).eq("id", batchId);
    }
    revalidatePath("/admin/marketing/whatsapp");
    return {
      ok: true,
      recipient: (failed as WhatsappRecipientRow) ?? null,
      pendingCount: pendingFail,
      batchCompleted: pendingFail === 0,
    };
  }

  const { data: sent } = await admin
    .from("whatsapp_campaign_recipients")
    .update({
      status: "sent",
      error: null,
      sent_at: nowIso,
      rendered_message: text,
    })
    .eq("id", recipientId)
    .select(
      "id,customer_phone,last_location_label,total_trips,trips_until_25,status,error,sent_at",
    )
    .single();

  const { count: pendingCount } = await admin
    .from("whatsapp_campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "pending");

  const pending = pendingCount ?? 0;
  if (pending === 0) {
    await admin.from("whatsapp_campaign_batches").update({ status: "completed" }).eq("id", batchId);
  }

  revalidatePath("/admin/marketing/whatsapp");
  return {
    ok: true,
    recipient: (sent as WhatsappRecipientRow) ?? null,
    pendingCount: pending,
    batchCompleted: pending === 0,
  };
}
