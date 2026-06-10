import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import type { PendingFreelancerPayroll } from "@/lib/store";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { DEFAULT_TIED_AGENCY_ID } from "@/lib/pr-demo";
import { IzCard, IzPill } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { Building2, Camera, Check, Clock, Image, UserPlus, Users, X } from "lucide-react";

export const Route = createFileRoute("/agency/pending")({
  component: AgencyPending,
});

type Tab = "signups" | "freelancer";

function SignupApprovalCard({
  name,
  languages,
  ic,
  mobile,
  email,
  age,
  height,
  weight,
  race,
  hasIcPhotos,
  hasSelfie,
  hasComcard3d,
  portfolioCount,
  submittedAt,
  source,
  onApprove,
  onReject,
}: {
  name: string;
  languages: string;
  ic?: string;
  mobile?: string;
  email?: string;
  age?: number;
  height?: number;
  weight?: number;
  race?: string;
  hasIcPhotos?: boolean;
  hasSelfie?: boolean;
  hasComcard3d?: boolean;
  portfolioCount?: number;
  submittedAt?: string;
  source?: "self-signup" | "owner-invite";
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<"ic" | "selfie" | "comcard" | "portfolio" | null>(null);

  const previewTitle =
    preview === "ic"
      ? "IC photos"
      : preview === "selfie"
        ? "Selfie verification"
        : preview === "comcard"
          ? "Comcard (3D)"
          : preview === "portfolio"
            ? "Portfolio"
            : "";

  return (
    <>
      <IzCard>
        <div className="iz-between items-start gap-2">
          <div className="font-sora font-bold">{name}</div>
          {source === "owner-invite" && <IzPill variant="amber">Owner invite</IzPill>}
        </div>
        <div className="mt-1 iz-tiny iz-muted">{languages}</div>
        {submittedAt && (
          <p className="iz-tiny mt-1 flex items-center gap-1 text-[var(--iz-amber)]">
            <Clock className="h-3 w-3" />
            Applied {submittedAt}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {race && <IzPill variant="ink">{race}</IzPill>}
          {age && <IzPill variant="ink">Age {age}</IzPill>}
          {height && <IzPill variant="ink">{height} cm</IzPill>}
          {weight && <IzPill variant="ink">{weight} kg</IzPill>}
        </div>
        {ic && <p className="iz-tiny iz-muted2 mt-2">IC {ic}</p>}
        {mobile && <p className="iz-tiny iz-muted2">Mobile {mobile}</p>}
        {email && <p className="iz-tiny iz-muted2">Email {email}</p>}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={!hasIcPhotos}
            onClick={() => hasIcPhotos && setPreview("ic")}
            className={`rounded-xl border p-2 text-center transition-opacity ${hasIcPhotos ? "cursor-pointer hover:opacity-90" : "cursor-default opacity-70"} ${hasIcPhotos ? "border-[rgba(57,217,138,.35)] bg-[var(--iz-green-bg)]" : "border-dashed border-[var(--iz-line2)] bg-[var(--iz-bg2)]"}`}
          >
            {hasIcPhotos ? (
              <Check className="mx-auto h-4 w-4 text-[var(--iz-green)]" />
            ) : (
              <Camera className="mx-auto h-4 w-4 text-[var(--iz-muted)]" />
            )}
            <p className="iz-tiny iz-muted2 mt-1">IC photos</p>
          </button>
          <button
            type="button"
            disabled={!hasSelfie}
            onClick={() => hasSelfie && setPreview("selfie")}
            className={`rounded-xl border p-2 text-center transition-opacity ${hasSelfie ? "cursor-pointer hover:opacity-90" : "cursor-default opacity-70"} ${hasSelfie ? "border-[rgba(57,217,138,.35)] bg-[var(--iz-green-bg)]" : "border-dashed border-[var(--iz-line2)] bg-[var(--iz-bg2)]"}`}
          >
            {hasSelfie ? (
              <Check className="mx-auto h-4 w-4 text-[var(--iz-green)]" />
            ) : (
              <Camera className="mx-auto h-4 w-4 text-[var(--iz-muted)]" />
            )}
            <p className="iz-tiny iz-muted2 mt-1">Selfie</p>
          </button>
          <button
            type="button"
            disabled={!hasComcard3d}
            onClick={() => hasComcard3d && setPreview("comcard")}
            className={`rounded-xl border p-2 text-center transition-opacity ${hasComcard3d ? "cursor-pointer border-[rgba(167,139,250,.35)] bg-[var(--iz-violet-bg)] hover:opacity-90" : "cursor-default border-dashed border-[var(--iz-line2)] bg-[var(--iz-bg2)] opacity-70"}`}
          >
            {hasComcard3d ? (
              <IzPill variant="violet" className="!text-[9px]">3D 三维</IzPill>
            ) : (
              <p className="iz-tiny iz-muted2">Comcard</p>
            )}
          </button>
        </div>
        {(portfolioCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setPreview("portfolio")}
            className="iz-tiny iz-muted mt-2 flex w-full items-center gap-1 text-left hover:text-[var(--iz-ink)]"
          >
            <Image className="h-3 w-3" /> Portfolio · {portfolioCount} photos — tap to preview
          </button>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onApprove} className="iz-btn iz-btn-primary flex-1 !py-2 !text-xs">
            Approve
          </button>
          <button type="button" onClick={() => setRejectOpen(true)} className="iz-btn iz-btn-soft flex-1 !py-2 !text-xs">
            Reject
          </button>
        </div>
      </IzCard>

      {preview !== null && (
        <IzSheet open onClose={() => setPreview(null)}>
          <div className="iz-sheet-head">
            <div>
              <button
                type="button"
                className="iz-chip mb-2 !px-2 !py-1 !text-[10px]"
                onClick={() => setPreview(null)}
              >
                ← Back
              </button>
              <h3>{previewTitle}</h3>
            </div>
            <button type="button" className="iz-sheet-close" onClick={() => setPreview(null)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {preview === "ic" && (
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {["Front", "Back"].map((side) => (
                <div key={side} className="space-y-1">
                  <p className="iz-tiny iz-muted2">{side}</p>
                  <div className="aspect-[3/2] rounded-xl bg-gradient-to-br from-[var(--iz-bg3)] to-[var(--iz-line)]" />
                </div>
              ))}
            </div>
          )}
          {preview === "selfie" && (
            <div className="px-4 pb-4">
              <div className="aspect-[3/4] max-w-[220px] mx-auto rounded-xl bg-gradient-to-br from-[var(--iz-violet-bg)] to-[var(--iz-bg3)]" />
            </div>
          )}
          {preview === "comcard" && (
            <div className="px-4 pb-4">
              <div className="aspect-square max-w-[240px] mx-auto rounded-xl bg-gradient-to-br from-[var(--iz-violet-bg)] via-[var(--iz-bg2)] to-[var(--iz-gold-bg)] flex items-center justify-center">
                <IzPill variant="violet">3D Comcard preview</IzPill>
              </div>
            </div>
          )}
          {preview === "portfolio" && (
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {Array.from({ length: Math.min(portfolioCount ?? 0, 6) }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-[var(--iz-bg3)] to-[var(--iz-line)]" />
              ))}
            </div>
          )}
        </IzSheet>
      )}

      {rejectOpen && (
        <IzSheet open onClose={() => setRejectOpen(false)}>
          <div className="iz-sheet-head">
            <div>
              <button
                type="button"
                className="iz-chip mb-2 !px-2 !py-1 !text-[10px]"
                onClick={() => setRejectOpen(false)}
              >
                ← Back
              </button>
              <h3>Reject {name}</h3>
            </div>
            <button type="button" className="iz-sheet-close" onClick={() => setRejectOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="iz-tiny iz-muted mb-2">Reason is sent to PR (mandatory)</p>
          <textarea
            className="iz-field-input min-h-[80px] !text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incomplete IC verification…"
          />
          <button
            type="button"
            className="iz-btn iz-btn-primary mt-3 w-full"
            disabled={!reason.trim()}
            onClick={() => {
              onReject(reason.trim());
              setRejectOpen(false);
            }}
          >
            Confirm reject
          </button>
        </IzSheet>
      )}
    </>
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
      <p className="iz-tiny iz-muted2">PR can detach any time after approval</p>
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
    invitePendingPR,
    agencySubRole,
  } = useStore();
  const { date, time } = nowAgencyDateTime();
  const [tab, setTab] = useState<Tab>("signups");
  const [addOpen, setAddOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", ic: "", mobile: "", email: "" });

  const signups = pendingPRs.filter((p) => p.status === "pending");
  const freelancers = pendingFreelancerPayrolls.filter(
    (p) => p.agencyId === DEFAULT_TIED_AGENCY_ID && p.status === "pending",
  );

  if (!agencyCan(agencySubRole, "approvePrSignups")) {
    return (
      <div className="iz-screen">
        <AppTopbar backTo="/agency" backLabel="Home" />
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">Finance role cannot approve PR sign-ups.</p>
        </IzCard>
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/agency" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Approve sign-ups</h2>
        <p className="iz-tiny iz-muted mt-0.5">
          {date} · {time}
        </p>
        <button type="button" className="iz-chip mt-2" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-3 w-3" /> Add PR
        </button>
      </header>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-xs font-semibold ${tab === "signups" ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setTab("signups")}
        >
          Agency-Tied ({signups.length})
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-xs font-semibold ${tab === "freelancer" ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setTab("freelancer")}
        >
          Freelancer payroll ({freelancers.length})
        </button>
      </div>

      {tab === "signups" ? (
        <>
          <OutletSection
            title="New PR sign-ups"
            hint="IC · selfie · comcard · portfolio"
            className="!mt-4"
          >
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
                  age={p.age}
                  height={p.height}
                  weight={p.weight}
                  race={p.race}
                  hasIcPhotos={p.hasIcPhotos}
                  hasSelfie={p.hasSelfie}
                  hasComcard3d={p.hasComcard3d}
                  portfolioCount={p.portfolioCount}
                  submittedAt={p.submittedAt}
                  source={p.source}
                  onApprove={() => approvePendingPR(p.id)}
                  onReject={(reason) => rejectPendingPR(p.id, reason)}
                />
              ))
            )}
          </div>
          </OutletSection>
        </>
      ) : (
        <>
          <OutletSection
            title="Freelancer payroll"
            hint="Freelancers who chose your agency"
            className="!mt-4"
          >
          <div className="space-y-3">
            {freelancers.length === 0 ? (
              <IzCard flat className="text-center border-dashed border-[var(--iz-line2)]">
                <p className="iz-sm iz-muted">No freelancer payroll requests</p>
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
          </OutletSection>
        </>
      )}

      {addOpen && (
        <IzSheet open onClose={() => setAddOpen(false)}>
          <div className="iz-sheet-head">
            <div>
              <button
                type="button"
                className="iz-chip mb-2 !px-2 !py-1 !text-[10px]"
                onClick={() => setAddOpen(false)}
              >
                ← Back
              </button>
              <h3>Owner-initiated onboarding</h3>
            </div>
            <button type="button" className="iz-sheet-close" onClick={() => setAddOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="iz-tiny iz-muted mb-3">Enter IC + contact → invite sent to complete profile</p>
          {(["name", "ic", "mobile", "email"] as const).map((field) => (
            <div key={field} className="mb-2">
              <span className="iz-field-label capitalize">{field}</span>
              <input
                className="iz-field-input !text-sm"
                value={invite[field]}
                onChange={(e) => setInvite((v) => ({ ...v, [field]: e.target.value }))}
              />
            </div>
          ))}
          <button
            type="button"
            className="iz-btn iz-btn-primary mt-2 w-full"
            disabled={!invite.name || !invite.ic}
            onClick={() => {
              invitePendingPR(invite);
              setAddOpen(false);
              setInvite({ name: "", ic: "", mobile: "", email: "" });
            }}
          >
            Send invite
          </button>
        </IzSheet>
      )}
    </div>
  );
}
