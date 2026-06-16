/** Agency workflows — raise PV, analytics helpers */

import type { AgencyManagedPR } from "@/lib/agency-demo";
import { calcShiftPayout, getOutletRule } from "@/lib/agency-demo";
import type { FinanceHeadPvStamp } from "@/lib/finance-head-stamp";
import {
  fmtDtable,
  dayName,
  makeShiftPvId,
  type PrPaymentVoucher,
  type PrPvRow,
} from "@/lib/pr-demo";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { roundRm, type OutletPnlSynced } from "@/lib/outlet-financial-sync";

export interface PvOverrideAudit {
  at: string;
  reason: string;
  by: string;
  previousStatus: string;
}

export function shiftHistoryPvRef(row: ShiftHistoryRow): string {
  return `${row.dateIso}-${row.outlet}-${row.prId}`;
}

export function historyRowHasPv(
  row: ShiftHistoryRow,
  pvs: PrPaymentVoucher[],
): boolean {
  const ref = shiftHistoryPvRef(row);
  return pvs.some(
    (p) =>
      p.paidRefs?.includes(ref) ||
      (p.prName === row.prName &&
        p.outlet === row.outlet &&
        p.cycle.includes(row.dateDisplay.split(" ")[0] ?? row.dateIso)),
  );
}

/** Build a PV from a sealed shift history row (agency Raise PV flow). */
export function buildPvFromShiftHistoryRow(
  row: ShiftHistoryRow,
  pr: AgencyManagedPR,
  financeHead: FinanceHeadPvStamp,
): PrPaymentVoucher {
  const [y, m, d] = row.dateIso.split("-").map(Number);
  const dateLabel = fmtDtable(y, m, d);
  const day = dayName(y, m, d);
  const rule = getOutletRule(row.outlet);
  const drinkSales = row.totalDrinks * 15;
  const payout = calcShiftPayout({
    outlet: row.outlet,
    hoursWorked: row.durationHours,
    drinks: row.totalDrinks,
    drinkSales,
    tips: row.totalTips,
    tableSales: Math.round(row.totalTips * 0.5),
    checkOutAfterOt: row.durationHours > rule.otAfterHours,
  });
  const otHours = Math.max(0, row.durationHours - rule.otAfterHours);
  const rows: PrPvRow[] = [
    {
      i: 1,
      date: dateLabel,
      day,
      outlet: row.outlet,
      desc: "Daily Wages",
      qty: 1,
      amt: payout.wages,
      ref: "Sealed shift",
    },
  ];
  let idx = 2;
  if (payout.drinkCommission > 0) {
    rows.push({
      i: idx++,
      date: dateLabel,
      day,
      outlet: row.outlet,
      desc: "Commission – Drinks",
      qty: row.totalDrinks,
      amt: payout.drinkCommission,
      ref: "Outlet log",
    });
  }
  if (payout.tipCommission > 0) {
    rows.push({
      i: idx++,
      date: dateLabel,
      day,
      outlet: row.outlet,
      desc: "Commission – Tips",
      qty: 1,
      amt: payout.tipCommission,
      ref: "Outlet log",
    });
  }
  if (payout.tableCommission > 0) {
    rows.push({
      i: idx++,
      date: dateLabel,
      day,
      outlet: row.outlet,
      desc: "Commission – Tables",
      qty: 1,
      amt: payout.tableCommission,
      ref: "Outlet log",
    });
  }
  if (otHours > 0) {
    const otAmt = Math.round(otHours * rule.wagePerHour * 1.5 * 100) / 100;
    rows.push({
      i: idx++,
      date: dateLabel,
      day,
      outlet: row.outlet,
      desc: "Overtime (OT)",
      qty: Math.round(otHours * 60),
      amt: otAmt,
      ref: `MAX(0, check-out − shift end) · ${otHours.toFixed(1)}h`,
    });
  }
  const subtotal = rows.reduce((s, r) => s + r.amt, 0);
  const issued = row.dateDisplay;
  const pvId = makeShiftPvId([y, m, d], row.outlet) + `-${row.prId}`;
  return {
    id: pvId,
    prName: pr.name,
    prIc: pr.ic,
    outlet: row.outlet,
    cycle: `${dateLabel} shift`,
    issued,
    due: issued,
    rows,
    subtotal,
    deduct: 0,
    net: subtotal,
    status: "PENDING_REVIEW",
    ...financeHead,
    paidRefs: [shiftHistoryPvRef(row)],
  };
}

export function computeAgencyNoShowRate(agencyPRs: AgencyManagedPR[]): number {
  const totalShifts = agencyPRs.reduce((s, p) => s + p.checkIns + p.noShows, 0);
  const noShows = agencyPRs.reduce((s, p) => s + p.noShows, 0);
  if (totalShifts === 0) return 0;
  return Math.round((noShows / totalShifts) * 1000) / 10;
}

/** Filter PNL rows using shift history in date range (demo approximation). */
export function pnlForDateRange(
  basePnl: OutletPnlSynced[],
  history: ShiftHistoryRow[],
  dateFrom: string,
  dateTo: string,
): OutletPnlSynced[] {
  const filtered = history.filter((h) => h.dateIso >= dateFrom && h.dateIso <= dateTo);
  if (filtered.length === 0) return [];
  const byOutlet = new Map<string, { prPayout: number; count: number }>();
  for (const h of filtered) {
    const cur = byOutlet.get(h.outlet) ?? { prPayout: 0, count: 0 };
    cur.prPayout += h.totalPayout;
    cur.count += 1;
    byOutlet.set(h.outlet, cur);
  }
  return basePnl
    .filter((r) => byOutlet.has(r.outlet))
    .map((r) => {
      const agg = byOutlet.get(r.outlet)!;
      const ratio = Math.min(agg.prPayout / Math.max(r.prPayout, 1), 1);
      const prPayout = roundRm(agg.prPayout);
      const grossRevenue = roundRm(r.grossRevenue * ratio);
      const platformFee = roundRm(r.platformFee * ratio);
      const agencyNet = roundRm(r.agencyNet * ratio);
      const outletNet = roundRm(grossRevenue - prPayout - platformFee - agencyNet);
      return {
        ...r,
        grossRevenue,
        prPayout,
        platformFee,
        agencyNet,
        outletNet,
        syncedFromOutlet: r.syncedFromOutlet,
      };
    });
}
