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
import { marketplacePrsFromAgency } from "@/lib/portal-sync";
import {
  DEMO_RECONCILIATION_WEEK,
  recomputeWeeklyReconciliation,
} from "@/lib/reconciliation-weekly";
import { SEED_SHIFT_HISTORY } from "@/lib/shift-history";
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
      preferredRating: 4.5,
      preferredStarTiers: [4, 5],
      estimatedCost: 3840,
      liveSales: 0,
      drinkUnits: 8,
      tableUnits: 3,
      status: "confirmed",
      prs: ["p1", "p2", "p3", "p4", "p5"],
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
      prs: ["p1", "p2", "p3", "p4"],
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
      prs: ["p2", "p3"],
      payPerHour: corporateTiers["Tier I"].wagePerHour,
      tierRates: corporateTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s4",
      outletName: "Mermate",
      date: demoShiftDateLabel(0),
      shift: "21:00 — 02:00",
      quantity: 14,
      filled: 9,
      languages: "English / Mandarin",
      event: "Thursday lounge",
      preferredRating: 4,
      estimatedCost: 2520,
      liveSales: 0,
      status: "open",
      prs: ["p7"],
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
      prs: ["p5", "p6"],
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
      date: demoShiftDateLabel(0),
      shift: "22:00 — 04:00",
      quantity: 12,
      filled: 7,
      languages: "English / Cantonese",
      event: "Thursday floor coverage",
      preferredRating: 4,
      estimatedCost: 2400,
      liveSales: 0,
      status: "open",
      prs: ["p3"],
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
      prs: ["p4", "p5"],
      payPerHour: bearLaunchTiers["Tier I"].wagePerHour,
      tierRates: bearLaunchTiers,
      dressCode: "Black dress code",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s8b",
      outletName: "Bear Lounge",
      date: demoShiftDateLabel(2),
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
      date: demoShiftDateLabel(0),
      shift: "21:00 — 03:00",
      quantity: 14,
      filled: 8,
      languages: "English / Cantonese",
      event: "Thursday premium lounge",
      preferredRating: 4.2,
      estimatedCost: 3080,
      liveSales: 0,
      status: "open",
      prs: ["p6"],
      payPerHour: onyxThuTiers["Tier I"].wagePerHour,
      tierRates: onyxThuTiers,
      dressCode: "Smart casual",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s10",
      outletName: "Onyx KL",
      date: demoShiftDateLabel(1),
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
      prs: ["p1", "p2"],
      payPerHour: onyxRooftopTiers["Tier I"].wagePerHour,
      tierRates: onyxRooftopTiers,
      dressCode: "Cocktail attire",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s11",
      outletName: "Urban Soul",
      date: demoShiftDateLabel(1),
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
      prs: ["p2", "p3", "p4"],
      payPerHour: urbanPartyTiers["Tier I"].wagePerHour,
      tierRates: urbanPartyTiers,
      dressCode: "Heels required",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s12",
      outletName: "Urban Soul",
      date: demoShiftDateLabel(2),
      shift: "21:00 — 03:00",
      quantity: 14,
      filled: 7,
      languages: "English",
      event: "Saturday regular",
      preferredRating: 4,
      estimatedCost: 2520,
      liveSales: 0,
      status: "open",
      prs: ["p7"],
      payPerHour: urbanSatTiers["Tier I"].wagePerHour,
      tierRates: urbanSatTiers,
      dressCode: "Smart casual",
      destination: "agency",
    }),
    withShiftFinancialDefaults({
      id: "s13",
      outletName: "Velvet 23",
      date: demoShiftDateLabel(3),
      shift: "22:00 — 04:00",
      quantity: 15,
      filled: 9,
      languages: "English / Mandarin",
      event: "Sunday lounge",
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
      date: demoShiftDateLabel(4),
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
      date: demoShiftDateLabel(5),
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
  return raw.map((s) => ({ ...s, liveSales: computeShiftLiveSales(s) }));
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
  { id: "app-s2-p5", shiftId: "s2", prId: "p5", prName: "Nina", rating: 4.6, status: "pending" },
  { id: "app-s2-p6", shiftId: "s2", prId: "p6", prName: "Yuki", rating: 4.4, status: "pending" },
  {
    id: "app-s2-p7",
    shiftId: "s2",
    prId: "p7",
    prName: "Chen Wei",
    rating: 4.2,
    status: "pending",
  },
];

function buildDemoRoster(): AgencyRosterSlot[] {
  const date = fmtDateLabelFromIso(DEFAULT_ROSTER_DATE_ISO);
  const shift = "22:00 — 04:00";
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
  const velvetTonight: AgencyRosterSlot[] = [
    {
      id: "rs-demo-p3",
      prId: "p3",
      prName: "Vivi",
      outlet: "Velvet 23",
      date,
      dateIso: DEFAULT_ROSTER_DATE_ISO,
      shift,
      shiftStart: "22:00",
      shiftEnd: "04:00",
      status: "scheduled",
      estPayout: 480,
    },
    {
      id: "rs-demo-p4",
      prId: "p4",
      prName: "Cici",
      outlet: "Velvet 23",
      date,
      dateIso: DEFAULT_ROSTER_DATE_ISO,
      shift,
      shiftStart: "22:00",
      shiftEnd: "04:00",
      status: "scheduled",
      estPayout: 360,
    },
    {
      id: "rs-demo-p5",
      prId: "p5",
      prName: "Nina",
      outlet: "Velvet 23",
      date,
      dateIso: DEFAULT_ROSTER_DATE_ISO,
      shift,
      shiftStart: "22:00",
      shiftEnd: "04:00",
      status: "scheduled",
      estPayout: 360,
    },
  ];
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
    prReceiptScans: historyLedger.scans,
    prComcard: { ...COMCARD },
    prPortfolio: buildSeedPrPortfolio(),
    prLanguages: ["English", "Mandarin", "Cantonese"],
    prDisplayName: null as string | null,
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
  const agencyRoster = buildDemoRoster();
  const outletPnl = recomputeAllOutletPnl(shifts, undefined, agencyRoster);

  return {
    shifts,
    outletPnl,
    outletPnlSyncAt: 0,
    outletMoneyEditCount: 0,
    agencyRoster,
    agencyPRs: SEED_AGENCY_PRS.map(cloneAgencyPr),
    prs: marketplacePrsFromAgency(SEED_AGENCY_PRS.map(cloneAgencyPr)),
    shiftHistory: SEED_SHIFT_HISTORY.map((row) => ({ ...row })),
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
    agencyReconciliation: buildDemoReconciliation(SEED_SHIFT_HISTORY.map((row) => ({ ...row }))),
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
    ...buildPrDemoReset(agencyRoster),
  };
}
