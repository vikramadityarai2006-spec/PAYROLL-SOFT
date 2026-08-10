"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthLabel } from "@/lib/format";

export function MonthSelector({
  months,
  active,
}: {
  months: { month: string; label: string }[];
  active: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(month: string) {
    const q = new URLSearchParams(Array.from(params.entries()));
    q.set("month", month);
    router.push(`${pathname}?${q.toString()}`);
  }

  if (!months.length) {
    return <span className="text-sm text-muted-foreground">No payroll months yet</span>;
  }

  return (
    <Select value={active ?? months[0].month} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.month} value={m.month}>
            {m.label || monthLabel(m.month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
