import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  AGENCY_SUBSCRIPTION_PLANS,
  getAgencySubscriptionPlan,
  type AgencySubscriptionPlanId,
} from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";
import { Calendar, CreditCard, Receipt, Users } from "lucide-react";

const RENEWAL_DATE = "15 Jul 2026";
const CARD_LAST4 = "4242";

export const Route = createFileRoute("/agency/subscription")({
  component: AgencySubscription,
});

function AgencySubscription() {
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyCollections = useStore((s) => s.agencyCollections);
  const saveAgencyOwner = useStore((s) => s.saveAgencyOwner);
  const toast = useStore((s) => s.toast);
  const canEdit = agencyCan(agencySubRole, "editSettings");

  const currentPlan = getAgencySubscriptionPlan(agencyOwner.subscriptionPlanId);
  const prCount = agencyPRs.length;

  const billingHistory = useMemo(
    () =>
      agencyCollections.filter(
        (c) =>
          c.kind === "agency" &&
          c.lines.some((line) => line.label.toLowerCase().includes("subscription")),
      ),
    [agencyCollections],
  );

  const selectPlan = (planId: AgencySubscriptionPlanId) => {
    if (!canEdit || planId === currentPlan.id) return;
    const next = getAgencySubscriptionPlan(planId);
    if (prCount > next.prLimit) {
      toast(
        `You have ${prCount} PRs on roster — remove ${prCount - next.prLimit} before downgrading to ${next.label}`,
        "warn",
      );
      return;
    }
    saveAgencyOwner({ subscriptionPlanId: planId });
    toast(`Switched to ${next.label} · ${formatRM(next.monthlyRm)}/mo · up to ${next.prLimit} PRs`, "success");
  };

  if (!agencyCan(agencySubRole, "viewSettings")) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">You do not have access to subscription billing.</p>
        </IzCard>
      </div>
    );
  }

  const isFinanceReadOnly = agencySubRole === "agency_finance";

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Subscription</h2>
        <p className="iz-tiny iz-muted mt-0.5">{agencyOwner.orgName}</p>
        {isFinanceReadOnly && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Finance view — read-only · contact owner to change plan or card
          </p>
        )}
      </header>

      <IzSectionLabel>Plans · monthly</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">
        PR limit = max PRs you can roster · {prCount} PR{prCount === 1 ? "" : "s"} on roster now
      </p>
      <div className="space-y-2">
        {AGENCY_SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const atCapacity = prCount >= plan.prLimit;
          return (
            <IzCard
              key={plan.id}
              className={
                isCurrent
                  ? "border-[rgba(57,217,138,.35)] bg-[rgba(57,217,138,.06)]"
                  : undefined
              }
            >
              <div className="iz-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sora text-sm font-bold">{plan.label}</p>
                    {isCurrent && <IzPill variant="green">Current</IzPill>}
                    {atCapacity && !isCurrent && <IzPill variant="amber">At PR limit</IzPill>}
                  </div>
                  <p className="mt-1 text-lg font-bold text-[var(--iz-gold-l)]">
                    {formatRM(plan.monthlyRm)}
                    <span className="iz-tiny iz-muted font-normal"> / month</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-[var(--iz-txt)]">
                    <Users className="h-4 w-4 text-[var(--iz-gold)]" />
                    <span className="font-sora text-sm font-bold">Up to {plan.prLimit}</span>
                  </div>
                  <p className="iz-tiny iz-muted mt-0.5">PRs on roster</p>
                </div>
              </div>
              <p className="iz-tiny iz-muted mt-2">{plan.description}</p>
              {isCurrent ? (
                <p className="iz-tiny iz-muted2 mt-2">
                  Renewal {RENEWAL_DATE} · {prCount} / {plan.prLimit} PR slots used
                </p>
              ) : (
                canEdit && (
                  <button
                    type="button"
                    className="iz-btn iz-btn-soft mt-3 w-full"
                    onClick={() => selectPlan(plan.id)}
                  >
                    Switch to {plan.label}
                  </button>
                )
              )}
            </IzCard>
          );
        })}
      </div>

      <IzSectionLabel>Payment method</IzSectionLabel>
      <IzCard flat>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--iz-muted)]" />
          <div>
            <p className="iz-sm font-semibold">Visa ···· {CARD_LAST4}</p>
            <p className="iz-tiny iz-muted">
              Billed monthly · {formatRM(currentPlan.monthlyRm)} · auto-renew
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            className="iz-btn iz-btn-soft mt-3 w-full"
            onClick={() => toast("Card updated for subscription billing", "success")}
          >
            Update card
          </button>
        )}
      </IzCard>

      <div className="mt-1 flex items-center gap-2 iz-tiny iz-muted">
        <Calendar className="h-3.5 w-3.5" />
        Next renewal {RENEWAL_DATE}
      </div>

      <IzSectionLabel>Billing history</IzSectionLabel>
      <div className="space-y-2">
        {billingHistory.length === 0 ? (
          <IzCard flat>
            <p className="iz-tiny iz-muted text-center py-4">No subscription invoices yet.</p>
          </IzCard>
        ) : (
          billingHistory.map((inv) => (
            <IzCard key={inv.id} flat>
              <div className="iz-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
                  <div className="min-w-0">
                    <p className="iz-sm font-semibold truncate">{inv.lines[0]?.label ?? inv.id}</p>
                    <p className="iz-tiny iz-muted">
                      {inv.issueDate} · {inv.lines[0]?.detail}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="iz-sm font-bold">{formatRM(inv.amount)}</p>
                  <IzPill variant={inv.status === "SETTLED" ? "green" : "amber"} className="!mt-1">
                    {inv.status === "SETTLED" ? "Paid" : inv.status}
                  </IzPill>
                </div>
              </div>
            </IzCard>
          ))
        )}
      </div>
    </div>
  );
}
