import { createFileRoute } from "@tanstack/react-router";
import { AgencyCommissionRulesPanel } from "@/components/agency/AgencyCommissionRulesPanel";
import { IzCard } from "@/components/iz/ui";
import { agencyCan } from "@/lib/agency-rbac";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agency/commission-rules")({
  component: AgencyCommissionRules,
});

function AgencyCommissionRules() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyOwner = useStore((s) => s.agencyOwner);

  if (!agencyCan(agencySubRole, "viewSettings")) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">You do not have access to commission rules.</p>
        </IzCard>
      </div>
    );
  }

  const isFinanceReadOnly = agencySubRole === "agency_finance";

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Commission Rules</h2>
        <p className="iz-tiny iz-muted mt-0.5">{agencyOwner.orgName}</p>
        {isFinanceReadOnly && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Finance view — read-only
          </p>
        )}
      </header>

      <AgencyCommissionRulesPanel />
    </div>
  );
}
