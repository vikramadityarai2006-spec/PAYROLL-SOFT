import { getGrossPayableDays, getAuditLogs } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const gpd = await getGrossPayableDays();
  const logs = await getAuditLogs(50);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Calculation configuration, security and audit trail." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingsClient gpd={gpd} />

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Security</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Admin access is protected by a password set in the <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code> environment variable.</p>
            <p>To change it, update <code className="rounded bg-slate-100 px-1">.env</code> and restart the app. Sessions are signed cookies (HTTP-only) and expire after <code className="rounded bg-slate-100 px-1">SESSION_TTL_HOURS</code>.</p>
            <p>Salary and bank data is never written to logs, public pages, or browser local storage.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Audit log</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason / detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No activity yet.</TableCell></TableRow>
                ) : logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.createdAt)} {new Date(l.createdAt).toLocaleTimeString("en-IN")}</TableCell>
                    <TableCell><Badge variant="secondary">{l.action}</Badge></TableCell>
                    <TableCell className="text-xs">{l.entity}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground" title={l.reason ?? l.detail ?? ""}>{l.reason ?? l.detail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
