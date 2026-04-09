import { NextResponse } from "next/server";

import { endTripMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await endTripMutation(body);
  return NextResponse.json(result);
}

