import "server-only";

/**
 * Wasender HTTP API. Set WASENDER_API_TOKEN in env (never commit tokens).
 * Optional: WASENDER_API_URL (default https://wasenderapi.com/api/send-message).
 */
export async function sendWasenderText(
  to: string,
  text: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = process.env.WASENDER_API_TOKEN;
  if (!token) {
    return { ok: false, message: "Missing WASENDER_API_TOKEN (set in server environment)" };
  }

  const url =
    process.env.WASENDER_API_URL?.trim() || "https://wasenderapi.com/api/send-message";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, text }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Network error: ${msg}` };
  }

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, message: `Wasender HTTP ${res.status}: ${t.slice(0, 400)}` };
  }

  return { ok: true };
}

export const WASENDER_MIN_INTERVAL_MS = 60_000;
