import "server-only";
import { prisma } from "./prisma";

export async function getGrossPayableDays(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: "calc.grossPayableDays" } });
  const v = s ? parseFloat(s.value) : 30;
  return Number.isFinite(v) && v > 0 ? v : 30;
}

export async function listMonths(): Promise<{ month: string; label: string; status: string }[]> {
  const runs = await prisma.payrollRun.findMany({ orderBy: { month: "desc" } });
  return runs.map((r) => ({ month: r.month, label: r.label, status: r.status }));
}

export async function getRunWithRecords(month: string) {
  return prisma.payrollRun.findUnique({
    where: { month },
    include: {
      records: {
        orderBy: { employeeName: "asc" },
        include: { employee: { select: { employeeId: true, department: true, designation: true } } },
      },
    },
  });
}

export type RecordWithEmployee = NonNullable<
  Awaited<ReturnType<typeof getRunWithRecords>>
>["records"][number];

export async function getDashboardData(month: string | null) {
  const months = await listMonths();
  const activeMonth = month || months[0]?.month || null;

  const employeeCount = await prisma.employee.count({ where: { active: true } });

  if (!activeMonth) {
    return {
      months,
      activeMonth: null,
      employeeCount,
      totals: { gross: 0, deductions: 0, incentives: 0, netPayable: 0, count: 0 },
      records: [] as RecordWithEmployee[],
    };
  }

  const run = await getRunWithRecords(activeMonth);
  const records = run?.records ?? [];

  const totals = records.reduce(
    (acc, r) => {
      acc.gross += r.grossSalary;
      acc.deductions += r.deduction;
      acc.incentives += r.incentive + r.expenseClaim;
      acc.netPayable += r.netPayable;
      acc.count += 1;
      return acc;
    },
    { gross: 0, deductions: 0, incentives: 0, netPayable: 0, count: 0 }
  );

  return { months, activeMonth, employeeCount, totals, records };
}

export async function getRecordById(id: string) {
  return prisma.payrollRecord.findUnique({
    where: { id },
    include: {
      run: true,
      employee: { select: { employeeId: true, department: true, designation: true, joiningDate: true } },
    },
  });
}

export async function listEmployees() {
  return prisma.employee.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function getAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
