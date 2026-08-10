"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { MonthSelector } from "@/components/month-selector";
import { formatINR, maskAccount } from "@/lib/format";
import { computeRecord } from "@/lib/calc";
import { setRecordsStatus, updateRecord, type RecordPatch } from "@/app/actions/records";
import { Search, CheckCircle2, BadgeCheck, Pencil, Loader2, FileText, Printer } from "lucide-react";

export interface RegisterRecord {
  id: string;
  employeeName: string;
  department: string | null;
  payableDays: number;
  proratedFixedSalary: number;
  pliAmount: number;
  incentive: number;
  expenseClaim: number;
  deduction: number;
  grossSalary: number;
  netPayable: number;
  bankAccountNumber: string | null;
  remarks: string | null;
  status: string;
  isOverridden: boolean;
  // editable base
  physicalPresentDays: number;
  publicHolidays: number;
  grossPayableDays: number;
  pliPercent: number;
  revisedFixedSalary: number;
  revisedMonthlyRemuneration: number;
}

export function RegisterClient({
  months, activeMonth, records, departments,
}: {
  months: { month: string; label: string }[];
  activeMonth: string | null;
  records: RegisterRecord[];
  departments: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [editRow, setEditRow] = useState<RegisterRecord | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return records.filter((r) => {
      if (s && !r.employeeName.toLowerCase().includes(s)) return false;
      if (dept !== "all" && (r.department ?? "—") !== dept) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [records, q, dept, status]);

  const totals = useMemo(
    () => filtered.reduce(
      (a, r) => {
        a.fixed += r.proratedFixedSalary; a.pli += r.pliAmount; a.inc += r.incentive;
        a.exp += r.expenseClaim; a.ded += r.deduction; a.gross += r.grossSalary; a.net += r.netPayable;
        return a;
      },
      { fixed: 0, pli: 0, inc: 0, exp: 0, ded: 0, gross: 0, net: 0 }
    ),
    [filtered]
  );

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulk(next: "Approved" | "Paid") {
    if (selected.size === 0) return toast.error("Select at least one record.");
    setBusy(true);
    const r = await setRecordsStatus(Array.from(selected), next);
    setBusy(false);
    if (r.ok) { toast.success(`${r.count} record(s) marked ${next}`); setSelected(new Set()); router.refresh(); }
    else toast.error(r.error);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Month</Label>
              <MonthSelector months={months} active={activeMonth} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-[200px] pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => bulk("Approved")} disabled={busy || selected.size === 0}>
              <CheckCircle2 className="h-4 w-4" /> Approve ({selected.size})
            </Button>
            <Button variant="success" onClick={() => bulk("Paid")} disabled={busy || selected.size === 0}>
              <BadgeCheck className="h-4 w-4" /> Mark paid ({selected.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Payable Days</TableHead>
              <TableHead className="text-right">Fixed Pay</TableHead>
              <TableHead className="text-right">PLI</TableHead>
              <TableHead className="text-right">Incentive</TableHead>
              <TableHead className="text-right">Expense</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Bank A/C</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="py-8 text-center text-muted-foreground">No records match the filters.</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></TableCell>
                  <TableCell className="font-medium">
                    {r.employeeName}
                    {r.isOverridden && <span className="ml-1 text-xs text-warning">(override)</span>}
                    <div className="text-xs text-muted-foreground">{r.department ?? ""}</div>
                  </TableCell>
                  <TableCell className="tabular text-right">{r.payableDays}</TableCell>
                  <TableCell className="tabular text-right">{formatINR(r.proratedFixedSalary)}</TableCell>
                  <TableCell className="tabular text-right">{formatINR(r.pliAmount)}</TableCell>
                  <TableCell className="tabular text-right">{r.incentive ? formatINR(r.incentive) : "—"}</TableCell>
                  <TableCell className="tabular text-right">{r.expenseClaim ? formatINR(r.expenseClaim) : "—"}</TableCell>
                  <TableCell className="tabular text-right text-destructive">{r.deduction ? `- ${formatINR(r.deduction)}` : "—"}</TableCell>
                  <TableCell className="tabular text-right">{formatINR(r.grossSalary)}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{formatINR(r.netPayable)}</TableCell>
                  <TableCell className="tabular text-muted-foreground">{maskAccount(r.bankAccountNumber)}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={r.remarks ?? ""}>{r.remarks ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/slip/${r.id}`} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" title="Salary slip"><FileText className="h-4 w-4" /></Button>
                      </a>
                      <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditRow(r)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">Totals ({filtered.length})</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.fixed)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.pli)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.inc)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.exp)}</TableCell>
                <TableCell className="tabular text-right font-semibold text-destructive">{formatINR(totals.ded)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.gross)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatINR(totals.net)}</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <EditRecordDialog row={editRow} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); router.refresh(); }} />
    </div>
  );
}

function EditRecordDialog({ row, onClose, onSaved }: { row: RegisterRecord | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<RecordPatch>({});
  const [busy, setBusy] = useState(false);

  const base = row
    ? {
        physicalPresentDays: form.physicalPresentDays ?? row.physicalPresentDays,
        publicHolidays: form.publicHolidays ?? row.publicHolidays,
        grossPayableDays: form.grossPayableDays ?? row.grossPayableDays,
        pliPercent: form.pliPercent ?? row.pliPercent,
        revisedFixedSalary: row.revisedFixedSalary,
        revisedMonthlyRemuneration: row.revisedMonthlyRemuneration,
        incentive: form.incentive ?? row.incentive,
        expenseClaim: form.expenseClaim ?? row.expenseClaim,
        deduction: form.deduction ?? row.deduction,
      }
    : null;
  const preview = base ? computeRecord(base) : null;

  async function save() {
    if (!row) return;
    setBusy(true);
    const r = await updateRecord(row.id, form);
    setBusy(false);
    if (r.ok) { toast.success("Record updated"); onSaved(); }
    else toast.error(r.error);
  }

  const set = (k: keyof RecordPatch, v: number | string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) { setForm({}); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit — {row?.employeeName}</DialogTitle>
          <DialogDescription>Adjust attendance, incentives, deductions and remarks. Net recalculates live.</DialogDescription>
        </DialogHeader>
        {row && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Small label="Present days" v={form.physicalPresentDays ?? row.physicalPresentDays} onC={(v) => set("physicalPresentDays", v)} />
              <Small label="Public holidays" v={form.publicHolidays ?? row.publicHolidays} onC={(v) => set("publicHolidays", v)} />
              <Small label="Gross payable days" v={form.grossPayableDays ?? row.grossPayableDays} onC={(v) => set("grossPayableDays", v)} />
              <Small label="PLI %" v={form.pliPercent ?? row.pliPercent} onC={(v) => set("pliPercent", v)} />
              <Small label="Incentive" v={form.incentive ?? row.incentive} onC={(v) => set("incentive", v)} />
              <Small label="Expense claim" v={form.expenseClaim ?? row.expenseClaim} onC={(v) => set("expenseClaim", v)} />
              <Small label="Deduction" v={form.deduction ?? row.deduction} onC={(v) => set("deduction", v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Input value={form.remarks ?? row.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} />
            </div>
            {preview && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross salary</span><span className="tabular">{formatINR(preview.grossSalary)}</span></div>
                <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Net payable</span><span className="tabular">{formatINR(preview.netPayable)}</span></div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setForm({}); onClose(); }}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Small({ label, v, onC }: { label: string; v: number; onC: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" className="h-8 tabular" value={v} onChange={(e) => onC(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
