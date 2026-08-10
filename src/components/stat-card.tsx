import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
}) {
  const toneRing: Record<string, string> = {
    default: "text-slate-700 bg-slate-100",
    primary: "text-primary bg-accent",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        {icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneRing[tone])}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="tabular mt-1 text-xl font-semibold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
