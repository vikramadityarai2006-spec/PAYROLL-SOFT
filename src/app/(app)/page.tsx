import { getDashboardData } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { MonthSelector } from "@/components/month-selector";
import { RecentPayroll, type RecentRow } from "@/components/recent-payroll";
import { formatINR, monthLabel } from "@/lib/format";
import { Users, Wallet, TrendingDown, Gift, BadgeIndianRupee } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const data = await getDashboardData(searchParams.month ?? null);
  const { months, activeMonth, employeeCount, totals, records } = data;

  const rows: RecentRow[] = records.map((r) => ({
    id: r.id,
    employeeName: r.employeeName,
    department: r.employee?.department ?? null,
    grossSalary: r.grossSalary,
    deduction: r.deduction,
    netPayable: r.netPayable,
    bankAccountNumber: r.bankAccountNumber,
    status: r.status,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={activeMonth ? `Payroll overview for ${monthLabel(activeMonth)}` : "No payroll processed yet"}
      >
        <MonthSelector months={months} active={activeMonth} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Employees" value={String(employeeCount)} icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard label="Total Gross Payroll" value={formatINR(totals.gross)} sub={`${totals.count} records`} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Total Deductions" value={formatINR(totals.deductions)} icon={<TrendingDown className="h-5 w-5" />} tone="destructive" />
        <StatCard label="Incentives + Reimb." value={formatINR(totals.incentives)} icon={<Gift className="h-5 w-5" />} tone="warning" />
        <StatCard label="Total Net Payable" value={formatINR(totals.netPayable)} icon={<BadgeIndianRupee className="h-5 w-5" />} tone="success" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent payroll</h2>
        {activeMonth ? (
          <RecentPayroll rows={rows} />
        ) : (
          <div className="rounded-lg border border-dashed bg-white p-10 text-center text-muted-foreground">
            No payroll data yet. Go to <span className="font-medium text-primary">Payroll Processing</span> to import a salary file.
          </div>
        )}
      </div>
    </div>
  );
}
