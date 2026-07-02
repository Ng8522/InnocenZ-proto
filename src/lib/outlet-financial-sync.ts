import type { OutletCommissionRule, OutletPrTier, OutletTierRateSettings } from "@/lib/agency-demo";
import {
  calcShiftPayout,
  getOutletRule,
  OUTLET_BASE_TIER,
  OUTLET_COMMISSION_RULES,
  SEED_OUTLET_PNL,
  tierHappyHourDrinkPct,
  tierOtRmPerHour,
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
import {
  outletShiftActualLaborCostForShift,
  outletShiftActivePrIds,
  outletShiftTargetLaborCost,
  type OutletCutLossShiftSlice,
} from "@/lib/outlet-demo";
import {
  payTierRowShiftWage,
  POST_JOB_PAY_TIER_OPTIONS,
  resolveEffectiveShiftPayTierRows,
  shiftTierStaffingByPayTier,
  type PostJobPayTierRow,
} from "@/lib/post-job-pay-tiers";
import {
  averageDrinkPrice,
  effectiveShiftDrinkMenu,
  happyHourWindowHours,
  resolveOutletPrTier,
  shiftHoursFromLabel,
  shiftStartTimeFromLabel,
  typicalDrinkPrice,
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

/** PV payroll sync lines log commission RM — not gross floor sales. */
export function isPayrollCommissionReceiptScan(scan: PrReceiptScan): boolean {
  return Boolean(scan.pvId && scan.pvLineDesc);
}

export type OutletShiftLiveSalesContext = {
  outletName: string;
  drinkMenu?: OutletDrinkPrice[];
  rosterSlots: AgencyRosterSlot[];
  receiptScans?: PrReceiptScan[];
  /** Included in total when matching the tonight summary grand total. */
  specialServiceRm?: number;
  now?: Date;
};

export function outletShiftLiveSalesTotal(
  shift: ShiftRequest,
  ctx: OutletShiftLiveSalesContext,
): number {
  if (!outletShiftFloorSalesStarted(shift, ctx.now)) return 0;
  const floor = outletTonightFloorTotals({
    shift,
    outletName: ctx.outletName,
    drinkMenu: ctx.drinkMenu ?? [],
    rosterSlots: ctx.rosterSlots,
    prIds: shift.prs ?? [],
    receiptScans: ctx.receiptScans,
  });
  return roundRm(floor.totalSalesRm + (ctx.specialServiceRm ?? 0));
}

export function outletShiftDisplayLiveSales(
  shift: ShiftRequest,
  ctx?: OutletShiftLiveSalesContext,
  now = new Date(),
): number {
  if (ctx) return outletShiftLiveSalesTotal(shift, { ...ctx, now: ctx.now ?? now });
  if (!outletShiftFloorSalesStarted(shift, now)) return 0;
  return shift.liveSales ?? 0;
}

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
  if (!outletShiftFloorSalesStarted(opts.shift, opts.now)) return empty;
  const shiftDateIso = resolveOutletShiftDateIso(opts.shift.date, opts.shift.dateIso);
  const scans = (opts.receiptScans ?? []).filter(
    (scan) =>
      scan.prId === opts.prId &&
      outletMatches(scan.outlet, opts.outletName) &&
      receiptDateIso(scan) === shiftDateIso,
  );
  const grossScans = scans.filter((scan) => !isPayrollCommissionReceiptScan(scan));

  if (grossScans.length > 0) {
    const agg = aggregateShiftSales(grossScans);
    const drinkSalesRm = grossScans.reduce(
      (sum, scan) =>
        sum +
        scan.items
          .filter((item) => item.category === "drinks")
          .reduce((line, item) => line + item.amount, 0),
      0,
    );
    const tipRm = agg.tipRm;
    const salesRm = shiftSalesLogged(grossScans);
    return {
      salesRm,
      drinkSalesRm: drinkSalesRm > 0 ? drinkSalesRm : salesRm,
      drinkUnits: agg.drinkUnits,
      tipRm,
    };
  }

  const menu = effectiveShiftDrinkMenu(opts.shift, opts.drinkMenu);
  const perDrink = opts.shift.perDrinkRm ?? typicalDrinkPrice(menu);
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

export type OutletPrLiveSales = {
  salesRm: number;
  drinkSalesRm: number;
  drinkUnits: number;
  tipRm: number;
};

export type OutletTonightFloorTotals = {
  totalSalesRm: number;
  totalDrinksRm: number;
  drinkUnits: number;
  totalTipsRm: number;
};

/** Aggregate floor sales across PRs booked on tonight's shift. */
export function outletTonightFloorTotals(opts: {
  shift: ShiftRequest;
  outletName: string;
  drinkMenu: OutletDrinkPrice[];
  rosterSlots: AgencyRosterSlot[];
  prIds: string[];
  receiptScans?: PrReceiptScan[];
}): OutletTonightFloorTotals {
  const rosterByPr = new Map(opts.rosterSlots.map((s) => [s.prId, s]));
  let totalSalesRm = 0;
  let totalDrinksRm = 0;
  let drinkUnits = 0;
  let totalTipsRm = 0;
  for (const prId of opts.prIds) {
    const sales = outletPrLiveFloorSales({
      prId,
      outletName: opts.outletName,
      shift: opts.shift,
      slot: rosterByPr.get(prId),
      drinkMenu: opts.drinkMenu,
      receiptScans: opts.receiptScans,
    });
    totalSalesRm += sales.salesRm;
    totalDrinksRm += sales.drinkSalesRm;
    drinkUnits += sales.drinkUnits;
    totalTipsRm += sales.tipRm;
  }
  return {
    totalSalesRm: roundRm(totalSalesRm),
    totalDrinksRm: roundRm(totalDrinksRm),
    drinkUnits,
    totalTipsRm: roundRm(totalTipsRm),
  };
}

export type OutletPrLiveEarningsBreakdown = {
  prName: string;
  prId: string;
  dailyWagesRm: number;
  hhDrinkSalesRm: number;
  hhDrinkPct: number;
  hhCommissionRm: number;
  normalDrinkSalesRm: number;
  normalDrinkPct: number;
  normalCommissionRm: number;
  tipSalesRm: number;
  tipPct: number;
  tipCommissionRm: number;
  otHours: number;
  otRmPerHour: number;
  otPayRm: number;
  totalEarnRm: number;
};

/** Live earnings row for outlet floor — wages, HH/normal drink commission, tips & OT. */
export function outletPrLiveEarningsBreakdown(opts: {
  prId: string;
  prName: string;
  trainingLevel?: string;
  outletName: string;
  shift: ShiftRequest;
  slot?: AgencyRosterSlot;
  drinkMenu: OutletDrinkPrice[];
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  happyHourStart: string;
  happyHourEnd: string;
  receiptScans?: PrReceiptScan[];
}): OutletPrLiveEarningsBreakdown {
  const tier = resolveOutletPrTier(opts.trainingLevel);
  const tierRate = opts.tierRates[tier] ?? opts.tierRates[OUTLET_BASE_TIER];
  const floor = outletPrLiveFloorSales({
    prId: opts.prId,
    outletName: opts.outletName,
    shift: opts.shift,
    slot: opts.slot,
    drinkMenu: opts.drinkMenu,
    receiptScans: opts.receiptScans,
  });

  const shiftHours = shiftHoursFromLabel(opts.shift.shift);
  const hhHours = happyHourWindowHours(opts.happyHourStart, opts.happyHourEnd);
  const hhRatio = shiftHours > 0 ? Math.min(1, hhHours / shiftHours) : 0.25;
  const hhDrinkSalesRm = roundRm(floor.drinkSalesRm * hhRatio);
  const normalDrinkSalesRm = roundRm(floor.drinkSalesRm - hhDrinkSalesRm);

  const hhDrinkPct = tierHappyHourDrinkPct(tierRate);
  const normalDrinkPct = tierRate.drinkPct;
  const tipPct = tierRate.tipPct;

  const hhCommissionRm = roundRm((hhDrinkSalesRm * hhDrinkPct) / 100);
  const normalCommissionRm = roundRm((normalDrinkSalesRm * normalDrinkPct) / 100);
  const tipCommissionRm = roundRm((floor.tipRm * tipPct) / 100);

  const dailyWagesRm = tierRate.wagePerHour;
  const otHours = Math.max(0, shiftHours - tierRate.otAfterHours);
  const otRmPerHour = roundRm(tierOtRmPerHour(tierRate));
  const otPayRm = roundRm(otHours * otRmPerHour);

  const totalEarnRm = roundRm(
    dailyWagesRm + hhCommissionRm + normalCommissionRm + tipCommissionRm + otPayRm,
  );

  return {
    prName: opts.prName,
    prId: opts.prId,
    dailyWagesRm,
    hhDrinkSalesRm,
    hhDrinkPct,
    hhCommissionRm,
    normalDrinkSalesRm,
    normalDrinkPct,
    normalCommissionRm,
    tipSalesRm: floor.tipRm,
    tipPct,
    tipCommissionRm,
    otHours,
    otRmPerHour,
    otPayRm,
    totalEarnRm,
  };
}

/** Per-PR live earnings rows for tonight's shift — same source as Live Sales sheets. */
export function outletTonightLiveEarningsRows(opts: {
  shift: ShiftRequest;
  outletName: string;
  drinkMenu: OutletDrinkPrice[];
  rosterSlots: AgencyRosterSlot[];
  prIds: string[];
  prNameById: Record<string, string>;
  trainingLevelById: Record<string, string | undefined>;
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  happyHourStart: string;
  happyHourEnd: string;
  receiptScans?: PrReceiptScan[];
}): OutletPrLiveEarningsBreakdown[] {
  const rosterByPr = new Map(opts.rosterSlots.map((s) => [s.prId, s]));
  return opts.prIds.flatMap((prId) => {
    const prName = opts.prNameById[prId];
    if (!prName) return [];
    return [
      outletPrLiveEarningsBreakdown({
        prId,
        prName,
        trainingLevel: opts.trainingLevelById[prId],
        outletName: opts.outletName,
        shift: opts.shift,
        slot: rosterByPr.get(prId),
        drinkMenu: opts.drinkMenu,
        tierRates: opts.tierRates,
        happyHourStart: opts.happyHourStart,
        happyHourEnd: opts.happyHourEnd,
        receiptScans: opts.receiptScans,
      }),
    ];
  });
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

export type LaborCostReportLine = {
  id: string;
  label: string;
  depth: 0 | 1;
  actualRm: number;
  budgetRm: number;
};

export function buildOutletLaborCostReport(
  shift: OutletCutLossShiftSlice & {
    shift: string;
    prs?: string[];
    payTierRows?: PostJobPayTierRow[];
    releasedEarlyPrIds?: string[];
  },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  agencyPRs: { id: string; trainingLevel?: string }[],
): { lines: LaborCostReportLine[]; totalActualRm: number; totalBudgetRm: number } {
  const prTierById = Object.fromEntries(agencyPRs.map((p) => [p.id, p.trainingLevel]));
  const activePrIds = outletShiftActivePrIds(shift);
  const totalBudgetRm = outletShiftTargetLaborCost(shift, tierRates, prTierById);
  const totalActualRm = outletShiftActualLaborCostForShift(shift, tierRates, prTierById);

  const staffing = shiftTierStaffingByPayTier({
    payTierRows: shift.payTierRows,
    quantity: shift.quantity,
    demandCut: shift.demandCut,
    releasedEarlyPrIds: shift.releasedEarlyPrIds,
    tierRates,
    bookedPrIds: activePrIds,
    agencyPRs,
  });
  const demandRows = resolveEffectiveShiftPayTierRows({
    payTierRows: shift.payTierRows,
    quantity: shift.quantity,
    demandCut: shift.demandCut,
    releasedEarlyPrIds: shift.releasedEarlyPrIds,
    tierRates,
    bookedPrIds: activePrIds,
    agencyPRs,
    prTierById,
  });

  const tierLines: LaborCostReportLine[] = [];
  for (const option of POST_JOB_PAY_TIER_OPTIONS) {
    const stats = staffing[option.id];
    if (!stats || (stats.demand === 0 && stats.supplied === 0)) continue;
    const demandRow = demandRows.find((row) => row.payTierId === option.id);
    const wage = demandRow
      ? payTierRowShiftWage(demandRow, tierRates)
      : option.outletTier
        ? tierRates[option.outletTier]?.wagePerHour ?? 0
        : 0;
    tierLines.push({
      id: option.id,
      label: option.label,
      depth: 1,
      budgetRm: wage * stats.demand,
      actualRm: wage * stats.supplied,
    });
  }

  return {
    lines: [
      { id: "labor-total", label: "Labor cost", depth: 0, actualRm: totalActualRm, budgetRm: totalBudgetRm },
      ...tierLines,
    ],
    totalActualRm,
    totalBudgetRm,
  };
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
