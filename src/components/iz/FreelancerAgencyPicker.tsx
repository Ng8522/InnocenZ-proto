import { useState } from "react";
import { Building2, Check, Clock, Star, Unlink } from "lucide-react";
import {
  DEFAULT_TIED_AGENCY_ID,
  FREELANCER_DEMO_PR_ID,
  PR_AGENCIES,
  getPrAgencyById,
  type PrAgency,
} from "@/lib/pr-demo";
import { PR_AGENCY_CODES, isWithinOneYearTie, monthsSinceTied } from "@/lib/pr-features";
import { useStore } from "@/lib/store";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";

function AgencyRow({
  agency,
  selected,
  pending,
  linked,
  onSelect,
  onDetach,
  readOnly,
}: {
  agency: PrAgency;
  selected: boolean;
  pending?: boolean;
  linked?: boolean;
  onSelect?: () => void;
  onDetach?: () => void;
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
          <span>Finance · {agency.financeHead}</span>
        </div>
        {pending && !selected && (
          <p className="iz-tiny mt-1.5 flex items-center gap-1 text-[var(--iz-amber)]">
            <Clock className="h-3 w-3" />
            Awaiting agency payroll approval
          </p>
        )}
      </div>
      {linked && onDetach && (
        <button type="button" className="iz-tiny text-[var(--iz-red)] px-2" onClick={(e) => { e.stopPropagation(); onDetach(); }}>
          <Unlink className="h-3.5 w-3.5" />
        </button>
      )}
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
  const prFreelancerPayrollLinks = useStore((s) => s.prFreelancerPayrollLinks);
  const prAgencyTiedAt = useStore((s) => s.prAgencyTiedAt);
  const prLeaveRequest = useStore((s) => s.prLeaveRequest);
  const pendingFreelancerPayrolls = useStore((s) => s.pendingFreelancerPayrolls);
  const setPrPayrollAgency = useStore((s) => s.setPrPayrollAgency);
  const linkPayrollByAgencyCode = useStore((s) => s.linkPayrollByAgencyCode);
  const detachFreelancerPayroll = useStore((s) => s.detachFreelancerPayroll);
  const requestLeaveAgency = useStore((s) => s.requestLeaveAgency);
  const requestTransferAgency = useStore((s) => s.requestTransferAgency);
  const [agencyCode, setAgencyCode] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [leaveNote, setLeaveNote] = useState("");

  const effectiveId = tied ? DEFAULT_TIED_AGENCY_ID : prPayrollAgencyId;
  const selected = getPrAgencyById(effectiveId);
  const tiedMonths = monthsSinceTied(prAgencyTiedAt);
  const tiedLocked = isWithinOneYearTie(prAgencyTiedAt);

  const pendingForPr = (agencyId: string) =>
    pendingFreelancerPayrolls.find(
      (p) => p.prId === FREELANCER_DEMO_PR_ID && p.agencyId === agencyId && p.status === "pending",
    );

  const anyPending = PR_AGENCIES.some((a) => pendingForPr(a.id));

  return (
    <>
      <IzSectionLabel>
        <Building2 className="mr-1 inline h-3.5 w-3.5" />
        {tied ? "Agency tie" : "Payroll agencies"}
      </IzSectionLabel>

      {tied && selected ? (
        <>
          <IzCard flat className="border-[rgba(217,185,122,.25)]">
            <AgencyRow agency={selected} selected readOnly />
            <p className="iz-tiny iz-muted2 mt-2 border-t border-[rgba(255,255,255,.06)] pt-2">
              Tied {tiedMonths} months · {tiedLocked ? "1-year lock active" : "eligible to transfer"}
            </p>
          </IzCard>
          {tiedLocked ? (
            <IzCard flat className="mt-2.5">
              <p className="iz-sm font-bold">Leave agency</p>
              <p className="iz-tiny iz-muted mt-1">Before 1 year you must raise a support ticket.</p>
              <textarea
                className="iz-pv-dispute-input mt-2"
                rows={2}
                placeholder="Reason for early leave…"
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
              />
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-auto"
                onClick={() => requestLeaveAgency(leaveNote)}
              >
                Raise support ticket
              </button>
            </IzCard>
          ) : (
            <IzCard flat className="mt-2.5">
              <p className="iz-sm font-bold">Transfer agency</p>
              <input
                className="iz-field-input mt-2 w-full"
                placeholder="New agency code"
                value={transferCode}
                onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                className="iz-btn iz-btn-primary iz-btn-sm mt-2 w-auto"
                onClick={() => requestTransferAgency(transferCode, "Transfer after 1-year tie")}
              >
                Request transfer
              </button>
            </IzCard>
          )}
          {prLeaveRequest && (
            <p className="iz-tiny iz-muted2 mt-2">
              {prLeaveRequest.type === "leave" ? "Leave ticket" : "Transfer request"} submitted {prLeaveRequest.at}
            </p>
          )}
        </>
      ) : (
        <>
          <IzCard flat className="mb-2">
            <p className="iz-tiny iz-muted mb-2">Link payroll via agency code (multi-agency supported)</p>
            <div className="flex gap-2">
              <input
                className="iz-field-input flex-1"
                placeholder="e.g. ATLAS2026"
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
              />
              <button type="button" className="iz-btn iz-btn-primary iz-btn-sm shrink-0" onClick={() => linkPayrollByAgencyCode(agencyCode)}>
                Link
              </button>
            </div>
            <p className="iz-tiny iz-muted2 mt-1.5">Demo codes: {Object.keys(PR_AGENCY_CODES).join(", ")}</p>
          </IzCard>
          {anyPending && (
            <IzCard flat className="mb-2 border-[rgba(244,183,64,.35)]">
              <p className="iz-tiny text-[var(--iz-amber)]">Request sent — agency approves under Pending PR approvals.</p>
            </IzCard>
          )}
          <div className="space-y-2">
            {PR_AGENCIES.map((agency) => {
              const approved = prFreelancerPayrollLinks.includes(agency.id) || prPayrollAgencyId === agency.id;
              const pending = !!pendingForPr(agency.id);
              return (
                <AgencyRow
                  key={agency.id}
                  agency={agency}
                  selected={prPayrollAgencyId === agency.id}
                  linked={approved}
                  pending={pending}
                  onSelect={() => setPrPayrollAgency(agency.id)}
                  onDetach={approved ? () => detachFreelancerPayroll(agency.id) : undefined}
                />
              );
            })}
          </div>
          {prPayrollAgencyId && selected && (
            <div className="mt-2 flex justify-center">
              <IzPill variant="green">Active payroll · {selected.name}</IzPill>
            </div>
          )}
        </>
      )}
    </>
  );
}
