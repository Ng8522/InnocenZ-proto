import { useMemo } from "react";
import { CalendarOff, Check, Stethoscope, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { IzCard, IzPill } from "@/components/iz/ui";
import { pendingPrLeaveRequests, PR_LEAVE_KIND_LABEL } from "@/lib/pr-leave";

/**
 * Agency management for PR MC / personal-leave requests. Approving releases the
 * PR from the shift (no penalty) and, for MC, fires the backfill alert to the
 * outlet + agency with the nearest available PR to call.
 */
export function AgencyPrLeavePanel() {
  const prShiftLeaves = useStore((s) => s.prShiftLeaves);
  const approvePrShiftLeave = useStore((s) => s.approvePrShiftLeave);
  const rejectPrShiftLeave = useStore((s) => s.rejectPrShiftLeave);

  const pending = useMemo(() => pendingPrLeaveRequests(prShiftLeaves), [prShiftLeaves]);
  if (pending.length === 0) return null;

  return (
    <IzCard className="mb-3 border-[rgba(232,194,122,.35)]">
      <div className="iz-between mb-2">
        <span className="iz-sm flex items-center gap-1.5 font-bold">
          <Stethoscope className="h-4 w-4 text-[var(--iz-amber)]" /> PR MC / Leave requests
        </span>
        <IzPill variant="amber">{pending.length}</IzPill>
      </div>
      <div className="space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="rounded-xl border border-[var(--iz-line)] p-2.5">
            <div className="iz-between gap-2">
              <span className="iz-sm flex items-center gap-1.5 font-bold">
                {r.kind === "mc" ? (
                  <Stethoscope className="h-3.5 w-3.5" />
                ) : (
                  <CalendarOff className="h-3.5 w-3.5" />
                )}
                {r.prName}
              </span>
              <IzPill variant={r.kind === "mc" ? "red" : "amber"}>
                {PR_LEAVE_KIND_LABEL[r.kind]}
              </IzPill>
            </div>
            <p className="iz-tiny iz-muted mt-1">
              {r.outlet} · {r.dateLabel} · {r.shift}
            </p>
            <p className="iz-tiny iz-muted2 mt-1">Reason: {r.reason}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="iz-btn iz-btn-primary iz-btn-sm"
                onClick={() => approvePrShiftLeave(r.id)}
              >
                <Check className="h-3.5 w-3.5" /> Approve & release
              </button>
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm"
                onClick={() => rejectPrShiftLeave(r.id)}
              >
                <X className="h-3.5 w-3.5" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </IzCard>
  );
}
