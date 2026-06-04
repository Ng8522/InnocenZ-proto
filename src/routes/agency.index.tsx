import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { DEFAULT_TIED_AGENCY_ID, pvNeedsPrReview } from "@/lib/pr-demo";
import { ChevronRight, Store, Users } from "lucide-react";
import { IzCard, IzPill } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/")({
  component: AgencyHub,
});

function AgencyHub() {
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
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const { date, time } = nowAgencyDateTime();

  const quickActions = [
    { to: "/agency/history", icon: Store, title: "History", desc: "Outlet view · date · PR · payout · drinks · tips" },
    { to: "/agency/roster", icon: Users, title: "Workforce", desc: "Live today · planning est. cost" },
  ];

  const cards = [
    {
      to: "/agency/pending",
      title: "Approve PR sign-ups",
      desc: "Module 1 · sign-ups + freelancer payroll",
      badge: pendingTotal ? `${pendingTotal} pending` : undefined,
    },
    { to: "/agency/pv", title: "Payment vouchers", desc: "Module 7 · raise & track PVs · PDF only", badge: disputed ? `${disputed} dispute` : prPaymentVouchers.some((p) => pvNeedsPrReview(p.status)) ? "Action" : undefined },
    { to: "/agency/reports", title: "Payroll & analytics", desc: "Module 6 · PNL · outlet payment filters", badge: undefined },
    { to: "/agency/roster", title: "Schedule & roster", desc: "Module 2 · live floor · shifts · swap · edit", badge: swapCount ? `${swapCount} swap` : undefined },
    { to: "/agency/prs", title: "Manage PR", desc: "Filter age · language · race · KPI · 培养", badge: undefined },
    { to: "/agency/profile", title: "Agency settings", desc: "Owner info · OTP · commission rules", badge: undefined },
  ];

  return (
    <div className="iz-screen">
      <AppTopbar showDateTime />
      <h2 className="font-sora text-[22px] font-extrabold text-[var(--iz-txt)]">Agency home</h2>
      <p className="iz-tiny iz-muted">
        {date} · {time} · Live roster · payroll · collections
      </p>

      <IzCard glow className="mt-4">
        <p className="iz-sm text-[var(--iz-txt)]">
          Owner / Finance sub-roles · Agency approves PR onboarding before shifts unlock.
        </p>
      </IzCard>

      <p className="iz-sect-label mt-4">Quick actions</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((a) => (
          <Link key={a.to} to={a.to} className="block">
            <IzCard className="!mb-0 h-full">
              <a.icon className="h-4 w-4 text-[var(--iz-gold)]" />
              <div className="font-sora mt-2 text-xs font-bold">{a.title}</div>
              <div className="iz-tiny iz-muted2 mt-0.5 leading-snug">{a.desc}</div>
            </IzCard>
          </Link>
        ))}
      </div>

      {cards.map((c) => (
        <Link key={c.to} to={c.to} className="block">
          <IzCard className="flex items-center justify-between !mb-3">
            <div>
              <div className="font-sora text-sm font-bold text-[var(--iz-txt)]">{c.title}</div>
              <div className="iz-tiny iz-muted mt-1">{c.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              {c.badge && <IzPill variant="violet">{c.badge}</IzPill>}
              <ChevronRight className="h-4 w-4 text-[var(--iz-muted)]" />
            </div>
          </IzCard>
        </Link>
      ))}

    </div>
  );
}
