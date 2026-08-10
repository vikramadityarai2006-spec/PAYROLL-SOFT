"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setGrossPayableDays(value: number) {
  await requireAuth();
  const v = Number.isFinite(value) && value > 0 ? value : 30;
  await prisma.setting.upsert({
    where: { key: "calc.grossPayableDays" },
    update: { value: String(v) },
    create: { key: "calc.grossPayableDays", value: String(v) },
  });
  revalidatePath("/settings");
  revalidatePath("/calculation");
  return { ok: true };
}
