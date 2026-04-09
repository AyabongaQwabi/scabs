import "server-only";

import { redirect } from "next/navigation";

import { getDriverIdFromRequestCookie } from "./session";

export async function requireDriverId() {
  const driverId = await getDriverIdFromRequestCookie();
  if (!driverId) redirect("/driver/select");
  return driverId;
}

