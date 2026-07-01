import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Toasts } from "@/components/Toasts";
import { AdminNotificationBell } from "@/components/portal/AdminNotificationBell";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="iz-portal min-h-screen bg-[var(--iz-bg)]">
      <header className="border-b border-[var(--iz-line)] bg-[var(--iz-panel)] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--iz-violet-l)]" />
              <span className="font-sora text-sm font-bold">InnocenZ Admin</span>
            </div>
            <p className="iz-tiny iz-muted mt-0.5">Hidden operations portal</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminNotificationBell />
            <Link to="/admin/jobs" className="iz-chip !text-[11px]">
              Job postings
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}
