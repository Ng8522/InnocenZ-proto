import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
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
  Store,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";
import { formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/")({
  component: AgencyHub,
});

function AgencyHub() {
  const agencySubRole = useStore((s) => s.agencySubRole);
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
  const swapCount = useStore((s) => s.agencyRoster.filter((r) => r.outletSwap?.status === "pending_pr").length);
  const onDuty = useStore((s) => s.agencyRoster.filter((r) => r.status === "on-duty").length);
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const pendingCollections = useStore((s) => s.agencyCollections.filter((c) => c.status === "PENDING").length);
  const { date, time } = nowAgencyDateTime();
  const isFinance = agencySubRole === "agency_finance";

  const quickActions = [
    {
      to: "/agency/history",
      icon: Store,
      title: "History",
      desc: "Outlet shifts · payouts · drinks & tips",
      permission: "viewHistory" as const,
    },
    {
      to: "/agency/roster",
      icon: Users,
      title: "Workforce",
      desc: "Live floor today · planning & est. cost",
      permission: "viewWorkforce" as const,
    },
  ].filter((a) => agencyCan(agencySubRole, a.permission));

  const cards: {
    to: string;
    title: string;
    desc: string;
    badge?: string;
    icon: typeof UserCheck;
    iconTone?: "gold" | "violet" | "green";
    permission: Parameters<typeof agencyCan>[1];
  }[] = [
    {
      to: "/agency/pending",
      title: "Approve PR sign-ups",
      desc: "Review IC, comcard & portfolio before shifts unlock",
      badge: pendingTotal ? `${pendingTotal} pending` : undefined,
      icon: UserCheck,
      iconTone: "gold",
      permission: "approvePrSignups",
    },
    {
      to: "/agency/pv",
      title: "Payment vouchers",
      desc: "Raise PVs · dual-sign · PDF export",
      badge: disputed ? `${disputed} dispute` : prPaymentVouchers.some((p) => pvNeedsPrReview(p.status)) ? "Action" : undefined,
      icon: Receipt,
      iconTone: "violet",
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
      desc: "Owner profile · finance head · commission rules",
      icon: Settings,
      permission: "viewSettings",
    },
    {
      to: "/agency/pv",
      title: "Collections",
      desc: "Outlet invoices · aging · payment reminders",
      badge: pendingCollections ? `${pendingCollections} due` : undefined,
      icon: Wallet,
      iconTone: "green",
      permission: "viewCollections",
    },
  ].filter((c) => agencyCan(agencySubRole, c.permission));

  return (
    <div className="iz-screen">
      <AppTopbar />

      <div className="iz-hub-hero">
        <h2>Agency home</h2>
        <p className="iz-hub-hero-sub">
          {date} · {time}
          <br />
          Owner / Finance sub-roles · approve onboarding before shifts unlock
        </p>
        <div className="iz-hub-stats">
          <div className="iz-hub-stat">
            <div className={`n${pendingTotal ? " accent" : ""}`}>{pendingTotal}</div>
            <div className="l">Pending</div>
          </div>
          <div className="iz-hub-stat">
            <div className="n">{onDuty}</div>
            <div className="l">On duty</div>
          </div>
          <div className="iz-hub-stat">
            <div className={`n${disputed ? " warn" : ""}`}>{disputed || pendingCollections}</div>
            <div className="l">{disputed ? "Disputes" : "Collections"}</div>
          </div>
        </div>
      </div>

      {isFinance && (
        <p className="iz-tiny iz-muted mt-3 px-0.5">
          Finance view — payroll, PV, collections &amp; analytics only. No assign or PR management.
        </p>
      )}

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

      {quickActions.length > 0 && (
        <>
          <IzSectionLabel className="!mt-5">Quick actions</IzSectionLabel>
          <div className="iz-hub-quick">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className="iz-hub-quick-card">
                <span className="icon">
                  <a.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="title">{a.title}</div>
                <div className="desc">{a.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <IzSectionLabel>Modules</IzSectionLabel>
      {cards.map((c) => (
        <Link key={c.to + c.title} to={c.to} className="iz-hub-nav-card">
          <span className="left">
            <span className={`icon${c.iconTone ? ` ${c.iconTone}` : ""}`}>
              <c.icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <div className="title">{c.title}</div>
              <div className="desc">{c.desc}</div>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {c.badge && <IzPill variant="violet">{c.badge}</IzPill>}
            <ChevronRight className="chev h-4 w-4" />
          </span>
        </Link>
      ))}
    </div>
  );
}
