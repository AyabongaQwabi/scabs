import { NextResponse } from "next/server";

import { endShiftMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await endShiftMutation(body);
  return NextResponse.json(result);
}

