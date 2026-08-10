"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatINR, maskAccount } from "@/lib/format";
import { Search } from "lucide-react";

export interface RecentRow {
  id: string;
  employeeName: string;
  department: string | null;
  grossSalary: number;
  deduction: number;
  netPayable: number;
  bankAccountNumber: string | null;
  status: string;
}

export function RecentPayroll({ rows }: { rows: RecentRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(s) ||
        (r.department ?? "").toLowerCase().includes(s) ||
        r.status.toLowerCase().includes(s)
    );
  }, [q, rows]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search employee, department, status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Bank A/C</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No matching records.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.department ?? "—"}</TableCell>
                  <TableCell className="tabular text-right">{formatINR(r.grossSalary)}</TableCell>
                  <TableCell className="tabular text-right text-destructive">
                    {r.deduction ? `- ${formatINR(r.deduction)}` : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">{formatINR(r.netPayable)}</TableCell>
                  <TableCell className="tabular text-muted-foreground">{maskAccount(r.bankAccountNumber)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
