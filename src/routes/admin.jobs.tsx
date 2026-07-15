import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SpecialServiceOrderCard } from "@/components/special-service/SpecialServiceOrderCard";
import { IzCard, IzPageTitle, IzSectionLabel } from "@/components/iz/ui";
import { IconGuide } from "@/components/iz/IconGuide";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import {
  agencyPostedSpecialServices,
  pendingSpecialServicesForAdmin,
} from "@/lib/special-service-actions";

export const Route = createFileRoute("/admin/jobs")({
  component: AdminJobPostings,
});

function AdminJobPostings() {
  const records = useStore((s) => s.specialServiceOrders);
  const approveOrder = useStore((s) => s.approveSpecialServiceByAdmin);
  const declineOrder = useStore((s) => s.declineSpecialServiceByAdmin);

  const pending = useMemo(() => pendingSpecialServicesForAdmin(records), [records]);
  const agencyPosted = useMemo(() => agencyPostedSpecialServices(records), [records]);
  const reviewed = useMemo(
    () => agencyPosted.filter((r) => r.adminAccepted !== "pending"),
    [agencyPosted],
  );

  return (
    <div className="iz-screen !px-0">
      <header>
        <IzPageTitle>Job postings</IzPageTitle>
        <p className="iz-tiny iz-muted mt-0.5">Review agency- and outlet-submitted jobs · accept or reject</p>
      </header>

      <IzSectionLabel>Pending review</IzSectionLabel>
      {pending.length === 0 ? (
        <IzCard flat className="text-center">
          <p className="iz-sm iz-muted py-4">No job postings awaiting review.</p>
        </IzCard>
      ) : (
        <div className="space-y-2">
          {pending.map((row) => (
            <SpecialServiceOrderCard
              key={row.id}
              row={row}
              role="admin"
              onApprove={approveOrder}
              onDecline={declineOrder}
            />
          ))}
        </div>
      )}

      <OutletSection
        title="Reviewed postings"
        hint={`${reviewed.length} record${reviewed.length !== 1 ? "s" : ""}`}
        collapsible
        defaultOpen={false}
        className="!mt-4"
      >
        {reviewed.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted py-4">No reviewed postings yet.</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {reviewed.map((row) => (
              <SpecialServiceOrderCard key={row.id} row={row} role="admin" />
            ))}
          </div>
        )}
      </OutletSection>

      <IconGuide className="mt-5" />
    </div>
  );
}
