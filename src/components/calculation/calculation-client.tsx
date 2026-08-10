"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthSelector } from "@/components/month-selector";
import { computeRecord, FORMULAS } from "@/lib/calc";
import { formatINR } from "@/lib/format";
import { setGrossPayableDays } from "@/app/actions/settings";
import { overrideRecord, clearOverride } from "@/app/actions/records";
import { Calculator, Save, Pencil, RotateCcw, Loader2 } from "lucide-react";

export interface CalcRecord {
  id: string;
  employeeName: string;
  revisedFixedSalary: number;
  revisedMonthlyRemuneration: number;
  physicalPresentDays: number;
  publicHolidays: number;
  grossPayableDays: number;
  pliPercent: number;
  incentive: number;
  expenseClaim: number;
  deduction: number;
  netPayable: number;
  isOverridden: boolean;
  overrideReason: string | null;
}

export function CalculationClient({
  months, activeMonth, gpd, records,
}: {
  months: { month: string; label: string }[];
  activeMonth: string | null;
  gpd: number;
  records: CalcRecord[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Formula reference */}
      <Card>
        <CardHeader><CardTitle className="text-base">Calculation rules (transparent &amp; editable)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {FORMULAS.map((f) => (
              <div key={f.key} className="rounded-md border bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">{f.label}</div>
                <code className="text-xs text-primary">{f.expr}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConfigCard gpd={gpd} onSaved={() => router.refresh()} />
        <LiveCalculator gpd={gpd} />
      </div>

      {/* Overrides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Records &amp; overrides</CardTitle>
          <MonthSelector months={months} active={activeMonth} />
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No records for this month.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Calculated Net</TableHead>
                    <TableHead className="text-right">Applied Net</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => {
                    const calc = computeRecord(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employeeName}</TableCell>
                        <TableCell className="tabular text-right text-muted-foreground">{formatINR(calc.netPayable)}</TableCell>
                        <TableCell className="tabular text-right font-semibold">{formatINR(r.netPayable)}</TableCell>
                        <TableCell>
                          {r.isOverridden ? (
                            <Badge variant="warning" title={r.overrideReason ?? ""}>Overridden</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <OverrideAction record={r} onDone={() => router.refresh()} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigCard({ gpd, onSaved }: { gpd: number; onSaved: () => void }) {
  const [value, setValue] = useState(gpd);
  const [saving, setSaving] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Default gross payable days</Label>
          <div className="flex gap-2">
            <Input type="number" className="w-[140px]" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} />
            <Button
              onClick={async () => { setSaving(true); const r = await setGrossPayableDays(value); setSaving(false); if (r.ok) { toast.success("Saved"); onSaved(); } }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Used as the default divisor for proration when a row has no gross payable days.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveCalculator({ gpd }: { gpd: number }) {
  const [s, setS] = useState({
    revisedFixedSalary: 33800, revisedMonthlyRemuneration: 36800,
    physicalPresentDays: 24.5, publicHolidays: 0, grossPayableDays: gpd,
    pliPercent: 8.15, incentive: 0, expenseClaim: 0, deduction: 0,
  });
  const calc = computeRecord(s);
  const set = (k: keyof typeof s, v: number) => setS((p) => ({ ...p, [k]: v }));
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4" /> Live calculator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Revised fixed" v={s.revisedFixedSalary} onC={(v) => set("revisedFixedSalary", v)} />
          <Mini label="Monthly remun." v={s.revisedMonthlyRemuneration} onC={(v) => set("revisedMonthlyRemuneration", v)} />
          <Mini label="Present days" v={s.physicalPresentDays} onC={(v) => set("physicalPresentDays", v)} />
          <Mini label="Public holidays" v={s.publicHolidays} onC={(v) => set("publicHolidays", v)} />
          <Mini label="Gross payable days" v={s.grossPayableDays} onC={(v) => set("grossPayableDays", v)} />
          <Mini label="PLI %" v={s.pliPercent} onC={(v) => set("pliPercent", v)} />
          <Mini label="Incentive" v={s.incentive} onC={(v) => set("incentive", v)} />
          <Mini label="Expense claim" v={s.expenseClaim} onC={(v) => set("expenseClaim", v)} />
          <Mini label="Deduction" v={s.deduction} onC={(v) => set("deduction", v)} />
        </div>
        <div className="space-y-1 rounded-md border bg-slate-50 p-3 text-sm">
          <Line k="Payable days" v={`${calc.payableDays}`} />
          <Line k="Prorated fixed" v={formatINR(calc.proratedFixedSalary)} />
          <Line k="PLI amount" v={formatINR(calc.pliAmount)} />
          <Line k="Gross salary" v={formatINR(calc.grossSalary)} />
          <Line k="Total additions" v={formatINR(calc.totalAdditions)} />
          <div className="mt-1 flex items-center justify-between border-t pt-1 font-semibold">
            <span>Net payable</span><span className="tabular">{formatINR(calc.netPayable)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverrideAction({ record, onDone }: { record: CalcRecord; onDone: () => void }) {
  const calc = computeRecord(record);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(record.netPayable);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!reason.trim()) return toast.error("A reason is mandatory.");
    setBusy(true);
    const r = await overrideRecord(record.id, amount, reason);
    setBusy(false);
    if (r.ok) { toast.success("Override applied"); setOpen(false); onDone(); }
    else toast.error(r.error);
  }
  async function reset() {
    setBusy(true);
    const r = await clearOverride(record.id);
    setBusy(false);
    if (r.ok) { toast.success("Override cleared"); onDone(); }
    else toast.error(r.error);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {record.isOverridden && (
        <Button size="icon" variant="ghost" title="Reset to calculated" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
      )}
      <Button size="sm" variant="outline" onClick={() => { setAmount(record.netPayable); setReason(""); setOpen(true); }}>
        <Pencil className="h-4 w-4" /> Override
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override net payable — {record.employeeName}</DialogTitle>
            <DialogDescription>Calculated value is {formatINR(calc.netPayable)}. Overrides are audit-logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Override amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label>Reason (mandatory)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. approved retention bonus" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={apply} disabled={busy || !reason.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply override"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Mini({ label, v, onC }: { label: string; v: number; onC: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" className="h-8 tabular" value={v} onChange={(e) => onC(parseFloat(e.target.value) || 0)} />
    </div>
  );
}
function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular">{v}</span></div>;
}
