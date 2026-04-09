"use server";

import { calculateRecommendedTotal } from "@/lib/pricing/recommended";

export async function calculateTripRecommendedPrice(locationIds: string[]) {
  return calculateRecommendedTotal({ locationIds });
}

