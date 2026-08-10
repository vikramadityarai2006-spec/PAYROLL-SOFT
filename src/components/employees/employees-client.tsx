"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, maskAccount, formatDate } from "@/lib/format";
import { createEmployee, updateEmployee, setEmployeeActive, type EmployeeInput } from "@/app/actions/employees";
import { Plus, Pencil, Eye, Search, UserX, UserCheck, Loader2 } from "lucide-react";

export interface EmployeeRow {
  id: string;
  employeeId: string;
  name: string;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  active: boolean;
  fromAccount: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  ifsc: string | null;
  revisedMonthlyRemuneration: number;
  revisedFixedSalary: number;
  revisedPliComponent: number;
  oldSalary: number | null;
  fixedIncrease: number | null;
}

const empty: EmployeeInput = {
  employeeId: "",
  name: "",
  department: "",
  designation: "",
  joiningDate: "",
  fromAccount: "",
  bankName: "",
  bankAccountNumber: "",
  ifsc: "",
  revisedMonthlyRemuneration: 0,
  revisedFixedSalary: 0,
  revisedPliComponent: 0,
  oldSalary: 0,
  fixedIncrease: 0,
};

export function EmployeesClient({ employees }: { employees: EmployeeRow[] }) {
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewRow, setViewRow] = useState<EmployeeRow | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<EmployeeInput>(empty);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(s) ||
        e.employeeId.toLowerCase().includes(s) ||
        (e.department ?? "").toLowerCase().includes(s) ||
        (e.designation ?? "").toLowerCase().includes(s)
    );
  }, [q, employees]);

  function openAdd() {
    setEditing(null);
    setForm({ ...empty, employeeId: `EMP-${String(employees.length + 1).padStart(3, "0")}` });
    setFormOpen(true);
  }

  function openEdit(e: EmployeeRow) {
    setEditing(e);
    setForm({
      employeeId: e.employeeId,
      name: e.name,
      department: e.department ?? "",
      designation: e.designation ?? "",
      joiningDate: e.joiningDate ? e.joiningDate.slice(0, 10) : "",
      fromAccount: e.fromAccount ?? "",
      bankName: e.bankName ?? "",
      bankAccountNumber: e.bankAccountNumber ?? "",
      ifsc: e.ifsc ?? "",
      revisedMonthlyRemuneration: e.revisedMonthlyRemuneration,
      revisedFixedSalary: e.revisedFixedSalary,
      revisedPliComponent: e.revisedPliComponent,
      oldSalary: e.oldSalary ?? 0,
      fixedIncrease: e.fixedIncrease ?? 0,
    });
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    const res = editing ? await updateEmployee(editing.id, form) : await createEmployee(form);
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Employee updated" : "Employee added");
      setFormOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  async function toggleActive(e: EmployeeRow) {
    const res = await setEmployeeActive(e.id, !e.active);
    if (res.ok) toast.success(e.active ? "Employee deactivated" : "Employee reactivated");
    else toast.error(res.error);
  }

  const set = (k: keyof EmployeeInput, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employees…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add employee
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right">Monthly Remun.</TableHead>
              <TableHead>Bank A/C</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No employees found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
                <TableRow key={e.id} className={e.active ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{e.employeeId}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.department ?? "—"}</TableCell>
                  <TableCell>{e.designation ?? "—"}</TableCell>
                  <TableCell className="tabular text-right">{formatINR(e.revisedMonthlyRemuneration)}</TableCell>
                  <TableCell className="tabular text-muted-foreground">{maskAccount(e.bankAccountNumber)}</TableCell>
                  <TableCell>
                    {e.active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewRow(e)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleActive(e)} title={e.active ? "Deactivate" : "Reactivate"}>
                        {e.active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-success" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>Salary structure and bank details are confidential.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Employee ID"><Input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} /></Field>
            <Field label="Full name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
            <Field label="Joining date"><Input type="date" value={form.joiningDate ?? ""} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
            <Field label="From account (payer)"><Input value={form.fromAccount} onChange={(e) => set("fromAccount", e.target.value)} /></Field>

            <div className="sm:col-span-2 mt-2 border-t pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salary structure</div>
            <Field label="Revised monthly remuneration"><Input type="number" value={form.revisedMonthlyRemuneration} onChange={(e) => set("revisedMonthlyRemuneration", +e.target.value)} /></Field>
            <Field label="Revised fixed salary"><Input type="number" value={form.revisedFixedSalary} onChange={(e) => set("revisedFixedSalary", +e.target.value)} /></Field>
            <Field label="Revised PLI component"><Input type="number" value={form.revisedPliComponent} onChange={(e) => set("revisedPliComponent", +e.target.value)} /></Field>
            <Field label="Old salary"><Input type="number" value={form.oldSalary} onChange={(e) => set("oldSalary", +e.target.value)} /></Field>

            <div className="sm:col-span-2 mt-2 border-t pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank details (confidential)</div>
            <Field label="Bank name"><Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="Account number"><Input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} /></Field>
            <Field label="IFSC code"><Input value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewRow?.name}</DialogTitle>
            <DialogDescription>{viewRow?.employeeId} · {viewRow?.designation ?? "—"}</DialogDescription>
          </DialogHeader>
          {viewRow && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info k="Department" v={viewRow.department ?? "—"} />
              <Info k="Joining date" v={formatDate(viewRow.joiningDate)} />
              <Info k="Monthly remuneration" v={formatINR(viewRow.revisedMonthlyRemuneration)} />
              <Info k="Fixed salary" v={formatINR(viewRow.revisedFixedSalary)} />
              <Info k="PLI component" v={formatINR(viewRow.revisedPliComponent)} />
              <Info k="Bank" v={viewRow.bankName ?? "—"} />
              <Info k="Account (masked)" v={maskAccount(viewRow.bankAccountNumber)} />
              <Info k="IFSC" v={viewRow.ifsc ?? "—"} />
              <Info k="From account" v={viewRow.fromAccount ?? "—"} />
              <Info k="Status" v={viewRow.active ? "Active" : "Inactive"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="mt-0.5 font-medium tabular">{v}</p>
    </div>
  );
}
