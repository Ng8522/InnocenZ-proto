import { Building2, Check, Clock, Star } from "lucide-react";
import {
  DEFAULT_TIED_AGENCY_ID,
  FREELANCER_DEMO_PR_ID,
  PR_AGENCIES,
  getPrAgencyById,
  type PrAgency,
} from "@/lib/pr-demo";
import { useStore } from "@/lib/store";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";

function AgencyRow({
  agency,
  selected,
  pending,
  onSelect,
  readOnly,
}: {
  agency: PrAgency;
  selected: boolean;
  pending?: boolean;
  onSelect?: () => void;
  readOnly?: boolean;
}) {
  const rowClass = [
    "iz-agency-row w-full text-left",
    selected && "iz-agency-row--selected",
    pending && !selected && "iz-agency-row--pending",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div className="iz-agency-row__av" style={{ background: agency.gradient }}>
        {agency.initials}
      </div>
      <div className="iz-agency-row__body min-w-0 flex-1">
        <div className="font-sora text-[14px] font-bold text-[var(--iz-txt)]">{agency.name}</div>
        <div className="iz-tiny iz-muted mt-0.5">
          {agency.city} · {agency.tagline}
        </div>
        <div className="iz-tiny iz-muted2 mt-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-[var(--iz-gold-l)] text-[var(--iz-gold-l)]" />
            {agency.rating.toFixed(1)}
          </span>
          <span>{agency.activePrs} active PRs</span>
          <span>Finance · {agency.financeHead}</span>
        </div>
        {pending && !selected && (
          <p className="iz-tiny mt-1.5 flex items-center gap-1 text-[var(--iz-amber)]">
            <Clock className="h-3 w-3" />
            Awaiting agency payroll approval
          </p>
        )}
      </div>
      <div
        className={`iz-agency-row__check ${selected ? "iz-agency-row__check--on" : ""}${pending && !selected ? " iz-agency-row__check--pending" : ""}`}
        aria-hidden
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        {pending && !selected && <Clock className="h-3.5 w-3.5" strokeWidth={2} />}
      </div>
    </>
  );

  if (readOnly) {
    return <div className="iz-agency-row iz-agency-row--selected w-full">{inner}</div>;
  }

  return (
    <button type="button" className={rowClass} onClick={onSelect} aria-pressed={selected || pending}>
      {inner}
    </button>
  );
}

export function FreelancerAgencyPicker({ tied }: { tied?: boolean }) {
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const pendingFreelancerPayrolls = useStore((s) => s.pendingFreelancerPayrolls);
  const setPrPayrollAgency = useStore((s) => s.setPrPayrollAgency);

  const effectiveId = tied ? DEFAULT_TIED_AGENCY_ID : prPayrollAgencyId;
  const selected = getPrAgencyById(effectiveId);

  const pendingForPr = (agencyId: string) =>
    pendingFreelancerPayrolls.find(
      (p) => p.prId === FREELANCER_DEMO_PR_ID && p.agencyId === agencyId && p.status === "pending",
    );

  const anyPending = PR_AGENCIES.some((a) => pendingForPr(a.id));

  return (
    <>
      <IzSectionLabel>
        <Building2 className="mr-1 inline h-3.5 w-3.5" />
        {tied ? "Payroll agency" : "Choose payroll agency"}
      </IzSectionLabel>

      {tied && selected ? (
        <IzCard flat className="border-[rgba(217,185,122,.25)]">
          <AgencyRow agency={selected} selected readOnly />
          <p className="iz-tiny iz-muted2 mt-2 border-t border-[rgba(255,255,255,.06)] pt-2">
            Agency-Tied PRs are linked to this agency. PVs and payroll route through them automatically.
          </p>
        </IzCard>
      ) : (
        <>
          <p className="iz-tiny iz-muted mx-0.5 mb-2">
            Pick a registered PR agency to run payroll and raise Payment Vouchers for your sealed shifts. The agency
            must approve your payroll link before PVs unlock.
          </p>
          {anyPending && (
            <IzCard flat className="mb-2 border-[rgba(244,183,64,.35)]">
              <p className="iz-tiny text-[var(--iz-amber)]">
                Request sent — your agency will approve under Pending PR approvals.
              </p>
            </IzCard>
          )}
          <div className="space-y-2">
            {PR_AGENCIES.map((agency) => {
              const approved = prPayrollAgencyId === agency.id;
              const pending = !!pendingForPr(agency.id);
              return (
                <AgencyRow
                  key={agency.id}
                  agency={agency}
                  selected={approved}
                  pending={pending}
                  onSelect={() => setPrPayrollAgency(agency.id)}
                />
              );
            })}
          </div>
          {!prPayrollAgencyId && !anyPending && (
            <p className="iz-tiny iz-muted2 mt-2 text-center">Select an agency to request payroll approval.</p>
          )}
          {prPayrollAgencyId && selected && (
            <div className="mt-2 flex justify-center">
              <IzPill variant="green">Payroll approved · {selected.name}</IzPill>
            </div>
          )}
        </>
      )}
    </>
  );
}
