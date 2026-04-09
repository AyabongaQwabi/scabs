import { NextResponse } from "next/server";

import { startTripMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await startTripMutation(body);
  return NextResponse.json(result);
}

