import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { ChevronRight } from "lucide-react";

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
    <div>
      <AppHeader subtitle="InnocenZ · PR Agency" title="Agency Portal" />
      <div className="space-y-3 px-5 pt-5">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
          Owner / Finance sub-roles · Agency approves PR onboarding before shifts unlock.
        </div>
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="flex items-center justify-between rounded-2xl bg-gradient-surface p-4 shadow-card"
          >
            <div>
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{c.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              {c.badge && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">{c.badge}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
