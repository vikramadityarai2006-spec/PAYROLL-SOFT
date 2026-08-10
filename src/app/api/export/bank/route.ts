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
  // Only pay out records that are Approved or Paid, and have an account number.
  const records = (run?.records ?? []).filter((r) => r.bankAccountNumber && r.status !== "Draft");

  const header = ["Employee Name", "Preview Account (masked)", "Full Account Number", "IFSC", "Net Payable"];
  const rows = records.map((r) => [
    r.employeeName,
    maskAccount(r.bankAccountNumber),
    String(r.bankAccountNumber ?? ""), // full number ONLY appears in this export
    r.ifsc ?? "",
    r.netPayable,
  ]);
  const totalNet = records.reduce((a, r) => a + r.netPayable, 0);

  const aoa = [
    [`Bank Payment List — ${monthLabel(month)}`],
    ["Confidential — contains full account numbers"],
    header,
    ...rows,
    ["TOTAL", "", "", "", totalNet],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
  // Force full account column to text so long numbers are not truncated/rounded.
  const startRow = 3; // 0-based index of first data row in aoa
  for (let i = 0; i < rows.length; i++) {
    const addr = XLSX.utils.encode_cell({ c: 2, r: startRow + i });
    if (ws[addr]) { ws[addr].t = "s"; }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bank Payments");

  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bank-payment-list-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
