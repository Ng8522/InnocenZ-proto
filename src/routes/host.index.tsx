import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  fmtDFriendly,
  getPrProfile,
  type PrShiftOffer,
} from "@/lib/pr-demo";
import { Bell, Calendar, MapPin, Shield, Star } from "lucide-react";
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
  const toast = useStore((s) => s.toast);

  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const profile = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";
  const todayLine = fmtDFriendly(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2]);
  const activeShift = shiftAccepted ? PR_SHIFT_OFFERS[0] : null;
  const confirmShift = confirmIdx !== null ? PR_SHIFT_OFFERS[confirmIdx] : null;

  const onSos = () => toast("SOS alert. Security notified", "warn");

  return (
    <div className="iz-screen flex flex-col">
      <AppTopbar />

      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold leading-tight text-[var(--iz-txt)]">
        Tonight&apos;s shifts, {profile.first}
      </h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {todayLine}. Sorted by distance.{" "}
        {tied ? "Agency-Tied. Agency approval may apply" : "Freelancer. Accept independently"}
      </p>
      <p className="iz-tiny iz-muted2 mx-0.5 mt-1.5">
        <Shield className="mr-1 inline h-3 w-3" />
        Cancellation policy: penalties for cancels &lt; 2h before start. No-shows lower your reputation.
      </p>

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
