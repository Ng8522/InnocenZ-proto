/**
 * Cross-portal sync — single source of truth helpers for Agency, PR, and Outlet.
 */

import type {
  AgencyCollectionInvoice,
  AgencyReconciliationDay,
  AgencyRosterSlot,
  LiveWorkforceEntry,
  OutletCommissionRule,
} from "@/lib/agency-demo";
import { DEFAULT_AGENCY_OWNER, OUTLET_COMMISSION_RULES } from "@/lib/agency-demo";
import type { HistRow, PrPaymentVoucher } from "@/lib/pr-demo";
import { formatPrDisplayName } from "@/lib/pr-demo";
import { getPayrollWeekSundayIso } from "@/lib/demo-clock";
import {
  deriveShiftHistoryStatus,
  histRowsFromInboxPv,
  isPayrollWeekFromInboxPv,
  isPayrollWeekHiddenInHistory,
  isPrPaymentInboxPv,
  isShiftHiddenInHistory,
  pvForPayrollDate,
} from "@/lib/pr-payment-history";
import { shiftRowIncomeBreakdown } from "@/lib/pr-weekly-payment";
import { filterShiftHistoryThroughToday, prepareShiftHistoryForDisplay, sortShiftHistoryDesc, type ShiftHistoryRow } from "@/lib/shift-history-utils";
import type { ShiftRequest } from "@/lib/store";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";

/** Canonical outlet for the demo outlet portal (Velvet 23) */
export const DEFAULT_OUTLET_CANONICAL = "Velvet 23";

const OUTLET_ALIASES: Record<string, string> = {
  "Velvet Room KL": "Velvet 23",
  "Velvet 23": "Velvet 23",
};

export function canonicalOutlet(name: string): string {
  return OUTLET_ALIASES[name] ?? name;
}

export function outletMatches(a: string, b: string): boolean {
  return canonicalOutlet(a) === canonicalOutlet(b);
}

export function isDefaultOutlet(name: string): boolean {
  return outletMatches(name, DEFAULT_OUTLET_CANONICAL);
}

/** Estimated roster payout using live commission rules from the store */
export function estimateRosterPayout(
  slot: AgencyRosterSlot,
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
  perDrinkRm = 12,
): number {
  const rule = rules.find((r) => outletMatches(r.outlet, slot.outlet)) ?? rules[0];
  const wage = (rule?.wagePerHour ?? 60) * 6;
  const drinks = slot.floorDrinks ?? 0;
  const tips = slot.floorTips ?? 0;
  const drinkPct = rule?.drinkPct ?? 8;
  const tipPct = rule?.tipPct ?? 15;
  return Math.round((wage + drinks * perDrinkRm * (drinkPct / 100) + tips * (tipPct / 100)) * 100) / 100;
}

/** Live floor cards derived from roster — replaces static SEED_LIVE_WORKFORCE in UI */
export function deriveLiveWorkforce(
  roster: AgencyRosterSlot[],
  dateIso: string = DEFAULT_ROSTER_DATE_ISO,
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
  perDrinkRm = 12,
): LiveWorkforceEntry[] {
  return roster
    .filter(
      (s) =>
        s.dateIso === dateIso &&
        (s.status === "on-duty" || s.status === "en-route" || s.status === "scheduled"),
    )
    .filter((s) => s.status === "en-route" || (s.status === "on-duty" && !!s.checkedInAt))
    .map((s) => ({
      id: s.id,
      prName: s.prName,
      outlet: s.outlet,
      status: s.status === "on-duty" && s.checkedInAt ? "on-duty" : "en-route",
      checkIn: s.checkedInAt,
      checkOut: s.checkedOutAt,
      estPayout: s.estPayout ?? estimateRosterPayout(s, rules, perDrinkRm),
      drinks: s.floorDrinks ?? 0,
      tips: s.floorTips ?? 0,
    }));
}

type OutletShiftSlot = {
  outletName: string;
  status: string;
  prs: string[];
  filled: number;
  quantity: number;
};

/** Patch late / no-show flags on a PR's roster slot for the demo date */
export function patchPrRosterAttendanceFlags(
  roster: AgencyRosterSlot[],
  prId: string,
  outlet: string,
  dateIso: string,
  patch: { lateFlag?: boolean; noShowFlag?: boolean },
): AgencyRosterSlot[] {
  const idx = roster.findIndex(
    (s) => s.prId === prId && s.dateIso === dateIso && outletMatches(s.outlet, outlet),
  );
  if (idx < 0) return roster;
  return roster.map((s, i) => (i === idx ? { ...s, ...patch } : s));
}

/** Add a PR to the first open outlet shift with capacity */
export function addPrToOutletShift<T extends OutletShiftSlot>(shifts: T[], outlet: string, prId: string): T[] {
  const idx = shifts.findIndex(
    (s) =>
      outletMatches(s.outletName, outlet) &&
      s.status !== "sealed" &&
      !s.prs.includes(prId) &&
      s.filled < s.quantity,
  );
  if (idx < 0) return shifts;
  return shifts.map((sh, i) => {
    if (i !== idx) return sh;
    const prs = [...sh.prs, prId];
    return { ...sh, prs, filled: prs.length };
  });
}

export function floorTipsForOutletFromRoster(
  roster: AgencyRosterSlot[],
  outletName: string,
  dateIso: string = DEFAULT_ROSTER_DATE_ISO,
): number {
  return roster
    .filter((s) => s.dateIso === dateIso && outletMatches(s.outlet, outletName))
    .reduce((sum, s) => sum + (s.floorTips ?? 0), 0);
}

/** Outlet billing view of agency collections (same amounts, INV id prefix) */
export function collectionsForOutlet(
  collections: AgencyCollectionInvoice[],
  outletName: string,
): AgencyCollectionInvoice[] {
  return collections.filter((c) => outletMatches(c.outlet, outletName));
}

export function collectionToInvoiceId(colId: string): string {
  return colId.replace(/^COL-/, "INV-");
}

/** Recompute reconciliation totals from outlet gross + PV net (variance = outlet − PV). */
export function recomputeReconciliation(input: {
  outletGross: number;
  pvTotal: number;
  dateIso: string;
  dateLabel: string;
  agencyConfirmed: boolean;
  outletConfirmed: boolean;
}): AgencyReconciliationDay {
  const variance = Math.round((input.outletGross - input.pvTotal) * 100) / 100;
  return {
    dateIso: input.dateIso,
    dateLabel: input.dateLabel,
    outletSalesTotal: input.outletGross,
    pvTotal: input.pvTotal,
    variance,
    agencyConfirmed: input.agencyConfirmed,
    outletConfirmed: input.outletConfirmed,
  };
}

export function sumPvNetForCycle(pvs: PrPaymentVoucher[]): number {
  return Math.round(pvs.reduce((s, p) => s + p.net, 0) * 100) / 100;
}

export function outletGrossFromPnl(
  outletPnl: { outlet: string; grossRevenue: number }[],
  outletName: string,
): number {
  const row = outletPnl.find((r) => outletMatches(r.outlet, outletName));
  return row?.grossRevenue ?? 0;
}

/** PR history shifts tab — same log as agency/outlet */
export function shiftHistoryForPr(rows: ShiftHistoryRow[], prId: string): ShiftHistoryRow[] {
  return prepareShiftHistoryForDisplay(rows).filter((r) => r.prId === prId);
}

/** PR History shifts tab — sealed log + inbox PV rows; disputed weeks hidden. */
export function shiftHistoryToHistRows(
  rows: ShiftHistoryRow[],
  prId?: string,
  vouchers: PrPaymentVoucher[] = [],
): HistRow[] {
  const list = prId
    ? prepareShiftHistoryForDisplay(rows).filter((r) => r.prId === prId)
    : prepareShiftHistoryForDisplay(rows);

  const disputedWeeks = new Set(
    vouchers
      .filter((pv) => pv.weekStartIso && pv.status === "DISPUTED")
      .map((pv) => pv.weekStartIso!),
  );
  const inboxWeeks = new Set(
    vouchers
      .filter((pv) => pv.weekStartIso && pv.status === "SENT")
      .map((pv) => pv.weekStartIso!),
  );

  const shiftRows: HistRow[] = list
    .filter((row) => {
      const weekSun = getPayrollWeekSundayIso(row.dateIso);
      if (disputedWeeks.has(weekSun) || isPayrollWeekHiddenInHistory(weekSun, vouchers)) {
        return false;
      }
      if (inboxWeeks.has(weekSun) || isPayrollWeekFromInboxPv(weekSun, vouchers)) {
        return false;
      }
      if (isShiftHiddenInHistory(row.dateIso, vouchers)) return false;
      const pv = pvForPayrollDate(row.dateIso, vouchers);
      if (pv && isPrPaymentInboxPv(pv)) return false;
      return true;
    })
    .map((row) => {
      const [y, m, d] = row.dateIso.split("-").map(Number);
      const { st, pill } = deriveShiftHistoryStatus(row.dateIso, vouchers);
      const income = shiftRowIncomeBreakdown(row);
      const total = income.wages + income.drinks + income.tips + income.tables;
      return {
        d: [y, m, d] as [number, number, number],
        venue: row.outlet,
        wages: Math.round(income.wages),
        sales: Math.round(total),
        table: Math.round(income.tables),
        drinks: Math.round(income.drinks),
        tips: Math.round(income.tips),
        st,
        pill,
        durationHours: row.durationHours,
      };
    });

  const inboxRows = vouchers
    .filter((pv) => pv.weekStartIso && pv.status === "SENT")
    .flatMap((pv) => histRowsFromInboxPv(pv));

  return [...shiftRows, ...inboxRows].sort((a, b) => {
    const ak = `${a.d[0]}-${String(a.d[1]).padStart(2, "0")}-${String(a.d[2]).padStart(2, "0")}`;
    const bk = `${b.d[0]}-${String(b.d[1]).padStart(2, "0")}-${String(b.d[2]).padStart(2, "0")}`;
    return bk.localeCompare(ak);
  });
}

export function shiftHistoryForOutlet(rows: ShiftHistoryRow[] | undefined, outletName: string): ShiftHistoryRow[] {
  return sortShiftHistoryDesc((rows ?? []).filter((r) => outletMatches(r.outlet, outletName)));
}

/** Build a history row when a PR checks out or outlet seals a shift */
export function buildShiftHistoryRow(input: {
  prId: string;
  prName: string;
  outlet: string;
  dateIso: string;
  dateDisplay: string;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
  totalTables?: number;
  durationHours?: number;
}): ShiftHistoryRow {
  return {
    id: "h" + Date.now().toString(36),
    prId: input.prId,
    prName: input.prName,
    outlet: canonicalOutlet(input.outlet),
    agencyName: DEFAULT_AGENCY_OWNER.orgName,
    dateDisplay: input.dateDisplay,
    dateIso: input.dateIso,
    totalPayout: input.totalPayout,
    totalDrinks: input.totalDrinks,
    totalTips: input.totalTips,
    totalTables: input.totalTables ?? 0,
    durationHours: input.durationHours ?? 6,
  };
}

/** Sync roster check-in when PR checks in on their app */
function formatRosterDateLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const rest = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${weekday} · ${rest}`;
}

function parseShiftWindow(shift: string): { shiftStart: string; shiftEnd: string } {
  const parts = shift.split(/[—–-]/).map((s) => s.trim());
  return { shiftStart: parts[0] ?? "22:00", shiftEnd: parts[1] ?? "04:00" };
}

export function shiftDateIso(shiftDate: string): string {
  if (shiftDate === "Tonight") return DEFAULT_ROSTER_DATE_ISO;
  return DEFAULT_ROSTER_DATE_ISO;
}

export interface RosterSlotSeed {
  prId: string;
  prName: string;
  outlet: string;
  dateIso?: string;
  dateLabel?: string;
  shift?: string;
}

function findRosterSlot(
  roster: AgencyRosterSlot[],
  prId: string,
  outlet: string,
  dateIso: string,
): AgencyRosterSlot | undefined {
  const canon = canonicalOutlet(outlet);
  return roster.find(
    (s) => s.prId === prId && s.dateIso === dateIso && outletMatches(s.outlet, canon),
  );
}

/** Create a roster slot when a PR is booked on a shift but has no roster row yet */
export function ensureRosterSlot(
  roster: AgencyRosterSlot[],
  seed: RosterSlotSeed,
  status: AgencyRosterSlot["status"] = "scheduled",
  patch?: Partial<AgencyRosterSlot>,
): AgencyRosterSlot[] {
  const dateIso = seed.dateIso ?? DEFAULT_ROSTER_DATE_ISO;
  const existing = findRosterSlot(roster, seed.prId, seed.outlet, dateIso);
  if (existing) {
    return roster.map((s) => (s.id === existing.id ? { ...s, ...patch, status: patch?.status ?? status } : s));
  }
  const canon = canonicalOutlet(seed.outlet);
  const { shiftStart, shiftEnd } = parseShiftWindow(seed.shift ?? "22:00 — 04:00");
  const shift = seed.shift ?? `${shiftStart} — ${shiftEnd}`;
  const slot: AgencyRosterSlot = {
    id: `rs-${seed.prId}-${dateIso}`,
    prId: seed.prId,
    prName: seed.prName,
    outlet: canon,
    date: seed.dateLabel ?? formatRosterDateLabel(dateIso),
    dateIso,
    shift,
    shiftStart,
    shiftEnd,
    status,
    ...patch,
  };
  return [slot, ...roster];
}

/** PR tapped "on my way" — booked → en-route (still outside geofence until check-in) */
export function rosterEnRoute(
  roster: AgencyRosterSlot[],
  prId: string,
  outlet: string,
  seed?: Omit<RosterSlotSeed, "prId" | "outlet">,
): AgencyRosterSlot[] {
  const canon = canonicalOutlet(outlet);
  const dateIso = seed?.dateIso ?? DEFAULT_ROSTER_DATE_ISO;
  const existing = findRosterSlot(roster, prId, outlet, dateIso);

  if (existing) {
    if (existing.status === "on-duty" || existing.status === "en-route") return roster;
    if (existing.status === "scheduled" || existing.status === "assignment-pending") {
      return roster.map((s) =>
        s.id === existing.id ? { ...s, status: "en-route" as const, noShowFlag: false } : s,
      );
    }
    return roster;
  }

  if (!seed?.prName) return roster;

  const { shiftStart, shiftEnd } = parseShiftWindow(seed.shift ?? "22:00 — 04:00");
  return ensureRosterSlot(
    roster,
    { prId, outlet: canon, dateIso, ...seed },
    "en-route",
    { shiftStart, shiftEnd },
  );
}

export function rosterCheckIn(
  roster: AgencyRosterSlot[],
  prId: string,
  outlet: string,
  time: string,
  seed?: Omit<RosterSlotSeed, "prId" | "outlet">,
): AgencyRosterSlot[] {
  const canon = canonicalOutlet(outlet);
  const dateIso = seed?.dateIso ?? DEFAULT_ROSTER_DATE_ISO;
  const existing = findRosterSlot(roster, prId, outlet, dateIso);

  if (existing) {
    if (
      existing.status === "scheduled" ||
      existing.status === "en-route" ||
      existing.status === "assignment-pending" ||
      existing.status === "on-duty"
    ) {
      return roster.map((s) =>
        s.id === existing.id
          ? { ...s, status: "on-duty" as const, checkedInAt: time, noShowFlag: false }
          : s,
      );
    }
    return roster;
  }

  if (!seed?.prName) return roster;

  const { shiftStart, shiftEnd } = parseShiftWindow(seed.shift ?? "22:00 — 04:00");
  return ensureRosterSlot(
    roster,
    { prId, outlet: canon, dateIso, ...seed },
    "on-duty",
    { checkedInAt: time, noShowFlag: false, shiftStart, shiftEnd },
  );
}

/** Sync roster check-out */
export function rosterCheckOut(
  roster: AgencyRosterSlot[],
  prId: string,
  outlet: string,
  time: string,
): AgencyRosterSlot[] {
  const canon = canonicalOutlet(outlet);
  return roster.map((s) => {
    if (s.prId !== prId || !outletMatches(s.outlet, canon)) return s;
    if (s.status === "on-duty") {
      return { ...s, status: "scheduled" as const, checkedOutAt: time };
    }
    return s;
  });
}

/** Outlet shift PR list aligned with agency managed PRs */
export function marketplacePrsFromAgency(
  agencyPRs: { id: string; name: string; rating: number; languages: string[] }[],
) {
  const avatars: Record<string, string> = {
    p1: "🌙",
    p2: "✨",
    p3: "🥂",
    p4: "💎",
    p5: "🌹",
    p6: "🎐",
    p7: "⭐",
    p8: "🌸",
    p9: "💫",
    p10: "🔥",
    p11: "📋",
    "freelancer-jaya": "🌸",
  };
  return agencyPRs.map((p) => ({
    id: p.id,
    name: formatPrDisplayName(p.id, p.name),
    rating: p.rating,
    languages: p.languages.map((l) => (l.length <= 3 ? l : l.slice(0, 2).toUpperCase())),
    status: "available" as const,
    avatar: avatars[p.id] ?? "✨",
  }));
}

export function tonightShiftOutletName(shifts: ShiftRequest[] | undefined): string {
  const list = shifts ?? [];
  const tonight = list.find((s) => s.date === "Tonight") ?? list[0];
  return tonight ? canonicalOutlet(tonight.outletName) : DEFAULT_OUTLET_CANONICAL;
}
