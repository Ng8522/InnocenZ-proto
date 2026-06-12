import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { AgencyHomeTiles } from "@/components/agency/AgencyHomeTiles";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { DEFAULT_TIED_AGENCY_ID } from "@/lib/pr-demo";
import { AlertTriangle } from "lucide-react";
import { AiSuggestionsPanel } from "@/components/portal/AiSuggestionsPanel";
import { LiveWorkforceTable } from "@/components/portal/LiveWorkforceTable";
import { IzCard, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/")({
  component: AgencyHub,
});

function AgencyHub() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const pendingSignups = useStore((s) => s.pendingPRs.filter((p) => p.status === "pending").length);
  const pendingFreelancers = useStore(
    (s) =>
      s.pendingFreelancerPayrolls.filter(
        (p) => p.agencyId === DEFAULT_TIED_AGENCY_ID && p.status === "pending",
      ).length,
  );
  const pendingTotal = pendingSignups + pendingFreelancers;
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const onDuty = useStore((s) => s.agencyRoster.filter((r) => r.status === "on-duty").length);
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const pendingCollections = useStore((s) => s.agencyCollections.filter((c) => c.status === "PENDING").length);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const pendingPayoutTotal = useStore((s) =>
    s.agencyCollections.filter((c) => c.status === "PENDING").reduce((sum, c) => sum + c.amount, 0),
  );
  const activeDemand = agencyRoster.filter(
    (r) => r.status === "assignment-pending" || r.status === "scheduled",
  ).length;
  const noShowAlerts = agencyRoster.filter((r) => r.noShowFlag || r.lateFlag).length;
  const availablePrs = agencyPRs.filter((p) => !p.detached).length;
  const { date, time } = nowAgencyDateTime();
  const isFinance = agencySubRole === "agency_finance";
  const showWorkforce = agencyCan(agencySubRole, "viewWorkforce");

  return (
    <div className="iz-screen iz-portal-page">
      <AppTopbar />

      <div className="iz-portal-kpi-grid iz-portal-desktop-only">
        <div className="iz-portal-kpi">
          <div className="l">Available PR</div>
          <div className="n">{availablePrs}</div>
        </div>
        <div className="iz-portal-kpi">
          <div className="l">Active demand</div>
          <div className="n">{activeDemand}</div>
        </div>
        <div className="iz-portal-kpi">
          <div className="l">No-show alerts</div>
          <div className={`n${noShowAlerts ? " text-[var(--iz-violet)]" : ""}`}>
            {String(noShowAlerts).padStart(2, "0")}
          </div>
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
        <h2 className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">
          {agencyOwner.orgName}
        </h2>
        <p className="iz-tiny iz-muted mt-0.5">
          {date} · {time}
        </p>
        {isFinance && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Read-only overview — payroll, PV &amp; collections only
          </p>
        )}
      </header>

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Pending</div>
          <div className={`n${pendingTotal ? " text-[var(--iz-amber)]" : ""}`}>{pendingTotal}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">On duty</div>
          <div className="n text-[var(--iz-green)]">{onDuty}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">{disputed ? "Disputes" : "Due"}</div>
          <div className={`n${disputed ? " text-[var(--iz-red)]" : ""}`}>
            {disputed || pendingCollections}
          </div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">PRs</div>
          <div className="n">{agencyPRs.filter((p) => !p.detached).length}</div>
        </div>
      </div>

      {!reconciliation.agencyConfirmed && agencyCan(agencySubRole, "confirmReconciliation") && (
        <IzCard flat className="mt-3 border-[rgba(232,194,122,.4)] bg-[rgba(232,194,122,.06)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
            <div className="min-w-0 flex-1">
              <p className="iz-sm font-bold">Confirm today&apos;s reconciliation</p>
              <p className="iz-tiny iz-muted mt-0.5">
                {reconciliation.dateLabel} · Outlet sales {formatRM(reconciliation.outletSalesTotal)} vs PV{" "}
                {formatRM(reconciliation.pvTotal)}
                {reconciliation.variance !== 0 && (
                  <span className="text-[var(--iz-amber)]"> · variance {formatRM(reconciliation.variance)}</span>
                )}
              </p>
              <p className="iz-tiny iz-muted2 mt-1">
                Outlet {reconciliation.outletConfirmed ? "confirmed ✓" : "pending"} · Agency{" "}
                {reconciliation.agencyConfirmed ? "confirmed ✓" : "awaiting"}
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

      <AgencyHomeTiles />

      {showWorkforce && (
        <div className="iz-portal-desktop-only mt-4">
          <LiveWorkforceTable />
        </div>
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
