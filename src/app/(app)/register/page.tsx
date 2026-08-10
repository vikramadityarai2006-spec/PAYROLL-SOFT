import { listMonths, getRunWithRecords } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { RegisterClient, type RegisterRecord } from "@/components/register/register-client";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: { month?: string } }) {
  const months = await listMonths();
  const activeMonth = searchParams.month || months[0]?.month || null;
  const run = activeMonth ? await getRunWithRecords(activeMonth) : null;

  const records: RegisterRecord[] = (run?.records ?? []).map((r) => ({
    id: r.id,
    employeeName: r.employeeName,
    department: r.employee?.department ?? null,
    payableDays: r.payableDays,
    proratedFixedSalary: r.proratedFixedSalary,
    pliAmount: r.pliAmount,
    incentive: r.incentive,
    expenseClaim: r.expenseClaim,
    deduction: r.deduction,
    grossSalary: r.grossSalary,
    netPayable: r.netPayable,
    bankAccountNumber: r.bankAccountNumber,
    remarks: r.remarks,
    status: r.status,
    isOverridden: r.isOverridden,
    physicalPresentDays: r.physicalPresentDays,
    publicHolidays: r.publicHolidays,
    grossPayableDays: r.grossPayableDays,
    pliPercent: r.pliPercent,
    revisedFixedSalary: r.revisedFixedSalary,
    revisedMonthlyRemuneration: r.revisedMonthlyRemuneration,
  }));

  const departments = Array.from(
    new Set((run?.records ?? []).map((r) => r.employee?.department ?? "—").filter(Boolean))
  ) as string[];

  return (
    <div>
      <PageHeader title="Payroll Register" description="Full register with filters, bulk approval and payment status.">
        {activeMonth && (
          <a href={`/api/export/register?month=${activeMonth}`}>
            <Button variant="outline"><FileDown className="h-4 w-4" /> Export register</Button>
          </a>
        )}
      </PageHeader>
      <RegisterClient months={months} activeMonth={activeMonth} records={records} departments={departments} />
    </div>
  );
}
