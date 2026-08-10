"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { computeRecord } from "@/lib/calc";
import { monthLabel } from "@/lib/format";
import type { ImportRow } from "@/lib/validate";

export async function ensureRun(month: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAuth();
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Invalid month (use YYYY-MM)" };
  try {
    const run = await prisma.payrollRun.upsert({
      where: { month },
      update: {},
      create: { month, label: monthLabel(month), status: "Draft" },
    });
    revalidatePath("/register");
    revalidatePath("/");
    return { ok: true, id: run.id };
  } catch {
    return { ok: false, error: "Could not create run" };
  }
}

/**
 * Persist an imported batch of rows for a given month.
 * Replaces the draft records of that run and upserts employees.
 */
export async function saveImport(
  month: string,
  rows: ImportRow[]
): Promise<{ ok: boolean; count?: number; error?: string }> {
  await requireAuth();
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Invalid month" };
  if (!rows?.length) return { ok: false, error: "No rows to import" };

  try {
    const run = await prisma.payrollRun.upsert({
      where: { month },
      update: {},
      create: { month, label: monthLabel(month), status: "Draft" },
    });

    // Replace existing records for a clean re-import of this month.
    await prisma.payrollRecord.deleteMany({ where: { runId: run.id } });

    let seq = (await prisma.employee.count()) + 1;

    for (const r of rows) {
      const name = (r.name || "").trim();
      if (!name) continue;

      // Resolve employee: by employeeId, else by exact name, else create.
      let employee = null as Awaited<ReturnType<typeof prisma.employee.findFirst>> | null;
      if (r.employeeId?.trim()) {
        employee = await prisma.employee.findUnique({ where: { employeeId: r.employeeId.trim() } });
      }
      if (!employee) {
        employee = await prisma.employee.findFirst({ where: { name } });
      }

      const salaryFields = {
        revisedMonthlyRemuneration: r.revisedMonthlyRemuneration,
        revisedFixedSalary: r.revisedFixedSalary,
        revisedPliComponent: r.revisedPliComponent,
        fromAccount: r.fromAccount || null,
        bankName: r.bankName || null,
        bankAccountNumber: r.bankAccountNumber || null,
        ifsc: r.ifsc || null,
        department: r.department || null,
        designation: r.designation || null,
        joiningDate: r.joiningDate ? new Date(r.joiningDate) : null,
      };

      if (!employee) {
        const employeeId = r.employeeId?.trim() || `EMP-${String(seq++).padStart(3, "0")}`;
        employee = await prisma.employee.create({
          data: { employeeId, name, active: true, ...salaryFields },
        });
      } else {
        // Keep employee master salary in sync with the latest import.
        employee = await prisma.employee.update({
          where: { id: employee.id },
          data: { ...salaryFields },
        });
      }

      const calc = computeRecord(r);

      await prisma.payrollRecord.create({
        data: {
          runId: run.id,
          employeeId: employee.id,
          employeeName: name,
          bankName: r.bankName || null,
          bankAccountNumber: r.bankAccountNumber || null,
          ifsc: r.ifsc || null,
          fromAccount: r.fromAccount || null,
          revisedFixedSalary: r.revisedFixedSalary,
          revisedMonthlyRemuneration: r.revisedMonthlyRemuneration,
          physicalPresentDays: r.physicalPresentDays,
          publicHolidays: r.publicHolidays,
          grossPayableDays: r.grossPayableDays || 30,
          pliPercent: r.pliPercent,
          pliAmount: calc.pliAmount,
          payableDays: calc.payableDays,
          proratedFixedSalary: calc.proratedFixedSalary,
          grossSalary: calc.grossSalary,
          incentive: r.incentive,
          expenseClaim: r.expenseClaim,
          deduction: r.deduction,
          netPayable: calc.netPayable,
          remarks: r.remarks || null,
          status: "Draft",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "IMPORT",
        entity: "PayrollRun",
        entityId: run.id,
        detail: JSON.stringify({ month, rows: rows.length }),
      },
    });

    revalidatePath("/register");
    revalidatePath("/");
    revalidatePath("/reports");
    return { ok: true, count: rows.length };
  } catch (e) {
    return { ok: false, error: "Import failed" };
  }
}
