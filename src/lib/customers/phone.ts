/** Trim and collapse whitespace so `trips.customer_phone` matches `customers.phone`. */
export function normalizeCustomerPhone(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}
