import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import type { PendingCutlostRequest } from "@/lib/outlet-cutlost-requests";
import { cutlostRequestDetail, cutlostRequestTitle } from "@/lib/outlet-cutlost-requests";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzPill } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { Camera, Check, Clock, Image, Sparkles, TrendingDown, UserMinus, UserPlus, X } from "lucide-react";
import { publicAssetPath } from "@/lib/public-asset";
import { portfolioFilledCount } from "@/components/pr/PortfolioGalleryPicker";

type Tab = "signups" | "cutlost";

export const Route = createFileRoute("/agency/pending")({
  component: AgencyPending,
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab:
      search.tab === "cutlost" || search.tab === "freelancer" ? "cutlost" : undefined,
  }),
});

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
  portfolioPhotos,
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
  portfolioPhotos?: (string | null)[];
  submittedAt?: string;
  source?: "self-signup" | "owner-invite";
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<"ic" | "selfie" | "gallery" | null>(null);
  const galleryCount = portfolioFilledCount(portfolioPhotos ?? []);
  const gallerySlots = (portfolioPhotos ?? []).filter(Boolean) as string[];

  const previewTitle =
    preview === "ic"
      ? "IC photos"
      : preview === "selfie"
        ? "Selfie verification"
        : preview === "gallery"
          ? "Portfolio gallery"
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
            disabled={galleryCount === 0}
            onClick={() => galleryCount > 0 && setPreview("gallery")}
            className={`rounded-xl border p-2 text-center transition-opacity ${galleryCount > 0 ? "cursor-pointer border-[rgba(167,139,250,.35)] bg-[var(--iz-violet-bg)] hover:opacity-90" : "cursor-default border-dashed border-[var(--iz-line2)] bg-[var(--iz-bg2)] opacity-70"}`}
          >
            {galleryCount > 0 ? (
              <>
                <Image className="mx-auto h-4 w-4 text-[var(--iz-violet-l)]" />
                <p className="iz-tiny iz-muted2 mt-1">Gallery · {galleryCount}</p>
              </>
            ) : (
              <>
                <Camera className="mx-auto h-4 w-4 text-[var(--iz-muted)]" />
                <p className="iz-tiny iz-muted2 mt-1">Gallery</p>
              </>
            )}
          </button>
        </div>

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
          {preview === "gallery" && (
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {gallerySlots.map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border border-[var(--iz-line)]">
                  <img
                    src={publicAssetPath(src)}
                    alt={`Portfolio ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
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

function CutlostRequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: PendingCutlostRequest;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const Icon =
    req.kind === "best_effort"
      ? Sparkles
      : req.kind === "release_prs"
        ? UserMinus
        : TrendingDown;

  return (
    <>
      <IzCard className="border-[rgba(244,183,64,.28)] bg-[linear-gradient(180deg,rgba(244,183,64,.06),transparent)]">
        <div className="iz-between items-start gap-2">
          <div>
            <div className="font-sora font-bold">{req.outletName}</div>
            <div className="mt-1 iz-tiny iz-muted line-clamp-2">{req.shiftEvent}</div>
          </div>
          <IzPill variant="amber">Cutlost</IzPill>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-[10px] border border-[rgba(244,183,64,.22)] bg-[rgba(0,0,0,.2)] px-2.5 py-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold)]" />
          <div className="min-w-0">
            <p className="iz-sm font-bold text-[var(--iz-txt)]">{cutlostRequestTitle(req)}</p>
            <p className="iz-tiny iz-muted2 mt-0.5">{cutlostRequestDetail(req)}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <IzPill variant="ink">{req.dateLabel}</IzPill>
          <IzPill variant="ink">{req.shiftLabel}</IzPill>
          {req.model === "best_effort" && (
            <IzPill variant="violet">Best effort</IzPill>
          )}
          <IzPill variant="red">Cutlost RM {Math.round(req.cutlostBefore).toLocaleString("en-MY")}</IzPill>
          <IzPill variant="green">Saves ~RM {Math.round(req.estimatedSavings).toLocaleString("en-MY")}</IzPill>
        </div>
        {req.rationale?.length ? (
          <p className="iz-tiny iz-muted2 mt-2 leading-snug">
            {req.rationale[0]}
          </p>
        ) : null}
        <p className="iz-tiny mt-2 flex items-center gap-1 text-[var(--iz-amber)]">
          <Clock className="h-3 w-3" />
          Requested {req.requestedAt}
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onApprove} className="iz-btn iz-btn-primary flex-1 !py-2 !text-xs">
            Approve
          </button>
          <button type="button" onClick={() => setRejectOpen(true)} className="iz-btn iz-btn-soft flex-1 !py-2 !text-xs">
            Decline
          </button>
        </div>
      </IzCard>

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
              <h3>Decline cutlost request</h3>
            </div>
            <button type="button" className="iz-sheet-close" onClick={() => setRejectOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="iz-tiny iz-muted mb-2">
            {req.outletName} · {cutlostRequestTitle(req)}
          </p>
          <textarea
            className="iz-field-input min-h-[80px] !text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for declining…"
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
            Confirm decline
          </button>
        </IzSheet>
      )}
    </>
  );
}

function AgencyPending() {
  const { tab: tabFromSearch } = Route.useSearch();
  const {
    pendingPRs,
    pendingCutlostRequests,
    approvePendingPR,
    rejectPendingPR,
    approveCutlostRequest,
    rejectCutlostRequest,
    invitePendingPR,
    agencySubRole,
  } = useStore();
  const { date, time } = nowAgencyDateTime();
  const [tab, setTab] = useState<Tab>("signups");
  const [addOpen, setAddOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", ic: "", mobile: "", email: "" });

  useEffect(() => {
    if (tabFromSearch) setTab(tabFromSearch);
  }, [tabFromSearch]);

  const signups = pendingPRs.filter((p) => p.status === "pending");
  const cutlostRequests = pendingCutlostRequests.filter((r) => r.status === "pending");

  if (!agencyCan(agencySubRole, "approvePrSignups")) {
    return (
      <div className="iz-screen">
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
          className={`flex-1 rounded-full border py-2 text-xs font-semibold ${tab === "cutlost" ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setTab("cutlost")}
        >
          Cutlost requests ({cutlostRequests.length})
        </button>
      </div>

      {tab === "signups" ? (
        <>
          <OutletSection
            title="New PR sign-ups"
            hint="IC · selfie · gallery"
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
                  portfolioPhotos={p.portfolioPhotos}
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
            title="Outlet cutlost requests"
            hint="Review labor cuts before they apply"
            className="!mt-4"
          >
          <div className="space-y-3">
            {cutlostRequests.length === 0 ? (
              <IzCard flat className="text-center border-dashed border-[var(--iz-line2)]">
                <p className="iz-sm iz-muted">No outlet cutlost requests</p>
              </IzCard>
            ) : (
              cutlostRequests.map((req) => (
                <CutlostRequestCard
                  key={req.id}
                  req={req}
                  onApprove={() => approveCutlostRequest(req.id)}
                  onReject={(reason) => rejectCutlostRequest(req.id, reason)}
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
