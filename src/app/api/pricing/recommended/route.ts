import { NextResponse } from "next/server";

import { calculateRecommendedTotal } from "@/lib/pricing/recommended";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await calculateRecommendedTotal(body);
  return NextResponse.json(result);
}

