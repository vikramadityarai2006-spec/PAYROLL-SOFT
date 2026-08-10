"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { computeRecord } from "@/lib/calc";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export interface RecordPatch {
  physicalPresentDays?: number;
  publicHolidays?: number;
  grossPayableDays?: number;
  pliPercent?: number;
  revisedFixedSalary?: number;
  revisedMonthlyRemuneration?: number;
  incentive?: number;
  expenseClaim?: number;
  deduction?: number;
  remarks?: string;
}

export async function updateRecord(id: string, patch: RecordPatch) {
  await requireAuth();
  const existing = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Record not found" };

  const merged = {
    revisedFixedSalary: patch.revisedFixedSalary ?? existing.revisedFixedSalary,
    revisedMonthlyRemuneration: patch.revisedMonthlyRemuneration ?? existing.revisedMonthlyRemuneration,
    physicalPresentDays: patch.physicalPresentDays ?? existing.physicalPresentDays,
    publicHolidays: patch.publicHolidays ?? existing.publicHolidays,
    grossPayableDays: patch.grossPayableDays ?? existing.grossPayableDays,
    pliPercent: patch.pliPercent ?? existing.pliPercent,
    incentive: patch.incentive ?? existing.incentive,
    expenseClaim: patch.expenseClaim ?? existing.expenseClaim,
    deduction: patch.deduction ?? existing.deduction,
  };
  const calc = computeRecord(merged);

  // If overridden, keep the override amount as netPayable; else use calc.
  const netPayable = existing.isOverridden ? existing.overrideAmount ?? calc.netPayable : calc.netPayable;

  try {
    await prisma.payrollRecord.update({
      where: { id },
      data: {
        ...merged,
        payableDays: calc.payableDays,
        proratedFixedSalary: calc.proratedFixedSalary,
        pliAmount: calc.pliAmount,
        grossSalary: calc.grossSalary,
        netPayable,
        remarks: patch.remarks ?? existing.remarks,
      },
    });
    await prisma.auditLog.create({
      data: { action: "EDIT", entity: "PayrollRecord", entityId: id, detail: JSON.stringify(patch) },
    });
    revalidatePath("/register");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Update failed" };
  }
}

export async function overrideRecord(id: string, amount: number, reason: string) {
  await requireAuth();
  if (!reason?.trim()) return { ok: false, error: "A reason is mandatory for overrides" };
  const existing = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Record not found" };
  try {
    await prisma.payrollRecord.update({
      where: { id },
      data: { isOverridden: true, overrideAmount: num(amount), overrideReason: reason.trim(), netPayable: num(amount) },
    });
    await prisma.auditLog.create({
      data: {
        action: "OVERRIDE",
        entity: "PayrollRecord",
        entityId: id,
        reason: reason.trim(),
        detail: JSON.stringify({ from: existing.netPayable, to: num(amount) }),
      },
    });
    revalidatePath("/register");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Override failed" };
  }
}

export async function clearOverride(id: string) {
  await requireAuth();
  const existing = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Record not found" };
  const calc = computeRecord(existing);
  try {
    await prisma.payrollRecord.update({
      where: { id },
      data: { isOverridden: false, overrideAmount: null, overrideReason: null, netPayable: calc.netPayable },
    });
    await prisma.auditLog.create({
      data: { action: "CLEAR_OVERRIDE", entity: "PayrollRecord", entityId: id },
    });
    revalidatePath("/register");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed" };
  }
}

export async function setRecordsStatus(ids: string[], status: "Draft" | "Approved" | "Paid") {
  await requireAuth();
  if (!ids?.length) return { ok: false, error: "No records selected" };
  try {
    await prisma.payrollRecord.updateMany({ where: { id: { in: ids } }, data: { status } });
    await prisma.auditLog.create({
      data: {
        action: status === "Paid" ? "MARK_PAID" : status === "Approved" ? "APPROVE" : "REOPEN",
        entity: "PayrollRecord",
        detail: JSON.stringify({ ids, status }),
      },
    });
    revalidatePath("/register");
    revalidatePath("/");
    return { ok: true, count: ids.length };
  } catch {
    return { ok: false, error: "Status update failed" };
  }
}
