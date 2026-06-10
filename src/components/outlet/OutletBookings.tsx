import { useState } from "react";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill } from "@/components/iz/ui";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSealReview } from "@/components/outlet/OutletSealReview";
import { SHIFT_DESTINATION_LABELS } from "@/lib/outlet-demo";
import { CheckCircle2, ChevronDown, Clock, Lock, PlayCircle, Trash2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META = {
  sealed: { tone: "iz-pill-ink", icon: Lock, label: "Sealed" },
  confirmed: { tone: "iz-pill-green", icon: CheckCircle2, label: "Live" },
  open: { tone: "iz-pill-amber", icon: PlayCircle, label: "Open" },
  draft: { tone: "iz-pill-violet", icon: Clock, label: "Draft" },
} as const;

export function OutletBookings() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts, sealShift, confirmShift, deleteShift, shiftApplicants, respondToApplicant } =
    useStore();
  const canLogSales = outletCan(outletSubRole, "logSales");
  const canConfirm = outletCan(outletSubRole, "confirmShift");
  const canSeal = outletCan(outletSubRole, "sealShift");
  const canDelete = outletCan(outletSubRole, "postJob");
  const canStaff = outletCan(outletSubRole, "manageShiftStaffing");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sealTargetId, setSealTargetId] = useState<string | null>(null);
  const defaultOpen = shifts.find((s) => s.date === "Tonight")?.id ?? shifts[0]?.id;
  const deleteTarget = deleteTargetId ? shifts.find((s) => s.id === deleteTargetId) : null;
  const sealTarget = sealTargetId ? shifts.find((s) => s.id === sealTargetId) : null;

  if (shifts.length === 0) {
    return (
      <p className="iz-tiny iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
        No shifts yet — use Post Job to create one.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {shifts.map((s) => {
          const meta = STATUS_META[s.status] ?? STATUS_META.draft;
          const StatusIcon = meta.icon;
          const applicants = shiftApplicants.filter((a) => a.shiftId === s.id && a.status === "pending");
          const summaryRight = `RM ${s.liveSales.toLocaleString()} sales`;

          return (
            <details
              key={s.id}
              className="iz-outlet-booking-card group"
              open={s.id === defaultOpen}
            >
              <summary className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{s.event}</span>
                    <span className={cn("iz-pill shrink-0 !py-0.5 !text-[9px]", meta.tone)}>
                      <StatusIcon className="mr-0.5 inline h-2.5 w-2.5" />
                      {meta.label}
                    </span>
                  </div>
                  <p className="iz-tiny iz-muted mt-0.5 truncate">
                    {s.date} · {s.filled}/{s.quantity} PRs · {summaryRight}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iz-muted)] transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-[var(--iz-line)] px-3.5 pb-3.5 pt-2">
                <p className="iz-tiny iz-muted2">{s.shift}</p>
                {(s.dressCode || s.destination) && (
                  <p className="iz-tiny iz-muted2 mt-0.5">
                    {[s.dressCode, s.destination && SHIFT_DESTINATION_LABELS[s.destination]]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <Metric label="Filled" value={`${s.filled}/${s.quantity}`} />
                  <Metric label="Cost" value={`${(s.estimatedCost / 1000).toFixed(1)}k`} gold />
                  <Metric label="Sales" value={`${(s.liveSales / 1000).toFixed(1)}k`} green />
                </div>

                {canStaff && applicants.length > 0 && s.status !== "sealed" && (
                  <div className="mt-2.5 space-y-1.5 rounded-xl bg-white/[0.02] p-2">
                    <p className="text-[10px] font-semibold text-[var(--iz-muted)]">
                      Applicants · {applicants.length}
                    </p>
                    {applicants.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs">
                          {a.prName} · {a.rating}★
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => respondToApplicant(a.id, true)}
                            className="iz-chip !h-7 !w-7 !p-0 text-[var(--iz-green)]"
                            aria-label={`Accept ${a.prName}`}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToApplicant(a.id, false)}
                            className="iz-chip !h-7 !w-7 !p-0"
                            aria-label={`Decline ${a.prName}`}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canLogSales && s.status === "confirmed" && (
                  <OutletShiftSalesPanel shiftId={s.id} compact collapsible />
                )}
                {canLogSales && s.status === "sealed" && (
                  <p className="iz-tiny iz-muted mt-2">Sales locked after seal.</p>
                )}

                <div className="mt-2.5 flex gap-2">
                  {canDelete && s.status !== "sealed" && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(s.id)}
                      className="iz-chip !px-2.5 text-[var(--iz-muted)]"
                      aria-label="Delete shift"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canConfirm && s.status !== "confirmed" && s.status !== "sealed" && (
                    <button
                      type="button"
                      onClick={() => confirmShift(s.id)}
                      className="iz-btn iz-btn-primary iz-btn-sm min-w-0 flex-1"
                    >
                      Confirm
                    </button>
                  )}
                  {canSeal && s.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => setSealTargetId(s.id)}
                      className="iz-btn iz-btn-soft iz-btn-sm min-w-0 flex-1 !border-[var(--iz-gold-d)] !text-[var(--iz-gold)]"
                    >
                      Seal shift
                    </button>
                  )}
                  {s.status === "sealed" && (
                    <span className="flex flex-1 items-center justify-center py-1.5">
                      <IzPill variant="green">Payroll sent</IzPill>
                    </span>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <IzSheet open={deleteTarget !== null} onClose={() => setDeleteTargetId(null)}>
        <div className="iz-cardttl">Delete this shift?</div>
        {deleteTarget && (
          <IzCard flat className="mt-2">
            <p className="text-sm font-semibold">{deleteTarget.event}</p>
            <p className="iz-tiny iz-muted mt-1">
              {deleteTarget.date} · {deleteTarget.shift}
            </p>
          </IzCard>
        )}
        <button
          type="button"
          className="iz-btn iz-btn-danger mt-3 w-full"
          onClick={() => {
            if (deleteTargetId) deleteShift(deleteTargetId);
            setDeleteTargetId(null);
          }}
        >
          Delete shift
        </button>
        <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={() => setDeleteTargetId(null)}>
          Cancel
        </button>
      </IzSheet>

      <OutletSealReview
        shift={sealTarget ?? null}
        open={sealTarget !== null}
        onClose={() => setSealTargetId(null)}
        onConfirm={() => {
          if (sealTargetId) sealShift(sealTargetId);
          setSealTargetId(null);
        }}
      />
    </>
  );
}

function Metric({
  label,
  value,
  gold,
  green,
}: {
  label: string;
  value: string;
  gold?: boolean;
  green?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-1 py-1.5">
      <div className="text-[var(--iz-muted)]">{label}</div>
      <div
        className={cn(
          "font-sora mt-0.5 text-xs font-bold",
          gold && "text-[var(--iz-gold)]",
          green && "text-[var(--iz-green)]",
          !gold && !green && "text-[var(--iz-txt)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
