import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { getRunWithRecords } from "@/lib/queries";
import { maskAccount, monthLabel } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const run = await getRunWithRecords(month);
  const records = run?.records ?? [];

  const header = [
    "Employee", "Employee ID", "Department", "Payable Days", "Fixed Pay", "PLI",
    "Incentive", "Expense Claim", "Deductions", "Gross Salary", "Net Payable",
    "Bank A/C (masked)", "IFSC", "Status", "Remarks",
  ];

  const rows = records.map((r) => [
    r.employeeName,
    r.employee?.employeeId ?? "",
    r.employee?.department ?? "",
    r.payableDays,
    r.proratedFixedSalary,
    r.pliAmount,
    r.incentive,
    r.expenseClaim,
    r.deduction,
    r.grossSalary,
    r.netPayable,
    maskAccount(r.bankAccountNumber), // register export keeps account masked
    r.ifsc ?? "",
    r.status,
    r.remarks ?? "",
  ]);

  const totals = records.reduce(
    (a, r) => {
      a.fixed += r.proratedFixedSalary; a.pli += r.pliAmount; a.inc += r.incentive;
      a.exp += r.expenseClaim; a.ded += r.deduction; a.gross += r.grossSalary; a.net += r.netPayable;
      return a;
    },
    { fixed: 0, pli: 0, inc: 0, exp: 0, ded: 0, gross: 0, net: 0 }
  );
  const totalRow = ["TOTAL", "", "", "", totals.fixed, totals.pli, totals.inc, totals.exp, totals.ded, totals.gross, totals.net, "", "", "", ""];

  const aoa = [
    [`Payroll Register — ${monthLabel(month)}`],
    header,
    ...rows,
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = header.map((h, i) => ({ wch: i === 0 ? 22 : Math.max(12, h.length) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Register");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payroll-register-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
