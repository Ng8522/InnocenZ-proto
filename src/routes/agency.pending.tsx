import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import type { PendingFreelancerPayroll } from "@/lib/store";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { DEFAULT_TIED_AGENCY_ID } from "@/lib/pr-demo";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";
import { Building2, Clock, UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/agency/pending")({
  component: AgencyPending,
});

function SignupApprovalCard({
  name,
  languages,
  ic,
  mobile,
  email,
  onApprove,
  onReject,
}: {
  name: string;
  languages: string;
  ic?: string;
  mobile?: string;
  email?: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <IzCard>
      <div className="font-sora font-bold">{name}</div>
      <div className="mt-1 iz-tiny iz-muted">{languages}</div>
      {ic && <p className="iz-tiny iz-muted2 mt-1">IC {ic}</p>}
      {mobile && <p className="iz-tiny iz-muted2">Mobile {mobile}</p>}
      {email && <p className="iz-tiny iz-muted2">Email {email}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onApprove} className="iz-btn iz-btn-primary flex-1 !py-2 !text-xs">
          Approve
        </button>
        <button type="button" onClick={onReject} className="iz-btn iz-btn-soft flex-1 !py-2 !text-xs">
          Reject
        </button>
      </div>
    </IzCard>
  );
}

function FreelancerPayrollCard({
  req,
  onApprove,
  onReject,
}: {
  req: PendingFreelancerPayroll;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <IzCard className="border-[rgba(159,122,234,.35)] bg-[linear-gradient(180deg,rgba(159,122,234,.06),transparent)]">
      <div className="iz-between items-start gap-2">
        <div>
          <div className="font-sora font-bold">{req.prName}</div>
          <div className="mt-1 iz-tiny iz-muted">{req.languages}</div>
        </div>
        <IzPill variant="violet">Freelancer</IzPill>
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-[10px] border border-[rgba(159,122,234,.25)] bg-[rgba(0,0,0,.2)] px-2.5 py-2">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--iz-violet)]" />
        <div className="min-w-0">
          <p className="iz-tiny iz-muted2">Requested payroll via</p>
          <p className="iz-sm font-bold text-[var(--iz-violet)]">{req.agencyName}</p>
        </div>
      </div>
      <p className="iz-tiny iz-muted2 mt-2">IC {req.ic}</p>
      <p className="iz-tiny iz-muted2">Mobile {req.mobile}</p>
      <p className="iz-tiny iz-muted2">Email {req.email}</p>
      <p className="iz-tiny mt-2 flex items-center gap-1 text-[var(--iz-amber)]">
        <Clock className="h-3 w-3" />
        Selected {req.requestedAt}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onApprove} className="iz-btn iz-btn-primary flex-1 !py-2 !text-xs">
          Approve payroll
        </button>
        <button type="button" onClick={onReject} className="iz-btn iz-btn-soft flex-1 !py-2 !text-xs">
          Decline
        </button>
      </div>
    </IzCard>
  );
}

function AgencyPending() {
  const {
    pendingPRs,
    pendingFreelancerPayrolls,
    approvePendingPR,
    rejectPendingPR,
    approveFreelancerPayroll,
    rejectFreelancerPayroll,
  } = useStore();
  const { date, time } = nowAgencyDateTime();

  const signups = pendingPRs.filter((p) => p.status === "pending");
  const freelancers = pendingFreelancerPayrolls.filter(
    (p) => p.agencyId === DEFAULT_TIED_AGENCY_ID && p.status === "pending",
  );

  return (
    <div className="iz-screen">
      <AppHeader subtitle={`Module 1 · ${date} · ${time}`} title="Pending PR approvals" />

      <IzSectionLabel>
        <UserPlus className="mr-1 inline h-3.5 w-3.5" />
        New PR sign-ups
      </IzSectionLabel>
      <p className="iz-tiny iz-muted -mt-1 mb-2">After registration · IC &amp; PDA review · unlock shift board</p>
      <div className="space-y-3">
        {signups.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No pending sign-ups</p>
          </IzCard>
        ) : (
          signups.map((p) => (
            <SignupApprovalCard
              key={p.id}
              name={p.name}
              languages={p.languages}
              ic={p.ic}
              mobile={p.mobile}
              email={p.email}
              onApprove={() => approvePendingPR(p.id)}
              onReject={() => rejectPendingPR(p.id)}
            />
          ))
        )}
      </div>

      <IzSectionLabel className="mt-6">
        <Users className="mr-1 inline h-3.5 w-3.5" />
        Freelancer payroll requests
        {freelancers.length > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--iz-violet-ink)] px-1.5 text-[10px] font-bold text-[var(--iz-violet-l)]">
            {freelancers.length}
          </span>
        )}
      </IzSectionLabel>
      <p className="iz-tiny iz-muted -mt-1 mb-2">
        Freelancers who chose your agency on their profile — approve payroll before you can raise PVs
      </p>
      <div className="space-y-3">
        {freelancers.length === 0 ? (
          <IzCard flat className="text-center border-dashed border-[var(--iz-line2)]">
            <p className="iz-sm iz-muted">No freelancer payroll requests</p>
            <p className="iz-tiny iz-muted2 mt-1">
              When a Freelancer PR selects Atlas Agency, they appear here for approval.
            </p>
          </IzCard>
        ) : (
          freelancers.map((p) => (
            <FreelancerPayrollCard
              key={p.id}
              req={p}
              onApprove={() => approveFreelancerPayroll(p.id)}
              onReject={() => rejectFreelancerPayroll(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
