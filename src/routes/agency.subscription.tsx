import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  AGENCY_SUBSCRIPTION_PLANS,
  agencyActivePrCount,
  agencyExpectedMonthlyPvFromPrCount,
  agencyMonthlyPvCount,
  getAgencySubscriptionPlan,
  resolveAgencySubscriptionPlanForMonthlyPv,
  type AgencySubscriptionPlanId,
} from "@/lib/agency-demo";
import { getAgencyManagedPvs } from "@/lib/agency-payroll";
import { agencyCan } from "@/lib/agency-rbac";
import { OutletSection } from "@/components/outlet/OutletSection";
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
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const agencyCollections = useStore((s) => s.agencyCollections);
  const saveAgencyOwner = useStore((s) => s.saveAgencyOwner);
  const toast = useStore((s) => s.toast);
  const canEdit = agencyCan(agencySubRole, "editSettings");

  const currentPlan = getAgencySubscriptionPlan(agencyOwner.subscriptionPlanId);
  const activePrCount = agencyActivePrCount(agencyPRs);
  const expectedMonthlyPv = agencyExpectedMonthlyPvFromPrCount(activePrCount);
  const rosterFitPlan = resolveAgencySubscriptionPlanForMonthlyPv(expectedMonthlyPv);
  const issuedMonthlyPv = useMemo(
    () => agencyMonthlyPvCount(getAgencyManagedPvs(prPaymentVouchers, agencyPRs), agencyPRs),
    [prPaymentVouchers, agencyPRs],
  );

  useEffect(() => {
    if (agencyOwner.subscriptionPlanId !== rosterFitPlan.id) {
      saveAgencyOwner({ subscriptionPlanId: rosterFitPlan.id });
    }
  }, [agencyOwner.subscriptionPlanId, rosterFitPlan.id, saveAgencyOwner]);

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
    if (next.renegotiate) {
      toast("Contact InnocenZ admin to negotiate pricing for 201+ PV/mo", "info");
      return;
    }
    if (expectedMonthlyPv > next.pvLimit) {
      toast(
        `Your roster needs ~${expectedMonthlyPv} PV/mo (${activePrCount} PRs × 1 PV/week) — choose a plan with at least ${expectedMonthlyPv} PV/mo before switching to ${next.label}`,
        "warn",
      );
      return;
    }
    saveAgencyOwner({ subscriptionPlanId: planId });
    const price = next.monthlyRm != null ? `${formatRM(next.monthlyRm)}/mo` : next.priceLabel ?? "Renegotiate Price";
    toast(`Switched to ${next.label} · ${price} · ${next.capacityLabel}`, "success");
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
        1 PV per active PR per week (~{expectedMonthlyPv} PV/mo) · {activePrCount} PR
        {activePrCount === 1 ? "" : "s"} on roster · {issuedMonthlyPv} PV
        {issuedMonthlyPv === 1 ? "" : "s"} issued this month
        {currentPlan.id !== rosterFitPlan.id ? (
          <>
            {" "}
            · roster fits <b className="text-[var(--iz-gold-l)]">{rosterFitPlan.label}</b>
          </>
        ) : null}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {AGENCY_SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const isRosterFit = plan.id === rosterFitPlan.id;
          const priceDisplay =
            plan.priceLabel ?? (plan.monthlyRm != null ? formatRM(plan.monthlyRm) : "Renegotiate Price");
          return (
            <IzCard
              key={plan.id}
              className={
                isCurrent
                  ? "border-[rgba(57,217,138,.35)] bg-[rgba(57,217,138,.06)]"
                  : undefined
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sora text-sm font-bold">{plan.label}</p>
                    {isCurrent && <IzPill variant="green">Current</IzPill>}
                    {isRosterFit && !isCurrent && <IzPill variant="ink">Roster fit</IzPill>}
                  </div>
                  <p className="mt-1 text-lg font-bold text-[var(--iz-gold-l)]">
                    {priceDisplay}
                    {!plan.priceLabel && plan.monthlyRm != null && (
                      <span className="iz-tiny iz-muted font-normal"> / month</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <div className="flex items-center gap-1.5 text-[var(--iz-txt)] sm:justify-end">
                    <Users className="h-4 w-4 text-[var(--iz-gold)]" />
                    <span className="font-sora text-sm font-bold">{plan.capacityLabel}</span>
                  </div>
                </div>
              </div>
              <p className="iz-tiny iz-muted mt-2">{plan.description}</p>
              {isCurrent ? (
                <p className="iz-tiny iz-muted2 mt-2">
                  Renewal {RENEWAL_DATE}
                  {plan.renegotiate
                    ? ` · ~${expectedMonthlyPv} PV/mo from roster`
                    : ` · ~${expectedMonthlyPv} / ${plan.capacityLabel} from roster`}
                </p>
              ) : (
                canEdit && (
                  <button
                    type="button"
                    className="iz-btn iz-btn-soft mt-3 w-full"
                    onClick={() => selectPlan(plan.id)}
                  >
                    {plan.renegotiate ? "Contact admin" : `Switch to ${plan.label}`}
                  </button>
                )
              )}
            </IzCard>
          );
        })}
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

      <OutletSection
        title="Payment method"
        hint={`Visa ···· ${CARD_LAST4} · renewal ${RENEWAL_DATE}`}
        collapsible
        defaultOpen={false}
        className="!mt-5"
      >
        <IzCard flat>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--iz-muted)]" />
            <div>
              <p className="iz-sm font-semibold">Visa ···· {CARD_LAST4}</p>
              <p className="iz-tiny iz-muted">
                Billed monthly ·{" "}
                {currentPlan.priceLabel ??
                  (currentPlan.monthlyRm != null ? formatRM(currentPlan.monthlyRm) : "Renegotiate Price")}{" "}
                · auto-renew
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

        <div className="mt-2 flex items-center gap-2 iz-tiny iz-muted">
          <Calendar className="h-3.5 w-3.5" />
          Next renewal {RENEWAL_DATE}
        </div>
      </OutletSection>
    </div>
  );
}
