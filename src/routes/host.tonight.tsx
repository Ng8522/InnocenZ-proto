import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { PrDuringShiftExtras } from "@/components/pr/PrDuringShiftExtras";
import { PrShiftStatusPanel } from "@/components/pr/PrShiftStatusPanel";
import { PrShiftOutletBriefCard } from "@/components/pr/PrShiftOutletBrief";
import { getPrShiftOutletBrief } from "@/lib/pr-shift-outlet";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrStatusPill } from "@/components/pr/PrOfferRow";
import { useStore } from "@/lib/store";
import { outletMatches } from "@/lib/portal-sync";
import { findAgencyRosterTonight } from "@/lib/pr-session";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { evaluateShiftCancellation, CANCEL_RULES } from "@/lib/pr-schedule-cancellation";
import { SHIFT_TODAY, fmtDFriendly, getPrRosterId, PR_SHIFT_OFFERS } from "@/lib/pr-demo";
import { aggregateShiftSales, calcDutyWagesFromOutlet, receiptItemsForShift, shiftDurationLabel, shiftPayoutTotal } from "@/lib/pr-shift-status";
import { Calendar, Camera, Check, ExternalLink, MapPin, Navigation } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import {
  GEOFENCE_METERS,
  computePrCheckInGpsState,
  formatDistanceMeters,
  prGpsPingOffset,
} from "@/lib/gps-locations";

export const Route = createFileRoute("/host/tonight")({
  component: AttendancePage,
});

type CheckPhase = "idle" | "selfie" | "ready";

function AttendancePage() {
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const prCheckIn = useStore((s) => s.prCheckIn);
  const prMarkEnRoute = useStore((s) => s.prMarkEnRoute);
  const prCheckOut = useStore((s) => s.prCheckOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const acceptedShiftIndex = useStore((s) => s.acceptedShiftIndex);
  const agencyRoster = useStore((s) => s.agencyRoster);
  const cancelPrShift = useStore((s) => s.cancelPrShift);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);
  const demoPrEnRoute = useStore((s) => s.demoPrEnRoute);
  const simulatePrNoShow = useStore((s) => s.simulatePrNoShow);
  const simulatePrLate = useStore((s) => s.simulatePrLate);
  const toast = useStore((s) => s.toast);
  const prSubRole = useStore((s) => s.prSubRole);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const isFreelancer = prSubRole === "pr_free";

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checkPhase, setCheckPhase] = useState<CheckPhase>("idle");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [pendingCheckOut, setPendingCheckOut] = useState(false);
  const selfieRef = useRef<HTMLInputElement>(null);

  const td = SHIFT_TODAY;
  const todayFriendly = fmtDFriendly(td[0], td[1], td[2]);
  const shiftOffer = PR_SHIFT_OFFERS[acceptedShiftIndex ?? 0] ?? PR_SHIFT_OFFERS[0];
  const venueName = shiftOffer.outlet;
  const attendanceSession = prActiveShift ?? prCheckInMeta.closedShift ?? null;
  const dutyEstimate = calcDutyWagesFromOutlet(venueName, shiftOffer.time, attendanceSession?.overtimeMinutes ?? 0);
  const baseWages = prActiveShift?.baseWages ?? prCheckInMeta.closedShift?.baseWages ?? dutyEstimate.wages;
  const shiftScans = useMemo(
    () => receiptItemsForShift(attendanceSession, prReceiptScans),
    [attendanceSession, prReceiptScans],
  );
  const shiftSales = useMemo(() => aggregateShiftSales(shiftScans), [shiftScans]);
  const runningCommission = shiftSales.commissionTotal;
  const runningPayout = shiftPayoutTotal(baseWages, shiftScans);

  const prId = getPrRosterId(prSubRole);
  const prAgencyRow = agencyPRs.find((p) => p.id === prId);

  const gpsOutOfRange = !!prCheckInMeta.gpsFallback;
  const rosterSlot = useMemo(() => {
    return agencyRoster.find(
      (s) =>
        s.prId === prId &&
        s.dateIso === DEFAULT_ROSTER_DATE_ISO &&
        outletMatches(s.outlet, venueName),
    );
  }, [agencyRoster, prId, venueName]);
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

  const gpsState = useMemo(
    () =>
      computePrCheckInGpsState({
        prId,
        outlet: venueName,
        phase: enRoute ? "en-route" : "booked",
        homePlace: prAgencyRow?.place ?? "KL",
        gpsFallback: gpsOutOfRange,
      }),
    [prId, venueName, enRoute, prAgencyRow?.place, gpsOutOfRange],
  );

  const outletBrief = useMemo(
    () =>
      getPrShiftOutletBrief(shiftOffer, {
        shiftDateLabel: todayFriendly,
        rosterSlot,
        prCoord: gpsState.prCoord,
      }),
    [shiftOffer, todayFriendly, rosterSlot, gpsState.prCoord],
  );

  const pingPos = prGpsPingOffset(gpsState.meters, gpsState.inRange, prId);
  const rangePct = Math.min(100, (gpsState.meters / Math.max(gpsState.geofenceMeters * 4, 200)) * 100);
  const fencePct = (gpsState.geofenceMeters / Math.max(gpsState.geofenceMeters * 4, 200)) * 100;
  const statusLabel = !shiftAccepted
    ? "No shift"
    : checkedIn && !checkedOut
      ? "On duty"
      : checkedOut
        ? "Complete"
        : enRoute
          ? "En route"
          : "Booked";

  const completeCheckIn = () => {
    prCheckIn({
      selfieDataUrl: selfieUrl ?? undefined,
      gpsFallback: prCheckInMeta.gpsFallback,
      simulateLate: prCheckInMeta.late,
    });
    setCheckPhase("idle");
    setSelfieUrl(null);
  };

  const completeCheckOut = () => {
    prCheckOut();
    setCheckPhase("idle");
    setSelfieUrl(null);
    setPendingCheckOut(false);
  };

  const startHold = (forCheckout: boolean) => {
    if (!selfieUrl && checkPhase !== "ready") {
      setPendingCheckOut(forCheckout);
      setCheckPhase("selfie");
      return;
    }
    setHolding(true);
    let p = 0;
    const id = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setHolding(false);
        setProgress(0);
        toast("Validating GPS — hold steady", "info");
        setTimeout(() => (forCheckout ? completeCheckOut() : completeCheckIn()), 800);
      }
    }, 60);
  };

  const onSelfiePicked = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setSelfieUrl(r.result as string);
      setCheckPhase("ready");
    };
    r.readAsDataURL(file);
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (cancelOpen) {
            setCancelOpen(false);
            return;
          }
          if (checkPhase === "selfie") {
            setCheckPhase("idle");
            return;
          }
          return false;
        }}
        backLabel={cancelOpen || checkPhase === "selfie" ? "Attendance" : undefined}
      />

      <PrPageHeader label="Attendance" title={venueName} meta={`${todayFriendly} · ${shiftOffer.time}`} />

      {shiftAccepted && (
        <div className="mt-3">
          <PrShiftOutletBriefCard
            brief={outletBrief}
            assignmentLabel={rosterSlot ? "Outlet assigned · Atlas Agency" : "Tonight's shift"}
          />
        </div>
      )}

      {!shiftAccepted && (
        <p className="iz-tiny iz-muted mt-3">Accept a shift to see your assigned outlet briefing.</p>
      )}

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Status</div>
          <div className="n text-[var(--iz-gold-l)]">{statusLabel}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Wages</div>
          <div className="n text-[var(--iz-violet-l)]">{formatRM(baseWages)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Commission</div>
          <div className="n text-[var(--iz-gold-l)]">{formatRM(runningCommission)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Payout</div>
          <div className="n text-[var(--iz-gold)]">{formatRM(runningPayout)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Sales</div>
          <div className="n text-[11px] leading-tight">
            D {shiftSales.drinkUnits} · T {shiftSales.tipRm}
          </div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">GPS</div>
          <div className={`n ${gpsState.inRange ? "text-[var(--iz-green)]" : "text-[var(--iz-amber)]"}`}>
            {formatDistanceMeters(gpsState.meters)}
          </div>
        </div>
      </div>

      <div className="pt-3">
        {!shiftAccepted && (
          <div className="iz-pr-note py-6 text-center">
            <Calendar className="mx-auto mb-2 h-5 w-5 text-[var(--iz-muted)]" />
            <p className="iz-sm iz-muted">Accept a shift to enable check-in.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link to="/host" className="iz-btn iz-btn-soft iz-btn-sm w-auto">Browse shifts</Link>
              <button type="button" className="iz-btn iz-btn-soft iz-btn-sm w-auto" onClick={demoPrShiftIn}>
                Demo shift in
              </button>
            </div>
          </div>
        )}

        {shiftAccepted && !checkedIn && (
          <>
            <div className="iz-gps-map mb-3" style={{ height: 120 }}>
              <span className="iz-gps-map-venue" aria-hidden />
              <span className="iz-gps-map-geofence" aria-hidden />
              <span
                className={`iz-ping${gpsState.inRange ? " live" : enRoute ? " en-route" : ""}`}
                style={{ left: pingPos.left, top: pingPos.top }}
              />
              <span className="iz-tiny iz-muted absolute bottom-2 left-2.5">Geofence {GEOFENCE_METERS} m</span>
              <span className="iz-tiny absolute bottom-2 right-2.5 font-semibold text-[var(--iz-muted2)]">
                {venueName}
              </span>
            </div>
            {enRoute ? (
              <div className="mb-3 rounded-xl border border-[rgba(139,92,246,.35)] bg-[rgba(139,92,246,.08)] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5 shrink-0 text-[var(--iz-violet-l)]" />
                  <p className="text-xs font-semibold text-[var(--iz-violet-l)]">En route to {venueName}</p>
                </div>
                <p className="iz-tiny iz-muted mt-0.5">
                  Outlet sees you on Live GPS. Check in when you are within {GEOFENCE_METERS} m of the venue.
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm mb-3 w-full"
                onClick={() => prMarkEnRoute()}
              >
                <MapPin className="h-3.5 w-3.5" /> Head to venue
              </button>
            )}

            <div className="iz-pr-gps-distance-card mb-2">
              <div className="iz-between items-start gap-3">
                <div className="min-w-0">
                  <div className="iz-tiny iz-muted">Distance to venue</div>
                  <div className="font-sora text-2xl font-extrabold leading-tight text-[var(--iz-gold-l)]">
                    {formatDistanceMeters(gpsState.meters)}
                  </div>
                  <div className="iz-tiny iz-muted2 mt-1">
                    {enRoute
                      ? `Heading to ${venueName} · outlet tracking live`
                      : `At home · tap Head to venue when you leave`}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <PrStatusPill variant={gpsState.inRange ? "green" : gpsOutOfRange || enRoute ? "amber" : "ink"}>
                    {gpsState.inRange ? "In range" : gpsOutOfRange ? "Out of range" : enRoute ? "On route" : "Not departed"}
                  </PrStatusPill>
                  <div className="iz-tiny iz-muted2 mt-1.5">
                    ≤ {GEOFENCE_METERS} m to check in
                  </div>
                </div>
              </div>
              <div className="iz-pr-gps-range-bar mt-3" aria-hidden>
                <div className="iz-pr-gps-range-fill" style={{ width: `${rangePct}%` }} />
                <div className="iz-pr-gps-range-fence" style={{ left: `${fencePct}%` }} title={`${GEOFENCE_METERS} m geofence`} />
              </div>
              <div className="iz-between iz-tiny iz-muted2 mt-1">
                <span>You</span>
                <span>{GEOFENCE_METERS} m zone</span>
                <span>{venueName}</span>
              </div>
            </div>

            <a
              href={outletBrief.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="iz-outlet-quick-chip mb-2 inline-flex w-full justify-center"
            >
              <ExternalLink className="h-3 w-3" /> Open directions in Maps
            </a>
            <button
              type="button"
              className="iz-tiny text-[var(--iz-blue)] underline-offset-2 hover:underline"
              onClick={() => {
                const next = !gpsOutOfRange;
                useStore.setState((st) => ({
                  prCheckInMeta: { ...st.prCheckInMeta, gpsFallback: next },
                }));
                toast(next ? "GPS fail simulated — maps fallback required" : "GPS lock restored", next ? "warn" : "info");
              }}
            >
              {gpsOutOfRange ? "Simulate GPS lock" : "Simulate GPS fail"}
            </button>
            {gpsOutOfRange && (
              <a href={outletBrief.mapsUrl} target="_blank" rel="noreferrer" className="iz-outlet-quick-chip mt-2 inline-flex">
                <ExternalLink className="h-3 w-3" /> Maps fallback
              </a>
            )}
            <label className="iz-tiny mt-3 flex cursor-pointer items-center gap-2.5 text-[var(--iz-txt)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--iz-gold)]"
                checked={!!prCheckInMeta.late}
                onChange={(e) => simulatePrLate(e.target.checked)}
              />
              Simulate late (+15 min)
            </label>
            {prCheckInMeta.late && (
              <p className="iz-tiny mt-2 rounded-lg border border-[rgba(244,183,64,.35)] bg-[rgba(244,183,64,.08)] px-2.5 py-1.5 text-[var(--iz-amber)]">
                Late flag active — +15 min past shift start · visible on agency roster
              </p>
            )}
            {prCheckInMeta.noShowRisk && (
              <p className="iz-tiny mt-2 rounded-lg border border-[rgba(255,107,107,.35)] bg-[var(--iz-red-bg)] px-2.5 py-1.5 text-[var(--iz-red)]">
                No-show risk flagged — +30 min past shift start without check-in
              </p>
            )}
            <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full" onClick={simulatePrNoShow}>
              Simulate no-show (+30 min)
            </button>
            <HoldButton label="Check in" icon={<MapPin className="h-4 w-4" />} holding={holding} progress={progress} onPress={() => startHold(false)} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="iz-btn iz-btn-soft iz-btn-sm flex-1" onClick={demoPrEnRoute}>
                Demo: en route
              </button>
              <button type="button" className="iz-btn iz-btn-soft iz-btn-sm flex-1" onClick={demoPrShiftIn}>
                Demo: check in
              </button>
            </div>
            <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full" onClick={() => setCancelOpen(true)}>
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
            />
            <PrDuringShiftExtras />
            <HoldButton label="Check out" icon={<MapPin className="h-4 w-4" />} holding={holding} progress={progress} onPress={() => startHold(true)} />
          </>
        )}

        {shiftAccepted && checkedOut && attendanceSession && (
          <>
            <div className="iz-pr-hero mb-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <PrStatusPill variant="green"><Check className="h-3 w-3" /> Complete</PrStatusPill>
            </div>
            <PrShiftStatusPanel
              session={attendanceSession}
              scans={prReceiptScans}
              baseWages={baseWages}
              checkedOut
            />
            <div className="iz-pr-shift-status__summary mt-3 rounded-xl border border-[var(--iz-line)] bg-white/[0.02] p-3">
              <div className="iz-between iz-tiny">
                <span className="iz-muted">Final payout</span>
                <span className="font-sora font-bold text-[var(--iz-gold)]">{formatRM(runningPayout)}</span>
              </div>
              {attendanceSession.overtimeMinutes != null && attendanceSession.overtimeMinutes > 0 && (
                <p className="iz-tiny iz-muted2 mt-1">
                  Duration {shiftDurationLabel(attendanceSession)} incl. +{attendanceSession.overtimeMinutes}m OT
                </p>
              )}
            </div>
            <Link
              to="/host/PaymentVoucher"
              search={isFreelancer ? undefined : { pvId: attendanceSession.pvId }}
              className="iz-btn iz-btn-primary mt-3"
            >
              Payment
            </Link>
            <p className="iz-tiny iz-muted2 mt-3 text-center">
              Shift progress is saved — reset from the welcome screen when you need a fresh demo.
            </p>
          </>
        )}

        {shiftAccepted && checkedOut && !attendanceSession && (
          <>
            <div className="iz-pr-hero mb-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <PrStatusPill variant="green"><Check className="h-3 w-3" /> Complete</PrStatusPill>
              <div className="mt-3 space-y-1.5">
                <div className="iz-between iz-tiny"><span className="iz-muted">Final payout</span><b className="text-[var(--iz-gold)]">{formatRM(runningPayout)}</b></div>
              </div>
            </div>
            <Link to="/host/PaymentVoucher" className="iz-btn iz-btn-primary">Payment</Link>
          </>
        )}
      </div>

      <IzSheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="iz-cardttl">Cancel shift?</div>
        {cancelEval ? (
          <>
            <p className="text-sm font-semibold mb-1">{cancelEval.headline}</p>
            <p className="iz-tiny iz-muted mb-3">{cancelEval.detail}</p>
          </>
        ) : (
          <p className="iz-tiny iz-muted mb-3">Less than 2 hours before start incurs a wage deduction.</p>
        )}
        <button type="button" className="iz-btn iz-btn-danger" onClick={() => { cancelPrShift(); setCancelOpen(false); }}>
          {cancelEval && cancelEval.deductionRm > 0
            ? `Cancel & accept −RM ${cancelEval.deductionRm}`
            : "Cancel shift"}
        </button>
      </IzSheet>

      <IzSheet open={checkPhase === "selfie"} onClose={() => setCheckPhase("idle")}>
        <div className="iz-cardttl">Selfie required</div>
        <input ref={selfieRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => onSelfiePicked(e.target.files?.[0])} />
        {selfieUrl ? (
          <img src={selfieUrl} alt="" className="mx-auto max-h-48 rounded-xl object-cover" />
        ) : (
          <button type="button" className="iz-btn iz-btn-primary" onClick={() => selfieRef.current?.click()}>
            <Camera className="h-4 w-4" /> Capture selfie
          </button>
        )}
        {selfieUrl && (
          <button type="button" className="iz-btn iz-btn-primary mt-3" onClick={() => startHold(pendingCheckOut)}>
            Continue to GPS hold
          </button>
        )}
      </IzSheet>
    </div>
  );
}

function HoldButton({
  label,
  icon,
  holding,
  progress,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  holding: boolean;
  progress: number;
  onPress: () => void;
}) {
  return (
    <button type="button" onPointerDown={onPress} disabled={holding} className="iz-btn iz-btn-primary relative mt-3 w-full overflow-hidden">
      <span className="absolute inset-y-0 left-0 bg-white/20 transition-all" style={{ width: `${progress}%` }} />
      <span className="relative flex items-center justify-center gap-2">
        {icon} {holding ? `Holding ${progress}%` : label}
      </span>
    </button>
  );
}
