import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  getOutletSubscriptionPlan,
  OUTLET_SUBSCRIPTION_BILLING,
  OUTLET_SUBSCRIPTION_PLANS,
  type OutletSubscriptionPlanId,
} from "@/lib/outlet-demo";
import { outletCan } from "@/lib/outlet-rbac";
import { outletMatches, tonightShiftOutletName } from "@/lib/portal-sync";
import { OutletSection } from "@/components/outlet/OutletSection";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";
import { Calendar, CalendarDays, CreditCard, Receipt } from "lucide-react";

const RENEWAL_DATE = "15 Jul 2026";

export const Route = createFileRoute("/outlet/subscription")({
  component: OutletSubscriptionPage,
});

function OutletSubscriptionPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletOwner = useStore((s) => s.outletOwner);
  const shifts = useStore((s) => s.shifts);
  const paymentCardLast4 = useStore((s) => s.paymentCardLast4);
  const saveOutletOwner = useStore((s) => s.saveOutletOwner);
  const updateOutletPaymentCard = useStore((s) => s.updateOutletPaymentCard);
  const toast = useStore((s) => s.toast);
  const canEdit = outletCan(outletSubRole, "editSettings");

  const outletName = tonightShiftOutletName(shifts);
  const currentPlan = getOutletSubscriptionPlan(outletOwner.subscriptionPlanId);

  const shiftsThisMonth = useMemo(
    () => shifts.filter((s) => outletMatches(s.outletName, outletName)).length,
    [shifts, outletName],
  );

  const billingHistory = OUTLET_SUBSCRIPTION_BILLING;

  const selectPlan = (planId: OutletSubscriptionPlanId) => {
    if (!canEdit || planId === currentPlan.id) return;
    const next = getOutletSubscriptionPlan(planId);
    if (shiftsThisMonth > next.shiftLimit) {
      toast(
        `You have ${shiftsThisMonth} shifts posted — reduce to ${next.shiftLimit} before downgrading to ${next.label}`,
        "warn",
      );
      return;
    }
    saveOutletOwner({ subscriptionPlanId: planId });
    toast(`Switched to ${next.label} · ${formatRM(next.monthlyRm)}/mo · ${next.capacityLabel}`, "success");
  };

  if (!outletCan(outletSubRole, "viewSettings")) {
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

  const isFinanceReadOnly = outletSubRole === "outlet_finance";

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Subscription</h2>
        <p className="iz-tiny iz-muted mt-0.5">{outletOwner.orgName}</p>
        {isFinanceReadOnly && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Finance view — read-only · contact owner to change plan or card
          </p>
        )}
      </header>

      <IzSectionLabel>Plans · monthly</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">
        Shift limit = max shifts you can post per month · {shiftsThisMonth} shift
        {shiftsThisMonth === 1 ? "" : "s"} posted now
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OUTLET_SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const atCapacity = shiftsThisMonth >= plan.shiftLimit;
          return (
            <IzCard
              key={plan.id}
              className={
                isCurrent ? "border-[rgba(57,217,138,.35)] bg-[rgba(57,217,138,.06)]" : undefined
              }
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-sora text-sm font-bold">{plan.label}</p>
                    {isCurrent && <IzPill variant="green">Current</IzPill>}
                    {atCapacity && !isCurrent && <IzPill variant="amber">At shift limit</IzPill>}
                  </div>
                  <p className="mt-1 text-lg font-bold text-[var(--iz-gold-l)]">
                    {formatRM(plan.monthlyRm)}
                    <span className="iz-tiny iz-muted font-normal"> / month</span>
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <div className="flex items-center gap-1.5 text-[var(--iz-txt)] sm:justify-end">
                    <CalendarDays className="h-4 w-4 text-[var(--iz-gold)]" />
                    <span className="font-sora text-sm font-bold">{plan.capacityLabel}</span>
                  </div>
                  <p className="iz-tiny iz-muted mt-0.5">per outlet</p>
                </div>
              </div>
              <p className="iz-tiny iz-muted mt-2">{plan.description}</p>
              {isCurrent ? (
                <p className="iz-tiny iz-muted2 mt-2">
                  Renewal {RENEWAL_DATE}
                  {plan.id === "enterprise"
                    ? ` · ${shiftsThisMonth} shifts posted`
                    : ` · ${shiftsThisMonth} / ${plan.shiftLimit} shift slots used`}
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

      <IzSectionLabel>Billing history</IzSectionLabel>
      <div className="space-y-2">
        {billingHistory.length === 0 ? (
          <IzCard flat>
            <p className="iz-tiny iz-muted py-4 text-center">No subscription invoices yet.</p>
          </IzCard>
        ) : (
          billingHistory.map((inv) => (
            <IzCard key={inv.id} flat>
              <div className="iz-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
                  <div className="min-w-0">
                    <p className="iz-sm truncate font-semibold">InnocenZ Outlet · {currentPlan.label}</p>
                    <p className="iz-tiny iz-muted">
                      {inv.issueDate} · {inv.detail}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
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
        hint={`Visa ···· ${paymentCardLast4} · renewal ${RENEWAL_DATE}`}
        collapsible
        defaultOpen={false}
        className="!mt-5"
      >
        <IzCard flat>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--iz-muted)]" />
            <div>
              <p className="iz-sm font-semibold">Visa ···· {paymentCardLast4}</p>
              <p className="iz-tiny iz-muted">
                Billed monthly · {formatRM(currentPlan.monthlyRm)} · auto-pay enabled
              </p>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              className="iz-btn iz-btn-soft mt-3 w-full"
              onClick={() => updateOutletPaymentCard(String(Math.floor(1000 + Math.random() * 9000)))}
            >
              Update card
            </button>
          )}
        </IzCard>

        <div className="iz-tiny iz-muted mt-2 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Next renewal {RENEWAL_DATE}
        </div>
      </OutletSection>
    </div>
  );
}
