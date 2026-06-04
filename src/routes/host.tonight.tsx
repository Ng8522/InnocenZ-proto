import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import { SHIFT_TODAY, addDay, fmtDFriendly, fmtDShort } from "@/lib/pr-demo";
import { Calendar, Check, MapPin, ScanLine, Shield } from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/tonight")({
  component: AttendancePage,
});

function AttendancePage() {
  const shiftAccepted = useStore((s) => s.shiftAccepted);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const drinks = useStore((s) => s.drinks);
  const tables = useStore((s) => s.tables);
  const prCheckIn = useStore((s) => s.prCheckIn);
  const prCheckOut = useStore((s) => s.prCheckOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const cancelPrShift = useStore((s) => s.cancelPrShift);
  const resetPrShift = useStore((s) => s.resetPrShift);
  const toast = useStore((s) => s.toast);
  const prSubRole = useStore((s) => s.prSubRole);
  const isFreelancer = prSubRole === "pr_free";

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);

  const td = SHIFT_TODAY;
  const nx = addDay(td[0], td[1], td[2]);
  const todayFriendly = fmtDFriendly(td[0], td[1], td[2]);
  const todayShort = fmtDShort(td[0], td[1], td[2]);
  const nextShort = fmtDShort(nx[0], nx[1], nx[2]);
  const salesTotal = drinks * 15 + tables * 60;
  const runningPayout = 350 + salesTotal;

  const startHold = (cb: () => void) => {
    setHolding(true);
    let p = 0;
    const id = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setHolding(false);
        setProgress(0);
        toast("Validating GPS? hold steady", "info");
        setTimeout(cb, 800);
      }
    }, 60);
  };

  const dateBanner = (
    <IzCard
      flat
      className="mb-2.5 border-[rgba(232,194,122,.25)] bg-[linear-gradient(180deg,rgba(232,194,122,.08),transparent)]"
    >
      <div className="iz-between">
        <div>
          <div className="iz-tiny iz-muted2 tracking-widest">CALENDAR DATE STAMP ? v3</div>
          <div className="font-sora iz-sm mt-0.5 font-bold text-[var(--iz-gold-l)]">{todayFriendly}</div>
        </div>
        <div className="text-right">
          <div className="iz-tiny iz-muted2 tracking-wide">SHIFT</div>
          <div className="iz-sm mt-0.5 font-semibold">9:00 PM ? 2:00 AM</div>
        </div>
      </div>
    </IzCard>
  );

  let body: React.ReactNode;

  if (!shiftAccepted) {
    body = (
      <IzCard flat className="py-8 text-center">
        <span className="iz-iconbox mx-auto mb-3">
          <Calendar className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <p className="iz-sm iz-muted">Accept a shift first to enable GPS check-in.</p>
        <Link to="/host" className="iz-btn iz-btn-soft iz-btn-sm mx-auto mt-3 w-auto">
          Browse shifts
        </Link>
      </IzCard>
    );
  } else if (!checkedIn) {
    body = (
      <>
        {dateBanner}
        <IzCard>
          <div className="iz-gps-map">
            <span className="iz-ping" style={{ left: "50%", top: "50%" }} />
            <span className="iz-tiny iz-muted absolute bottom-2 left-2.5">Velvet 23 ? geofence 50m</span>
          </div>
          <div className="iz-between mt-3">
            <span className="iz-sm iz-muted">Your distance to venue</span>
            <IzPill variant="green">32 m ? in range</IzPill>
          </div>
          <HoldButton
            label="Check-In (4s GPS hold + selfie)"
            icon={<MapPin className="h-4 w-4" />}
            holding={holding}
            progress={progress}
            onPress={() => startHold(prCheckIn)}
          />
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            Mandatory selfie proof ? Time-In locks immutably with date stamp
          </p>
        </IzCard>
        <button type="button" className="iz-btn iz-btn-ghost mt-2" onClick={() => setCancelOpen(true)}>
          Cancel this shift
        </button>
        <p className="iz-tiny iz-muted2 mt-2 text-center">Cancelling &lt; 2h before start incurs a penalty.</p>
      </>
    );
  } else if (!checkedOut) {
    body = (
      <>
        {dateBanner}
        <IzCard glow>
          <div className="iz-between">
            <IzPill variant="green">
              <Check className="h-3 w-3" /> ON-DUTY
            </IzPill>
            <span className="iz-tiny iz-muted">{todayShort} ? 21:04 ? locked</span>
          </div>
          <div className="iz-gps-map mt-2.5" style={{ height: 90 }}>
            <span className="iz-ping live" style={{ left: "50%", top: "50%" }} />
          </div>
        </IzCard>
        <IzCard className="mt-2.5">
          <p className="iz-sm iz-muted mb-2">Live earnings ticker</p>
          {prActiveShift && (
            <p className="iz-tiny text-[var(--iz-gold-l)] mb-2">
              Shift PV <b>{prActiveShift.pvId}</b> · {prActiveShift.receiptIds.length} receipt(s) attached
            </p>
          )}
          <div className="iz-grid2">
            <div className="iz-stat-tile">
              <div className="n text-[var(--iz-gold)]">{formatRM(runningPayout)}</div>
              <div className="l">Running payout</div>
            </div>
            <div className="iz-stat-tile">
              <div className="n">{drinks + tables}</div>
              <div className="l">Sales logged for you</div>
            </div>
          </div>
        </IzCard>
        <Link to="/host/scan" className="iz-btn iz-btn-soft mt-2.5">
          <ScanLine className="h-4 w-4" /> Scan receipt (logs to {prActiveShift?.pvId ?? "shift PV"})
        </Link>
        <HoldButton
          label="Check-Out (GPS + final selfie)"
          icon={<MapPin className="h-4 w-4" />}
          holding={holding}
          progress={progress}
          onPress={() => startHold(prCheckOut)}
        />
        <button type="button" className="iz-btn iz-btn-danger mt-2.5" onPointerDown={() => toast("SOS ? hold detected", "warn")}>
          Hold for SOS Emergency
        </button>
      </>
    );
  } else {
    body = (
      <>
        {dateBanner}
        <IzCard glow className="border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
          <div className="iz-between">
            <IzPill variant="green">
              <Check className="h-3 w-3" /> SHIFT COMPLETE
            </IzPill>
            <span className="iz-tiny iz-muted">{nextShort} ? 02:11</span>
          </div>
          <p className="iz-tiny iz-muted mt-2">
            Both Time-In & Time-Out captured with calendar dates. Attendance record locked & sent to your agency for
            payroll.
          </p>
        </IzCard>
        <IzCard className="mt-2.5">
          <div className="iz-v-sum">
            <span className="iz-muted">Time-In</span>
            <b className="font-sora">{todayShort} ? 21:04</b>
          </div>
          <div className="iz-v-sum">
            <span className="iz-muted">Time-Out</span>
            <b className="font-sora">{nextShort} ? 02:11</b>
          </div>
          <div className="iz-v-sum">
            <span className="iz-muted">Shift duration</span>
            <b>5h 07m</b>
          </div>
          <div className="iz-v-sum">
            <span className="iz-muted">Overtime (? v3 receipt-scan ts)</span>
            <b className="text-[var(--iz-gold)]">+11m</b>
          </div>
          <div className="iz-v-sum tot">
            <span>Final payout (est.)</span>
            <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(runningPayout)}</span>
          </div>
        </IzCard>
        <IzCard flat className="iz-tiny iz-muted mt-2.5">
          <Shield className="mr-1 inline h-3 w-3" />
          {isFreelancer
            ? "One PV per shift is generated at Time-Out from wages + every receipt you scanned while on duty."
            : "PV auto-generated at Time-Out — Time-In/Out, wages, tips & all shift receipts in one voucher."}
        </IzCard>
        <Link to="/host/wallet" className="iz-btn iz-btn-primary mt-2.5">
          Go to Vouchers
        </Link>
        <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={resetPrShift}>
          Reset demo
        </button>
      </>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">Attendance</h2>
      <div className="pt-2">{body}</div>

      <IzSheet open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <div className="iz-cardttl">Cancel this shift?</div>
        <IzCard flat className="mt-2 border-[rgba(255,107,107,.3)]">
          <p className="iz-sm font-bold text-[var(--iz-red)]">Cancellation policy</p>
          <p className="iz-tiny iz-muted mt-1.5">
            Cancelling less than 2 hours before start incurs a penalty flag. Repeated late cancellations and no-shows
            lower your reputation score.
          </p>
        </IzCard>
        <button
          type="button"
          className="iz-btn iz-btn-danger mt-3"
          onClick={() => {
            cancelPrShift();
            setCancelOpen(false);
          }}
        >
          Cancel shift & accept penalty
        </button>
        <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={() => setCancelOpen(false)}>
          Keep my shift
        </button>
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
    <button type="button" onPointerDown={onPress} disabled={holding} className="iz-btn iz-btn-primary relative mt-3 overflow-hidden">
      <span className="absolute inset-y-0 left-0 bg-white/20 transition-all" style={{ width: `${progress}%` }} />
      <span className="relative flex items-center justify-center gap-2">
        {icon} {holding ? `Holding ${progress}%` : label}
      </span>
    </button>
  );
}
