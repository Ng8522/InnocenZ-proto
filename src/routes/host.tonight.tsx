import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { PrDuringShiftExtras } from "@/components/pr/PrDuringShiftExtras";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrStatusPill } from "@/components/pr/PrOfferRow";
import { useStore } from "@/lib/store";
import { SHIFT_TODAY, addDay, fmtDFriendly, fmtDShort } from "@/lib/pr-demo";
import { Calendar, Camera, Check, ExternalLink, MapPin } from "lucide-react";
import { formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/tonight")({
  component: AttendancePage,
});

type CheckPhase = "idle" | "selfie" | "ready";

function AttendancePage() {
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const drinks = useStore((s) => s.drinks);
  const tables = useStore((s) => s.tables);
  const prCheckIn = useStore((s) => s.prCheckIn);
  const prCheckOut = useStore((s) => s.prCheckOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const prCheckInMeta = useStore((s) => s.prCheckInMeta);
  const cancelPrShift = useStore((s) => s.cancelPrShift);
  const demoPrShiftIn = useStore((s) => s.demoPrShiftIn);
  const simulatePrNoShow = useStore((s) => s.simulatePrNoShow);
  const simulatePrLate = useStore((s) => s.simulatePrLate);
  const toast = useStore((s) => s.toast);
  const prSubRole = useStore((s) => s.prSubRole);
  const isFreelancer = prSubRole === "pr_free";

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checkPhase, setCheckPhase] = useState<CheckPhase>("idle");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [pendingCheckOut, setPendingCheckOut] = useState(false);
  const selfieRef = useRef<HTMLInputElement>(null);

  const td = SHIFT_TODAY;
  const nx = addDay(td[0], td[1], td[2]);
  const todayFriendly = fmtDFriendly(td[0], td[1], td[2]);
  const todayShort = fmtDShort(td[0], td[1], td[2]);
  const nextShort = fmtDShort(nx[0], nx[1], nx[2]);
  const salesTotal = drinks * 15 + tables * 60;
  const runningPayout = 350 + salesTotal;
  const mapsUrl = "https://www.google.com/maps?q=3.1478,101.7005";

  const gpsOutOfRange = !!prCheckInMeta.gpsFallback;
  const statusLabel = !shiftAccepted ? "No shift" : !checkedIn ? "Pre check-in" : !checkedOut ? "On duty" : "Complete";

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

      <PrPageHeader label="Attendance" title="Velvet 23" meta={`${todayFriendly} · 9 PM – 2 AM`} />

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Status</div>
          <div className="n text-[var(--iz-gold-l)]">{statusLabel}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Payout</div>
          <div className="n text-[var(--iz-gold)]">{formatRM(runningPayout)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Sales</div>
          <div className="n">{drinks + tables}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">GPS</div>
          <div className={`n ${gpsOutOfRange ? "text-[var(--iz-amber)]" : "text-[var(--iz-green)]"}`}>
            {gpsOutOfRange ? "Fail" : "32 m"}
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
              <span className="iz-ping" style={{ left: "50%", top: "50%" }} />
              <span className="iz-tiny iz-muted absolute bottom-2 left-2.5">Geofence 50 m</span>
            </div>
            <div className="iz-between mb-2">
              <span className="iz-tiny iz-muted">Distance to venue</span>
              <PrStatusPill variant={gpsOutOfRange ? "amber" : "green"}>{gpsOutOfRange ? "Out of range" : "In range"}</PrStatusPill>
            </div>
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
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="iz-outlet-quick-chip mt-2 inline-flex">
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
            <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-full" onClick={demoPrShiftIn}>
              Demo shift in
            </button>
            <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm mt-2 w-full" onClick={() => setCancelOpen(true)}>
              Cancel shift
            </button>
          </>
        )}

        {shiftAccepted && checkedIn && !checkedOut && (
          <>
            <div className="iz-pr-hero mb-3">
              <div className="iz-between">
                <PrStatusPill variant="green"><Check className="h-3 w-3" /> On duty</PrStatusPill>
                <span className="iz-tiny iz-muted">{todayShort} · 21:04{prCheckInMeta.late && " · Late"}</span>
              </div>
              {prCheckInMeta.selfieDataUrl && (
                <img src={prCheckInMeta.selfieDataUrl} alt="" className="mt-2 h-12 w-12 rounded-lg object-cover" />
              )}
              {prActiveShift && (
                <p className="iz-tiny iz-muted mt-2">PV {prActiveShift.pvId} · {prActiveShift.receiptIds.length} receipt(s)</p>
              )}
            </div>
            <PrDuringShiftExtras />
            <HoldButton label="Check out" icon={<MapPin className="h-4 w-4" />} holding={holding} progress={progress} onPress={() => startHold(true)} />
          </>
        )}

        {shiftAccepted && checkedOut && (
          <>
            <div className="iz-pr-hero mb-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <PrStatusPill variant="green"><Check className="h-3 w-3" /> Complete</PrStatusPill>
              <div className="mt-3 space-y-1.5">
                <div className="iz-between iz-tiny"><span className="iz-muted">Time in</span><b>{todayShort} · 21:04</b></div>
                <div className="iz-between iz-tiny"><span className="iz-muted">Time out</span><b>{nextShort} · 02:11</b></div>
                <div className="iz-between iz-tiny"><span className="iz-muted">Overtime</span><b className="text-[var(--iz-gold)]">+11m</b></div>
                <div className="iz-between iz-tiny border-t border-[var(--iz-line)] pt-2">
                  <span>Final payout</span>
                  <span className="font-sora font-bold text-[var(--iz-gold)]">{formatRM(runningPayout)}</span>
                </div>
              </div>
            </div>
            <Link
              to={isFreelancer ? "/host/wallet" : "/host/history"}
              search={isFreelancer ? undefined : { tab: "pv" }}
              className="iz-btn iz-btn-primary"
            >
              {isFreelancer ? "Vouchers" : "Review PV"}
            </Link>
            <p className="iz-tiny iz-muted2 mt-3 text-center">
              Shift progress is saved — reset from the welcome screen when you need a fresh demo.
            </p>
          </>
        )}
      </div>

      <IzSheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="iz-cardttl">Cancel shift?</div>
        <p className="iz-tiny iz-muted mb-3">Less than 2 hours before start incurs a penalty flag.</p>
        <button type="button" className="iz-btn iz-btn-danger" onClick={() => { cancelPrShift(); setCancelOpen(false); }}>
          Cancel & accept penalty
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
