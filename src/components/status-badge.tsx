import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "warning" | "secondary" | "default"> = {
    Paid: "success",
    Approved: "default",
    Draft: "warning",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}
