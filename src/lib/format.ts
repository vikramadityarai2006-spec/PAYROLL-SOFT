/** Indian currency + safe masking helpers. */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(value: number | null | undefined): string {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return INR.format(v);
}

/** Compact INR for big totals, e.g. ₹1.2L / ₹3.4Cr */
export function formatINRCompact(value: number | null | undefined): string {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return formatINR(v);
}

/**
 * Mask an account number, revealing only the last 4 digits.
 * "917010008569264" -> "•••••••••••5264"
 */
export function maskAccount(acc: string | null | undefined): string {
  if (!acc) return "—";
  const s = String(acc).replace(/\s+/g, "");
  if (s.length <= 4) return s;
  const last4 = s.slice(-4);
  return "•".repeat(Math.min(s.length - 4, 11)) + last4;
}

export function formatNumber(value: number | null | undefined, dp = 0): string {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return v.toLocaleString("en-IN", { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2026-04" -> "April 2026" */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}
