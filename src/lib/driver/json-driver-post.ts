import "server-only";

import { NextResponse } from "next/server";

import { DriverNotAuthenticatedError } from "@/lib/driver-session/require-driver";

export async function jsonDriverPost<T>(
  req: Request,
  run: (body: unknown) => Promise<T>,
): Promise<Response> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // ignore — mutations treat null as invalid payload
  }

  try {
    const result = await run(body);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DriverNotAuthenticatedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
