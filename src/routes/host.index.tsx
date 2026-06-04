import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  DEFAULT_PR_AGENCY_NAME,
  fmtDFriendly,
  formatTimeAgo,
  getPrProfile,
  getPrRosterId,
  type PrShiftOffer,
} from "@/lib/pr-demo";
import type { AgencyRosterSlot } from "@/lib/agency-demo";
import { Bell, Building2, Calendar, ArrowLeftRight, MapPin, Shield, Star } from "lucide-react";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/")({
  component: HostShifts,
});

function HostShifts() {
  const prSubRole = useStore((s) => s.prSubRole);
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const pendingApproval = useStore((s) => s.pendingApproval);
  const checkedIn = useStore((s) => s.checkedIn);
  const acceptPrShift = useStore((s) => s.acceptPrShift);
  const approvePrShift = useStore((s) => s.approvePrShift);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const approveOutletSwapByPr = useStore((s) => s.approveOutletSwapByPr);
  const declineOutletSwapByPr = useStore((s) => s.declineOutletSwapByPr);
  const approveAgencyAssignmentByPr = useStore((s) => s.approveAgencyAssignmentByPr);
  const declineAgencyAssignmentByPr = useStore((s) => s.declineAgencyAssignmentByPr);
  const toast = useStore((s) => s.toast);

  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const profile = getPrProfile(prSubRole);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const tied = prSubRole !== "pr_free";
  const todayLine = fmtDFriendly(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2]);
  const activeShift = shiftAccepted ? PR_SHIFT_OFFERS[0] : null;
  const confirmShift = confirmIdx !== null ? PR_SHIFT_OFFERS[confirmIdx] : null;
  const firstName = (prDisplayName ?? profile.first).split(" ")[0];
  const myRosterId = getPrRosterId(prSubRole);
  const pendingOutletSwaps = agencyRoster.filter(
    (s) => s.prId === myRosterId && s.outletSwap?.status === "pending_pr",
  );
  const pendingAgencyAssignments = agencyRoster.filter(
    (s) => s.prId === myRosterId && s.status === "assignment-pending",
  );
  const hasAgencyInbox = pendingAgencyAssignments.length > 0 || pendingOutletSwaps.length > 0;

  const onSos = () => toast("SOS alert. Security notified", "warn");

  return (
    <div className="iz-screen flex flex-col">
      <AppTopbar />

      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold leading-tight text-[var(--iz-txt)]">
        Tonight&apos;s shifts, {firstName}
      </h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {todayLine}. Sorted by distance.{" "}
        {tied ? "Agency-Tied. Agency approval may apply" : "Freelancer. Accept independently — appoint any agency for payroll"}
      </p>
      {!tied && (
        <div className="mt-2.5">
          <FreelancerPayrollNotice compact />
        </div>
      )}
      <p className="iz-tiny iz-muted2 mx-0.5 mt-1.5">
        <Shield className="mr-1 inline h-3 w-3" />
        Cancellation policy: penalties for cancels &lt; 2h before start. No-shows lower your reputation.
      </p>

      {hasAgencyInbox && (
        <>
          <IzSectionLabel className="!mt-3">From your agency</IzSectionLabel>
          <p className="iz-tiny iz-muted mx-0.5 -mt-1 mb-1">
            Your agency sent these — tap Approve to take the shift or Reject if you cannot go.
          </p>
        </>
      )}

      {pendingAgencyAssignments.map((slot) => (
        <PrAgencyAssignmentCard
          key={slot.id}
          slot={slot}
          onApprove={() => approveAgencyAssignmentByPr(slot.id)}
          onReject={() => declineAgencyAssignmentByPr(slot.id)}
        />
      ))}

      {pendingOutletSwaps.map((slot) => (
        <PrOutletSwapCard
          key={slot.id}
          slot={slot}
          onApprove={() => approveOutletSwapByPr(slot.id)}
          onReject={() => declineOutletSwapByPr(slot.id)}
        />
      ))}

      {pendingApproval && (
        <IzCard glow className="mt-3">
          <div className="flex items-start gap-2.5">
            <span className="iz-iconbox bg-[var(--iz-amber-bg)] text-[var(--iz-amber)]">
              <Bell className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-sora text-[15px] font-bold text-[var(--iz-txt)]">Awaiting agency approval</div>
              <p className="iz-tiny iz-muted mt-0.5">
                Agency-Tied PRs need Atlas Agency to confirm before the slot locks.
              </p>
            </div>
          </div>
          <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mt-2.5 w-auto" onClick={approvePrShift}>
            Simulate agency approval
          </button>
        </IzCard>
      )}

      {shiftAccepted && activeShift && (
        <IzCard glow className="mt-3">
          <div className="iz-ring">
            <span className="iz-tiny iz-muted tracking-wide">{checkedIn ? "ON-DUTY" : "Next check-in"}</span>
            <span className="font-sora mt-0.5 text-[17px] font-extrabold text-[var(--iz-txt)]">{activeShift.outlet}</span>
            <span className="iz-ledger font-sora font-bold text-[var(--iz-gold)]">
              {formatRM(activeShift.base + activeShift.comm)}
            </span>
          </div>
          <div className="iz-between mt-3">
            <div className="iz-tiny iz-muted">
              {fmtDFriendly(activeShift.date[0], activeShift.date[1], activeShift.date[2])}
              <br />
              {activeShift.event}. {activeShift.time}. {activeShift.addr}
            </div>
            <IzPill variant="gold">
              <Star className="h-2.5 w-2.5" /> VIP
            </IzPill>
          </div>
          <Link to="/host/tonight" className="iz-btn iz-btn-primary mt-3">
            <MapPin className="h-4 w-4" /> {checkedIn ? "View attendance" : "Go to Check-In"}
          </Link>
        </IzCard>
      )}

      <IzSectionLabel>Open near you</IzSectionLabel>

      {PR_SHIFT_OFFERS.map((s, i) => (
        <ShiftOfferCard
          key={s.outlet}
          shift={s}
          hideAccept={shiftAccepted || pendingApproval}
          onAccept={() => setConfirmIdx(i)}
        />
      ))}

      <button type="button" className="iz-btn iz-btn-violet mt-1" onPointerDown={onSos}>
        Emergency Support (hold)
      </button>

      <IzSheet open={confirmShift !== null} onClose={() => setConfirmIdx(null)}>
        {confirmShift && (
          <ConfirmShiftBody
            shift={confirmShift}
            tied={tied}
            onConfirm={() => {
              acceptPrShift();
              setConfirmIdx(null);
            }}
          />
        )}
      </IzSheet>
    </div>
  );
}

function PrAgencyAssignmentCard({
  slot,
  onApprove,
  onReject,
}: {
  slot: AgencyRosterSlot;
  onApprove: () => void;
  onReject: () => void;
}) {
  const agency = slot.agencyAssignment?.agencyName ?? DEFAULT_PR_AGENCY_NAME;
  const sentAgo =
    slot.agencyAssignment?.assignedAtMs != null
      ? formatTimeAgo(slot.agencyAssignment.assignedAtMs)
      : slot.agencyAssignment?.assignedAt ?? "recently";

  return (
    <IzCard glow className="mt-2.5 border-[rgba(232,194,122,.4)]">
      <div className="flex items-start gap-2.5">
        <span className="iz-iconbox bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]">
          <Building2 className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-sora text-[15px] font-bold">Agency assigned you to an outlet</div>
          <p className="iz-tiny iz-muted mt-0.5">
            <span className="font-semibold text-[var(--iz-gold-l)]">{agency}</span>
            {" · "}
            <span className="text-[var(--iz-muted2)]">{sentAgo}</span>
          </p>
        </div>
        <IzPill variant="amber">New</IzPill>
      </div>
      <div className="mt-2.5 rounded-xl bg-[rgba(0,0,0,.2)] p-2.5">
        <p className="iz-tiny iz-muted2">Go to outlet</p>
        <p className="iz-sm font-bold text-[var(--iz-gold-l)]">{slot.outlet}</p>
        <p className="iz-tiny iz-muted mt-1.5">
          {slot.date} · {slot.shiftStart} — {slot.shiftEnd}
        </p>
        {slot.agencyAssignment?.agencyNote && (
          <p className="iz-tiny iz-muted2 mt-1">{slot.agencyAssignment.agencyNote}</p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="iz-btn iz-btn-primary flex-1 !py-2.5 !text-xs" onClick={onApprove}>
          Approve
        </button>
        <button type="button" className="iz-btn iz-btn-soft flex-1 !py-2.5 !text-xs" onClick={onReject}>
          Reject
        </button>
      </div>
    </IzCard>
  );
}

function PrOutletSwapCard({
  slot,
  onApprove,
  onReject,
}: {
  slot: AgencyRosterSlot;
  onApprove: () => void;
  onReject: () => void;
}) {
  const swap = slot.outletSwap!;
  const agency = swap.agencyName ?? DEFAULT_PR_AGENCY_NAME;
  const sentAgo =
    swap.requestedAtMs != null ? formatTimeAgo(swap.requestedAtMs) : swap.requestedAt ?? "recently";

  return (
    <IzCard glow className="mt-2.5 border-[rgba(124,107,255,.35)]">
      <div className="flex items-start gap-2.5">
        <span className="iz-iconbox bg-[rgba(159,122,234,.15)] text-[var(--iz-violet)]">
          <ArrowLeftRight className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-sora text-[15px] font-bold">Agency outlet swap</div>
          <p className="iz-tiny iz-muted mt-0.5">
            <span className="font-semibold text-[var(--iz-violet)]">{agency}</span>
            {" · "}
            <span className="text-[var(--iz-muted2)]">{sentAgo}</span>
          </p>
        </div>
        <IzPill variant="violet">Swap</IzPill>
      </div>
      <div className="mt-2.5 rounded-xl bg-[rgba(0,0,0,.2)] p-2.5">
        <p className="iz-tiny iz-muted2">Current outlet</p>
        <p className="iz-sm font-bold">{slot.outlet}</p>
        <p className="iz-tiny iz-muted2 mt-2">Move to</p>
        <p className="iz-sm font-bold text-[var(--iz-gold-l)]">{swap.targetOutlet}</p>
        <p className="iz-tiny iz-muted mt-1.5">
          {slot.date} · {slot.shiftStart} — {slot.shiftEnd}
        </p>
        {swap.agencyNote && <p className="iz-tiny iz-muted2 mt-1">{swap.agencyNote}</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="iz-btn iz-btn-primary flex-1 !py-2.5 !text-xs" onClick={onApprove}>
          Approve
        </button>
        <button type="button" className="iz-btn iz-btn-soft flex-1 !py-2.5 !text-xs" onClick={onReject}>
          Reject
        </button>
      </div>
    </IzCard>
  );
}

function ShiftOfferCard({
  shift: s,
  hideAccept,
  onAccept,
}: {
  shift: PrShiftOffer;
  hideAccept: boolean;
  onAccept: () => void;
}) {
  return (
    <IzCard>
      <div className="iz-between">
        <div className="font-sora text-[15px] font-bold text-[var(--iz-txt)]">{s.outlet}</div>
        <IzPill variant={s.vip ? "gold" : "ink"}>{s.vip ? "VIP" : "Regular"}</IzPill>
      </div>
      <div className="mt-1">
        <span className="iz-tiny font-sora font-semibold tracking-wide text-[var(--iz-gold-l)]">
          <Calendar className="mr-1 inline h-2.5 w-2.5" />
          {fmtDFriendly(s.date[0], s.date[1], s.date[2])}
        </span>
      </div>
      <p className="iz-tiny iz-muted mt-1.5">
        <Star className="mr-1 inline h-2.5 w-2.5" />
        {s.rating}. {s.time}
        {s.endNext ? " (ends next day)" : ""}. {s.distance}
      </p>
      <div className="iz-between mt-2.5">
        <span className="iz-tiny iz-muted">Est. payout</span>
        <span className="font-sora text-lg font-extrabold text-[var(--iz-gold)]">{formatRM(s.base + s.comm)}</span>
      </div>
      {!hideAccept && (
        <button type="button" className="iz-btn iz-btn-primary iz-btn-sm mt-2.5 w-full" onClick={onAccept}>
          Accept Shift
        </button>
      )}
    </IzCard>
  );
}

function ConfirmShiftBody({
  shift: s,
  tied,
  onConfirm,
}: {
  shift: PrShiftOffer;
  tied: boolean;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="iz-cardttl">Confirm shift</div>
      <p className="iz-tiny iz-muted mb-2.5">
        {s.outlet}. {s.event}
      </p>
      <IzCard>
        <div className="iz-v-sum">
          <span className="iz-muted">Shift date</span>
          <b className="font-sora text-[var(--iz-gold-l)]">{fmtDFriendly(s.date[0], s.date[1], s.date[2])}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Location</span>
          <b>{s.addr}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Check-in window</span>
          <b>
            {s.time}
            {s.endNext ? " (ends next day)" : ""}
          </b>
        </div>
        <div className="iz-divider" />
        <div className="iz-v-sum">
          <span className="iz-muted">Base wage</span>
          <b className="iz-ledger">{formatRM(s.base)}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Est. commission</span>
          <b className="iz-ledger">{formatRM(s.comm)}</b>
        </div>
        <div className="iz-v-sum tot">
          <span>Expected payout</span>
          <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(s.base + s.comm)}</span>
        </div>
      </IzCard>
      <IzCard flat className="mt-2.5 border-[rgba(244,183,64,.3)]">
        <p className="iz-sm font-bold text-[var(--iz-amber)]">
          {tied ? "Agency pre-approval required" : "Independent accept"}
        </p>
        <p className="iz-tiny iz-muted mt-1">
          {tied
            ? "As an Agency-Tied PR, Atlas Agency must approve before your slot locks."
            : "As a Freelancer, you accept independently. No agency approval needed."}
        </p>
      </IzCard>
      <button type="button" className="iz-btn iz-btn-primary mt-3" onClick={onConfirm}>
        {tied ? "Request shift \u00b7 send for approval" : "Accept shift"}
      </button>
    </>
  );
}
