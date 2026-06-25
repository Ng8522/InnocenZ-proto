/**
 * Canonical demo snapshot — restored only via manual “Reset all demo data” on welcome.
 */

import {
  DEFAULT_AGENCY_OWNER,
  DEFAULT_FINANCE_HEAD,
  OUTLET_COMMISSION_RULES,
  SCALING_TIER_MULTIPLIERS,
  SEED_AGENCY_COLLECTIONS,
  SEED_AGENCY_PRS,
  SEED_AGENCY_ROSTER,
  SEED_PENDING_FREELANCER_PAYROLLS,
  SEED_PENDING_PRS,
  SEED_RECONCILIATION,
  type AgencyCollectionInvoice,
  type AgencyManagedPR,
  type AgencyRosterSlot,
} from "@/lib/agency-demo";
import { syncAgencyPayrollReceiptScans, syncAgencyPayrollShiftHistory } from "@/lib/agency-payroll";
import {
  DEFAULT_OUTLET_SETTINGS,
  DEFAULT_OUTLET_WORKSPACE,
  DEFAULT_OUTLET_OWNER,
  DEFAULT_OUTLET_FINANCE_HEAD,
  DEFAULT_OUTLET_OPS_HEAD,
  patchShiftTierWages,
  patchShiftTierSalesTargets,
  DEMO_SHIFT_TIER_SALES_TARGETS,
  type ShiftApplicant,
} from "@/lib/outlet-demo";
import { mergeHistoryDemoLedger } from "@/lib/history-demo-sync";
import {
  computeShiftLiveSales,
  recomputeAllOutletPnl,
  withShiftFinancialDefaults,
} from "@/lib/outlet-financial-sync";
import { marketplacePrsFromAgency, mergeOutletRequestRosterSlots } from "@/lib/portal-sync";
import {
  DEMO_RECONCILIATION_WEEK,
  recomputeWeeklyReconciliation,
} from "@/lib/reconciliation-weekly";
import { SEED_SHIFT_HISTORY, prepareShiftHistoryForDisplay } from "@/lib/shift-history";
import {
  SEED_PR_PVS,
  LIVE_SEED_PR_PVS,
  LIVE_SEED_RECEIPT_SCANS,
  getPrProfile,
  remapSeedPaymentVouchers,
  SEED_RECEIPT_SCANS,
  COMCARD,
  buildSeedPrPortfolio,
  SEED_PR_AVATAR_IMAGE,
  PORTFOLIO_SLOT_COUNT,
  fmtDateLabelFromIso,
  type PrPaymentVoucher,
} from "@/lib/pr-demo";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/push-notifications";
import {
  DEMO_AGENCY_TIED_AT,
  SEED_PENDING_RATINGS,
  SEED_PR_NOTIFICATIONS,
  SEED_RATING_HISTORY,
  SEED_UPCOMING_SHIFTS,
  SEED_PR_SWAP_REQUESTS,
} from "@/lib/pr-features";
import type { Booking, PV, ShiftRequest } from "@/lib/store";
import { addDaysToIso } from "@/lib/demo-clock";
import { resolveOutletShiftDateIso } from "@/lib/agency-outlet-shifts";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";

const DEMO_BOOKINGS: Booking[] = [
  {
    id: "b1",
    outletName: "Velvet 23",
    date: "Tonight",
    shift: "22:00 — 04:00",
    pay: 360,
    status: "offered",
    event: "Hennessy Launch",
    languages: "EN / 中文",
  },
  {
    id: "b2",
    outletName: "Noir Lounge",
    date: "Tomorrow",
    shift: "21:00 — 03:00",
    pay: 320,
    status: "offered",
    event: "Ladies Night",
    languages: "EN / Mandarin",
  },
];

const DEMO_PVS: PV[] = [
  {
    id: "pv1",
    prName: "You",
    outlet: "Velvet 23",
    date: "Last Sat",
    wages: 360,
    drinkCommission: 84,
    tipCommission: 45,
    tableCommission: 30,
    status: "sent",
    version: 1,
  },
];

/** Extra Velvet invoice so Finance can demo Pay */
const DEMO_COLLECTIONS: AgencyCollectionInvoice[] = [
  ...SEED_AGENCY_COLLECTIONS,
  {
    id: "COL-2026-0615",
    outlet: "Velvet 23",
    amount: 2160,
    issueDate: "8 Jun 2026",
    issueTime: "10:00",
    dueDate: "15 Jun 2026",
    status: "PENDING",
    aging: "current",
    linkedPvIds: ["PV-2026-0611-A"],
    lines: [
      { label: "Daily wages", detail: "Velvet 23 · current cycle", amount: 720, group: "payroll" },
      {
        label: "Commission – Drinks",
        detail: "Floor sales passthrough",
        amount: 1240,
        group: "commissions",
      },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 200, group: "fees" },
    ],
  },
];

function demoShiftDateLabel(daysFromToday: number): string {
  if (daysFromToday === 0) return "Tonight";
  if (daysFromToday === 1) return "Tomorrow";
  return fmtDateLabelFromIso(addDaysToIso(DEFAULT_ROSTER_DATE_ISO, daysFromToday));
}

/** Next occurrence of a weekday (0=Sun … 6=Sat) — keeps event names like "Friday lounge" aligned. */
function demoShiftDateOnWeekday(weekday: number, allowToday = false): string {
  const todayIso = DEFAULT_ROSTER_DATE_ISO;
  const [y, m, d] = todayIso.split("-").map(Number);
  const todayDow = new Date(y, m - 1, d).getDay();
  let delta = (weekday - todayDow + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  if (delta === 0) return "Tonight";
  if (delta === 1) return "Tomorrow";
  return fmtDateLabelFromIso(addDaysToIso(todayIso, delta));
}

/** Outlet home — Private VIP Hennessy Launch (Velvet 23 tonight). */
export const HENNESSY_LAUNCH_SHIFT_ID = "s1";

export const HENNESSY_LAUNCH_PR_IDS = [
  "p1",
  "pr-comcard-alice",
  "pr-comcard-angie",
  "pr-comcard-ava",
  "pr-comcard-bernice",
  "pr-comcard-charlotte",
  "pr-comcard-grace",
  "pr-comcard-hazel",
] as const;

const AGENCY_PR_NAME_BY_ID = Object.fromEntries(SEED_AGENCY_PRS.map((p) => [p.id, p.name]));

/** Re-apply demo staffing on the Hennessy shift after localStorage hydrate. */
export function mergeDemoShiftStaffing(
  shifts: ShiftRequest[],
  seedShifts?: ShiftRequest[],
): ShiftRequest[] {
  const seed = seedShifts?.find((s) => s.id === HENNESSY_LAUNCH_SHIFT_ID);
  const prIds = [...HENNESSY_LAUNCH_PR_IDS];
  return shifts.map((sh) => {
    if (sh.id !== HENNESSY_LAUNCH_SHIFT_ID) return sh;
    return {
      ...sh,
      prs: prIds,
      filled: Math.max(sh.filled ?? 0, prIds.length, seed?.filled ?? 0),
      drinkUnits: seed?.drinkUnits ?? 0,
      drinkUnitCounts: seed?.drinkUnitCounts,
      legacyDrinkSalesRm: seed?.legacyDrinkSalesRm,
      liveSales: seed?.liveSales ?? 0,
      anchorLiveSales: seed?.anchorLiveSales ?? 0,
    };
  });
}

/** Re-apply demo shift dates after localStorage hydrate — keeps weekday event names aligned. */
export function mergeDemoShiftDates(
  shifts: ShiftRequest[],
  seedShifts: ShiftRequest[],
): ShiftRequest[] {
  const seedById = Object.fromEntries(seedShifts.map((s) => [s.id, s]));
  return shifts.map((sh) => {
    const seed = seedById[sh.id];
    if (!seed) return sh;
    const dateIso =
      seed.dateIso ??
      resolveOutletShiftDateIso(seed.date, seed.dateIso, DEFAULT_ROSTER_DATE_ISO);
    return { ...sh, date: seed.date, dateIso };
  });
}

function velvetTonightRosterSlot(id: string, prId: string, estPayout = 360): AgencyRosterSlot {
  const date = fmtDateLabelFromIso(DEFAULT_ROSTER_DATE_ISO);
  return {
    id,
    prId,
    prName: AGENCY_PR_NAME_BY_ID[prId] ?? "PR",
    outlet: "Velvet 23",
    date,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "scheduled",
    estPayout,
  };
}

function buildDemoShifts(): ShiftRequest[] {
  const wsTierRates = DEFAULT_OUTLET_WORKSPACE.tierRates;
  const tierRatesFor = (
    baseWage: number,
    targets: Partial<Record<import("@/lib/agency-demo").OutletPrTier, number>>,
  ) =>
    patchShiftTierSalesTargets(
      patchShiftTierWages(wsTierRates, {
        "Tier I": baseWage,
        "Tier II": baseWage + 5,
        "Tier III": baseWage + 10,
        "Tier IV": baseWage + 15,
        "Tier V": baseWage + 30,
      }),
      targets,
    );
  const tonightTiers = tierRatesFor(50, DEMO_SHIFT_TIER_SALES_TARGETS.s1);
  const vipEventDrinks = DEFAULT_OUTLET_WORKSPACE.drinkMenu.map((d) => ({
    ...d,
    priceRm: d.id === "hennessy" ? 450 : d.id === "champagne" ? 550 : Math.round(d.priceRm * 1.25),
  }));
  const ladiesTiers = tierRatesFor(55, DEMO_SHIFT_TIER_SALES_TARGETS.s2);
  const corporateTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s3);
  const mermateThuTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s4);
  const mermateRelaunchTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s5);
  const mermateVipTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s6);
  const bearLaunchTiers = tierRatesFor(50, DEMO_SHIFT_TIER_SALES_TARGETS.s7);
  const bearSoulTiers = tierRatesFor(50, DEMO_SHIFT_TIER_SALES_TARGETS.s8);
  const onyxThuTiers = tierRatesFor(55, DEMO_SHIFT_TIER_SALES_TARGETS.s9);
  const onyxRooftopTiers = tierRatesFor(55, DEMO_SHIFT_TIER_SALES_TARGETS.s10);
  const urbanPartyTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s11);
  const urbanSatTiers = tierRatesFor(45, DEMO_SHIFT_TIER_SALES_TARGETS.s12);
  const raw: ShiftRequest[] = [
    withShiftFinancialDefaults({
      id: "s1",
      outletName: "Velvet 23",
      date: "Tonight",
      shift: "22:00 — 04:00",
      quantity: 16,
      filled: 11,
      languages: "English / Mandarin",
      event: "Private VIP — Hennessy Launch",
      eventKind: "special",
      specialEventType: "vip",
      eventDrinkMenu: vipEventDrinks,
      preferredRating: 4.5,
      preferredStarTiers: [4, 5],
      estimatedCost: 6000,
      liveSales: 0,
      drinkUnits: 0,
      status: "confirmed",
      prs: [...HENNESSY_LAUNCH_PR_IDS],
      payPerHour: tonightTiers["Tier I"].wagePerHour,
      tierRates: tonightTiers,
      dressCode: "Black elegant",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s2",
      outletName: "Velvet 23",
      date: "Tomorrow",
      shift: "21:00 — 03:00",
      quantity: 18,
      filled: 10,
      languages: "English / Mandarin",
      event: "Ladies Night — Champagne",
      preferredRating: 4,
      preferredStarTiers: [4, 5],
      estimatedCost: 4320,
      liveSales: 0,
      status: "open",
      prs: ["p1", "pr-comcard-alice", "pr-comcard-charlotte", "pr-comcard-angie"],
      payPerHour: ladiesTiers["Tier I"].wagePerHour,
      tierRates: ladiesTiers,
      dressCode: "Cocktail attire",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s3",
      outletName: "Velvet 23",
      date: "Fri 6 Jun",
      shift: "20:00 — 02:00",
      quantity: 14,
      filled: 8,
      languages: "English",
      event: "Corporate Table Buyout",
      preferredRating: 4,
      estimatedCost: 2520,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-alice", "pr-comcard-charlotte"],
      payPerHour: corporateTiers["Tier I"].wagePerHour,
      tierRates: corporateTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s4",
      outletName: "Mermate",
      date: demoShiftDateOnWeekday(4, true),
      shift: "21:00 — 02:00",
      quantity: 14,
      filled: 9,
      languages: "English / Mandarin",
      event: "Thursday lounge",
      preferredRating: 4,
      estimatedCost: 2520,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-sarah"],
      payPerHour: mermateThuTiers["Tier I"].wagePerHour,
      tierRates: mermateThuTiers,
      dressCode: "Smart casual",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s5",
      outletName: "Mermate",
      date: demoShiftDateLabel(1),
      shift: "22:00 — 04:00",
      quantity: 16,
      filled: 10,
      languages: "English / Mandarin",
      event: "Lounge relaunch",
      preferredRating: 4.2,
      preferredStarTiers: [3, 4, 5],
      estimatedCost: 2880,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-victoria", "pr-comcard-moon"],
      payPerHour: mermateRelaunchTiers["Tier I"].wagePerHour,
      tierRates: mermateRelaunchTiers,
      dressCode: "Cocktail attire",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s6",
      outletName: "Mermate",
      date: demoShiftDateLabel(2),
      shift: "21:00 — 02:00",
      quantity: 12,
      filled: 6,
      languages: "English",
      event: "Weekend VIP tables",
      preferredRating: 4.5,
      preferredStarTiers: [4, 5],
      estimatedCost: 2160,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: mermateVipTiers["Tier I"].wagePerHour,
      tierRates: mermateVipTiers,
      dressCode: "Black elegant",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s7",
      outletName: "Bear Lounge",
      date: demoShiftDateOnWeekday(4, true),
      shift: "22:00 — 04:00",
      quantity: 12,
      filled: 7,
      languages: "English / Cantonese",
      event: "Thursday floor coverage",
      preferredRating: 4,
      estimatedCost: 2400,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-charlotte"],
      payPerHour: bearLaunchTiers["Tier I"].wagePerHour,
      tierRates: bearLaunchTiers,
      dressCode: "Smart casual",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s8",
      outletName: "Bear Lounge",
      date: demoShiftDateLabel(1),
      shift: "22:30 — 04:30",
      quantity: 16,
      filled: 9,
      languages: "English",
      event: "Launch night floor",
      preferredRating: 4.3,
      preferredStarTiers: [4, 5],
      estimatedCost: 3200,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-angie", "pr-comcard-victoria"],
      payPerHour: bearLaunchTiers["Tier I"].wagePerHour,
      tierRates: bearLaunchTiers,
      dressCode: "Black dress code",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s8b",
      outletName: "Bear Lounge",
      date: demoShiftDateOnWeekday(6),
      shift: "20:00 — 01:00",
      quantity: 12,
      filled: 5,
      languages: "English",
      event: "Saturday soul session",
      preferredRating: 4,
      estimatedCost: 1800,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: bearSoulTiers["Tier I"].wagePerHour,
      tierRates: bearSoulTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s9",
      outletName: "Onyx KL",
      date: demoShiftDateOnWeekday(4, true),
      shift: "21:00 — 03:00",
      quantity: 14,
      filled: 8,
      languages: "English / Cantonese",
      event: "Thursday premium lounge",
      preferredRating: 4.2,
      estimatedCost: 3080,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-moon"],
      payPerHour: onyxThuTiers["Tier I"].wagePerHour,
      tierRates: onyxThuTiers,
      dressCode: "Smart casual",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s10",
      outletName: "Onyx KL",
      date: demoShiftDateOnWeekday(5),
      shift: "20:00 — 02:00",
      quantity: 16,
      filled: 11,
      languages: "English / Mandarin",
      event: "Friday rooftop",
      preferredRating: 4.5,
      preferredStarTiers: [4, 5],
      estimatedCost: 3520,
      liveSales: 0,
      status: "open",
      prs: ["p1", "pr-comcard-alice"],
      payPerHour: onyxRooftopTiers["Tier I"].wagePerHour,
      tierRates: onyxRooftopTiers,
      dressCode: "Cocktail attire",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s11",
      outletName: "Urban Soul",
      date: demoShiftDateOnWeekday(5),
      shift: "20:00 — 01:00",
      quantity: 18,
      filled: 12,
      languages: "English / Mandarin",
      event: "Friday party",
      preferredRating: 4,
      preferredStarTiers: [3, 4, 5],
      estimatedCost: 4320,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-alice", "pr-comcard-charlotte", "pr-comcard-angie"],
      payPerHour: urbanPartyTiers["Tier I"].wagePerHour,
      tierRates: urbanPartyTiers,
      dressCode: "Heels required",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s12",
      outletName: "Urban Soul",
      date: demoShiftDateOnWeekday(6),
      shift: "21:00 — 03:00",
      quantity: 14,
      filled: 7,
      languages: "English",
      event: "Saturday regular",
      preferredRating: 4,
      estimatedCost: 2520,
      liveSales: 0,
      status: "open",
      prs: ["pr-comcard-sarah"],
      payPerHour: urbanSatTiers["Tier I"].wagePerHour,
      tierRates: urbanSatTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s13",
      outletName: "Velvet 23",
      date: demoShiftDateOnWeekday(5),
      shift: "22:00 — 04:00",
      quantity: 15,
      filled: 9,
      languages: "English / Mandarin",
      event: "Friday lounge",
      preferredRating: 4.2,
      estimatedCost: 2700,
      liveSales: 0,
      status: "open",
      prs: ["p1"],
      payPerHour: tonightTiers["Tier I"].wagePerHour,
      tierRates: tonightTiers,
      dressCode: "Smart casual",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s14",
      outletName: "Onyx KL",
      date: demoShiftDateOnWeekday(1),
      shift: "21:00 — 03:00",
      quantity: 14,
      filled: 6,
      languages: "English / Cantonese",
      event: "Monday premium night",
      preferredRating: 4.3,
      estimatedCost: 3080,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: onyxThuTiers["Tier I"].wagePerHour,
      tierRates: onyxThuTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s15",
      outletName: "Bear Lounge",
      date: demoShiftDateOnWeekday(2),
      shift: "22:30 — 04:30",
      quantity: 12,
      filled: 4,
      languages: "English",
      event: "Tuesday soul night",
      preferredRating: 4,
      estimatedCost: 2400,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: bearSoulTiers["Tier I"].wagePerHour,
      tierRates: bearSoulTiers,
      dressCode: "Black dress code",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s17",
      outletName: "Velvet 23",
      date: demoShiftDateOnWeekday(6),
      shift: "21:00 — 03:00",
      quantity: 16,
      filled: 10,
      languages: "English / Mandarin",
      event: "Saturday champagne",
      preferredRating: 4.9,
      preferredStarTiers: [4, 5],
      estimatedCost: 3520,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: tonightTiers["Tier I"].wagePerHour,
      tierRates: tonightTiers,
      dressCode: "Black dress code",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s16",
      outletName: "Mermate",
      date: demoShiftDateLabel(6),
      shift: "21:00 — 02:00",
      quantity: 13,
      filled: 5,
      languages: "English / Mandarin",
      event: "Midweek tables",
      preferredRating: 4.1,
      estimatedCost: 2340,
      liveSales: 0,
      status: "open",
      prs: [],
      payPerHour: mermateThuTiers["Tier I"].wagePerHour,
      tierRates: mermateThuTiers,
      dressCode: "Cocktail attire",
      destination: "agency",
    }),
  ];
  return raw.map((s) => ({
    ...s,
    filled: s.prs?.length ?? 0,
    liveSales:
      (s.drinkUnits ?? 0) > 0 || s.drinkUnitCounts
        ? computeShiftLiveSales(s)
        : 0,
    dateIso: s.dateIso ?? resolveOutletShiftDateIso(s.date, s.dateIso, DEFAULT_ROSTER_DATE_ISO),
  }));
}

function cloneRosterSlot(slot: AgencyRosterSlot): AgencyRosterSlot {
  return {
    ...slot,
    lateFlag: undefined,
    noShowFlag: undefined,
    outletSwap: slot.outletSwap ? { ...slot.outletSwap } : undefined,
    agencyAssignment: slot.agencyAssignment ? { ...slot.agencyAssignment } : undefined,
  };
}

function cloneAgencyPr(pr: AgencyManagedPR): AgencyManagedPR {
  return { ...pr, detached: false };
}

function clonePaymentVoucher(pv: PrPaymentVoucher): PrPaymentVoucher {
  return {
    ...pv,
    rows: pv.rows.map((r) => ({ ...r })),
    overrideAudit: undefined,
  };
}

const DEMO_APPLICANTS: ShiftApplicant[] = [
  { id: "app-s2-p5", shiftId: "s2", prId: "pr-comcard-victoria", prName: "Victoria", rating: 4.6, status: "pending", source: "freelancer" },
  { id: "app-s2-p6", shiftId: "s2", prId: "pr-comcard-moon", prName: "Moon", rating: 4.4, status: "pending", source: "freelancer" },
  {
    id: "app-s2-p7",
    shiftId: "s2",
    prId: "pr-comcard-sarah",
    prName: "Sarah",
    rating: 4.2,
    status: "pending",
    source: "freelancer",
  },
];

function buildDemoRoster(): AgencyRosterSlot[] {
  const patched = SEED_AGENCY_ROSTER.map(cloneRosterSlot).map((slot) => {
    if (slot.id === "rs3") {
      const { outletSwap: _swap, ...rest } = slot;
      return {
        ...rest,
        status: "on-duty" as const,
        checkedInAt: "21:45",
        floorDrinks: 9,
        floorTips: 35,
        estPayout: 523,
      };
    }
    return slot;
  });
  const velvetTonight: AgencyRosterSlot[] = HENNESSY_LAUNCH_PR_IDS.filter(
    (prId) => prId !== "p1" && prId !== "pr-comcard-alice",
  ).map((prId, index) => velvetTonightRosterSlot(`rs-hennessy-${index + 1}`, prId));
  return [...patched, ...velvetTonight];
}

/** Fresh weekly reconciliation — both sides pending so Owner/Finance can confirm on Sunday */
function buildDemoReconciliation(shiftHistory: import("@/lib/shift-history-utils").ShiftHistoryRow[]) {
  return recomputeWeeklyReconciliation({
    shiftHistory,
    pvs: SEED_PR_PVS,
    weekStartIso: DEMO_RECONCILIATION_WEEK.weekStartIso,
    weekEndIso: DEMO_RECONCILIATION_WEEK.weekEndIso,
    dateLabel: DEMO_RECONCILIATION_WEEK.dateLabel,
    agencyConfirmed: false,
    outletConfirmed: false,
  });
}

import { defaultPrShiftSessionForRole, type PrShiftSessionState } from "@/lib/pr-session";

/** PR portal fields included in the full demo snapshot. */
export function buildPrDemoReset(agencyRoster: AgencyRosterSlot[] = buildDemoRoster()) {
  const prSessionByRole: Record<"pr_tied" | "pr_free", PrShiftSessionState> = {
    pr_tied: defaultPrShiftSessionForRole("pr_tied", { agencyRoster }),
    pr_free: defaultPrShiftSessionForRole("pr_free", { agencyRoster }),
  };

  const historyLedger = mergeHistoryDemoLedger({
    shiftHistory: SEED_SHIFT_HISTORY,
    scans: [...LIVE_SEED_RECEIPT_SCANS],
    pvs: remapSeedPaymentVouchers(SEED_PR_PVS).map(clonePaymentVoucher),
    profile: getPrProfile("pr_tied"),
  });
  const agencyPRs = SEED_AGENCY_PRS.map(cloneAgencyPr);
  const payrollScans = syncAgencyPayrollReceiptScans(
    historyLedger.scans,
    historyLedger.pvs,
    agencyPRs,
  );

  return {
    prSessionByRole,
    shiftAccepted: false,
    pendingApproval: false,
    acceptedShiftIndex: null as number | null,
    checkedIn: false,
    checkedOut: false,
    drinks: 0,
    tables: 0,
    outletRatingStars: 0,
    prActiveShift: null,
    prPaymentVouchers: historyLedger.pvs,
    prReceiptScans: payrollScans,
    prComcard: { ...COMCARD },
    prPortfolio: buildSeedPrPortfolio(),
    prLanguages: ["English", "Mandarin", "Cantonese"],
    prDisplayName: null as string | null,
    prIcName: null as string | null,
    prMobile: null as string | null,
    prEmail: null as string | null,
    prAvatarPhoto: SEED_PR_AVATAR_IMAGE,
    prPayrollAgencyId: null as string | null,
    prNotifications: [...SEED_PR_NOTIFICATIONS],
    prDeclinedOfferIds: [] as string[],
    prMarketplaceApplication: null,
    prUpcomingShifts: [...SEED_UPCOMING_SHIFTS],
    prSwapRequests: SEED_PR_SWAP_REQUESTS.map((s) => ({ ...s })),
    prAgencyTiedAt: DEMO_AGENCY_TIED_AT,
    prFreelancerPayrollLinks: [] as string[],
    prPendingRatings: [...SEED_PENDING_RATINGS],
    prRatingHistory: [...SEED_RATING_HISTORY],
    prFreelancerLowRatingStrikes: 0,
    prCheckInMeta: {},
    prLeaveRequest: null,
    opsNotifications: [],
    sosIncidents: [],
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  };
}

export function buildDemoStoreReset() {
  const shifts = buildDemoShifts();
  const agencyRoster = mergeOutletRequestRosterSlots(buildDemoRoster(), shifts, DEMO_APPLICANTS);
  const outletPnl = recomputeAllOutletPnl(shifts, undefined, agencyRoster);
  const agencyPRs = SEED_AGENCY_PRS.map(cloneAgencyPr);
  const prDemo = buildPrDemoReset(agencyRoster);
  const shiftHistory = prepareShiftHistoryForDisplay(
    syncAgencyPayrollShiftHistory(
      SEED_SHIFT_HISTORY.map((row) => ({ ...row })),
      prDemo.prPaymentVouchers,
      agencyPRs,
    ),
  );

  return {
    shifts,
    outletPnl,
    outletPnlSyncAt: 0,
    outletMoneyEditCount: 0,
    agencyRoster,
    agencyPRs,
    prs: marketplacePrsFromAgency(SEED_AGENCY_PRS.map(cloneAgencyPr)),
    shiftHistory,
    shiftApplicants: [...DEMO_APPLICANTS],
    ratings: [
      {
        id: "r-demo-1",
        pr: "Vicky",
        stars: 5,
        note: "Strong upsell on VIP tables",
        tags: ["Great upsell", "Professional"],
        date: "3 Jun 2026",
      },
    ],
    agencyReconciliation: buildDemoReconciliation(shiftHistory),
    agencyCollections: DEMO_COLLECTIONS.map((c) => ({ ...c })),
    agencyOwner: { ...DEFAULT_AGENCY_OWNER },
    agencyFinanceHead: { ...DEFAULT_FINANCE_HEAD },
    outletCommissionRules: OUTLET_COMMISSION_RULES.map((r) => ({ ...r })),
    scalingTierMultipliers: { ...SCALING_TIER_MULTIPLIERS },
    bookings: [...DEMO_BOOKINGS],
    pvs: [...DEMO_PVS],
    walletBalance: 1240,
    outletWorkspace: { ...DEFAULT_OUTLET_WORKSPACE },
    outletSettings: { ...DEFAULT_OUTLET_SETTINGS },
    outletOwner: { ...DEFAULT_OUTLET_OWNER },
    outletFinanceHead: { ...DEFAULT_OUTLET_FINANCE_HEAD },
    outletOpsHead: { ...DEFAULT_OUTLET_OPS_HEAD },
    paymentCardLast4: "4242",
    postSealRatePrompt: null,
    pendingPRs: SEED_PENDING_PRS.map((p) => ({ ...p })),
    pendingFreelancerPayrolls: SEED_PENDING_FREELANCER_PAYROLLS.map((p) => ({ ...p })),
    ...prDemo,
  };
}
