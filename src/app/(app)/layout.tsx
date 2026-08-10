import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(); // redirects to /login if not authenticated

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
