import { createFileRoute } from "@tanstack/react-router";
import { SpecialServiceSection } from "@/components/agency/SpecialServiceSection";
import { IzCard, IzPageTitle } from "@/components/iz/ui";
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
          <IzPageTitle>Access restricted</IzPageTitle>
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
        <IzPageTitle>Job posting</IzPageTitle>
        <p className="iz-tiny iz-muted mt-0.5">{agencyOwner.orgName} · book services for PRs & outlets</p>
      </header>

      <SpecialServiceSection canBook={agencyCan(agencySubRole, "raisePv")} />
    </div>
  );
}
