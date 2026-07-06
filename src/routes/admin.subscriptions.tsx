import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Mail, Phone, Plug, User } from "lucide-react";
import { IzCard, IzPageTitle, IzPill, IzSectionLabel } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { pendingPosIntegrationQuoteRequests } from "@/lib/admin-notifications";
import { getOutletSubscriptionPlan } from "@/lib/outlet-demo";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
});

function AdminSubscriptions() {
  const requests = useStore((s) => s.posIntegrationQuoteRequests);
  const markPosIntegrationQuoteContacted = useStore((s) => s.markPosIntegrationQuoteContacted);
  const markAdminNotificationRead = useStore((s) => s.markAdminNotificationRead);
  const adminNotifications = useStore((s) => s.adminNotifications);

  const pending = useMemo(() => pendingPosIntegrationQuoteRequests(requests), [requests]);
  const contacted = useMemo(() => requests.filter((r) => r.status === "contacted"), [requests]);

  const markContacted = (requestId: string) => {
    markPosIntegrationQuoteContacted(requestId);
    const note = adminNotifications.find((n) => n.requestId === requestId);
    if (note && !note.read) {
      markAdminNotificationRead(note.id);
    }
  };

  return (
    <div className="iz-screen !px-0">
      <header>
        <IzPageTitle>Subscription requests</IzPageTitle>
        <p className="iz-tiny iz-muted mt-0.5">
          Outlet POS integration quotes — contact outlet to negotiate pricing
        </p>
      </header>

      <IzSectionLabel>Pending · POS integration</IzSectionLabel>
      {pending.length === 0 ? (
        <IzCard flat className="text-center">
          <p className="iz-sm iz-muted py-4">No POS pricing requests awaiting contact.</p>
        </IzCard>
      ) : (
        <div className="space-y-2">
          {pending.map((req) => {
            const plan = getOutletSubscriptionPlan(req.currentPlanId);
            return (
              <IzCard
                key={req.id}
                className="border-[rgba(139,92,246,.25)] bg-[rgba(139,92,246,.05)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Plug className="h-4 w-4 text-[var(--iz-violet-l)]" />
                      <p className="font-sora text-sm font-bold">{req.outlet}</p>
                      <IzPill variant="amber">New request</IzPill>
                    </div>
                    <p className="iz-tiny iz-muted mt-1">
                      Current plan · {plan.label} · requested {req.at}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="iz-btn iz-btn-soft shrink-0"
                    onClick={() => markContacted(req.id)}
                  >
                    Mark contacted
                  </button>
                </div>

                <div className="mt-3 grid gap-2 border-t border-[var(--iz-line)] pt-3 sm:grid-cols-3">
                  <p className="iz-tiny iz-muted flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {req.ownerName}
                  </p>
                  <p className="iz-tiny iz-muted flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {req.email}
                  </p>
                  <p className="iz-tiny iz-muted flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {req.mobile}
                  </p>
                </div>
              </IzCard>
            );
          })}
        </div>
      )}

      <OutletSection
        title="Contacted"
        hint={`${contacted.length} record${contacted.length !== 1 ? "s" : ""}`}
        collapsible
        defaultOpen={false}
        className="!mt-4"
      >
        {contacted.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted py-4">No contacted requests yet.</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {contacted.map((req) => (
              <IzCard key={req.id} flat>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="iz-sm font-semibold">{req.outlet}</p>
                    <p className="iz-tiny iz-muted">
                      {req.ownerName} · {req.email} · {req.at}
                    </p>
                  </div>
                  <IzPill variant="green">Contacted</IzPill>
                </div>
              </IzCard>
            ))}
          </div>
        )}
      </OutletSection>
    </div>
  );
}
