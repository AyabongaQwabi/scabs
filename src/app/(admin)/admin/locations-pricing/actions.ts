"use server";

import { revalidatePath } from "next/cache";

import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";
import { getDrivingDistanceKm } from "@/lib/maps/mapbox-matrix-distance";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function addLocationAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();

  if (!name) throw new Error("Location name is required.");

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if (lat !== null && !Number.isFinite(lat)) throw new Error("Invalid lat.");
  if (lng !== null && !Number.isFinite(lng)) throw new Error("Invalid lng.");

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("locations").insert({ name, lat, lng });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations-pricing");
}

export async function updateLocationAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();

  if (!id) return { error: "Missing location id." };
  if (!name) return { error: "Location name is required." };

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if (lat !== null && !Number.isFinite(lat)) return { error: "Invalid lat." };
  if (lng !== null && !Number.isFinite(lng)) return { error: "Invalid lng." };

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("locations").update({ name, lat, lng }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/locations-pricing");
  return { ok: true };
}

export async function deleteLocationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing location id.");

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("locations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations-pricing");
}

export async function upsertPriceAction(formData: FormData) {
  const fromId = String(formData.get("fromId") ?? "").trim();
  const toIdFields = formData.getAll("toId").map((v) => String(v).trim()).filter(Boolean);
  const uniqueToIds = [...new Set(toIdFields)];

  const rec = Number(String(formData.get("recommended") ?? ""));
  const min = Number(String(formData.get("min") ?? ""));
  const max = Number(String(formData.get("max") ?? ""));

  if (!fromId || uniqueToIds.length === 0) {
    throw new Error("Pick a from location and at least one destination.");
  }
  if (![rec, min, max].every((n) => Number.isFinite(n) && n >= 0)) throw new Error("Invalid prices.");

  const supabaseAdmin = getSupabaseAdmin();

  const conflicts: string[] = [];
  for (const toId of uniqueToIds) {
    const { data: existingForward, error: existsErr } = await supabaseAdmin
      .from("travel_routes")
      .select("id")
      .eq("from_location_id", fromId)
      .eq("to_location_id", toId)
      .maybeSingle();

    if (existsErr) throw new Error(existsErr.message);
    if (existingForward) conflicts.push(toId);
  }

  if (conflicts.length) {
    throw new Error(
      conflicts.length === uniqueToIds.length
        ? "All selected destinations already have a route from this origin. Edit them in the Travel Routes table below."
        : `${conflicts.length} selected destination(s) already have a route from this origin. Remove those from the list or edit them in Travel Routes.`,
    );
  }

  type Row = {
    from_location_id: string;
    to_location_id: string;
    recommended_price: number;
    min_price: number;
    max_price: number;
  };

  const rows: Row[] = [];
  for (const toId of uniqueToIds) {
    const forward: Row = {
      from_location_id: fromId,
      to_location_id: toId,
      recommended_price: rec,
      min_price: min,
      max_price: max,
    };
    if (fromId === toId) {
      rows.push(forward);
    } else {
      rows.push(forward, {
        from_location_id: toId,
        to_location_id: fromId,
        recommended_price: rec,
        min_price: min,
        max_price: max,
      });
    }
  }

  const { error } = await supabaseAdmin.from("travel_routes").upsert(rows, {
    onConflict: "from_location_id,to_location_id",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations-pricing");
}

export async function updateTravelRoutePricesAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const rec = Number(String(formData.get("recommended") ?? ""));
  const min = Number(String(formData.get("min") ?? ""));
  const max = Number(String(formData.get("max") ?? ""));

  if (!id) throw new Error("Missing route id.");
  if (![rec, min, max].every((n) => Number.isFinite(n) && n >= 0)) throw new Error("Invalid prices.");

  const supabaseAdmin = getSupabaseAdmin();
  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("travel_routes")
    .select("from_location_id,to_location_id")
    .eq("id", id)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Route not found.");

  const patch = { recommended_price: rec, min_price: min, max_price: max };

  const { error } = await supabaseAdmin.from("travel_routes").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  if (row.from_location_id !== row.to_location_id) {
    const { error: invErr } = await supabaseAdmin
      .from("travel_routes")
      .update(patch)
      .eq("from_location_id", row.to_location_id)
      .eq("to_location_id", row.from_location_id);
    if (invErr) throw new Error(invErr.message);
  }

  revalidatePath("/admin/locations-pricing");
}

export async function deleteTravelRouteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing route id.");

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("travel_routes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations-pricing");
}

/** For client `useActionState` on inline row editors. */
export async function updateTravelRoutePricesFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await updateTravelRoutePricesAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update prices." };
  }
}

export async function deleteTravelRouteFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await deleteTravelRouteAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete route." };
  }
}

/** For client `useActionState`: returns outcome instead of throwing so the form can reset on success. */
export async function upsertPriceFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await upsertPriceAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save price." };
  }
}

/** Driving distance for the Add route preview (requires `MAPBOX_ACCESS_TOKEN`; Mapbox Matrix API). */
export async function lookupRouteDistancePreview(input: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}): Promise<{ drivingKm: number | null }> {
  const o = normalizeLatLngSouthernAfrica(input.fromLat, input.fromLng);
  const d = normalizeLatLngSouthernAfrica(input.toLat, input.toLng);
  const drivingKm = await getDrivingDistanceKm(o, d);
  return { drivingKm };
}
