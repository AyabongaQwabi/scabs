import 'server-only';

import { z } from 'zod';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

const InputSchema = z.object({
  locationIds: z.array(z.guid()).min(2),
});

export type RecommendedPriceResult = {
  totalRecommended: number | null;
  missingLegs: Array<{ fromLocationId: string; toLocationId: string }>;
  legs: Array<{
    fromLocationId: string;
    toLocationId: string;
    recommendedPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
  }>;
};

type RouteRow = {
  from_location_id: string;
  to_location_id: string;
  recommended_price: unknown;
  min_price: unknown;
  max_price: unknown;
};

/**
 * Loads one directed edge. If the forward direction is missing, tries the inverse
 * (B→A) so pricing matches admin behaviour where routes are usually mirrored.
 *
 * Important: we query each leg with `.eq(from).eq(to)` instead of filtering
 * `from in (…) and to in (…)`, which can return a huge cross-product and hit
 * PostgREST row limits — so valid matrix rows were sometimes never returned.
 */
async function fetchTravelRouteRow(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  from: string,
  to: string,
): Promise<RouteRow | null> {
  const sel =
    'from_location_id,to_location_id,recommended_price,min_price,max_price' as const;

  const { data: forward, error: forwardErr } = await supabaseAdmin
    .from('travel_routes')
    .select(sel)
    .eq('from_location_id', from)
    .eq('to_location_id', to)
    .maybeSingle();

  if (forwardErr) throw new Error(forwardErr.message);
  if (forward) return forward;

  if (from === to) return null;

  const { data: inverse, error: inverseErr } = await supabaseAdmin
    .from('travel_routes')
    .select(sel)
    .eq('from_location_id', to)
    .eq('to_location_id', from)
    .maybeSingle();

  if (inverseErr) throw new Error(inverseErr.message);
  return inverse;
}

export async function calculateRecommendedTotal(
  input: unknown,
): Promise<RecommendedPriceResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { totalRecommended: null, missingLegs: [], legs: [] };
  }

  const locationIds = parsed.data.locationIds;
  const pairs = locationIds.slice(0, -1).map((from, i) => ({
    from,
    to: locationIds[i + 1]!,
  }));

  const supabaseAdmin = getSupabaseAdmin();
  console.log(pairs);
  const rows = await Promise.all(
    pairs.map((p) => fetchTravelRouteRow(supabaseAdmin, p.from, p.to)),
  );
  console.log(rows);
  let total = 0;
  const legs: RecommendedPriceResult['legs'] = [];
  const missingLegs: RecommendedPriceResult['missingLegs'] = [];

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i]!;
    const row = rows[i];
    const rec =
      row?.recommended_price != null ? Number(row.recommended_price) : null;
    legs.push({
      fromLocationId: p.from,
      toLocationId: p.to,
      recommendedPrice: rec,
      minPrice: row?.min_price != null ? Number(row.min_price) : null,
      maxPrice: row?.max_price != null ? Number(row.max_price) : null,
    });

    if (rec == null)
      missingLegs.push({ fromLocationId: p.from, toLocationId: p.to });
    else total += rec;
  }

  return {
    totalRecommended: missingLegs.length ? null : total,
    missingLegs,
    legs,
  };
}
