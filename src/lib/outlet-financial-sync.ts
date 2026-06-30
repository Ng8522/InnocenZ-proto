import type { OutletCommissionRule } from "@/lib/agency-demo";
import {
  calcShiftPayout,
  getOutletRule,
  OUTLET_COMMISSION_RULES,
  SEED_OUTLET_PNL,
  type AgencyRosterSlot,
  type OutletPnlRow,
} from "@/lib/agency-demo";
import { floorTipsForOutletFromRoster, outletMatches } from "@/lib/portal-sync";
import type { ShiftRequest } from "@/lib/store";
import { resolveOutletShiftDateIso } from "@/lib/agency-outlet-shifts";
import { aggregateShiftSales, shiftSalesLogged } from "@/lib/pr-shift-status";
import type { PrReceiptScan } from "@/lib/pr-demo";
import { receiptDateIso } from "@/lib/receipt-scan-utils";
import { shiftStartMs } from "@/lib/pr-schedule-cancellation";
import { getLiveTodayIso } from "@/lib/demo-clock";
import {
  averageDrinkPrice,
  effectiveShiftDrinkMenu,
  shiftStartTimeFromLabel,
  type OutletDrinkPrice,
} from "@/lib/outlet-demo";

export const DEFAULT_PER_DRINK_RM = 120;
export const DEFAULT_PER_TABLE_RM = 100;
export const DEFAULT_DRINK_UNITS = 4;
export const DEFAULT_TABLE_UNITS = 0.9;

export function totalDrinkUnits(shift: {
  drinkUnits?: number;
  drinkUnitCounts?: Record<string, number>;
}): number {
  if (shift.drinkUnitCounts && Object.keys(shift.drinkUnitCounts).length > 0) {
    return Object.values(shift.drinkUnitCounts).reduce((sum, qty) => sum + qty, 0);
  }
  return shift.drinkUnits ?? DEFAULT_DRINK_UNITS;
}

export function computeDrinkSales(
  shift: {
    drinkUnits?: number;
    drinkUnitCounts?: Record<string, number>;
    legacyDrinkSalesRm?: number;
    perDrinkRm?: number;
  },
  drinkMenu: OutletDrinkPrice[] = [],
): number {
  const countEntries = shift.drinkUnitCounts
    ? Object.entries(shift.drinkUnitCounts).filter(([, qty]) => qty > 0)
    : [];
  if (countEntries.length > 0 && drinkMenu.length > 0) {
    let total = shift.legacyDrinkSalesRm ?? 0;
    for (const [id, qty] of countEntries) {
      const item = drinkMenu.find((d) => d.id === id);
      total += qty * (item?.priceRm ?? shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM);
    }
    return total;
  }
  if (shift.legacyDrinkSalesRm != null) {
    return shift.legacyDrinkSalesRm;
  }
  const drinkUnits = shift.drinkUnits ?? DEFAULT_DRINK_UNITS;
  const perDrinkRm = shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  return drinkUnits * perDrinkRm;
}

/** Live floor sales = drink sales only */
export function computeShiftLiveSales(
  shift: {
    drinkUnits?: number;
    drinkUnitCounts?: Record<string, number>;
    legacyDrinkSalesRm?: number;
    perDrinkRm?: number;
  },
  drinkMenu: OutletDrinkPrice[] = [],
): number {
  const drinkSales = computeDrinkSales(shift, drinkMenu);
  return Math.round(drinkSales * 100) / 100;
}

/** Floor sales count only after shift start — confirmed/live before opening shows RM 0. */
export function outletShiftFloorSalesStarted(
  shift: Pick<ShiftRequest, "date" | "dateIso" | "shift" | "status">,
  now = new Date(),
): boolean {
  if (shift.status === "sealed") return true;
  const dateIso = resolveOutletShiftDateIso(shift.date, shift.dateIso);
  const start = shiftStartTimeFromLabel(shift.shift);
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return false;
  return now.getTime() >= shiftStartMs(dateIso, start);
}

export function outletShiftDisplayLiveSales(shift: ShiftRequest, now = new Date()): number {
  if (!outletShiftFloorSalesStarted(shift, now)) return 0;
  return shift.liveSales ?? 0;
}

export type OutletPrLiveSales = {
  salesRm: number;
  drinkSalesRm: number;
  drinkUnits: number;
  tipRm: number;
};

/** Per-PR floor sales for outlet tonight — receipt scans when present, else roster floor counts. */
export function outletPrLiveFloorSales(opts: {
  prId: string;
  outletName: string;
  shift: Pick<
    ShiftRequest,
    "date" | "dateIso" | "shift" | "status" | "perDrinkRm" | "eventDrinkMenu"
  >;
  slot?: AgencyRosterSlot;
  drinkMenu: OutletDrinkPrice[];
  receiptScans?: PrReceiptScan[];
  now?: Date;
}): OutletPrLiveSales {
  const empty = { salesRm: 0, drinkSalesRm: 0, drinkUnits: 0, tipRm: 0 };
  const shiftDateIso = resolveOutletShiftDateIso(opts.shift.date, opts.shift.dateIso);
  const previewTonight =
    opts.shift.status === "confirmed" && shiftDateIso === getLiveTodayIso();
  if (!outletShiftFloorSalesStarted(opts.shift, opts.now) && !previewTonight) return empty;
  const scans = (opts.receiptScans ?? []).filter(
    (scan) =>
      scan.prId === opts.prId &&
      outletMatches(scan.outlet, opts.outletName) &&
      receiptDateIso(scan) === shiftDateIso,
  );

  if (scans.length > 0) {
    const agg = aggregateShiftSales(scans);
    const drinkSalesRm = scans.reduce(
      (sum, scan) =>
        sum +
        scan.items
          .filter((item) => item.category === "drinks")
          .reduce((line, item) => line + item.amount, 0),
      0,
    );
    const tipRm = agg.tipRm;
    const salesRm = shiftSalesLogged(scans);
    return {
      salesRm,
      drinkSalesRm: drinkSalesRm > 0 ? drinkSalesRm : salesRm,
      drinkUnits: agg.drinkUnits,
      tipRm,
    };
  }

  const menu = effectiveShiftDrinkMenu(opts.shift, opts.drinkMenu);
  const perDrink = opts.shift.perDrinkRm ?? averageDrinkPrice(menu);
  const drinkUnits = opts.slot?.floorDrinks ?? 0;
  const drinkSalesRm = Math.round(drinkUnits * perDrink * 100) / 100;
  const tipRm = opts.slot?.floorTips ?? 0;
  return {
    salesRm: Math.round((drinkSalesRm + tipRm) * 100) / 100,
    drinkSalesRm,
    drinkUnits,
    tipRm,
  };
}

export function floorTipsForOutlet(outletName: string, roster: AgencyRosterSlot[] = []): number {
  return floorTipsForOutletFromRoster(roster, outletName);
}

export function roundRm(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface OutletPnlSynced extends OutletPnlRow {
  /** Tonight floor gross (before week rollup) */
  liveFloorGross: number;
  prWages: number;
  prCommission: number;
  /** True when an outlet shift drives this row */
  syncedFromOutlet: boolean;
}

export function withShiftFinancialDefaults(
  shift: ShiftRequest,
  workspaceDrinkMenu: OutletDrinkPrice[] = [],
): ShiftRequest {
  const drinkMenu = effectiveShiftDrinkMenu(shift, workspaceDrinkMenu);
  const perDrinkRm = shift.perDrinkRm ?? averageDrinkPrice(drinkMenu);
  const drinkUnits = totalDrinkUnits(shift);
  const computed =
    drinkUnits > 0 ? computeShiftLiveSales({ ...shift, drinkUnits }, drinkMenu) : 0;
  const live = outletShiftFloorSalesStarted(shift) ? computed : 0;
  const anchorLiveSales = shift.anchorLiveSales ?? live;
  return {
    ...shift,
    perDrinkRm,
    drinkUnits,
    tableUnits: 0,
    anchorLiveSales,
    liveSales: live,
  };
}

/** Roll outlet floor edits into agency PNL (gross, PR payout, agency net, outlet net) */
export function buildSyncedOutletPnlRow(
  seedRow: OutletPnlRow,
  shift: ShiftRequest,
  roster: AgencyRosterSlot[] = [],
  drinkMenu: OutletDrinkPrice[] = [],
  commissionRules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
): OutletPnlSynced {
  const rule = getOutletRule(seedRow.outlet, commissionRules);
  const shiftMenu = effectiveShiftDrinkMenu(shift, drinkMenu);
  const s = withShiftFinancialDefaults(shift, drinkMenu);
  const drinkUnits = totalDrinkUnits(s);
  const liveFloorGross = computeShiftLiveSales(s, shiftMenu);
  const anchorLive = s.anchorLiveSales ?? liveFloorGross;
  const grossDelta = liveFloorGross - anchorLive;
  const grossRevenue = Math.round((seedRow.grossRevenue + grossDelta) * 100) / 100;

  const drinkSales = computeDrinkSales(s, shiftMenu);
  const tips = floorTipsForOutlet(s.outletName, roster);
  const payout = calcShiftPayout(
    {
      outlet: seedRow.outlet,
      hoursWorked: 6,
      drinks: drinkUnits,
      drinkSales,
      tips,
      tableSales: 0,
      shiftTierRates: s.tierRates,
    },
    commissionRules,
  );
  const prCommission = Math.round(
    (payout.drinkCommission + payout.tipCommission + payout.tableCommission) * 100,
  ) / 100;
  const prWages = s.estimatedCost;
  const anchorCommission = calcAnchorCommission(
    seedRow.outlet,
    anchorLive,
    s,
    roster,
    shiftMenu,
    commissionRules,
  );
  const prPayout = Math.round((prWages + prCommission) * 100) / 100;
  const anchorPrPayout = Math.round((prWages + anchorCommission) * 100) / 100;
  const prPayoutDelta = prPayout - anchorPrPayout;

  const platformFee = Math.round(grossRevenue * (rule.platformPct / 100) * 100) / 100;
  const agencyShareOnGross = seedRow.grossRevenue > 0 ? seedRow.agencyNet / seedRow.grossRevenue : 0.28;
  const agencyNet = Math.round((seedRow.agencyNet + grossDelta * agencyShareOnGross + prPayoutDelta * 0.15) * 100) / 100;
  const outletNet = Math.round((grossRevenue - prPayout - platformFee - agencyNet) * 100) / 100;

  return {
    ...seedRow,
    grossRevenue,
    prPayout,
    agencyNet,
    outletNet,
    platformFee,
    liveFloorGross,
    prWages,
    prCommission,
    syncedFromOutlet: true,
  };
}

function calcAnchorCommission(
  outlet: string,
  anchorLive: number,
  shift: ShiftRequest,
  roster: AgencyRosterSlot[] = [],
  drinkMenu: OutletDrinkPrice[] = [],
  commissionRules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
) {
  const perDrink = shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  const drinkUnits = perDrink > 0 ? anchorLive / perDrink : 0;
  const payout = calcShiftPayout(
    {
      outlet,
      hoursWorked: 6,
      drinks: drinkUnits,
      drinkSales: computeDrinkSales({ ...shift, drinkUnits }, drinkMenu),
      tips: floorTipsForOutlet(shift.outletName, roster),
      tableSales: 0,
      shiftTierRates: shift.tierRates,
    },
    commissionRules,
  );
  return payout.drinkCommission + payout.tipCommission + payout.tableCommission;
}

export function recomputeAllOutletPnl(
  shifts: ShiftRequest[],
  seedRows: OutletPnlRow[] = SEED_OUTLET_PNL,
  roster: AgencyRosterSlot[] = [],
  drinkMenu: OutletDrinkPrice[] = [],
  commissionRules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
): OutletPnlSynced[] {
  return seedRows.map((row) => {
    const active = shifts.find(
      (s) =>
        s.outletName === row.outlet &&
        (s.date === "Tonight" || s.status === "confirmed" || s.status === "open"),
    );
    if (!active) {
      return {
        ...row,
        liveFloorGross: 0,
        prWages: 0,
        prCommission: 0,
        syncedFromOutlet: false,
      };
    }
    return buildSyncedOutletPnlRow(row, active, roster, drinkMenu, commissionRules);
  });
}
