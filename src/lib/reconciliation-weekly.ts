import type { AgencyReconciliationDay } from "@/lib/agency-demo";
import { parsePvIssuedMs, type PrPaymentVoucher } from "@/lib/pr-demo";
import { recomputeReconciliation, sumPvNetForCycle } from "@/lib/portal-sync";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { VELVET_OUTLET_NAME, VELVET_WEEKLY_NIGHTS } from "@/lib/velvet-week-demo";

/** Week runs Sunday → Saturday (local calendar). */
export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateIsoInRange(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

export function isWeeklyReconciliationSunday(ref = new Date()): boolean {
  return ref.getDay() === 0;
}

/** On Sunday, reconcile the Sun–Sat week that ended yesterday (Saturday). */
export function getWeeklyReconciliationPeriod(ref = new Date()): {
  weekStartIso: string;
  weekEndIso: string;
  dateLabel: string;
} | null {
  if (!isWeeklyReconciliationSunday(ref)) return null;

  const saturday = new Date(ref);
  saturday.setDate(saturday.getDate() - 1);
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() - 6);

  const weekStartIso = isoDateLocal(sunday);
  const weekEndIso = isoDateLocal(saturday);
  return {
    weekStartIso,
    weekEndIso,
    dateLabel: formatWeekRangeLabel(weekStartIso, weekEndIso),
  };
}

export function formatWeekRangeLabel(weekStartIso: string, weekEndIso: string): string {
  const fmt = (iso: string) =>
    parseIsoDateLocal(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  const y = parseIsoDateLocal(weekEndIso).getFullYear();
  return `Week ${fmt(weekStartIso)} – ${fmt(weekEndIso)} ${y}`;
}

export function shouldShowWeeklyReconciliation(
  reconciliation: AgencyReconciliationDay,
  ref = new Date(),
): boolean {
  const period = getWeeklyReconciliationPeriod(ref);
  if (!period) return false;
  if (!reconciliation.weekEndIso) return true;
  return reconciliation.weekEndIso === period.weekEndIso;
}

function sumVelvetSalesInRange(weekStartIso: string, weekEndIso: string): number {
  return VELVET_WEEKLY_NIGHTS.filter((n) => dateIsoInRange(n.dateIso, weekStartIso, weekEndIso)).reduce(
    (sum, n) => sum + n.sales,
    0,
  );
}

function estimateOutletSalesFromShift(row: ShiftHistoryRow): number {
  return Math.round((row.totalDrinks * 14 + row.totalTips * 6 + row.totalPayout * 1.8) * 100) / 100;
}

/** Agency-wide outlet sales for a Sun–Sat week. */
export function sumAgencyOutletSalesForWeek(
  shiftHistory: ShiftHistoryRow[],
  weekStartIso: string,
  weekEndIso: string,
): number {
  const velvetDates = new Set(
    VELVET_WEEKLY_NIGHTS.filter((n) => dateIsoInRange(n.dateIso, weekStartIso, weekEndIso)).map(
      (n) => n.dateIso,
    ),
  );

  let total = sumVelvetSalesInRange(weekStartIso, weekEndIso);

  for (const row of shiftHistory) {
    if (!dateIsoInRange(row.dateIso, weekStartIso, weekEndIso)) continue;
    if (row.outlet === VELVET_OUTLET_NAME && velvetDates.has(row.dateIso)) continue;
    total += estimateOutletSalesFromShift(row);
  }

  return Math.round(total * 100) / 100;
}

function pvBelongsToWeek(p: PrPaymentVoucher, weekStartIso: string, weekEndIso: string): boolean {
  if (p.weekStartIso && p.weekEndIso) {
    return p.weekStartIso === weekStartIso && p.weekEndIso === weekEndIso;
  }
  const issuedIso = isoDateLocal(new Date(parsePvIssuedMs(p.issued)));
  return dateIsoInRange(issuedIso, weekStartIso, weekEndIso);
}

export function sumPvNetForWeek(
  pvs: PrPaymentVoucher[],
  weekStartIso: string,
  weekEndIso: string,
): number {
  const filtered = pvs.filter((p) => pvBelongsToWeek(p, weekStartIso, weekEndIso));
  return sumPvNetForCycle(filtered);
}

export function recomputeWeeklyReconciliation(input: {
  shiftHistory: ShiftHistoryRow[];
  pvs: PrPaymentVoucher[];
  weekStartIso: string;
  weekEndIso: string;
  dateLabel: string;
  agencyConfirmed: boolean;
  outletConfirmed: boolean;
  varianceReason?: string;
  agencyAdjustDrinks?: number;
  agencyAdjustTips?: number;
  agencyAdjustReason?: string;
}): AgencyReconciliationDay {
  const outletGross = sumAgencyOutletSalesForWeek(
    input.shiftHistory,
    input.weekStartIso,
    input.weekEndIso,
  );
  const pvTotal = sumPvNetForWeek(input.pvs, input.weekStartIso, input.weekEndIso);
  const base = recomputeReconciliation({
    outletGross,
    pvTotal,
    dateIso: input.weekEndIso,
    dateLabel: input.dateLabel,
    agencyConfirmed: input.agencyConfirmed,
    outletConfirmed: input.outletConfirmed,
  });
  return {
    ...base,
    weekStartIso: input.weekStartIso,
    weekEndIso: input.weekEndIso,
    varianceReason: input.varianceReason,
    agencyAdjustDrinks: input.agencyAdjustDrinks,
    agencyAdjustTips: input.agencyAdjustTips,
    agencyAdjustReason: input.agencyAdjustReason,
  };
}

export function buildReconciliationFromLedger(
  st: {
    agencyReconciliation: AgencyReconciliationDay;
    shiftHistory: ShiftHistoryRow[];
    prPaymentVouchers: PrPaymentVoucher[];
  },
  patch: {
    shiftHistory?: ShiftHistoryRow[];
    prPaymentVouchers?: PrPaymentVoucher[];
  } = {},
  ref = new Date(),
): AgencyReconciliationDay {
  const period = getWeeklyReconciliationPeriod(ref);
  const prev = st.agencyReconciliation;
  if (!period) return prev;

  const shiftHistory = patch.shiftHistory ?? st.shiftHistory;
  const pvs = patch.prPaymentVouchers ?? st.prPaymentVouchers;
  const isNewWeek = prev.weekEndIso !== period.weekEndIso;

  return recomputeWeeklyReconciliation({
    shiftHistory,
    pvs,
    weekStartIso: period.weekStartIso,
    weekEndIso: period.weekEndIso,
    dateLabel: period.dateLabel,
    agencyConfirmed: isNewWeek ? false : prev.agencyConfirmed,
    outletConfirmed: isNewWeek ? false : prev.outletConfirmed,
    varianceReason: isNewWeek ? undefined : prev.varianceReason,
    agencyAdjustDrinks: isNewWeek ? undefined : prev.agencyAdjustDrinks,
    agencyAdjustTips: isNewWeek ? undefined : prev.agencyAdjustTips,
    agencyAdjustReason: isNewWeek ? undefined : prev.agencyAdjustReason,
  });
}

/** Fixed Sun–Sat demo week aligned with velvet seed (1–7 Jun 2026). */
export const DEMO_RECONCILIATION_WEEK = {
  weekStartIso: "2026-06-01",
  weekEndIso: "2026-06-07",
  dateLabel: formatWeekRangeLabel("2026-06-01", "2026-06-07"),
} as const;
