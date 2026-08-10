"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { formatINR, maskAccount } from "@/lib/format";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export interface SlipData {
  id: string;
  monthLabel: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  bankName: string;
  bankAccountNumberMasked: string;
  ifsc: string;
  payableDays: number;
  grossPayableDays: number;
  proratedFixedSalary: number;
  pliAmount: number;
  grossSalary: number;
  incentive: number;
  expenseClaim: number;
  deduction: number;
  netPayable: number;
  remarks: string;
  status: string;
  isOverridden: boolean;
}

export function SlipClient({ slip }: { slip: SlipData }) {
  function downloadPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    doc.setFontSize(16);
    doc.setTextColor(23, 37, 84);
    doc.text("Salary Slip", marginX, 50);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Pay period: ${slip.monthLabel}`, marginX, 68);
    doc.text(`Status: ${slip.status}${slip.isOverridden ? " (override applied)" : ""}`, marginX, 82);

    autoTable(doc, {
      startY: 100,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        ["Employee", slip.employeeName, "Employee ID", slip.employeeId],
        ["Department", slip.department || "—", "Designation", slip.designation || "—"],
        ["Bank", slip.bankName || "—", "A/C (masked)", slip.bankAccountNumberMasked],
        ["IFSC", slip.ifsc || "—", "Payable days", `${slip.payableDays} / ${slip.grossPayableDays}`],
      ],
    });

    // @ts-expect-error - lastAutoTable is added by the plugin at runtime
    const y1 = doc.lastAutoTable.finalY + 16;
    autoTable(doc, {
      startY: y1,
      head: [["Earnings", "Amount (INR)"]],
      headStyles: { fillColor: [23, 37, 84] },
      styles: { fontSize: 10 },
      body: [
        ["Prorated Fixed Salary", formatINR(slip.proratedFixedSalary)],
        ["PLI Amount", formatINR(slip.pliAmount)],
        ["Incentive", formatINR(slip.incentive)],
        ["Expense Claim", formatINR(slip.expenseClaim)],
        [{ content: "Gross Salary (Fixed + PLI)", styles: { fontStyle: "bold" } }, { content: formatINR(slip.grossSalary), styles: { fontStyle: "bold" } }],
      ],
    });

    // @ts-expect-error runtime property
    const y2 = doc.lastAutoTable.finalY + 12;
    autoTable(doc, {
      startY: y2,
      head: [["Deductions", "Amount (INR)"]],
      headStyles: { fillColor: [153, 27, 27] },
      styles: { fontSize: 10 },
      body: [["Deduction", formatINR(slip.deduction)]],
    });

    // @ts-expect-error runtime property
    const y3 = doc.lastAutoTable.finalY + 12;
    autoTable(doc, {
      startY: y3,
      theme: "grid",
      styles: { fontSize: 12, fontStyle: "bold" },
      body: [["NET PAYABLE", formatINR(slip.netPayable)]],
    });

    if (slip.remarks) {
      // @ts-expect-error runtime property
      const y4 = doc.lastAutoTable.finalY + 16;
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`Remarks: ${slip.remarks}`, marginX, y4, { maxWidth: 515 });
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Confidential — system generated salary slip.", marginX, 800);
    doc.save(`salary-slip-${slip.employeeName.replace(/\s+/g, "_")}-${slip.monthLabel.replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/register"><Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={downloadPDF}><Download className="h-4 w-4" /> Download PDF</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold text-primary">Salary Slip</h1>
            <p className="text-sm text-muted-foreground">Pay period: {slip.monthLabel}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{slip.status}</p>
            {slip.isOverridden && <p className="text-warning">Override applied</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4 text-sm">
          <Info k="Employee" v={slip.employeeName} />
          <Info k="Employee ID" v={slip.employeeId} />
          <Info k="Department" v={slip.department || "—"} />
          <Info k="Designation" v={slip.designation || "—"} />
          <Info k="Bank" v={slip.bankName || "—"} />
          <Info k="A/C (masked)" v={slip.bankAccountNumberMasked} />
          <Info k="IFSC" v={slip.ifsc || "—"} />
          <Info k="Payable days" v={`${slip.payableDays} / ${slip.grossPayableDays}`} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border">
            <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold">Earnings</div>
            <Row k="Prorated Fixed Salary" v={formatINR(slip.proratedFixedSalary)} />
            <Row k="PLI Amount" v={formatINR(slip.pliAmount)} />
            <Row k="Incentive" v={formatINR(slip.incentive)} />
            <Row k="Expense Claim" v={formatINR(slip.expenseClaim)} />
            <Row k="Gross Salary" v={formatINR(slip.grossSalary)} bold />
          </div>
          <div className="rounded-lg border">
            <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold">Deductions</div>
            <Row k="Deduction" v={formatINR(slip.deduction)} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary px-4 py-3 text-primary-foreground">
          <span className="font-semibold">Net Payable</span>
          <span className="tabular text-lg font-bold">{formatINR(slip.netPayable)}</span>
        </div>

        {slip.remarks && <p className="mt-4 text-xs text-muted-foreground">Remarks: {slip.remarks}</p>}
        <p className="mt-6 text-center text-xs text-muted-foreground">Confidential — system generated salary slip.</p>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="mt-0.5 font-medium">{v}</p>
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 text-sm ${bold ? "border-t font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{k}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}
