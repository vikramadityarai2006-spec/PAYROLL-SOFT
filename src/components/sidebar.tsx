"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Calculator,
  Table2,
  FileDown,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/payroll", label: "Payroll Processing", icon: FileSpreadsheet },
  { href: "/calculation", label: "Salary Calculation", icon: Calculator },
  { href: "/register", label: "Payroll Register", icon: Table2 },
  { href: "/reports", label: "Reports & Export", icon: FileDown },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground md:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5" /> Payroll
        </div>
        <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <aside
        className={cn(
          "flex w-64 shrink-0 flex-col border-r bg-primary text-primary-foreground md:sticky md:top-0 md:h-screen",
          open ? "block" : "hidden md:flex"
        )}
      >
        <div className="hidden items-center gap-2 px-5 py-5 text-lg font-semibold md:flex">
          <ShieldCheck className="h-6 w-6" />
          Payroll
        </div>
        <nav className="flex-1 space-y-1 px-3 py-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-white/15 text-white"
                  : "text-primary-foreground/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-primary-foreground/80 hover:bg-white/10 hover:text-white"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
