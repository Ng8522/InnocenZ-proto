/**
 * Canonical demo snapshot — restored when user returns to the welcome screen.
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
  type ShiftApplicant,
} from "@/lib/outlet-demo";
import {
  computeShiftLiveSales,
  recomputeAllOutletPnl,
  withShiftFinancialDefaults,
} from "@/lib/outlet-financial-sync";
import {
  marketplacePrsFromAgency,
  outletGrossFromPnl,
  recomputeReconciliation,
  sumPvNetForCycle,
} from "@/lib/portal-sync";
import { SEED_SHIFT_HISTORY } from "@/lib/shift-history";
import {
  SEED_PR_PVS,
  SEED_RECEIPT_SCANS,
  COMCARD,
  PORTFOLIO_SLOT_COUNT,
  type PrPaymentVoucher,
} from "@/lib/pr-demo";
import {
  DEMO_AGENCY_TIED_AT,
  SEED_PENDING_RATINGS,
  SEED_PR_NOTIFICATIONS,
  SEED_RATING_HISTORY,
  SEED_UPCOMING_SHIFTS,
  SEED_PR_SWAP_REQUESTS,
} from "@/lib/pr-features";
import type { Booking, PV, ShiftRequest } from "@/lib/store";
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
    linkedPvIds: ["PV-2026-0615-A"],
  },
];

function buildDemoShifts(): ShiftRequest[] {
  const raw: ShiftRequest[] = [
    withShiftFinancialDefaults({
      id: "s1",
      outletName: "Velvet 23",
      date: "Tonight",
      shift: "22:00 — 04:00",
      quantity: 6,
      filled: 4,
      languages: "English / Mandarin",
      event: "Private VIP — Hennessy Launch",
      preferredRating: 4.5,
      preferredStarTiers: [4, 5],
      estimatedCost: 1440,
      liveSales: 0,
      drinkUnits: 8,
      tableUnits: 3,
      status: "confirmed",
      prs: ["p1", "p2", "p3", "p4"],
      payPerHour: 60,
      dressCode: "Black elegant",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s2",
      outletName: "Velvet 23",
      date: "Tomorrow",
      shift: "21:00 — 03:00",
      quantity: 8,
      filled: 4,
      languages: "English / Mandarin",
      event: "Ladies Night — Champagne",
      preferredRating: 4,
      preferredStarTiers: [4, 5],
      estimatedCost: 1920,
      liveSales: 0,
      status: "open",
      prs: ["p1", "p2", "p3", "p4"],
      payPerHour: 60,
      dressCode: "Cocktail attire",
      destination: "both",
    }),
    withShiftFinancialDefaults({
      id: "s3",
      outletName: "Velvet 23",
      date: "Fri 6 Jun",
      shift: "20:00 — 02:00",
      quantity: 4,
      filled: 2,
      languages: "English",
      event: "Corporate Table Buyout",
      preferredRating: 4,
      estimatedCost: 720,
      liveSales: 0,
      status: "open",
      prs: ["p2", "p3"],
      payPerHour: 60,
      dressCode: "Smart casual",
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
  return { ...pr, suspended: false, detached: false };
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
  { id: "app-s2-p7", shiftId: "s2", prId: "p7", prName: "Chen Wei", rating: 4.2, status: "pending" },
];

function buildDemoRoster(): AgencyRosterSlot[] {
  const date = "Wed · 04 Jun 2026";
  const shift = "22:00 — 04:00";
  const patched = SEED_AGENCY_ROSTER.map(cloneRosterSlot).map((slot) => {
    if (slot.id === "rs1") {
      return {
        ...slot,
        status: "on-duty" as const,
        checkedInAt: "21:58",
        floorDrinks: 14,
        floorTips: 52,
      };
    }
    return slot;
  });
  const extra: AgencyRosterSlot[] = [
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
      status: "on-duty",
      checkedInAt: "22:14",
      floorDrinks: 11,
      floorTips: 41,
      estPayout: 395,
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
      status: "on-duty",
      checkedInAt: "22:22",
      floorDrinks: 7,
      floorTips: 28,
      estPayout: 368,
    },
  ];
  return [...patched, ...extra];
}

/** Fresh reconciliation — both sides pending so Owner/Finance can confirm */
function buildDemoReconciliation(shifts: ShiftRequest[], roster: AgencyRosterSlot[]) {
  const outletPnl = recomputeAllOutletPnl(shifts, undefined, roster);
  return recomputeReconciliation({
    outletGross: outletGrossFromPnl(outletPnl, "Velvet 23"),
    pvTotal: sumPvNetForCycle(SEED_PR_PVS),
    dateIso: SEED_RECONCILIATION.dateIso,
    dateLabel: SEED_RECONCILIATION.dateLabel,
    agencyConfirmed: false,
    outletConfirmed: false,
  });
}

/** PR portal demo snapshot — restored when entering PR from welcome (same pattern as outlet). */
export function buildPrDemoReset() {
  return {
    shiftAccepted: false,
    pendingApproval: false,
    acceptedShiftIndex: null as number | null,
    checkedIn: false,
    checkedOut: false,
    drinks: 0,
    tables: 0,
    outletRatingStars: 0,
    prActiveShift: null,
    prPaymentVouchers: SEED_PR_PVS.map(clonePaymentVoucher),
    prReceiptScans: [...SEED_RECEIPT_SCANS],
    prComcard: { ...COMCARD },
    prPortfolio: Array.from({ length: PORTFOLIO_SLOT_COUNT }, () => null) as (string | null)[],
    prLanguages: ["English", "Mandarin", "Cantonese"],
    prDisplayName: null as string | null,
    prAvatarPhoto: null as string | null,
    prPayrollAgencyId: null as string | null,
    prNotifications: [...SEED_PR_NOTIFICATIONS],
    prDeclinedOfferIds: [] as string[],
    prMarketplaceApplication: null,
    prUpcomingShifts: [...SEED_UPCOMING_SHIFTS],
    prSelfLogs: [],
    prSwapRequests: SEED_PR_SWAP_REQUESTS.map((s) => ({ ...s })),
    prAgencyTiedAt: DEMO_AGENCY_TIED_AT,
    prFreelancerPayrollLinks: [] as string[],
    prPendingRatings: [...SEED_PENDING_RATINGS],
    prRatingHistory: [...SEED_RATING_HISTORY],
    prFreelancerLowRatingStrikes: 0,
    prCheckInMeta: {},
    prLeaveRequest: null,
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
        pr: "Luna",
        stars: 5,
        note: "Strong upsell on VIP tables",
        tags: ["Great upsell", "Professional"],
        date: "3 Jun 2026",
      },
    ],
    agencyReconciliation: buildDemoReconciliation(shifts, agencyRoster),
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
    paymentCardLast4: "4242",
    postSealRatePrompt: null,
    pendingPRs: SEED_PENDING_PRS.map((p) => ({ ...p })),
    pendingFreelancerPayrolls: SEED_PENDING_FREELANCER_PAYROLLS.map((p) => ({ ...p })),
    ...buildPrDemoReset(),
  };
}
