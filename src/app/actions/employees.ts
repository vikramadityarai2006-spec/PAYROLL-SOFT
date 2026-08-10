"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface EmployeeInput {
  employeeId: string;
  name: string;
  department?: string;
  designation?: string;
  joiningDate?: string | null;
  active?: boolean;
  fromAccount?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  oldSalary?: number;
  fixedIncrease?: number;
  existingMonthlyRemuneration?: number;
  existingPliComponent?: number;
  revisedMonthlyRemuneration?: number;
  revisedFixedSalary?: number;
  revisedPliComponent?: number;
}

type Result = { ok: true; id: string } | { ok: false; error: string };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function clean(data: EmployeeInput) {
  return {
    employeeId: data.employeeId.trim(),
    name: data.name.trim(),
    department: data.department?.trim() || null,
    designation: data.designation?.trim() || null,
    joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
    active: data.active ?? true,
    fromAccount: data.fromAccount?.trim() || null,
    bankName: data.bankName?.trim() || null,
    bankAccountNumber: data.bankAccountNumber?.trim() || null,
    ifsc: data.ifsc?.trim() || null,
    oldSalary: num(data.oldSalary),
    fixedIncrease: num(data.fixedIncrease),
    existingMonthlyRemuneration: num(data.existingMonthlyRemuneration),
    existingPliComponent: num(data.existingPliComponent),
    revisedMonthlyRemuneration: num(data.revisedMonthlyRemuneration),
    revisedFixedSalary: num(data.revisedFixedSalary),
    revisedPliComponent: num(data.revisedPliComponent),
  };
}

export async function createEmployee(data: EmployeeInput): Promise<Result> {
  await requireAuth();
  if (!data.name?.trim()) return { ok: false, error: "Name is required" };
  if (!data.employeeId?.trim()) return { ok: false, error: "Employee ID is required" };
  try {
    const emp = await prisma.employee.create({ data: clean(data) });
    revalidatePath("/employees");
    return { ok: true, id: emp.id };
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Employee ID already exists" : "Could not create employee";
    return { ok: false, error: msg };
  }
}

export async function updateEmployee(id: string, data: EmployeeInput): Promise<Result> {
  await requireAuth();
  try {
    await prisma.employee.update({ where: { id }, data: clean(data) });
    revalidatePath("/employees");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Could not update employee" };
  }
}

export async function setEmployeeActive(id: string, active: boolean): Promise<Result> {
  await requireAuth();
  try {
    await prisma.employee.update({ where: { id }, data: { active } });
    revalidatePath("/employees");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Could not update status" };
  }
}
