import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { ChevronRight } from "lucide-react";
import { IzCard, IzPill } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/")({
  component: AgencyHub,
});

function AgencyHub() {
  const pending = useStore((s) => s.pendingPRs.filter((p) => p.status === "pending").length);
  const pvs = useStore((s) => s.pvs);

  const cards = [
    { to: "/agency/pending", title: "Approve PR sign-ups", desc: "Module 1 · IC & PDA review", badge: pending ? `${pending} pending` : undefined },
    { to: "/agency/pv", title: "Payment vouchers", desc: "Module 7 · raise & track PVs", badge: pvs.some((p) => p.status === "sent") ? "Action" : undefined },
    { to: "/agency/reports", title: "Payroll & analytics", desc: "Module 6 · revenue & collections", badge: undefined },
  ];

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora text-[22px] font-extrabold text-[var(--iz-txt)]">Agency home</h2>
      <p className="iz-tiny iz-muted">Live roster · payroll · collections</p>

      <IzCard glow className="mt-4">
        <p className="iz-sm text-[var(--iz-txt)]">
          Owner / Finance sub-roles · Agency approves PR onboarding before shifts unlock.
        </p>
      </IzCard>

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
