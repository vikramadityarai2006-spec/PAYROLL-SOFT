import { listEmployees } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { EmployeesClient, type EmployeeRow } from "@/components/employees/employees-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await listEmployees();
  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    name: e.name,
    department: e.department,
    designation: e.designation,
    joiningDate: e.joiningDate ? e.joiningDate.toISOString() : null,
    active: e.active,
    fromAccount: e.fromAccount,
    bankName: e.bankName,
    bankAccountNumber: e.bankAccountNumber,
    ifsc: e.ifsc,
    revisedMonthlyRemuneration: e.revisedMonthlyRemuneration,
    revisedFixedSalary: e.revisedFixedSalary,
    revisedPliComponent: e.revisedPliComponent,
    oldSalary: e.oldSalary,
    fixedIncrease: e.fixedIncrease,
  }));

  return (
    <div>
      <PageHeader title="Employees" description="Manage employee master, salary structure and bank details." />
      <EmployeesClient employees={rows} />
    </div>
  );
}
