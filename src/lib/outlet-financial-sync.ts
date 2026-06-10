import {
  calcShiftPayout,
  getOutletRule,
  SEED_OUTLET_PNL,
  type AgencyRosterSlot,
  type OutletPnlRow,
} from "@/lib/agency-demo";
import { floorTipsForOutletFromRoster } from "@/lib/portal-sync";
import type { ShiftRequest } from "@/lib/store";

export const DEFAULT_PER_DRINK_RM = 120;
export const DEFAULT_PER_TABLE_RM = 100;
export const DEFAULT_DRINK_UNITS = 4;
export const DEFAULT_TABLE_UNITS = 0.9;

/** Live floor sales = drink units × per-drink + table units × per-table */
export function computeShiftLiveSales(shift: {
  drinkUnits?: number;
  tableUnits?: number;
  perDrinkRm?: number;
  perTableRm?: number;
}): number {
  const drinkUnits = shift.drinkUnits ?? DEFAULT_DRINK_UNITS;
  const tableUnits = shift.tableUnits ?? DEFAULT_TABLE_UNITS;
  const perDrinkRm = shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  const perTableRm = shift.perTableRm ?? DEFAULT_PER_TABLE_RM;
  const raw = drinkUnits * perDrinkRm + tableUnits * perTableRm;
  return Math.round(raw * 100) / 100;
}

export function floorTipsForOutlet(outletName: string, roster: AgencyRosterSlot[] = []): number {
  return floorTipsForOutletFromRoster(roster, outletName);
}

export interface OutletPnlSynced extends OutletPnlRow {
  /** Tonight floor gross (before week rollup) */
  liveFloorGross: number;
  prWages: number;
  prCommission: number;
  /** True when an outlet shift drives this row */
  syncedFromOutlet: boolean;
}

export function withShiftFinancialDefaults(shift: ShiftRequest): ShiftRequest {
  const perDrinkRm = shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  const perTableRm = shift.perTableRm ?? DEFAULT_PER_TABLE_RM;
  const drinkUnits = shift.drinkUnits ?? DEFAULT_DRINK_UNITS;
  const tableUnits = shift.tableUnits ?? DEFAULT_TABLE_UNITS;
  const live = computeShiftLiveSales({ perDrinkRm, perTableRm, drinkUnits, tableUnits });
  const anchorLiveSales = shift.anchorLiveSales ?? live;
  return {
    ...shift,
    perDrinkRm,
    perTableRm,
    drinkUnits,
    tableUnits,
    anchorLiveSales,
    liveSales: live,
  };
}

/** Roll outlet floor edits into agency PNL (gross, PR payout, agency net, outlet net) */
export function buildSyncedOutletPnlRow(
  seedRow: OutletPnlRow,
  shift: ShiftRequest,
  roster: AgencyRosterSlot[] = [],
): OutletPnlSynced {
  const rule = getOutletRule(seedRow.outlet);
  const s = withShiftFinancialDefaults(shift);
  const drinkUnits = s.drinkUnits!;
  const tableUnits = s.tableUnits!;
  const perDrinkRm = s.perDrinkRm!;
  const perTableRm = s.perTableRm!;
  const liveFloorGross = computeShiftLiveSales(s);
  const anchorLive = s.anchorLiveSales ?? liveFloorGross;
  const grossDelta = liveFloorGross - anchorLive;
  const grossRevenue = Math.round((seedRow.grossRevenue + grossDelta) * 100) / 100;

  const drinkSales = drinkUnits * perDrinkRm;
  const tableSales = tableUnits * perTableRm;
  const tips = floorTipsForOutlet(s.outletName, roster);
  const payout = calcShiftPayout({
    outlet: seedRow.outlet,
    hoursWorked: 6,
    drinks: drinkUnits,
    drinkSales,
    tips,
    tableSales,
  });
  const prCommission = Math.round(
    (payout.drinkCommission + payout.tipCommission + payout.tableCommission) * 100,
  ) / 100;
  const prWages = s.estimatedCost;
  const anchorCommission = calcAnchorCommission(seedRow.outlet, anchorLive, s, roster);
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
) {
  const perDrink = shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  const perTable = shift.perTableRm ?? DEFAULT_PER_TABLE_RM;
  const totalUnit = perDrink + perTable || 1;
  const drinkShare = perDrink / totalUnit;
  const drinkUnits = (anchorLive * drinkShare) / perDrink;
  const tableUnits = (anchorLive * (1 - drinkShare)) / perTable;
  const payout = calcShiftPayout({
    outlet,
    hoursWorked: 6,
    drinks: drinkUnits,
    drinkSales: drinkUnits * perDrink,
    tips: floorTipsForOutlet(shift.outletName, roster),
    tableSales: tableUnits * perTable,
  });
  return payout.drinkCommission + payout.tipCommission + payout.tableCommission;
}

export function recomputeAllOutletPnl(
  shifts: ShiftRequest[],
  seedRows: OutletPnlRow[] = SEED_OUTLET_PNL,
  roster: AgencyRosterSlot[] = [],
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
    return buildSyncedOutletPnlRow(row, active, roster);
  });
}

export function formatSyncTime(ms: number) {
  return new Date(ms).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
