import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime, OUTLET_NAMES } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { shouldShowWeeklyReconciliation } from "@/lib/reconciliation-weekly";
import { AlertTriangle } from "lucide-react";
import { AiSuggestionsPanel } from "@/components/portal/AiSuggestionsPanel";
import { AgencyHomeHubTabs } from "@/components/portal/AgencyHomeHubTabs";
import { IzCard, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/")({
  component: AgencyHub,
});

function AgencyHub() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const syncReconciliationFromLedger = useStore((s) => s.syncReconciliationFromLedger);
  const pendingPayoutTotal = useStore((s) =>
    s.agencyCollections.filter((c) => c.status === "PENDING").reduce((sum, c) => sum + c.amount, 0),
  );
  const totalPrs = agencyPRs.filter((p) => !p.detached).length;
  const totalOutlets = OUTLET_NAMES.length;
  const { date, time } = nowAgencyDateTime();
  const isFinance = agencySubRole === "agency_finance";
  const showWorkforce = agencyCan(agencySubRole, "viewWorkforce");

  useEffect(() => {
    syncReconciliationFromLedger();
  }, [syncReconciliationFromLedger]);

  const showWeeklyReconciliation =
    shouldShowWeeklyReconciliation(reconciliation) &&
    !reconciliation.agencyConfirmed &&
    agencyCan(agencySubRole, "confirmReconciliation");

  return (
    <div className="iz-screen iz-portal-page">

      <div className="iz-portal-kpi-grid iz-portal-desktop-only">
        <div className="iz-portal-kpi">
          <div className="l">Total PR</div>
          <div className="n">{totalPrs}</div>
        </div>
        <div className="iz-portal-kpi">
          <div className="l">Total outlets</div>
          <div className="n">{totalOutlets}</div>
        </div>
        <div className="iz-portal-kpi">
          <div className="l">Pending payouts</div>
          <div className="n text-[var(--iz-gold-l)]">{formatRM(pendingPayoutTotal)}</div>
        </div>
      </div>

      <div className="iz-portal-home-grid">
        <div className="iz-portal-home-main">
      <header className="pt-1">
        <p className="iz-tiny iz-muted2 uppercase tracking-widest">Today</p>
        <p className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">
          {date} · {time}
        </p>
        {isFinance && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Read-only overview — payroll, PV &amp; collections only
          </p>
        )}
      </header>

      <AgencyHomeHubTabs agencySubRole={agencySubRole} />

      {showWeeklyReconciliation && (
        <IzCard flat className="mt-3 border-[rgba(232,194,122,.4)] bg-[rgba(232,194,122,.06)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
            <div className="min-w-0 flex-1">
              <p className="iz-sm font-bold">Confirm weekly reconciliation</p>
              <p className="iz-tiny iz-muted mt-0.5">
                {reconciliation.dateLabel} · PR earnings {formatRM(reconciliation.prIncomeTotal ?? 0)} vs PV{" "}
                {formatRM(reconciliation.pvTotal)}
                {(reconciliation.prVariance ?? 0) !== 0 && (
                  <span className="text-[var(--iz-amber)]">
                    {" "}
                    · variance {formatRM(reconciliation.prVariance ?? 0)}
                  </span>
                )}
              </p>
              <p className="iz-tiny iz-muted2 mt-1">
                Agency–PR weekly reconcile · confirm in Payroll → Reconcile
              </p>
              <Link to="/agency/pv" className="iz-tiny mt-1 inline-block text-[var(--iz-gold-l)]">
                Review in Payroll →
              </Link>
              <button
                type="button"
                className="iz-btn iz-btn-primary mt-2 w-full !py-2 !text-xs"
                onClick={() => confirmAgencyReconciliation()}
              >
                Confirm reconciliation
              </button>
            </div>
          </div>
        </IzCard>
      )}
        </div>

        {showWorkforce && !isFinance && (
          <aside className="iz-portal-home-aside iz-portal-desktop-only">
            <AiSuggestionsPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
