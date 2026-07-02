import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Toasts } from "@/components/Toasts";
import { AdminNotificationBell } from "@/components/portal/AdminNotificationBell";
import { useStore } from "@/lib/store";
import { pendingPosIntegrationQuoteRequests } from "@/lib/admin-notifications";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const requests = useStore((s) => s.posIntegrationQuoteRequests);
  const pendingCount = pendingPosIntegrationQuoteRequests(requests).length;

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
            <Link to="/admin/jobs" className="iz-chip !text-[11px]">
              Job postings
            </Link>
            <Link to="/admin/subscriptions" className="iz-chip relative !text-[11px]">
              Subscriptions
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--iz-red)] px-0.5 text-[8px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
            <AdminNotificationBell />
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
