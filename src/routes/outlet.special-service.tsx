import { createFileRoute } from "@tanstack/react-router";
import { SpecialServicePortalSection } from "@/components/special-service/SpecialServicePortalSection";
import { IzCard } from "@/components/iz/ui";
import { outletCan } from "@/lib/outlet-rbac";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/outlet/special-service")({
  component: OutletSpecialService,
});

function OutletSpecialService() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const outletName = useStore((s) => s.outletWorkspace.outletName);

  if (!outletCan(outletSubRole, "orderSpecialService")) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">Your outlet role cannot access job postings.</p>
        </IzCard>
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Job Posting</h2>
        <p className="iz-tiny iz-muted mt-0.5">{outletName} · agency add-ons</p>
      </header>
      <SpecialServicePortalSection role="outlet" />
    </div>
  );
}
