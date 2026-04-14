import { normalizeCustomerPhone } from "@/lib/customers/phone";

export type E164Result = { ok: true; e164: string } | { ok: false; reason: string };

/** Best-effort E.164 for South Africa (+27). Passes through other international + numbers. */
export function toE164ForWhatsapp(raw: string): E164Result {
  const trimmed = normalizeCustomerPhone(raw);
  if (!trimmed) return { ok: false, reason: "Empty phone number" };

  let d = trimmed.replace(/\s/g, "");

  if (d.startsWith("+")) {
    if (/^\+27\d{9}$/.test(d)) return { ok: true, e164: d };
    if (/^\+[1-9]\d{7,14}$/.test(d)) return { ok: true, e164: d };
    return { ok: false, reason: "Unrecognized international number format" };
  }

  if (d.startsWith("0")) {
    d = "+27" + d.slice(1);
  } else if (d.startsWith("27") && d.length >= 11) {
    d = "+" + d;
  } else if (/^\d{9}$/.test(d)) {
    d = "+27" + d;
  } else {
    return { ok: false, reason: "Could not parse as SA number (use 0… or +27…)" };
  }

  if (!/^\+27\d{9}$/.test(d)) {
    return { ok: false, reason: "SA mobile should be +27 followed by 9 digits" };
  }

  return { ok: true, e164: d };
}
