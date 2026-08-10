import { getGrossPayableDays, listMonths, getRunWithRecords } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { CalculationClient, type CalcRecord } from "@/components/calculation/calculation-client";

export const dynamic = "force-dynamic";

export default async function CalculationPage({ searchParams }: { searchParams: { month?: string } }) {
  const months = await listMonths();
  const gpd = await getGrossPayableDays();
  const activeMonth = searchParams.month || months[0]?.month || null;
  const run = activeMonth ? await getRunWithRecords(activeMonth) : null;

  const records: CalcRecord[] = (run?.records ?? []).map((r) => ({
    id: r.id,
    employeeName: r.employeeName,
    revisedFixedSalary: r.revisedFixedSalary,
    revisedMonthlyRemuneration: r.revisedMonthlyRemuneration,
    physicalPresentDays: r.physicalPresentDays,
    publicHolidays: r.publicHolidays,
    grossPayableDays: r.grossPayableDays,
    pliPercent: r.pliPercent,
    incentive: r.incentive,
    expenseClaim: r.expenseClaim,
    deduction: r.deduction,
    netPayable: r.netPayable,
    isOverridden: r.isOverridden,
    overrideReason: r.overrideReason,
  }));

  return (
    <div>
      <PageHeader title="Salary Calculation" description="Every formula is visible and editable. Overrides require a reason and are logged." />
      <CalculationClient months={months} activeMonth={activeMonth} gpd={gpd} records={records} />
    </div>
  );
}
