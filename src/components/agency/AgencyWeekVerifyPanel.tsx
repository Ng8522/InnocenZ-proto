import { useMemo } from "react";
import { BadgeCheck, Check, ShieldCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { IzCard, IzPill } from "@/components/iz/ui";
import { findWeekDayReview, pendingWeekDisputes } from "@/lib/pr-week-review";

/**
 * Agency verification for the running week: verify a PR's checked-out shift day
 * (locks that day's dispute window) and resolve PR disputes raised this week.
 */
export function AgencyWeekVerifyPanel() {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prWeekDayReviews = useStore((s) => s.prWeekDayReviews);
  const verifyPrWeekDay = useStore((s) => s.verifyPrWeekDay);
  const resolvePrWeekDispute = useStore((s) => s.resolvePrWeekDispute);

  const checkedOut = useMemo(
    () => agencyRoster.filter((s) => Boolean(s.checkedOutAt && s.prId)),
    [agencyRoster],
  );
  const disputes = useMemo(() => pendingWeekDisputes(prWeekDayReviews), [prWeekDayReviews]);
  const nameFor = (id: string) => agencyPRs.find((p) => p.id === id)?.name ?? id;

  if (checkedOut.length === 0 && disputes.length === 0) return null;

  return (
    <IzCard className="mb-3 border-[rgba(124,107,255,.35)]">
      <div className="iz-between mb-2">
        <span className="iz-sm flex items-center gap-1.5 font-bold">
          <ShieldCheck className="h-4 w-4 text-[var(--iz-violet-l)]" /> Verify shifts &amp; disputes
          (this week)
        </span>
      </div>

      {disputes.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="iz-tiny iz-muted2 tracking-wide">PENDING DISPUTES</p>
          {disputes.map((d) => (
            <div
              key={`${d.prId}-${d.dateIso}`}
              className="rounded-xl border border-[rgba(255,107,107,.35)] p-2.5"
            >
              <div className="iz-between gap-2">
                <span className="iz-sm font-bold">{nameFor(d.prId)}</span>
                <IzPill variant="red">Disputed</IzPill>
              </div>
              <p className="iz-tiny iz-muted mt-1">{d.dateIso}</p>
              <p className="iz-tiny iz-muted2 mt-1">Reason: {d.disputeReason}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="iz-btn iz-btn-primary iz-btn-sm"
                  onClick={() => resolvePrWeekDispute(d.prId, d.dateIso, true)}
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  type="button"
                  className="iz-btn iz-btn-soft iz-btn-sm"
                  onClick={() => resolvePrWeekDispute(d.prId, d.dateIso, false)}
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {checkedOut.length > 0 && (
        <div className="space-y-2">
          <p className="iz-tiny iz-muted2 tracking-wide">CHECKED-OUT SHIFTS</p>
          {checkedOut.map((s) => {
            const review = findWeekDayReview(prWeekDayReviews, s.prId, s.dateIso);
            const verified = review?.agencyVerified;
            const disputed = review?.disputeStatus === "pending";
            return (
              <div key={s.id} className="rounded-xl border border-[var(--iz-line)] p-2.5">
                <div className="iz-between gap-2">
                  <span className="iz-sm font-bold">{s.prName}</span>
                  {verified ? (
                    <IzPill variant="green">Verified</IzPill>
                  ) : disputed ? (
                    <IzPill variant="red">Disputed</IzPill>
                  ) : (
                    <IzPill variant="amber">Awaiting</IzPill>
                  )}
                </div>
                <p className="iz-tiny iz-muted mt-1">
                  {s.outlet} · {s.dateIso} · {s.shift}
                </p>
                {!verified && (
                  <button
                    type="button"
                    className="iz-btn iz-btn-primary iz-btn-sm mt-2 w-full"
                    disabled={disputed}
                    onClick={() => verifyPrWeekDay(s.prId, s.dateIso)}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />{" "}
                    {disputed ? "Resolve dispute first" : "Verify shift"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </IzCard>
  );
}
