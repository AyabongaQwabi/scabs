/**
 * Parse JSON from driver API responses. Avoids throwing on HTML bodies (e.g. after bad redirects).
 */
export async function readDriverApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      text.startsWith("<")
        ? `Request failed (${res.status}). Try signing in again.`
        : (text.slice(0, 200) || `Request failed (${res.status})`),
    );
  }

  if (!res.ok) {
    const msg =
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}
