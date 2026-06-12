import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import { useStore } from "@/lib/store";
import { getPrRosterId } from "@/lib/pr-demo";
import { prNotificationsForRecipient, type PrNotification } from "@/lib/pr-features";

export function PrNotificationBell() {
  const prSubRole = useStore((s) => s.prSubRole);
  const allNotifications = useStore((s) => s.prNotifications);
  const notifications = prNotificationsForRecipient(allNotifications, getPrRosterId(prSubRole));
  const markPrNotificationRead = useStore((s) => s.markPrNotificationRead);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;

  const openNotification = (n: PrNotification) => {
    markPrNotificationRead(n.id);
    setOpen(false);
    if (n.pvId) {
      void navigate({ to: "/host/history", search: { tab: "pv", pvId: n.pvId } as { tab: "pv"; pvId: string } });
      return;
    }
    if (n.href) void navigate({ to: n.href as "/host/profile" });
  };

  return (
    <>
      <button
        type="button"
        className="iz-topbar-action relative"
        title="Notifications"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
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
        <div className="iz-cardttl">Notifications</div>
        <p className="iz-tiny iz-muted mb-3">PV alerts, ratings, assignments, and SOS receipts.</p>
        {notifications.length === 0 ? (
          <p className="iz-sm iz-muted py-6 text-center">No notifications</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left${n.read ? "" : " opacity-100"}`}
                onClick={() => openNotification(n)}
              >
                <IzCard flat className={n.read ? "" : "border-[rgba(232,194,122,.35)]"}>
                  <div className="iz-between gap-2">
                    <span className="iz-sm font-bold">{n.title}</span>
                    {!n.read && <IzPill variant="amber">New</IzPill>}
                  </div>
                  <p className="iz-tiny iz-muted mt-1">{n.body}</p>
                  <p className="iz-tiny iz-muted2 mt-1">{n.at}</p>
                </IzCard>
              </button>
            ))}
          </div>
        )}
        <Link to="/host/history" search={{ tab: "shifts" }} className="iz-btn iz-btn-soft mt-3" onClick={() => setOpen(false)}>
          Open History
        </Link>
      </IzSheet>
    </>
  );
}
