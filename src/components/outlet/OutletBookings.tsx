import { useState } from "react";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { CheckCircle2, Clock, Lock, PlayCircle, Trash2 } from "lucide-react";

export function OutletBookings() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts, sealShift, confirmShift, deleteShift } = useStore();
  const canLogSales = outletCan(outletSubRole, "logSales");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = deleteTargetId ? shifts.find((s) => s.id === deleteTargetId) : null;

  if (shifts.length === 0) {
    return (
      <section className="mt-4">
        <IzSectionLabel>Your bookings</IzSectionLabel>
        <p className="iz-tiny iz-muted mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
          No shifts posted yet. Use Post Job to create one.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <IzSectionLabel>Your bookings</IzSectionLabel>
      <div className="mt-3 space-y-3">
        {shifts.map((s) => {
          const tone =
            s.status === "sealed"
              ? "bg-muted text-muted-foreground"
              : s.status === "confirmed"
                ? "bg-success/20 text-success"
                : s.status === "open"
                  ? "bg-warning/20 text-warning"
                  : "bg-primary/20 text-primary";
          const Icon =
            s.status === "sealed" ? Lock : s.status === "confirmed" ? CheckCircle2 : s.status === "open" ? PlayCircle : Clock;

          return (
            <div key={s.id} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.event}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.date} · {s.shift}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {s.status !== "sealed" && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(s.id)}
                      className="iz-chip flex h-7 w-7 items-center justify-center !p-0 text-[var(--iz-muted)] hover:text-[var(--iz-red)]"
                      aria-label={`Delete ${s.event}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${tone}`}
                  >
                    <Icon className="h-3 w-3" /> {s.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Filled</div>
                  <div className="font-semibold">
                    {s.filled}/{s.quantity}
                  </div>
                </div>
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-semibold text-gradient-gold">RM {s.estimatedCost.toLocaleString()}</div>
                </div>
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Sales</div>
                  <div className="font-semibold text-success">RM {s.liveSales.toLocaleString()}</div>
                </div>
              </div>
              {canLogSales && s.status === "confirmed" && (
                <OutletShiftSalesPanel shiftId={s.id} compact label="Enter shift sales" />
              )}
              {canLogSales && s.status === "sealed" && <OutletShiftSalesPanel shiftId={s.id} sealed compact />}
              <div className="mt-3 flex gap-2">
                {s.status !== "confirmed" && s.status !== "sealed" && (
                  <button
                    type="button"
                    onClick={() => confirmShift(s.id)}
                    className="flex-1 rounded-full bg-gradient-primary py-2 text-xs font-semibold"
                  >
                    Confirm
                  </button>
                )}
                {s.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => sealShift(s.id)}
                    className="flex-1 rounded-full border border-gold/50 py-2 text-xs font-semibold text-gold"
                  >
                    Seal & generate PVs
                  </button>
                )}
                {s.status === "sealed" && (
                  <span className="flex-1 rounded-full bg-muted py-2 text-center text-xs text-muted-foreground">
                    Payroll dispatched
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <IzSheet open={deleteTarget !== null} onClose={() => setDeleteTargetId(null)}>
        <div className="iz-cardttl">Delete this shift?</div>
        {deleteTarget && (
          <IzCard flat className="mt-2">
            <p className="text-sm font-semibold text-[var(--iz-txt)]">{deleteTarget.event}</p>
            <p className="iz-tiny iz-muted mt-1">
              {deleteTarget.date} · {deleteTarget.shift}
            </p>
          </IzCard>
        )}
        <p className="iz-tiny iz-muted mt-3">
          This removes the booking from your list. Sealed shifts cannot be deleted.
        </p>
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
        <button type="button" className="iz-btn iz-btn-soft mt-2.5 w-full" onClick={() => setDeleteTargetId(null)}>
          Keep shift
        </button>
      </IzSheet>
    </section>
  );
}
