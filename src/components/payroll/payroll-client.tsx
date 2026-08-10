"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  APP_FIELDS, autoMap, normalizeHeader, toNumber, toText, toDate,
  type Mapping, type AppField,
} from "@/lib/mapping";
import { computeRecord, pliPercentFromAmount } from "@/lib/calc";
import { summarizeFlags, type ImportRow } from "@/lib/validate";
import { formatINR, maskAccount, monthLabel } from "@/lib/format";
import { saveImport } from "@/app/actions/runs";
import { UploadCloud, ArrowRight, ArrowLeft, Save, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";

type Step = "upload" | "map" | "preview";

export function PayrollClient({ defaultGrossPayableDays }: { defaultGrossPayableDays: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [matrix, setMatrix] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [saving, setSaving] = useState(false);

  const headers = useMemo(() => {
    const hr = matrix[headerRow] ?? [];
    return hr.map((h) => toText(h));
  }, [matrix, headerRow]);

  // ---- Step 1: read file (fully client-side; nothing is uploaded to a server) ----
  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setFileName(file.name);
      loadSheet(wb, 0);
      setStep("map");
    } catch {
      toast.error("Could not read this file. Make sure it is a valid .xls or .xlsx.");
    }
  }

  function loadSheet(wb: XLSX.WorkBook, idx: number) {
    const ws = wb.Sheets[wb.SheetNames[idx]];
    const m = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }) as unknown[][];
    setMatrix(m);
    setSheetIndex(idx);
    // auto-detect header row: row (within first 6) with most non-empty text cells
    let best = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(m.length, 6); i++) {
      const score = (m[i] ?? []).filter((c) => typeof c === "string" && c.trim().length > 1).length;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    setHeaderRow(best);
    const hdr = (m[best] ?? []).map((h) => toText(h));
    setMapping(autoMap(hdr));
  }

  function reMap(hr: number) {
    setHeaderRow(hr);
    const hdr = (matrix[hr] ?? []).map((h) => toText(h));
    setMapping(autoMap(hdr));
  }

  // ---- Step 2 -> build preview rows ----
  function buildRows(): ImportRow[] {
    const data = matrix.slice(headerRow + 1);
    const get = (row: unknown[], f: AppField) => {
      const idx = mapping[f];
      return idx === undefined ? undefined : row[idx];
    };
    const out: ImportRow[] = [];
    for (const row of data) {
      const name = toText(get(row, "name"));
      if (!name) continue; // skip blank / total rows
      const revisedMonthlyRemuneration = toNumber(get(row, "revisedMonthlyRemuneration"));
      const revisedFixedSalary = toNumber(get(row, "revisedFixedSalary"));
      const revisedPliComponent = toNumber(get(row, "revisedPliComponent"));
      const pliAmountRaw = mapping.pliAmount !== undefined ? toNumber(get(row, "pliAmount")) : revisedPliComponent;
      const pliPercent = pliPercentFromAmount(pliAmountRaw, revisedMonthlyRemuneration);
      const gpd = mapping.grossPayableDays !== undefined ? toNumber(get(row, "grossPayableDays")) : 0;
      const dojRaw = get(row, "joiningDate");
      const doj = toDate(dojRaw);

      out.push({
        name,
        employeeId: toText(get(row, "employeeId")) || undefined,
        department: toText(get(row, "department")) || undefined,
        designation: toText(get(row, "designation")) || undefined,
        joiningDate: doj ? doj.toISOString() : null,
        revisedFixedSalary,
        revisedMonthlyRemuneration,
        revisedPliComponent,
        physicalPresentDays: toNumber(get(row, "physicalPresentDays")),
        publicHolidays: toNumber(get(row, "publicHolidays")),
        grossPayableDays: gpd > 0 ? gpd : defaultGrossPayableDays,
        pliPercent,
        pliAmount: pliAmountRaw,
        incentive: toNumber(get(row, "incentive")) + toNumber(get(row, "incentive2")),
        expenseClaim: toNumber(get(row, "expenseClaim")),
        deduction: toNumber(get(row, "deduction")),
        fromAccount: toText(get(row, "fromAccount")) || undefined,
        bankName: toText(get(row, "bankName")) || undefined,
        bankAccountNumber: toText(get(row, "bankAccountNumber")) || undefined,
        ifsc: toText(get(row, "ifsc")) || undefined,
        remarks: toText(get(row, "remarks")) || undefined,
      });
    }
    return out;
  }

  function goPreview() {
    if (mapping.name === undefined) return toast.error("Please map the Employee Name column.");
    if (mapping.revisedFixedSalary === undefined || mapping.revisedMonthlyRemuneration === undefined)
      return toast.error("Please map the revised fixed salary and monthly remuneration columns.");
    const r = buildRows();
    if (!r.length) return toast.error("No employee rows found. Check the header row selection.");
    setRows(r);
    setStep("preview");
  }

  const flags = useMemo(() => summarizeFlags(rows), [rows]);

  function editRow(i: number, key: keyof ImportRow, value: number | string) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value } as ImportRow;
      return next;
    });
  }

  async function doSave() {
    setSaving(true);
    const res = await saveImport(month, rows);
    setSaving(false);
    if (res.ok) {
      toast.success(`Imported ${res.count} records for ${monthLabel(month)}`);
      router.push(`/register?month=${month}`);
      router.refresh();
    } else {
      toast.error(res.error ?? "Import failed");
    }
  }

  const headerOptions = headers.map((h, i) => ({ i, h: h || `(column ${i + 1})` }));

  return (
    <div className="space-y-6">
      {/* Month + steps */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <Label>Salary month</Label>
            <Input type="month" className="w-[200px]" value={month} onChange={(e) => setMonth(e.target.value)} />
            <p className="text-xs text-muted-foreground">Payroll month is always configurable — {monthLabel(month)}.</p>
          </div>
          <Stepper step={step} />
        </CardContent>
      </Card>

      {step === "upload" && (
        <Card>
          <CardContent className="p-8">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center transition hover:border-primary hover:bg-accent"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
            >
              <UploadCloud className="mb-3 h-10 w-10 text-primary" />
              <p className="font-medium">Drop the salary workbook here, or click to browse</p>
              <p className="mt-1 text-sm text-muted-foreground">Supports legacy .xls and .xlsx. Data is parsed locally in your browser.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" /> Map columns — {fileName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sheetNames.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Sheet</Label>
                  <Select value={String(sheetIndex)} onValueChange={(v) => workbook && loadSheet(workbook, +v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((s, i) => <SelectItem key={i} value={String(i)}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Header row (1-based)</Label>
                <Input type="number" min={1} value={headerRow + 1} onChange={(e) => reMap(Math.max(0, (+e.target.value || 1) - 1))} className="w-[140px]" />
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App field</TableHead>
                    <TableHead>Spreadsheet column</TableHead>
                    <TableHead>Sample value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {APP_FIELDS.map((def) => {
                    const idx = mapping[def.field];
                    const sample = idx !== undefined ? toText(matrix[headerRow + 1]?.[idx]) : "";
                    return (
                      <TableRow key={def.field}>
                        <TableCell className="font-medium">
                          {def.label}{" "}
                          {def.required && <span className="text-destructive">*</span>}
                          {def.help && <span className="block text-xs font-normal text-muted-foreground">{def.help}</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={idx === undefined ? "-1" : String(idx)}
                            onValueChange={(v) => {
                              const n = parseInt(v, 10);
                              setMapping((m) => {
                                const next = { ...m };
                                if (n < 0) delete next[def.field];
                                else next[def.field] = n;
                                return next;
                              });
                            }}
                          >
                            <SelectTrigger className="w-[280px]"><SelectValue placeholder="— not mapped —" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-1">— not mapped —</SelectItem>
                              {headerOptions.map((o) => <SelectItem key={o.i} value={String(o.i)}>{o.h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{sample || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={goPreview}>Preview <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              Preview — {rows.length} employees
              {flags.errors > 0 && <Badge variant="destructive">{flags.errors} errors</Badge>}
              {flags.warnings > 0 && <Badge variant="warning">{flags.warnings} warnings</Badge>}
              {flags.errors === 0 && flags.warnings === 0 && <Badge variant="success">All clear</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Attendance, public holidays, incentives, expense claims, deductions and remarks are editable below. Figures recalculate live.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Employee</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Pub. Hol.</TableHead>
                    <TableHead>GPD</TableHead>
                    <TableHead className="text-right">Fixed (prorated)</TableHead>
                    <TableHead className="text-right">PLI</TableHead>
                    <TableHead>Incentive</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead>Deduction</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead>Bank A/C</TableHead>
                    <TableHead className="min-w-[160px]">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const calc = computeRecord(r);
                    const rowFlags = flags.perRow[i] ?? [];
                    const hasError = rowFlags.some((f) => f.level === "error");
                    return (
                      <TableRow key={i} className={hasError ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.department ?? ""}</div>
                        </TableCell>
                        <TableCell><NumCell value={r.physicalPresentDays} onChange={(v) => editRow(i, "physicalPresentDays", v)} /></TableCell>
                        <TableCell><NumCell value={r.publicHolidays} onChange={(v) => editRow(i, "publicHolidays", v)} /></TableCell>
                        <TableCell><NumCell value={r.grossPayableDays} onChange={(v) => editRow(i, "grossPayableDays", v)} /></TableCell>
                        <TableCell className="tabular text-right">{formatINR(calc.proratedFixedSalary)}</TableCell>
                        <TableCell className="tabular text-right">{formatINR(calc.pliAmount)}</TableCell>
                        <TableCell><NumCell value={r.incentive} onChange={(v) => editRow(i, "incentive", v)} /></TableCell>
                        <TableCell><NumCell value={r.expenseClaim} onChange={(v) => editRow(i, "expenseClaim", v)} /></TableCell>
                        <TableCell><NumCell value={r.deduction} onChange={(v) => editRow(i, "deduction", v)} className="text-destructive" /></TableCell>
                        <TableCell className="tabular text-right font-semibold">{formatINR(calc.netPayable)}</TableCell>
                        <TableCell className="tabular text-muted-foreground">{maskAccount(r.bankAccountNumber)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rowFlags.map((f, k) => (
                              <Badge key={k} variant={f.level === "error" ? "destructive" : "warning"} className="gap-1">
                                <AlertTriangle className="h-3 w-3" />{f.message}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("map")}><ArrowLeft className="h-4 w-4" /> Back to mapping</Button>
              <div className="flex items-center gap-2">
                {flags.errors > 0 && (
                  <span className="text-sm text-destructive">Resolve errors before saving.</span>
                )}
                <Button onClick={doSave} disabled={saving || flags.errors > 0} variant="success">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save payroll for {monthLabel(month)}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NumCell({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`h-8 w-[84px] tabular ${className ?? ""}`}
    />
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Import file" },
    { key: "map", label: "Map columns" },
    { key: "preview", label: "Preview & save" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-500"}`}>
            {i + 1}
          </div>
          <span className={`text-sm ${i <= idx ? "font-medium text-slate-900" : "text-muted-foreground"}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="mx-1 text-slate-300">›</span>}
        </div>
      ))}
    </div>
  );
}
