import { useMemo } from "react";
import { calcShiftPayout } from "@/lib/agency-demo";
import { shiftHoursFromLabel } from "@/lib/outlet-demo";
import type { ShiftRequest } from "@/lib/store";
import { useStore } from "@/lib/store";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, formatRM } from "@/components/iz/ui";

export function OutletSealReview({
  shift,
  open,
  onClose,
  onConfirm,
}: {
  shift: ShiftRequest | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyRoster = useStore((s) => s.agencyRoster);

  const rows = useMemo(() => {
    if (!shift) return [];
    const hours = shiftHoursFromLabel(shift.shift);
    const drinkUnits = shift.drinkUnits ?? 0;
    const tableUnits = shift.tableUnits ?? 0;
    const perPr = Math.max(shift.prs.length, 1);
    return shift.prs.map((prId) => {
      const pr = agencyPRs.find((p) => p.id === prId);
      const roster = agencyRoster.find((s) => s.prId === prId && s.status === "on-duty");
      const drinks = Math.round(drinkUnits / perPr);
      const tables = Math.round(tableUnits / perPr);
      const drinkSales = drinks * (shift.perDrinkRm ?? 120);
      const tableSales = tables * (shift.perTableRm ?? 95);
      const tips = roster?.floorTips ?? Math.round(tableSales * 0.2);
      const payout = calcShiftPayout({
        outlet: shift.outletName,
        hoursWorked: hours,
        drinks,
        drinkSales,
        tips,
        tableSales,
      });
      return {
        prId,
        prName: pr?.name ?? prId,
        hours,
        drinks,
        tables,
        tips,
        payout,
      };
    });
  }, [shift, agencyPRs, agencyRoster]);

  const total = rows.reduce((sum, r) => sum + r.payout.total, 0);

  return (
    <IzSheet open={open} onClose={onClose}>
      <div className="iz-cardttl">Seal shift · per-PR review</div>
      {shift && (
        <p className="iz-tiny iz-muted mt-1">
          {shift.event} · {shift.date} · {shift.shift}
        </p>
      )}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <IzCard key={r.prId} flat className="!py-2.5">
            <div className="font-sora text-sm font-bold">{r.prName}</div>
            <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-[var(--iz-muted)]">
              <span>{r.hours}h</span>
              <span>{r.drinks} drinks</span>
              <span>{r.tables} tables</span>
              <span>{formatRM(r.tips)} tips</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-[var(--iz-gold)]">{formatRM(r.payout.total)} PV est.</div>
          </IzCard>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="iz-v-sum tot mt-3">
          <span className="font-sora font-bold">Total payroll</span>
          <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(total)}</span>
        </div>
      )}
      <button type="button" className="iz-btn iz-btn-primary mt-3 w-full" onClick={onConfirm}>
        Seal & generate PVs
      </button>
      <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={onClose}>
        Back
      </button>
    </IzSheet>
  );
}
