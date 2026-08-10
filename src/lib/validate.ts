import { computeRecord } from "./calc";

export interface ImportRow {
  name: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joiningDate?: string | null;
  revisedFixedSalary: number;
  revisedMonthlyRemuneration: number;
  revisedPliComponent: number;
  physicalPresentDays: number;
  publicHolidays: number;
  grossPayableDays: number;
  pliPercent: number;
  pliAmount: number;
  incentive: number;
  expenseClaim: number;
  deduction: number;
  fromAccount?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  remarks?: string;
}

export type FlagLevel = "error" | "warning";
export interface RowFlag {
  level: FlagLevel;
  code: string;
  message: string;
}

const HIGH_DEDUCTION_RATIO = 0.5; // deduction > 50% of gross is "unusual"

export function flagRow(row: ImportRow, allNamesLower: string[]): RowFlag[] {
  const flags: RowFlag[] = [];
  const calc = computeRecord(row);

  if (!row.name?.trim()) {
    flags.push({ level: "error", code: "NO_NAME", message: "Missing employee name" });
  }
  if (!row.bankAccountNumber?.trim()) {
    flags.push({ level: "warning", code: "NO_BANK", message: "Missing bank account details" });
  }
  if (!row.ifsc?.trim() && row.bankAccountNumber?.trim()) {
    flags.push({ level: "warning", code: "NO_IFSC", message: "Bank account present but IFSC missing" });
  }
  if (calc.netPayable < 0) {
    flags.push({ level: "error", code: "NEG_NET", message: "Negative net payable" });
  }
  if (row.revisedFixedSalary < 0 || row.revisedMonthlyRemuneration < 0) {
    flags.push({ level: "error", code: "NEG_SALARY", message: "Negative salary value" });
  }
  if (row.deduction < 0) {
    flags.push({ level: "warning", code: "NEG_DED", message: "Negative deduction" });
  }
  // duplicate name in this batch
  const cnt = allNamesLower.filter((n) => n === row.name.trim().toLowerCase()).length;
  if (cnt > 1) {
    flags.push({ level: "warning", code: "DUP", message: "Duplicate employee name in file" });
  }
  // unusual deduction
  if (calc.grossSalary > 0 && row.deduction > calc.grossSalary * HIGH_DEDUCTION_RATIO) {
    flags.push({
      level: "warning",
      code: "HIGH_DED",
      message: `Unusually high deduction (> ${HIGH_DEDUCTION_RATIO * 100}% of gross)`,
    });
  }
  return flags;
}

export function summarizeFlags(rows: ImportRow[]): {
  errors: number;
  warnings: number;
  perRow: RowFlag[][];
} {
  const namesLower = rows.map((r) => r.name.trim().toLowerCase());
  let errors = 0;
  let warnings = 0;
  const perRow = rows.map((r) => {
    const f = flagRow(r, namesLower);
    errors += f.filter((x) => x.level === "error").length;
    warnings += f.filter((x) => x.level === "warning").length;
    return f;
  });
  return { errors, warnings, perRow };
}
