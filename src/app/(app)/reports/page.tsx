import { listMonths, getRunWithRecords } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { MonthSelector } from "@/components/month-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatINR, maskAccount, monthLabel } from "@/lib/format";
import { FileSpreadsheet, Landmark, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: { month?: string } }) {
  const months = await listMonths();
  const activeMonth = searchParams.month || months[0]?.month || null;
  const run = activeMonth ? await getRunWithRecords(activeMonth) : null;
  const records = run?.records ?? [];

  const totals = records.reduce(
    (a, r) => { a.gross += r.grossSalary; a.ded += r.deduction; a.net += r.netPayable; return a; },
    { gross: 0, ded: 0, net: 0 }
  );

  return (
    <div>
      <PageHeader title="Reports & Export" description="Export the register, bank payment list, and individual salary slips.">
        <MonthSelector months={months} active={activeMonth} />
      </PageHeader>

      {!activeMonth ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-muted-foreground">No payroll month to export yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" /> Payroll Register (Excel)</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">All columns with totals. Bank accounts stay masked.</p>
                <a href={`/api/export/register?month=${activeMonth}`}><Button>Download</Button></a>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Bank Payment List (Excel)</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Full account numbers for the bank. Approved/Paid only.</p>
                <a href={`/api/export/bank?month=${activeMonth}`}><Button variant="outline">Download</Button></a>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 rounded-lg border bg-white">
            <div className="border-b px-4 py-3 font-semibold">Salary slips — {monthLabel(activeMonth)}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Bank A/C</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Slip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No records.</TableCell></TableRow>
                ) : records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell className="tabular text-right">{formatINR(r.grossSalary)}</TableCell>
                    <TableCell className="tabular text-right text-destructive">{r.deduction ? `- ${formatINR(r.deduction)}` : "—"}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatINR(r.netPayable)}</TableCell>
                    <TableCell className="tabular text-muted-foreground">{maskAccount(r.bankAccountNumber)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <a href={`/slip/${r.id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><FileText className="h-4 w-4" /> PDF</Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {records.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Totals</TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatINR(totals.gross)}</TableCell>
                    <TableCell className="tabular text-right font-semibold text-destructive">{formatINR(totals.ded)}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatINR(totals.net)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
