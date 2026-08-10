"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setGrossPayableDays } from "@/app/actions/settings";
import { Save, Loader2 } from "lucide-react";

export function SettingsClient({ gpd }: { gpd: number }) {
  const router = useRouter();
  const [value, setValue] = useState(gpd);
  const [saving, setSaving] = useState(false);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Calculation configuration</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Default gross payable days</Label>
          <div className="flex gap-2">
            <Input type="number" className="w-[140px]" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} />
            <Button
              disabled={saving}
              onClick={async () => { setSaving(true); const r = await setGrossPayableDays(value); setSaving(false); if (r.ok) { toast.success("Saved"); router.refresh(); } }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Divisor used for salary proration when a payroll row does not carry its own value.</p>
        </div>
      </CardContent>
    </Card>
  );
}
