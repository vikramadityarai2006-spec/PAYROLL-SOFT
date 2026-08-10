/**
 * Column-mapping logic for Excel import.
 * Pure module (no xlsx dependency) so it can run on client and server.
 */

export type AppField =
  | "name"
  | "employeeId"
  | "department"
  | "designation"
  | "joiningDate"
  | "oldSalary"
  | "fixedIncrease"
  | "existingMonthlyRemuneration"
  | "existingPliComponent"
  | "revisedMonthlyRemuneration"
  | "revisedFixedSalary"
  | "revisedPliComponent"
  | "physicalPresentDays"
  | "publicHolidays"
  | "payDays"
  | "grossPayableDays"
  | "pliAmount"
  | "incentive"
  | "incentive2"
  | "expenseClaim"
  | "deduction"
  | "fromAccount"
  | "bankName"
  | "bankAccountNumber"
  | "ifsc"
  | "remarks";

export interface FieldDef {
  field: AppField;
  label: string;
  required?: boolean;
  type: "text" | "number" | "date";
  /** normalized substrings that indicate this field */
  match: string[];
  /** when several headers match, prefer the right-most (latest revision) */
  preferLast?: boolean;
  help?: string;
}

export const APP_FIELDS: FieldDef[] = [
  { field: "name", label: "Employee Name", required: true, type: "text", match: ["employeename", "name"] },
  { field: "employeeId", label: "Employee ID", type: "text", match: ["employeeid", "empid", "empcode", "empno"] },
  { field: "department", label: "Department", type: "text", match: ["department", "dept"] },
  { field: "designation", label: "Designation", type: "text", match: ["designation", "role", "title"] },
  { field: "joiningDate", label: "Joining Date (DOJ)", type: "date", match: ["dateofjoining", "joiningdate", "doj"] },

  { field: "oldSalary", label: "Old Salary", type: "number", match: ["oldsalary"] },
  { field: "fixedIncrease", label: "Fixed Increase", type: "number", match: ["fixincrease", "fixedincrease"] },
  { field: "existingMonthlyRemuneration", label: "Existing Monthly Remuneration", type: "number", match: ["existingmonthly"] },
  { field: "existingPliComponent", label: "Existing PLI Component", type: "number", match: ["existingpli"] },

  { field: "revisedMonthlyRemuneration", label: "Revised Monthly Remuneration", required: true, type: "number", match: ["revisedmonth", "revisedmonthly"], preferLast: true, help: "Latest revision (right-most column)" },
  { field: "revisedFixedSalary", label: "Revised Fixed Salary Component", required: true, type: "number", match: ["revisedfixedsalary"], preferLast: true, help: "Latest revision (right-most column)" },
  { field: "revisedPliComponent", label: "Revised PLI Component", type: "number", match: ["revisedpli"], preferLast: true },

  { field: "physicalPresentDays", label: "Physical Present Days", type: "number", match: ["physicalpresent"] },
  { field: "publicHolidays", label: "Public Holidays", type: "number", match: ["publicholiday"] },
  { field: "payDays", label: "Pay Days", type: "number", match: ["payday"] },
  { field: "grossPayableDays", label: "Gross Payable Days", type: "number", match: ["paybledays", "payabledays", "grosspay"] },

  { field: "pliAmount", label: "PLI Amount", type: "number", match: ["plifor", "pliamount", "pliforthemonth"] },
  { field: "incentive", label: "Incentive (1st)", type: "number", match: ["incentivefirst", "incentive1"] },
  { field: "incentive2", label: "Incentive (2nd)", type: "number", match: ["incentivesecond", "incentive2"] },
  { field: "expenseClaim", label: "Expense Claim", type: "number", match: ["expenseclaim"] },
  { field: "deduction", label: "Deduction", type: "number", match: ["deduction"] },

  { field: "fromAccount", label: "From Account", type: "text", match: ["fromaccount"] },
  { field: "bankName", label: "Bank", type: "text", match: ["bankname", "bank"] },
  { field: "bankAccountNumber", label: "Bank A/C Number", type: "text", match: ["acnumber", "accountnumber", "accno"] },
  { field: "ifsc", label: "IFSC Code", type: "text", match: ["ifsc"] },
  { field: "remarks", label: "Remarks", type: "text", match: ["remark", "remarks", "note"] },
];

export function normalizeHeader(h: string): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export type Mapping = Partial<Record<AppField, number>>; // field -> header index

/** Auto-suggest a mapping from raw header strings. */
export function autoMap(headers: string[]): Mapping {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: Mapping = {};

  for (const def of APP_FIELDS) {
    let best: { idx: number; score: number } | null = null;
    for (let i = 0; i < norm.length; i++) {
      if (used.has(i)) continue;
      const h = norm[i];
      if (!h) continue;
      let score = 0;
      for (const m of def.match) {
        if (h.includes(m)) score = Math.max(score, m.length);
      }
      if (score <= 0) continue;
      if (
        !best ||
        score > best.score ||
        (score === best.score && def.preferLast) // right-most wins for revision fields
      ) {
        best = { idx: i, score };
      }
    }
    if (best) {
      mapping[def.field] = best.idx;
      used.add(best.idx);
    }
  }
  return mapping;
}

/** Coerce arbitrary cell to number. */
export function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Coerce a cell that may be an Excel date serial / Date / string to a Date or null. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    // Excel serial: only treat plausible serials (>= 1990-ish) as dates.
    if (v > 30000 && v < 60000) {
      const ms = (v - 25569) * 86400 * 1000; // 25569 = days from 1899-12-30 to 1970-01-01
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
