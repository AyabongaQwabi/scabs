import "server-only";

import { redirect } from "next/navigation";

import { getDriverIdFromRequestCookie } from "./session";

/** Thrown from Route Handlers path — never use `redirect()` there or `fetch().json()` breaks after following redirects. */
export class DriverNotAuthenticatedError extends Error {
  constructor() {
    super("Your driver session expired. Open Driver and sign in again.");
    this.name = "DriverNotAuthenticatedError";
  }
}

export async function requireDriverId() {
  const driverId = await getDriverIdFromRequestCookie();
  if (!driverId) redirect("/driver/select");
  return driverId;
}

/** For `/api/driver/*` mutations only — returns JSON-friendly errors instead of redirecting. */
export async function requireDriverIdForApi(): Promise<string> {
  const driverId = await getDriverIdFromRequestCookie();
  if (!driverId) throw new DriverNotAuthenticatedError();
  return driverId;
}

