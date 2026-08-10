import { getGrossPayableDays } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { PayrollClient } from "@/components/payroll/payroll-client";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const gpd = await getGrossPayableDays();
  return (
    <div>
      <PageHeader
        title="Payroll Processing"
        description="Select a month, import the salary workbook, map columns, review and save."
      />
      <PayrollClient defaultGrossPayableDays={gpd} />
    </div>
  );
}
