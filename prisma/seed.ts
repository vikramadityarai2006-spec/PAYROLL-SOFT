/**
 * Seed script — SYNTHETIC sample data only.
 *
 * IMPORTANT: This intentionally contains NO real employee, salary or bank data.
 * The real confidential figures only ever enter the app through the encrypted
 * local import flow on the user's own machine. Sample data is fictional and is
 * only used so the UI is not empty before a real import.
 */
import { prisma } from "../src/lib/prisma";
import { computeRecord } from "../src/lib/calc";

// Build a configurable, relative month label (never hard-code April 2026).
function currentMonthKey(): { month: string; label: string } {
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
  return { month, label };
}

const SAMPLE = [
  { name: "Aarav Sharma", dept: "Sales", desig: "Executive", fixed: 33800, pli: 3000, rem: 36800, present: 24.5, ph: 0, pliPct: 8.15, inc: 1000, exp: 0, ded: 0, bank: "Axis Bank", acc: "917010008500001", ifsc: "UTIB0000407", from: "Payroll-A" },
  { name: "Isha Verma", dept: "Operations", desig: "Coordinator", fixed: 34375, pli: 3000, rem: 37375, present: 24, ph: 0, pliPct: 8.03, inc: 0, exp: 950, ded: 0, bank: "IDBI Bank", acc: "15104000200002", ifsc: "IBKL0000015", from: "Payroll-A" },
  { name: "Rohan Mehta", dept: "Sales", desig: "Manager", fixed: 40000, pli: 4050, rem: 44050, present: 24, ph: 0, pliPct: 9.19, inc: 0, exp: 0, ded: 0, bank: "ICICI", acc: "106701500003", ifsc: "ICIC0001067", from: "Payroll-A" },
  { name: "Priya Nair", dept: "Support", desig: "Associate", fixed: 18000, pli: 3250, rem: 21250, present: 0, ph: 0, pliPct: 15.29, inc: 0, exp: 0, ded: 0, bank: "HDFC", acc: "50100500004", ifsc: "HDFC0009186", from: "Payroll-A" },
  { name: "Karan Singh", dept: "Operations", desig: "Executive", fixed: 27000, pli: 3000, rem: 30000, present: 20.5, ph: 0, pliPct: 10, inc: 0, exp: 0, ded: 0, bank: "IDBI", acc: "15104000700005", ifsc: "IBKL0000015", from: "Payroll-A" },
  { name: "Neha Gupta", dept: "Support", desig: "Associate", fixed: 12500, pli: 2600, rem: 15100, present: 26, ph: 0, pliPct: 17.22, inc: 0, exp: 0, ded: 0, bank: "Wallet", acc: "", ifsc: "", from: "Payroll-B" },
  { name: "Vivaan Rao", dept: "Sales", desig: "Executive", fixed: 12000, pli: 2000, rem: 14000, present: 23.5, ph: 0, pliPct: 14.29, inc: 0, exp: 0, ded: 0, bank: "Wallet", acc: "", ifsc: "", from: "Payroll-B" },
  { name: "Ananya Iyer", dept: "Support", desig: "Trainee", fixed: 12000, pli: 2400, rem: 14400, present: 13, ph: 0, pliPct: 16.67, inc: 0, exp: 0, ded: 3000, bank: "Wallet", acc: "", ifsc: "", from: "Payroll-B" },
];

async function main() {
  console.log("Seeding synthetic sample data…");

  // Default calculation config
  await prisma.setting.upsert({
    where: { key: "calc.grossPayableDays" },
    update: {},
    create: { key: "calc.grossPayableDays", value: "30" },
  });

  const { month, label } = currentMonthKey();

  const run = await prisma.payrollRun.upsert({
    where: { month },
    update: {},
    create: { month, label, status: "Draft" },
  });

  let i = 1;
  for (const s of SAMPLE) {
    const employeeId = `EMP-${String(i).padStart(3, "0")}`;
    const emp = await prisma.employee.upsert({
      where: { employeeId },
      update: {},
      create: {
        employeeId,
        name: s.name,
        department: s.dept,
        designation: s.desig,
        joiningDate: new Date(2022, (i % 12), 5),
        active: true,
        fromAccount: s.from,
        bankName: s.bank || null,
        bankAccountNumber: s.acc || null,
        ifsc: s.ifsc || null,
        revisedMonthlyRemuneration: s.rem,
        revisedFixedSalary: s.fixed,
        revisedPliComponent: s.pli,
      },
    });

    const calc = computeRecord({
      revisedFixedSalary: s.fixed,
      revisedMonthlyRemuneration: s.rem,
      physicalPresentDays: s.present,
      publicHolidays: s.ph,
      grossPayableDays: 30,
      pliPercent: s.pliPct,
      incentive: s.inc,
      expenseClaim: s.exp,
      deduction: s.ded,
    });

    await prisma.payrollRecord.create({
      data: {
        runId: run.id,
        employeeId: emp.id,
        employeeName: emp.name,
        bankName: emp.bankName,
        bankAccountNumber: emp.bankAccountNumber,
        ifsc: emp.ifsc,
        fromAccount: emp.fromAccount,
        revisedFixedSalary: s.fixed,
        revisedMonthlyRemuneration: s.rem,
        physicalPresentDays: s.present,
        publicHolidays: s.ph,
        grossPayableDays: 30,
        pliPercent: s.pliPct,
        pliAmount: calc.pliAmount,
        payableDays: calc.payableDays,
        proratedFixedSalary: calc.proratedFixedSalary,
        grossSalary: calc.grossSalary,
        incentive: s.inc,
        expenseClaim: s.exp,
        deduction: s.ded,
        netPayable: calc.netPayable,
        status: "Draft",
      },
    });
    i++;
  }

  console.log(`Seeded ${SAMPLE.length} sample employees for ${label} (${month}).`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
