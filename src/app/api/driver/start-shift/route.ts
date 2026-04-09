import { NextResponse } from "next/server";

import { startShiftMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    const result = await startShiftMutation(body);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Start shift failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

