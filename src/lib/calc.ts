/**
 * Transparent salary calculation rules.
 * Every formula here is mirrored 1:1 in the UI (see FormulaPanel) so the
 * calculation is fully auditable and editable.
 */

export interface CalcInput {
  revisedFixedSalary: number;
  revisedMonthlyRemuneration: number;
  physicalPresentDays: number;
  publicHolidays: number;
  grossPayableDays: number; // configurable, default 30
  pliPercent: number;
  incentive: number;
  expenseClaim: number;
  deduction: number;
}

export interface CalcResult {
  payableDays: number;
  proratedFixedSalary: number;
  pliAmount: number;
  grossSalary: number;
  totalAdditions: number;
  netPayable: number;
}

function n(v: unknown): number {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
}

/** Round to 2 decimals to avoid floating point noise in money. */
export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function computeRecord(input: Partial<CalcInput>): CalcResult {
  const revisedFixedSalary = n(input.revisedFixedSalary);
  const revisedMonthlyRemuneration = n(input.revisedMonthlyRemuneration);
  const physicalPresentDays = n(input.physicalPresentDays);
  const publicHolidays = n(input.publicHolidays);
  const grossPayableDays = n(input.grossPayableDays) || 30;
  const pliPercent = n(input.pliPercent);
  const incentive = n(input.incentive);
  const expenseClaim = n(input.expenseClaim);
  const deduction = n(input.deduction);

  // payableDays = physicalPresentDays + publicHolidays
  const payableDays = round2(physicalPresentDays + publicHolidays);

  // proratedFixedSalary = revisedFixedSalary * payableDays / grossPayableDays
  const proratedFixedSalary =
    grossPayableDays > 0
      ? round2((revisedFixedSalary * payableDays) / grossPayableDays)
      : 0;

  // pliAmount = revisedMonthlyRemuneration * pliPercent / 100
  const pliAmount = round2((revisedMonthlyRemuneration * pliPercent) / 100);

  // grossSalary = proratedFixedSalary + pliAmount
  const grossSalary = round2(proratedFixedSalary + pliAmount);

  // totalAdditions = incentive + expenseClaim
  const totalAdditions = round2(incentive + expenseClaim);

  // netPayable = grossSalary + totalAdditions - deduction
  const netPayable = round2(grossSalary + totalAdditions - deduction);

  return {
    payableDays,
    proratedFixedSalary,
    pliAmount,
    grossSalary,
    totalAdditions,
    netPayable,
  };
}

/**
 * Given a known pliAmount (as often present in source sheets), back-calculate
 * the implied PLI percent of the monthly remuneration. Used on import so the
 * percent-based rule stays consistent with imported figures.
 */
export function pliPercentFromAmount(
  pliAmount: number,
  revisedMonthlyRemuneration: number
): number {
  if (!revisedMonthlyRemuneration) return 0;
  return round2((n(pliAmount) / revisedMonthlyRemuneration) * 100);
}

/** Human-readable list of the formulas, shown in the UI. */
export const FORMULAS: { key: string; label: string; expr: string }[] = [
  { key: "payableDays", label: "Payable Days", expr: "physicalPresentDays + publicHolidays" },
  { key: "proratedFixedSalary", label: "Prorated Fixed Salary", expr: "revisedFixedSalary × payableDays ÷ grossPayableDays" },
  { key: "pliAmount", label: "PLI Amount", expr: "revisedMonthlyRemuneration × pliPercent ÷ 100" },
  { key: "grossSalary", label: "Gross Salary", expr: "proratedFixedSalary + pliAmount" },
  { key: "totalAdditions", label: "Total Additions", expr: "incentive + expenseClaim" },
  { key: "netPayable", label: "Net Payable", expr: "grossSalary + totalAdditions − deduction" },
];
