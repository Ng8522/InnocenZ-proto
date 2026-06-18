import { createFileRoute } from "@tanstack/react-router";
import { SpecialServiceSection } from "@/components/agency/SpecialServiceSection";
import { IzCard } from "@/components/iz/ui";
import { agencyCan } from "@/lib/agency-rbac";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agency/special-service")({
  component: AgencySpecialService,
});

function AgencySpecialService() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyOwner = useStore((s) => s.agencyOwner);

  if (!agencyCan(agencySubRole, "viewPv")) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">You do not have access to job postings.</p>
        </IzCard>
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Job Posting</h2>
        <p className="iz-tiny iz-muted mt-0.5">{agencyOwner.orgName} · review & fulfil orders</p>
      </header>

      <SpecialServiceSection canBook={agencyCan(agencySubRole, "raisePv")} />
    </div>
  );
}
