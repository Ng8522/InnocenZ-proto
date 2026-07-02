import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Plug } from "lucide-react";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import { useStore } from "@/lib/store";
import type { AdminNotification } from "@/lib/admin-notifications";

export function AdminNotificationBell() {
  const notifications = useStore((s) => s.adminNotifications);
  const markAdminNotificationRead = useStore((s) => s.markAdminNotificationRead);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unread = notifications.filter((n) => !n.read).length;

  const openNotification = (n: AdminNotification) => {
    markAdminNotificationRead(n.id);
    setOpen(false);
    if (n.href) {
      void navigate({ to: n.href });
    }
  };

  return (
    <>
      <button
        type="button"
        className="iz-topbar-action relative"
        title="Admin notifications"
        aria-label={`Admin notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--iz-red)] px-0.5 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <IzSheet open={open} onClose={() => setOpen(false)}>
        <div className="iz-cardttl">Admin alerts</div>
        <p className="iz-tiny iz-muted mb-3">
          Outlet pricing requests and ops items — tap to open.
        </p>
        {notifications.length === 0 ? (
          <p className="iz-sm iz-muted py-6 text-center">No notifications</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className="w-full text-left"
                onClick={() => openNotification(n)}
              >
                <IzCard
                  flat
                  className={
                    n.read ? "" : "border-[rgba(232,194,122,.35)] bg-[rgba(232,194,122,.04)]"
                  }
                >
                  <div className="iz-between gap-2">
                    <span className="iz-sm flex items-center gap-1.5 font-bold">
                      <Plug className="h-3.5 w-3.5 shrink-0 text-[var(--iz-violet-l)]" />
                      {n.title}
                    </span>
                    {!n.read && <IzPill variant="amber">New</IzPill>}
                  </div>
                  <p className="iz-tiny iz-muted mt-1">{n.body}</p>
                  <p className="iz-tiny iz-muted2 mt-1">{n.at}</p>
                </IzCard>
              </button>
            ))}
          </div>
        )}
        <Link
          to="/admin/subscriptions"
          className="iz-btn iz-btn-soft mt-3"
          onClick={() => setOpen(false)}
        >
          Open subscription requests
        </Link>
      </IzSheet>
    </>
  );
}
