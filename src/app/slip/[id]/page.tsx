import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getRecordById } from "@/lib/queries";
import { SlipClient, type SlipData } from "@/components/slip/slip-client";
import { maskAccount, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SlipPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const r = await getRecordById(params.id);
  if (!r) notFound();

  const slip: SlipData = {
    id: r.id,
    monthLabel: r.run ? monthLabel(r.run.month) : "",
    employeeName: r.employeeName,
    employeeId: r.employee?.employeeId ?? "",
    department: r.employee?.department ?? "",
    designation: r.employee?.designation ?? "",
    bankName: r.bankName ?? "",
    bankAccountNumberMasked: maskAccount(r.bankAccountNumber),
    ifsc: r.ifsc ?? "",
    payableDays: r.payableDays,
    grossPayableDays: r.grossPayableDays,
    proratedFixedSalary: r.proratedFixedSalary,
    pliAmount: r.pliAmount,
    grossSalary: r.grossSalary,
    incentive: r.incentive,
    expenseClaim: r.expenseClaim,
    deduction: r.deduction,
    netPayable: r.netPayable,
    remarks: r.remarks ?? "",
    status: r.status,
    isOverridden: r.isOverridden,
  };

  return <SlipClient slip={slip} />;
}
