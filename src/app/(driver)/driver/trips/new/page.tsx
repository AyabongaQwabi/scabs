import { requireDriverId } from "@/lib/driver-session/require-driver";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NewTripForm } from "./new-trip-form";

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  await requireDriverId();
  const supabaseAdmin = getSupabaseAdmin();
  const { data: locations, error } = await supabaseAdmin
    .from("locations")
    .select("id,name,lat,lng")
    .order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Trip</h1>
        <p className="text-sm text-muted-foreground">
          Select start, stops, and end. We’ll show one recommended total.
        </p>
      </div>

      <NewTripForm locations={locations ?? []} />
    </div>
  );
}

