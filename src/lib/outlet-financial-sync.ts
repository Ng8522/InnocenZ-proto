import type { OutletCommissionRule } from "@/lib/agency-demo";
import {
  calcShiftPayout,
  getOutletRule,
  OUTLET_COMMISSION_RULES,
  SEED_OUTLET_PNL,
  type AgencyRosterSlot,
  type OutletPnlRow,
} from "@/lib/agency-demo";
import { floorTipsForOutletFromRoster } from "@/lib/portal-sync";
import type { ShiftRequest } from "@/lib/store";

import { averageDrinkPrice, effectiveShiftDrinkMenu, type OutletDrinkPrice } from "@/lib/outlet-demo";

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
  const live = computeShiftLiveSales({ ...shift, drinkUnits }, drinkMenu);
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
