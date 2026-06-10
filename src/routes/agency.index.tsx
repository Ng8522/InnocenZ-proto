import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { AgencyHomeTiles } from "@/components/agency/AgencyHomeTiles";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { DEFAULT_TIED_AGENCY_ID, pvNeedsPrReview } from "@/lib/pr-demo";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronRight,
  Receipt,
  Settings,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

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
  const outletSwapCount = useStore((s) => s.agencyRoster.filter((r) => r.outletSwap?.status === "pending_pr").length);
  const prSwapCount = useStore((s) => s.prSwapRequests.filter((r) => r.status === "pending_agency").length);
  const swapCount = outletSwapCount + prSwapCount;
  const onDuty = useStore((s) => s.agencyRoster.filter((r) => r.status === "on-duty").length);
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const pendingCollections = useStore((s) => s.agencyCollections.filter((c) => c.status === "PENDING").length);
  const { date, time } = nowAgencyDateTime();
  const isFinance = agencySubRole === "agency_finance";

  const cards: {
    to: string;
    title: string;
    desc: string;
    badge?: string;
    icon: typeof UserCheck;
    permission: Parameters<typeof agencyCan>[1];
  }[] = [
    {
      to: "/agency/pending",
      title: "Approve PR sign-ups",
      desc: "IC, comcard & portfolio before shifts unlock",
      badge: pendingTotal ? `${pendingTotal} pending` : undefined,
      icon: UserCheck,
      permission: "approvePrSignups",
    },
    {
      to: "/agency/pv",
      title: "Payment vouchers",
      desc: "Raise PVs · dual-sign · PDF export",
      badge: disputed ? `${disputed} dispute` : prPaymentVouchers.some((p) => pvNeedsPrReview(p.status)) ? "Action" : undefined,
      icon: Receipt,
      permission: "viewPv",
    },
    {
      to: "/agency/reports",
      title: "Payroll & analytics",
      desc: "PNL by outlet · date filters · live vs sealed",
      icon: BarChart3,
      permission: "viewAnalytics",
    },
    {
      to: "/agency/roster",
      title: "Schedule & roster",
      desc: "Assign shifts · swap outlets · edit slots",
      badge: swapCount ? `${swapCount} swap` : undefined,
      icon: Calendar,
      permission: "assignShifts",
    },
    {
      to: "/agency/prs",
      title: "Manage PR",
      desc: `${agencyPRs.length} on roster · KPI · tier`,
      icon: Users,
      permission: "managePr",
    },
    {
      to: "/agency/profile",
      title: "Agency settings",
      desc: isFinance ? "Read-only · commission & finance head" : "Owner profile · finance head · commission",
      icon: Settings,
      permission: "viewSettings",
    },
    {
      to: "/agency/pv",
      title: "Collections",
      desc: "Outlet invoices · aging · payment reminders",
      badge: pendingCollections ? `${pendingCollections} due` : undefined,
      icon: Wallet,
      permission: "viewCollections",
    },
  ].filter((c) => agencyCan(agencySubRole, c.permission));

  return (
    <div className="iz-screen">
      <AppTopbar />

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

      <OutletSection title="Modules" hint={`${cards.length} available`} className="!mt-4">
        <div className="space-y-2">
          {cards.map((c) => (
            <Link
              key={c.to + c.title}
              to={c.to}
              className="flex items-center gap-3 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-grad-card)] px-3.5 py-3 transition-opacity hover:opacity-90"
            >
              <span className="iz-iconbox !h-9 !w-9">
                <c.icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <div className="font-sora text-sm font-bold">{c.title}</div>
                <div className="iz-tiny iz-muted2 mt-0.5 line-clamp-2">{c.desc}</div>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {c.badge && (
                  <IzPill variant="amber" className="shrink-0 !py-0.5 !text-[9px]">
                    {c.badge}
                  </IzPill>
                )}
                <ChevronRight className="h-4 w-4 text-[var(--iz-muted)]" />
              </span>
            </Link>
          ))}
        </div>
      </OutletSection>

      <AgencyHomeTiles />
    </div>
  );
}
