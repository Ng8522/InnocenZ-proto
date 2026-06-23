import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { PrShiftCancellationSheet } from "@/components/pr/PrShiftCancellationSheet";
import { PrShiftStatusPanel } from "@/components/pr/PrShiftStatusPanel";
import { PrShiftOutletBriefCard } from "@/components/pr/PrShiftOutletBrief";
import { getPrShiftOutletBrief, getPrCheckInAssignmentLabel } from "@/lib/pr-shift-outlet";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrStatusPill } from "@/components/pr/PrOfferRow";
import { useStore } from "@/lib/store";
import { findAgencyRosterTonight, resolvePrShiftOfferForPr } from "@/lib/pr-session";
import { evaluateShiftCancellation, CANCEL_RULES } from "@/lib/pr-schedule-cancellation";
import { findOutletShiftForPr, tierSalesTargetForPr } from "@/lib/outlet-demo";
import { SHIFT_TODAY, fmtDFriendly, getPrRosterId, PR_SHIFT_OFFERS } from "@/lib/pr-demo";
import {
  calcDutyWagesFromOutlet,
  receiptItemsForShift,
  shiftDurationLabel,
  shiftPayoutTotal,
} from "@/lib/pr-shift-status";
import { Calendar, Check, MapPin } from "lucide-react";
import { GEOFENCE_METERS } from "@/lib/gps-locations";
import { geofenceReminderMessage, verifyCheckInGeofence } from "@/lib/pr-check-in-geofence";
import { formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/tonight")({
  component: AttendancePage,
});

function AttendancePage() {
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const prCheckIn = useStore((s) => s.prCheckIn);
  const prCheckOut = useStore((s) => s.prCheckOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const acceptedShiftIndex = useStore((s) => s.acceptedShiftIndex);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);
  const cancelPrShift = useStore((s) => s.cancelPrShift);
  const prSubRole = useStore((s) => s.prSubRole);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shifts = useStore((s) => s.shifts);
  const prMarketplaceApplication = useStore((s) => s.prMarketplaceApplication);

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [geofenceHint, setGeofenceHint] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const td = SHIFT_TODAY;
  const todayFriendly = fmtDFriendly(td[0], td[1], td[2]);
  const prId = getPrRosterId(prSubRole);

  const rosterSlot = useMemo(
    () => findAgencyRosterTonight(agencyRoster, prId),
    [agencyRoster, prId],
  );

  const shiftOffer = useMemo(
    () =>
      resolvePrShiftOfferForPr(
        agencyRoster,
        prId,
        acceptedShiftIndex,
        shifts,
      ),
    [agencyRoster, prId, acceptedShiftIndex, shifts],
  );
  const venueName = shiftOffer.outlet;
  const attendanceSession = prActiveShift ?? prCheckInMeta.closedShift ?? null;
  const dutyEstimate = calcDutyWagesFromOutlet(
    venueName,
    shiftOffer.time,
    attendanceSession?.overtimeMinutes ?? 0,
  );
  const baseWages =
    prActiveShift?.baseWages ?? prCheckInMeta.closedShift?.baseWages ?? dutyEstimate.wages;
  const shiftScans = useMemo(
    () => receiptItemsForShift(attendanceSession, prReceiptScans),
    [attendanceSession, prReceiptScans],
  );
  const runningPayout = shiftPayoutTotal(baseWages, shiftScans);

  const prAgencyRow = agencyPRs.find((p) => p.id === prId);
  const prTier = prAgencyRow?.trainingLevel;

  const outletShift = useMemo(
    () =>
      findOutletShiftForPr(
        shifts,
        venueName,
        prId,
        prMarketplaceApplication?.shiftId,
      ),
    [shifts, venueName, prId, prMarketplaceApplication?.shiftId],
  );
  const tierSalesTargetRm = useMemo(
    () => tierSalesTargetForPr(outletShift?.tierRates, prTier),
    [outletShift?.tierRates, prTier],
  );

  const enRoute = rosterSlot?.status === "en-route";

  const cancelEval = useMemo(() => {
    const slot = rosterSlot ?? findAgencyRosterTonight(agencyRoster, prId);
    if (!slot) return null;
    return evaluateShiftCancellation(
      new Date(),
      slot.dateIso,
      slot.shiftStart,
      slot.estPayout ?? CANCEL_RULES.defaultDailyWagesRm,
    );
  }, [agencyRoster, prId, rosterSlot]);

  const outletBrief = useMemo(
    () =>
      getPrShiftOutletBrief(shiftOffer, {
        shiftDateLabel: todayFriendly,
        rosterSlot,
      }),
    [shiftOffer, todayFriendly, rosterSlot],
  );

  const statusLabel = !shiftAccepted
    ? "No shift"
    : checkedIn && !checkedOut
      ? "On duty"
      : checkedOut
        ? "Complete"
        : enRoute
          ? "En route"
          : "Booked";

  const completeCheckIn = async () => {
    setCheckingLocation(true);
    setGeofenceHint(null);
    const result = await verifyCheckInGeofence(venueName);
    setCheckingLocation(false);
    if (result.ok) {
      setGeofenceHint(null);
      prCheckIn({ prCoord: result.prCoord });
      return;
    }
    const reminder = geofenceReminderMessage(result);
    setGeofenceHint(reminder);
    prCheckIn({ skipGeofence: true, geofenceReminder: reminder });
  };

  const completeCheckOut = () => {
    prCheckOut();
  };

  const startHold = (forCheckout: boolean) => {
    setHolding(true);
    let p = 0;
    const id = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setHolding(false);
        setProgress(0);
        setTimeout(() => (forCheckout ? completeCheckOut() : completeCheckIn()), 300);
      }
    }, 60);
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (cancelOpen) {
            setCancelOpen(false);
            return;
          }
          return false;
        }}
        backLabel={cancelOpen ? "Attendance" : undefined}
      />

      {shiftAccepted ? (
        <div className="pt-1">
          <PrShiftOutletBriefCard
            brief={outletBrief}
            assignmentLabel={getPrCheckInAssignmentLabel(rosterSlot)}
            pageLabel="Attendance"
            statusLabel={statusLabel}
          />
        </div>
      ) : (
        <>
          <PrPageHeader
            label="Attendance"
            title="Check in"
            meta="Your agency assigns shifts — check in when assigned."
          />
          <p className="iz-tiny iz-muted mt-2">
            Outlets may request a specific PR, but assignment is confirmed by your agency only.
          </p>
        </>
      )}

      <div className="pt-3">
        {!shiftAccepted && (
          <div className="iz-pr-note py-6 text-center">
            <Calendar className="mx-auto mb-2 h-5 w-5 text-[var(--iz-muted)]" />
            <p className="iz-sm iz-muted">Your agency will assign your shift — check in when assigned.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link to="/host" className="iz-btn iz-btn-soft iz-btn-sm w-auto">
                View schedule
              </Link>
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm w-auto"
                onClick={demoPrShiftIn}
              >
                Demo shift in
              </button>
            </div>
          </div>
        )}

        {shiftAccepted && !checkedIn && (
          <>
            <HoldButton
              label={checkingLocation ? "Checking location…" : "Check in"}
              icon={<MapPin className="h-4 w-4" />}
              holding={holding}
              progress={progress}
              disabled={checkingLocation}
              onPress={() => startHold(false)}
            />
            <p className="iz-tiny iz-muted2 mt-2 text-center">
              Reminder: at the venue, check-in is only allowed within {GEOFENCE_METERS}m of{" "}
              {venueName}
            </p>
            {geofenceHint && (
              <p className="iz-tiny mt-1 text-center text-[var(--iz-amber)]">{geofenceHint}</p>
            )}
            <button
              type="button"
              className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full"
              onClick={() => setCancelOpen(true)}
            >
              Cancel shift
            </button>
          </>
        )}

        {shiftAccepted && checkedIn && !checkedOut && (
          <>
            <PrShiftStatusPanel
              session={prActiveShift}
              scans={prReceiptScans}
              baseWages={baseWages}
              checkedOut={false}
              tierSalesTargetRm={tierSalesTargetRm}
              prTier={prTier}
            />
            <HoldButton
              label="Check out"
              icon={<MapPin className="h-4 w-4" />}
              holding={holding}
              progress={progress}
              onPress={() => startHold(true)}
            />
          </>
        )}

        {shiftAccepted && checkedOut && attendanceSession && (
          <>
            <div className="iz-pr-hero mb-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <PrStatusPill variant="green">
                <Check className="h-3 w-3" /> Complete
              </PrStatusPill>
            </div>
            <PrShiftStatusPanel
              session={attendanceSession}
              scans={prReceiptScans}
              baseWages={baseWages}
              checkedOut
              tierSalesTargetRm={tierSalesTargetRm}
              prTier={prTier}
            />
            <div className="iz-pr-shift-status__summary mt-3 rounded-xl border border-[var(--iz-line)] bg-white/[0.02] p-3">
              <div className="iz-between iz-tiny">
                <span className="iz-muted">Final payout</span>
                <span className="font-sora font-bold text-[var(--iz-gold)]">
                  {formatRM(runningPayout)}
                </span>
              </div>
              {attendanceSession.overtimeMinutes != null &&
                attendanceSession.overtimeMinutes > 0 && (
                  <p className="iz-tiny iz-muted2 mt-1">
                    Duration {shiftDurationLabel(attendanceSession)} incl. +
                    {attendanceSession.overtimeMinutes}m OT
                  </p>
                )}
            </div>
            <p className="iz-tiny iz-muted2 mt-3 text-center">
              Shift progress is saved — reset from the welcome screen when you need a fresh demo.
            </p>
          </>
        )}

        {shiftAccepted && checkedOut && !attendanceSession && (
          <>
            <div className="iz-pr-hero mb-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <PrStatusPill variant="green">
                <Check className="h-3 w-3" /> Complete
              </PrStatusPill>
              <div className="mt-3 space-y-1.5">
                <div className="iz-between iz-tiny">
                  <span className="iz-muted">Final payout</span>
                  <b className="text-[var(--iz-gold)]">{formatRM(runningPayout)}</b>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <PrShiftCancellationSheet
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setCancelReason("");
        }}
        title="Cancel shift?"
        outlet={rosterSlot?.outlet ?? venueName}
        dateLine={rosterSlot?.date ?? todayFriendly}
        shiftLine={rosterSlot?.shift ?? shiftOffer.time}
        evaluation={cancelEval}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onSubmit={() => {
          cancelPrShift(cancelReason);
          setCancelOpen(false);
          setCancelReason("");
        }}
        submitLabel={
          cancelEval && cancelEval.deductionRm > 0
            ? `Cancel & accept −RM ${cancelEval.deductionRm}`
            : "Cancel shift"
        }
      />
    </div>
  );
}

function HoldButton({
  label,
  icon,
  holding,
  progress,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  holding: boolean;
  progress: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={disabled ? undefined : onPress}
      disabled={holding || disabled}
      className="iz-btn iz-btn-primary relative mt-3 w-full overflow-hidden"
    >
      <span
        className="absolute inset-y-0 left-0 bg-white/20 transition-all"
        style={{ width: `${progress}%` }}
      />
      <span className="relative flex items-center justify-center gap-2">
        {icon} {holding ? `Holding ${progress}%` : label}
      </span>
    </button>
  );
}
