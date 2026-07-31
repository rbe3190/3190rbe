/** Indian grouping: 10,000 / 1,00,000 / 10,00,000 (en-IN). */
export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Prefixed rupee amount, e.g. ₹10,000 */
export function formatInrCurrency(amount: number): string {
  const n = formatInr(amount);
  return n ? `₹${n}` : "";
}
