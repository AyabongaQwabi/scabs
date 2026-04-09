import { NextResponse } from "next/server";

import { addFuelFillupMutation } from "@/lib/driver/mutations";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await addFuelFillupMutation(body);
  return NextResponse.json(result);
}

