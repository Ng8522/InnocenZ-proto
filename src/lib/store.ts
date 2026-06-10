import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type PrSubRole,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrComcard,
  type PrReceiptScan,
  type PrActiveShiftSession,
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  SEED_PR_PVS,
  SEED_RECEIPT_SCANS,
  COMCARD,
  PORTFOLIO_SLOT_COUNT,
  calcReceiptCommissions,
  buildPaymentVoucherFromShift,
  getPrProfile,
  makeShiftSessionId,
  makeShiftPvId,
  FINANCE_HEAD_SIGNER,
  FREELANCER_DEMO_PR_ID,
  DEFAULT_TIED_AGENCY_ID,
  getPrAgencyById,
  getPrRosterId,
} from "@/lib/pr-demo";
import {
  type AgencyOwnerSettings,
  type AgencyRosterSlot,
  type AgencyManagedPR,
  type AgencyCollectionInvoice,
  type AgencyFinanceHead,
  type AgencyReconciliationDay,
  type OutletSwapRequest,
  DEFAULT_AGENCY_OWNER,
  DEFAULT_FINANCE_HEAD,
  SEED_AGENCY_COLLECTIONS,
  SEED_AGENCY_ROSTER,
  SEED_RECONCILIATION,
  mergeAgencyRoster,
  SEED_AGENCY_PRS,
  SEED_PENDING_PRS,
  SEED_PENDING_FREELANCER_PAYROLLS,
  pendingPRToManagedPR,
  OUTLET_COMMISSION_RULES,
  SCALING_TIER_MULTIPLIERS,
  type OutletCommissionRule,
} from "@/lib/agency-demo";
import {
  buildPvFromShiftHistoryRow,
  historyRowHasPv,
} from "@/lib/agency-actions";
import { getFreePrsWithDistances } from "@/lib/roster-availability";
import type { AgencySubRole } from "@/lib/agency-rbac";
import type { OutletSubRole } from "@/lib/outlet-rbac";
import {
  computeShiftLiveSales,
  recomputeAllOutletPnl,
  withShiftFinancialDefaults,
  type OutletPnlSynced,
} from "@/lib/outlet-financial-sync";
import { mergeShiftHistory, type ShiftHistoryRow, SEED_SHIFT_HISTORY } from "@/lib/shift-history";
import {
  buildShiftHistoryRow,
  marketplacePrsFromAgency,
  recomputeReconciliation,
  rosterCheckIn,
  rosterCheckOut,
  sumPvNetForCycle,
  outletGrossFromPnl,
  canonicalOutlet,
  outletMatches,
} from "@/lib/portal-sync";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import {
  type OutletSettings,
  type OutletWorkspaceSettings,
  type ShiftApplicant,
  type ShiftDestination,
  DEFAULT_OUTLET_SETTINGS,
  DEFAULT_OUTLET_WORKSPACE,
  shiftHoursFromLabel,
} from "@/lib/outlet-demo";
import { buildDemoStoreReset, buildPrDemoReset } from "@/lib/demo-seed";
import {
  type PrNotification,
  type PrSelfLog,
  type PrSwapRequest,
  type PrPendingRating,
  type PrRatingRecord,
  type PrUpcomingShift,
  PR_AGENCY_CODES,
  SEED_PR_NOTIFICATIONS,
  SEED_PENDING_RATINGS,
  SEED_RATING_HISTORY,
  SEED_UPCOMING_SHIFTS,
  SEED_PR_SWAP_REQUESTS,
  DEMO_AGENCY_TIED_AT,
  offerToShiftIndex,
} from "@/lib/pr-features";

export type Role = "vendor" | "host" | "agency";

export interface PR {
  id: string;
  name: string;
  rating: number;
  languages: string[];
  status: "available" | "booked" | "pending";
  avatar: string;
}

export interface ShiftRequest {
  id: string;
  outletName: string;
  date: string;
  shift: string;
  quantity: number;
  filled: number;
  languages: string;
  event: string;
  preferredRating: number;
  estimatedCost: number;
  liveSales: number;
  /** Outlet floor pricing — syncs to agency analytics */
  perDrinkRm?: number;
  perTableRm?: number;
  drinkUnits?: number;
  tableUnits?: number;
  /** Baseline live sales when PNL was seeded — delta rolls into gross revenue */
  anchorLiveSales?: number;
  status: "draft" | "open" | "confirmed" | "sealed";
  prs: string[];
  payPerHour: number;
  dressCode?: string;
  destination?: ShiftDestination;
  preferredStarTiers?: number[];
}

export interface PV {
  id: string;
  prName: string;
  outlet: string;
  date: string;
  wages: number;
  drinkCommission: number;
  tipCommission: number;
  tableCommission: number;
  status: "draft" | "sent" | "signed" | "disputed";
  version: number;
}

export interface Booking {
  id: string;
  outletName: string;
  date: string;
  shift: string;
  pay: number;
  status: "offered" | "accepted" | "checked-in" | "completed";
  event: string;
  languages: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface PendingPR {
  id: string;
  name: string;
  languages: string;
  ic?: string;
  mobile?: string;
  email?: string;
  age?: number;
  height?: number;
  weight?: number;
  race?: string;
  hasIcPhotos?: boolean;
  hasSelfie?: boolean;
  hasComcard3d?: boolean;
  portfolioCount?: number;
  submittedAt?: string;
  /** Agency roster id assigned when approved */
  targetPrId?: string;
  source?: "self-signup" | "owner-invite";
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
}

/** Freelancer chose this agency for payroll — agency must approve before PVs */
export interface PendingFreelancerPayroll {
  id: string;
  prId: string;
  prName: string;
  languages: string;
  ic: string;
  mobile: string;
  email: string;
  agencyId: string;
  agencyName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

interface Toast { id: number; message: string; tone?: "success" | "info" | "warn" }

interface StoreState {
  role: Role | null;
  prSubRole: PrSubRole | null;
  outletSubRole: OutletSubRole | null;
  agencySubRole: AgencySubRole | null;
  user: { name: string; email: string } | null;
  setRole: (r: Role | null) => void;
  setPrSubRole: (r: PrSubRole | null) => void;
  setOutletSubRole: (r: OutletSubRole | null) => void;
  setAgencySubRole: (r: AgencySubRole | null) => void;
  signIn: (name: string, email: string) => void;
  signOut: () => void;
  /** Restore all demo data — call when returning to welcome / sign-in */
  resetDemo: () => void;

  /** PR Talent shift lifecycle (prototype flow) */
  shiftAccepted: boolean;
  pendingApproval: boolean;
  acceptedShiftIndex: number | null;
  checkedIn: boolean;
  checkedOut: boolean;
  drinks: number;
  tables: number;
  outletRatingStars: number;
  prActiveShift: PrActiveShiftSession | null;
  acceptPrShift: (shiftIndex?: number) => void;
  approvePrShift: () => void;
  declinePrOffer: (offerId: string) => void;
  applyFreelancerListing: (listingId: string) => void;
  simulateOutletAcceptApplication: () => void;
  simulateOutletDeclineApplication: () => void;
  cancelPrShift: () => void;
  /** Restore PR demo snapshot — called when entering PR from welcome */
  resetPrDemo: () => void;
  /** Prototype: accept shift (if needed) and check in without GPS/selfie */
  demoPrShiftIn: () => void;
  prCheckIn: (opts?: { selfieDataUrl?: string; gpsFallback?: boolean; simulateLate?: boolean }) => void;
  simulatePrNoShow: () => void;
  prCheckOut: () => void;
  setOutletRatingStars: (n: number) => void;

  prNotifications: PrNotification[];
  prDeclinedOfferIds: string[];
  prMarketplaceApplication: { listingId: string; status: "pending" | "accepted" | "declined" } | null;
  prUpcomingShifts: PrUpcomingShift[];
  prSelfLogs: PrSelfLog[];
  prSwapRequests: PrSwapRequest[];
  prAgencyTiedAt: string;
  prFreelancerPayrollLinks: string[];
  prPendingRatings: PrPendingRating[];
  prRatingHistory: PrRatingRecord[];
  prFreelancerLowRatingStrikes: number;
  prCheckInMeta: { late?: boolean; noShowRisk?: boolean; selfieDataUrl?: string | null; gpsFallback?: boolean };
  prLeaveRequest: { type: "leave" | "transfer"; note: string; newAgencyCode?: string; at: string } | null;
  markPrNotificationRead: (id: string) => void;
  requestPrSwap: (replacementPrName: string, reason: string) => void;
  addPrSelfLog: (log: { category: "drinks" | "tips" | "tables"; qty: number; amount: number }) => void;
  flagPrSelfLog: (id: string) => void;
  confirmOutletPrSelfLog: (id: string) => void;
  rejectOutletPrSelfLog: (id: string) => void;
  outletScanPrQr: (prName: string) => void;
  linkPayrollByAgencyCode: (code: string) => void;
  detachFreelancerPayroll: (agencyId: string) => void;
  submitPrOutletRating: (pendingId: string, stars: number) => void;
  submitSosIncident: (note: string, photoDataUrl?: string) => void;
  requestLeaveAgency: (note: string) => void;
  requestTransferAgency: (code: string, note: string) => void;

  prComcard: PrComcard;
  prPortfolio: (string | null)[];
  prLanguages: string[];
  prDisplayName: string | null;
  prAvatarPhoto: string | null;
  prPayrollAgencyId: string | null;
  setPrPayrollAgency: (agencyId: string) => void;
  savePrProfile: (data: {
    displayName: string;
    avatarPhoto: string | null;
    comcard: PrComcard;
    portfolio: (string | null)[];
    languages: string[];
  }) => void;

  prPaymentVouchers: PrPaymentVoucher[];
  signPrPv: (id: string) => void;
  disputePrPv: (id: string, reason: string, photoDataUrl?: string) => void;
  updatePrPvDisputeReason: (id: string, reason: string) => void;
  escalatePrPvDispute: (id: string) => void;
  demoFreelancerLowRatingStrike: () => void;

  prReceiptScans: PrReceiptScan[];
  addReceiptScan: (draft: {
    outlet: string;
    prCode: string;
    prName: string;
    items: PrReceiptScan["items"];
    totalLogged: number;
  }) => string;
  editAgencyPv: (id: string, patch: { rows?: PrPvRow[]; deduct?: number; disputeNote?: string }) => void;
  resendAgencyPv: (id: string) => void;
  resolveAgencyPvDispute: (id: string) => void;
  raiseAgencyPvFromHistory: (shiftHistoryId: string) => void;
  overrideSignedAgencyPv: (id: string, reason: string) => void;

  agencyOwner: AgencyOwnerSettings;
  agencyFinanceHead: AgencyFinanceHead;
  saveAgencyOwner: (patch: Partial<AgencyOwnerSettings>) => void;
  saveAgencyFinanceHead: (patch: Partial<AgencyFinanceHead>) => void;
  sendAgencyOtp: () => void;
  verifyAgencyOtp: (code: string) => boolean;

  agencyCollections: AgencyCollectionInvoice[];
  markCollectionSettled: (id: string) => void;
  sendCollectionReminder: (id: string) => void;
  agencyReconciliation: AgencyReconciliationDay;
  confirmAgencyReconciliation: () => void;
  confirmOutletReconciliation: () => void;
  syncReconciliationFromLedger: () => void;
  adjustAgencyReconciliation: (patch: { drinks?: number; tips?: number; reason: string }) => void;

  agencyRoster: AgencyRosterSlot[];
  editRosterSlot: (id: string, patch: Partial<AgencyRosterSlot>) => void;
  requestOutletSwap: (id: string, targetOutlet: string, agencyNote?: string) => void;
  cancelOutletSwap: (id: string) => void;
  approveOutletSwapByPr: (rosterSlotId: string) => void;
  declineOutletSwapByPr: (rosterSlotId: string) => void;
  approveAgencyAssignmentByPr: (rosterSlotId: string) => void;
  declineAgencyAssignmentByPr: (rosterSlotId: string) => void;
  assignPrToOutlet: (input: {
    prId: string;
    outlet: string;
    dateIso: string;
    dateLabel: string;
    shiftStart: string;
    shiftEnd: string;
  }) => void;
  approvePrSwapRequest: (swapId: string) => void;
  declinePrSwapRequest: (swapId: string) => void;
  demoAutoAssignPr: (dateIso: string) => void;
  flagRosterAttendance: (slotId: string, flag: "late" | "no-show") => void;

  agencyPRs: AgencyManagedPR[];
  suspendAgencyPr: (prId: string) => void;
  detachAgencyPr: (prId: string) => void;
  setAgencyPrKpiTier: (prId: string, tier: string) => void;
  setAgencyPrTrainingTier: (prId: string, tier: string) => void;
  outletCommissionRules: OutletCommissionRule[];
  scalingTierMultipliers: Record<string, number>;
  saveOutletCommissionRule: (outlet: string, patch: Partial<OutletCommissionRule>) => void;
  saveScalingMultipliers: (multipliers: Record<string, number>) => void;
  inviteFinanceHead: (email: string) => void;
  /** Shared transaction log — agency & outlet history screens */
  shiftHistory: ShiftHistoryRow[];

  prs: PR[];
  shifts: ShiftRequest[];
  /** Agency analytics PNL — recomputed when outlet edits floor money */
  outletPnl: OutletPnlSynced[];
  outletPnlSyncAt: number;
  outletMoneyEditCount: number;
  updateOutletShiftMoney: (
    shiftId: string,
    patch: { perDrinkRm?: number; perTableRm?: number },
  ) => void;
  adjustOutletShiftUnits: (shiftId: string, kind: "drink" | "table", delta: number) => void;
  bookings: Booking[];
  pvs: PV[];
  walletBalance: number;
  ratings: { id: string; pr: string; stars: number; note: string; date: string; tags?: string[] }[];
  outletWorkspace: OutletWorkspaceSettings;
  outletSettings: OutletSettings;
  shiftApplicants: ShiftApplicant[];
  postSealRatePrompt: { shiftId: string; prIds: string[] } | null;
  paymentCardLast4: string;
  pendingPRs: PendingPR[];
  pendingFreelancerPayrolls: PendingFreelancerPayroll[];

  approvePendingPR: (id: string) => void;
  rejectPendingPR: (id: string, reason?: string) => void;
  invitePendingPR: (input: { name: string; ic: string; mobile: string; email: string }) => void;
  approveFreelancerPayroll: (id: string) => void;
  rejectFreelancerPayroll: (id: string) => void;

  createShift: (s: Omit<ShiftRequest, "id" | "status" | "filled" | "prs">) => string;
  createShifts: (
    items: Array<Omit<ShiftRequest, "id" | "status" | "filled" | "prs"> & { prs?: string[] }>,
  ) => void;
  deleteShift: (shiftId: string) => void;
  togglePrOnShift: (shiftId: string, prId: string) => void;
  confirmShift: (shiftId: string) => void;
  sealShift: (shiftId: string) => void;
  saveOutletWorkspace: (patch: Partial<OutletWorkspaceSettings>) => void;
  saveOutletSettings: (patch: Partial<OutletSettings>) => void;
  setReconciliationVarianceReason: (reason: string) => void;
  respondToApplicant: (applicantId: string, accept: boolean) => void;
  payOutletInvoice: (collectionId: string) => void;
  updateOutletPaymentCard: (last4: string) => void;
  clearPostSealRatePrompt: () => void;

  acceptBooking: (id: string) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;

  signPv: (id: string) => void;
  disputePv: (id: string, reason: string) => void;
  withdraw: (amount: number) => void;
  ratePr: (prId: string, stars: number, note: string, tags?: string[]) => void;

  toasts: Toast[];
  toast: (m: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

const demoSnapshot = buildDemoStoreReset();

function applyOutletFinancialSync(
  shifts: ShiftRequest[],
  editCount: number,
  syncAt: number,
  roster: AgencyRosterSlot[] = [],
  reconciliation?: AgencyReconciliationDay,
): Pick<StoreState, "shifts" | "outletPnl" | "outletPnlSyncAt" | "outletMoneyEditCount" | "agencyReconciliation"> {
  const normalized = shifts.map(withShiftFinancialDefaults);
  const outletPnl = recomputeAllOutletPnl(normalized, undefined, roster);
  const nextRecon =
    reconciliation ??
    recomputeReconciliation({
      outletGross: outletGrossFromPnl(outletPnl, "Velvet 23"),
      pvTotal: 0,
      dateIso: DEFAULT_ROSTER_DATE_ISO,
      dateLabel: "Wed · 04 Jun 2026",
      agencyConfirmed: false,
      outletConfirmed: false,
    });
  return {
    shifts: normalized,
    outletPnl,
    outletPnlSyncAt: syncAt,
    outletMoneyEditCount: editCount,
    agencyReconciliation: nextRecon,
  };
}

function syncLedgerState(
  st: StoreState,
  patch: Partial<Pick<StoreState, "shifts" | "agencyRoster" | "shiftHistory" | "prPaymentVouchers">>,
): Partial<StoreState> {
  const shifts = patch.shifts ?? st.shifts;
  const roster = patch.agencyRoster ?? st.agencyRoster;
  const pvs = patch.prPaymentVouchers ?? st.prPaymentVouchers;
  const outletPnl = recomputeAllOutletPnl(shifts, undefined, roster);
  const reconciliation = recomputeReconciliation({
    outletGross: outletGrossFromPnl(outletPnl, "Velvet 23"),
    pvTotal: sumPvNetForCycle(pvs),
    dateIso: st.agencyReconciliation.dateIso,
    dateLabel: st.agencyReconciliation.dateLabel,
    agencyConfirmed: st.agencyReconciliation.agencyConfirmed,
    outletConfirmed: st.agencyReconciliation.outletConfirmed,
  });
  return {
    ...patch,
    outletPnl,
    outletPnlSyncAt: Date.now(),
    agencyReconciliation: reconciliation,
  };
}


function mergePendingPRs(persisted: PendingPR[] | undefined, current: PendingPR[]): PendingPR[] {
  const base = persisted && persisted.length > 0 ? persisted : current;
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const seed of SEED_PENDING_PRS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values());
}

function mergePendingFreelancerPayrolls(
  persisted: PendingFreelancerPayroll[] | undefined,
  current: PendingFreelancerPayroll[],
): PendingFreelancerPayroll[] {
  const base = persisted && persisted.length > 0 ? persisted : current;
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const seed of SEED_PENDING_FREELANCER_PAYROLLS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values());
}

let toastId = 0;

function isWelcomePath() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/$/, "") || "/";
  return p === "/" || p === "/signin";
}

function cloneSeedPaymentVouchers(): PrPaymentVoucher[] {
  return SEED_PR_PVS.map((pv) => ({
    ...pv,
    receiptIds: pv.receiptIds ? [...pv.receiptIds] : undefined,
    rows: pv.rows.map((r) => ({
      ...r,
      receiptIds: r.receiptIds ? [...r.receiptIds] : undefined,
    })),
  }));
}

function cloneSeedShifts(): ShiftRequest[] {
  return seedShifts.map((s) =>
    withShiftFinancialDefaults({
      ...s,
      prs: [...s.prs],
    }),
  );
}

function buildDemoResetPatch(): Partial<StoreState> {
  const roster = mergeAgencyRoster(undefined, SEED_AGENCY_ROSTER);
  const shifts = cloneSeedShifts();
  const prPaymentVouchers = cloneSeedPaymentVouchers();
  return {
    role: null,
    prSubRole: null,
    outletSubRole: null,
    agencySubRole: null,
    user: null,
    shiftAccepted: false,
    pendingApproval: false,
    acceptedShiftIndex: null,
    checkedIn: false,
    checkedOut: false,
    drinks: 0,
    tables: 0,
    outletRatingStars: 0,
    prActiveShift: null,
    prComcard: { ...COMCARD },
    prPortfolio: Array.from({ length: PORTFOLIO_SLOT_COUNT }, () => null),
    prLanguages: ["English", "Mandarin", "Cantonese"],
    prDisplayName: null,
    prAvatarPhoto: null,
    prPayrollAgencyId: null,
    prPaymentVouchers,
    prReceiptScans: [...SEED_RECEIPT_SCANS],
    agencyOwner: { ...DEFAULT_AGENCY_OWNER },
    agencyFinanceHead: { ...DEFAULT_FINANCE_HEAD },
    agencyCollections: SEED_AGENCY_COLLECTIONS.map((c) => ({ ...c })),
    agencyReconciliation: recomputeReconciliation({
      outletGross: outletGrossFromPnl(recomputeAllOutletPnl(shifts, undefined, roster), "Velvet 23"),
      pvTotal: sumPvNetForCycle(prPaymentVouchers),
      dateIso: SEED_RECONCILIATION.dateIso,
      dateLabel: SEED_RECONCILIATION.dateLabel,
      agencyConfirmed: SEED_RECONCILIATION.agencyConfirmed,
      outletConfirmed: SEED_RECONCILIATION.outletConfirmed,
    }),
    agencyRoster: roster,
    agencyPRs: SEED_AGENCY_PRS.map((p) => ({ ...p, languages: [...p.languages] })),
    shiftHistory: [...SEED_SHIFT_HISTORY],
    prs: marketplacePrsFromAgency(SEED_AGENCY_PRS),
    shifts,
    outletPnl: recomputeAllOutletPnl(shifts, undefined, roster),
    outletPnlSyncAt: 0,
    outletMoneyEditCount: 0,
    bookings: seedBookings.map((b) => ({ ...b })),
    pvs: seedPVs.map((p) => ({ ...p })),
    walletBalance: 1240,
    ratings: [],
    pendingPRs: SEED_PENDING_PRS.map((p) => ({ ...p })),
    pendingFreelancerPayrolls: SEED_PENDING_FREELANCER_PAYROLLS.map((p) => ({ ...p })),
    toasts: [],
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      role: null,
      prSubRole: null,
      outletSubRole: null,
      agencySubRole: null,
      user: null,
      setRole: (r) => set({ role: r }),
      setPrSubRole: (r) => set({ prSubRole: r }),
      setOutletSubRole: (r) => set({ outletSubRole: r }),
      setAgencySubRole: (r) => set({ agencySubRole: r }),
      signIn: (name, email) => set({ user: { name, email } }),
      signOut: () => {
        get().resetDemo();
      },
      resetDemo: () => {
        const demo = buildDemoStoreReset();
        set({
          ...demo,
          role: null,
          prSubRole: null,
          outletSubRole: null,
          agencySubRole: null,
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
        }),
      resetDemo: () => {
        toastId = 0;
        set(buildDemoResetPatch());
      },

      shiftAccepted: false,
      pendingApproval: false,
      acceptedShiftIndex: null,
      checkedIn: false,
      checkedOut: false,
      drinks: 0,
      tables: 0,
      outletRatingStars: 0,
      prActiveShift: null,

      prNotifications: [...SEED_PR_NOTIFICATIONS],
      prDeclinedOfferIds: [],
      prMarketplaceApplication: null,
      prUpcomingShifts: [...SEED_UPCOMING_SHIFTS],
      prSelfLogs: [],
      prSwapRequests: [...SEED_PR_SWAP_REQUESTS],
      prAgencyTiedAt: DEMO_AGENCY_TIED_AT,
      prFreelancerPayrollLinks: [],
      prPendingRatings: [...SEED_PENDING_RATINGS],
      prRatingHistory: [...SEED_RATING_HISTORY],
      prFreelancerLowRatingStrikes: 0,
      prCheckInMeta: {},
      prLeaveRequest: null,

      acceptPrShift: (shiftIndex) => {
        const idx = shiftIndex ?? 0;
        const tied = get().prSubRole === "pr_tied";
        if (tied) {
          set({ pendingApproval: true, acceptedShiftIndex: idx });
          get().toast("Sent to Atlas Agency for approval", "warn");
        } else {
          set({ shiftAccepted: true, acceptedShiftIndex: idx, pendingApproval: false });
          get().toast("Shift accepted — slot locked", "success");
        }
      },
      declinePrOffer: (offerId) => {
        set((st) => ({
          prDeclinedOfferIds: st.prDeclinedOfferIds.includes(offerId)
            ? st.prDeclinedOfferIds
            : [...st.prDeclinedOfferIds, offerId],
        }));
        get().toast("Offer declined", "info");
      },
      applyFreelancerListing: (listingId) => {
        if (get().prSubRole !== "pr_free") return;
        if (get().prFreelancerLowRatingStrikes >= 3) {
          get().toast("Account suspended — 3 ratings below 3.0★", "warn");
          return;
        }
        set({
          prMarketplaceApplication: { listingId, status: "pending" },
          acceptedShiftIndex: offerToShiftIndex(listingId),
        });
        get().toast("Application sent — outlet or agency will accept or decline", "info");
      },
      simulateOutletAcceptApplication: () => {
        const app = get().prMarketplaceApplication;
        if (!app || app.status !== "pending") return;
        set({
          prMarketplaceApplication: { ...app, status: "accepted" },
          shiftAccepted: true,
          pendingApproval: false,
        });
        get().toast("Outlet accepted your application — slot locked", "success");
      },
      simulateOutletDeclineApplication: () => {
        const app = get().prMarketplaceApplication;
        if (!app || app.status !== "pending") return;
        set({
          prMarketplaceApplication: { ...app, status: "declined" },
          shiftAccepted: false,
          acceptedShiftIndex: null,
        });
        get().toast("Outlet declined your application", "warn");
      },
      approvePrShift: () => {
        set({ pendingApproval: false, shiftAccepted: true });
        get().toast("Agency approved — slot locked", "success");
      },
      cancelPrShift: () => {
        set({
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
        });
        get().toast("Shift cancelled — penalty flag logged", "warn");
      },
      requestPrSwap: (replacementPrName, reason) => {
        const shift = get().prActiveShift;
        const outlet = shift?.outlet ?? PR_SHIFT_OFFERS[get().acceptedShiftIndex ?? 0]?.outlet ?? "Velvet 23";
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prSwapRequests: [
            {
              id: "swap-" + Date.now().toString(36),
              outlet,
              date: stamp,
              replacementPrName: replacementPrName.trim(),
              reason: reason.trim(),
              status: "pending_agency",
              requestedAt: stamp,
            },
            ...st.prSwapRequests,
          ],
        }));
        get().toast("Swap request sent — agency must approve replacement PR", "info");
      },
      prCheckIn: (opts) => {
        const idx = get().acceptedShiftIndex ?? 0;
        const offer = PR_SHIFT_OFFERS[idx] ?? PR_SHIFT_OFFERS[0];
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const date = [...SHIFT_TODAY] as [number, number, number];
        const session: PrActiveShiftSession = {
          id: makeShiftSessionId(date, offer.outlet),
          pvId: makeShiftPvId(date, offer.outlet),
          outlet: offer.outlet,
          date,
          shiftTime: offer.time,
          baseWages: offer.base + 70,
          timeIn: stamp,
          receiptIds: [],
        };
        const prId = getPrRosterId(get().prSubRole);
        const checkInTime = new Date().toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const late = opts?.simulateLate ?? false;
        set((st) => ({
          checkedIn: true,
          prActiveShift: session,
          agencyRoster: rosterCheckIn(st.agencyRoster, prId, offer.outlet, checkInTime),
          prCheckInMeta: {
            late,
            noShowRisk: false,
            selfieDataUrl: opts?.selfieDataUrl ?? null,
            gpsFallback: opts?.gpsFallback ?? false,
          },
        }));
        const lateNote = late ? " · Late flag (+15 min)" : "";
        const gpsNote = opts?.gpsFallback ? " · Manual maps fallback" : "";
        get().toast(`Checked in ✓ Time-In locked · PV ${session.pvId}${lateNote}${gpsNote}`, "success");
      },
      simulatePrNoShow: () => {
        if (!get().shiftAccepted || get().checkedIn) {
          get().toast("Accept a shift first", "warn");
          return;
        }
        set((st) => ({
          prCheckInMeta: { ...st.prCheckInMeta, noShowRisk: true },
        }));
        get().toast("No-show flag logged (+30 min past shift start)", "warn");
      },
      prCheckOut: () => {
        const shift = get().prActiveShift;
        const prId = getPrRosterId(get().prSubRole);
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        if (!shift) {
          set({ checkedOut: true });
          get().toast("Checked out ✓ duration recorded", "success");
          return;
        }
        const closed: PrActiveShiftSession = { ...shift, timeOut: stamp, overtimeMinutes: 11 };
        const scans = (get().prReceiptScans ?? SEED_RECEIPT_SCANS).filter(
          (r) => r.shiftSessionId === shift.id || (r.pvId === shift.pvId && r.status === "attached"),
        );
        const profile = getPrProfile(get().prSubRole);
        const pv = buildPaymentVoucherFromShift(closed, scans, profile);
        const scanIds = new Set(scans.map((s) => s.id));
        const [y, m, d] = shift.date;
        const managedPr = get().agencyPRs.find((p) => p.id === prId);
        const historyRow = buildShiftHistoryRow({
          prId,
          prName: managedPr?.name ?? profile.name,
          outlet: shift.outlet,
          dateIso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          dateDisplay: stamp.split("·")[0]?.trim() ?? stamp,
          totalPayout: pv.net,
          totalDrinks: get().drinks,
          totalTips: scans.reduce((s, r) => s + (r.items?.reduce((a, i) => a + (i.category === "tip" ? i.amount : 0), 0) ?? 0), 0),
          durationHours: 6,
        });
        const checkOutTime = new Date().toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) =>
          syncLedgerState(st, {
            checkedOut: true,
            prActiveShift: null,
            agencyRoster: rosterCheckOut(st.agencyRoster, prId, shift.outlet, checkOutTime),
            shiftHistory: mergeShiftHistory(st.shiftHistory, [historyRow]),
            prReceiptScans: (st.prReceiptScans ?? SEED_RECEIPT_SCANS).map((r) =>
              scanIds.has(r.id)
                ? { ...r, pvId: shift.pvId, shiftSessionId: shift.id, status: "in_pv" as const, pvStatus: "PENDING_REVIEW" as const }
                : r,
            ),
            prPaymentVouchers: [
              pv,
              ...(st.prPaymentVouchers ?? SEED_PR_PVS).filter((p) => p.id !== pv.id),
            ],
          }),
        );
        get().toast(
          `Checked out ✓ PV ${shift.pvId} generated from ${scans.length} receipt(s) + shift wages`,
          "success",
        );
        set((st) => ({
          prNotifications: [
            {
              id: "n-pv-" + shift.pvId,
              kind: "pv" as const,
              title: "New shift PV ready",
              body: `${shift.pvId} generated — review and sign when finance pre-signs.`,
              at: stamp,
              read: false,
              pvId: shift.pvId,
            },
            ...st.prNotifications,
          ],
        }));
      },
      setOutletRatingStars: (n) => set({ outletRatingStars: n }),

      markPrNotificationRead: (id) =>
        set((st) => ({
          prNotifications: st.prNotifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      addPrSelfLog: (log) => {
        const shift = get().prActiveShift;
        if (!shift || !get().checkedIn || get().checkedOut) {
          get().toast("Check in first to self-log sales", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prSelfLogs: [
            {
              id: "sl-" + Date.now().toString(36),
              outlet: shift.outlet,
              category: log.category,
              qty: log.qty,
              amount: log.amount,
              status: "pending_outlet",
              loggedAt: stamp,
              shiftSessionId: shift.id,
            },
            ...st.prSelfLogs,
          ],
        }));
        get().toast("Self-logged — awaiting outlet confirmation", "info");
      },
      flagPrSelfLog: (id) => {
        set((st) => ({
          prSelfLogs: st.prSelfLogs.map((l) =>
            l.id === id ? { ...l, status: "flagged" as const, note: "PR flagged for agency review" } : l,
          ),
        }));
        get().toast("Entry flagged for review", "warn");
      },
      confirmOutletPrSelfLog: (id) => {
        const log = get().prSelfLogs.find((l) => l.id === id);
        if (!log || log.status !== "pending_outlet") return;
        const drinksDelta = log.category === "drinks" ? log.qty : 0;
        const tablesDelta = log.category === "tables" ? log.qty : 0;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prSelfLogs: st.prSelfLogs.map((l) => (l.id === id ? { ...l, status: "confirmed" as const } : l)),
          drinks: st.drinks + drinksDelta,
          tables: st.tables + tablesDelta,
          prNotifications: [
            {
              id: "n-sl-" + Date.now().toString(36),
              kind: "assignment",
              title: "Sales confirmed",
              body: `${log.outlet} confirmed ${log.qty}× ${log.category} · ${log.amount} RM`,
              at: stamp,
              read: false,
            },
            ...st.prNotifications,
          ],
        }));
        get().toast(`Confirmed ${log.qty}× ${log.category} for PR`, "success");
      },
      rejectOutletPrSelfLog: (id) => {
        const log = get().prSelfLogs.find((l) => l.id === id);
        if (!log || log.status !== "pending_outlet") return;
        set((st) => ({
          prSelfLogs: st.prSelfLogs.filter((l) => l.id !== id),
        }));
        get().toast("Self-log rejected — PR notified on next refresh", "info");
      },
      outletScanPrQr: (prName) => {
        const outlet = get().shifts.find((s) => s.date === "Tonight")?.outletName ?? "Velvet 23";
        const pending = get().prSelfLogs.find(
          (l) => l.outlet === outlet && l.status === "pending_outlet",
        );
        if (pending) {
          get().confirmOutletPrSelfLog(pending.id);
          get().toast(`Scanned ${prName} — confirmed pending self-log`, "success");
        } else {
          get().toast(`Scanned ${prName} — attributed to shift (no pending self-log)`, "success");
        }
      },
      linkPayrollByAgencyCode: (code) => {
        const agencyId = PR_AGENCY_CODES[code.trim().toUpperCase()];
        if (!agencyId) {
          get().toast("Invalid agency code", "warn");
          return;
        }
        get().setPrPayrollAgency(agencyId);
      },
      detachFreelancerPayroll: (agencyId) => {
        const st = get();
        const nextLinks = st.prFreelancerPayrollLinks.filter((id) => id !== agencyId);
        set({
          prFreelancerPayrollLinks: nextLinks,
          prPayrollAgencyId: st.prPayrollAgencyId === agencyId ? (nextLinks[0] ?? null) : st.prPayrollAgencyId,
        });
        get().toast("Payroll unlinked — future PVs blocked until you link again", "warn");
      },
      submitPrOutletRating: (pendingId, stars) => {
        const pending = get().prPendingRatings.find((p) => p.id === pendingId);
        if (!pending) return;
        if (stars < 1 || stars > 5) return;
        const stamp = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
        set((st) => {
          let strikes = st.prFreelancerLowRatingStrikes;
          if (st.prSubRole === "pr_free" && stars < 3) strikes += 1;
          return {
            prPendingRatings: st.prPendingRatings.filter((p) => p.id !== pendingId),
            prRatingHistory: [
              { id: "rh-" + Date.now().toString(36), outlet: pending.outlet, stars, direction: "pr_rates_outlet", date: stamp },
              ...st.prRatingHistory,
            ],
            prFreelancerLowRatingStrikes: strikes,
            outletRatingStars: 0,
          };
        });
        if (get().prSubRole === "pr_free" && stars < 3.5) {
          get().toast(
            stars < 3 && get().prFreelancerLowRatingStrikes >= 3
              ? "Rating submitted · 3 strikes below 3.0★ — account suspended (demo)"
              : stars < 3.5
                ? "Rating submitted · below 3.5★ warning logged"
                : "Rating submitted · outlet may rate you within 24h",
            stars < 3 && get().prFreelancerLowRatingStrikes >= 3 ? "warn" : "success",
          );
        } else {
          get().toast("Rating submitted · outlet may rate you within 24h", "success");
        }
      },
      submitSosIncident: (note, photoDataUrl) => {
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prNotifications: [
            {
              id: "n-sos-" + Date.now().toString(36),
              kind: "sos",
              title: "SOS sent",
              body: note.slice(0, 80),
              at: stamp,
              read: true,
            },
            ...st.prNotifications,
          ],
        }));
        get().toast("SOS alert sent · Agency, outlet, admin & emergency contacts notified", "warn");
        void photoDataUrl;
      },
      requestLeaveAgency: (note) => {
        const stamp = new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric" });
        set({ prLeaveRequest: { type: "leave", note, at: stamp } });
        get().toast("Support ticket raised — agency will review early leave request", "info");
      },
      requestTransferAgency: (code, note) => {
        const stamp = new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric" });
        set({ prLeaveRequest: { type: "transfer", note, newAgencyCode: code, at: stamp } });
        get().toast("Transfer request sent to InnocenZ support", "info");
      },

      prComcard: { ...COMCARD },
      prPortfolio: Array.from({ length: PORTFOLIO_SLOT_COUNT }, () => null),
      prLanguages: ["English", "Mandarin", "Cantonese"],
      prDisplayName: null,
      prAvatarPhoto: null,
      prPayrollAgencyId: null,
      setPrPayrollAgency: (agencyId) => {
        const agency = getPrAgencyById(agencyId);
        if (!agency) return;
        const profile = getPrProfile("pr_free");
        const prId = FREELANCER_DEMO_PR_ID;
        const st = get();
        const existing = st.pendingFreelancerPayrolls.find(
          (p) => p.prId === prId && p.agencyId === agencyId,
        );
        if (existing?.status === "approved") {
          set((st) => ({
            prPayrollAgencyId: agencyId,
            prFreelancerPayrollLinks: st.prFreelancerPayrollLinks.includes(agencyId)
              ? st.prFreelancerPayrollLinks
              : [...st.prFreelancerPayrollLinks, agencyId],
          }));
          get().toast(`Payroll linked to ${agency.name}`, "success");
          return;
        }
        if (existing?.status === "pending") {
          get().toast(`Waiting for ${agency.name} to approve payroll`, "info");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const langs = st.prLanguages.length ? st.prLanguages : profile.langs;
        set({
          prPayrollAgencyId: null,
          pendingFreelancerPayrolls: [
            ...st.pendingFreelancerPayrolls.filter(
              (p) => !(p.prId === prId && p.agencyId === agencyId),
            ),
            {
              id: "fp-" + Date.now().toString(36),
              prId,
              prName: st.prDisplayName ?? profile.name,
              ic: profile.ic,
              mobile: profile.mobile,
              email: profile.email,
              languages: langs.slice(0, 3).join(" · "),
              agencyId,
              agencyName: agency.name,
              status: "pending",
              requestedAt: stamp,
            },
          ],
        });
        get().toast(
          `Request sent to ${agency.name} — they must approve payroll before PVs unlock`,
          "success",
        );
      },
      savePrProfile: (data) => {
        set({
          prDisplayName: data.displayName.trim(),
          prAvatarPhoto: data.avatarPhoto,
          prComcard: data.comcard,
          prPortfolio: data.portfolio,
          prLanguages: data.languages,
        });
        get().toast("Profile saved — name, photo & comcard updated", "success");
      },

      prPaymentVouchers: SEED_PR_PVS,
      signPrPv: (id) => {
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const bankRef = `INZ-TRF-${Date.now().toString(36).toUpperCase().slice(-8)}`;
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "PAID" as const,
                  prSignedAt: stamp,
                  paidAt: stamp,
                  bankRef,
                }
              : p,
          ),
        }));
        get().toast(
          `Signed ✓ · ${pv.net.toLocaleString("en-MY", { style: "currency", currency: "MYR" })} sent to your bank (${bankRef})`,
          "success",
        );
      },
      disputePrPv: (id, reason, photoDataUrl) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Describe the issue so your agency can verify", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "DISPUTED" as const,
                  prDisputeReason: trimmed,
                  disputedAt: stamp,
                  prDisputePhotoDataUrl: photoDataUrl,
                }
              : p,
          ),
        }));
        get().toast("Dispute submitted — agency has 7 days to resolve or escalates to Admin", "warn");
      },
      updatePrPvDisputeReason: (id, reason) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Dispute reason cannot be empty", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  prDisputeReason: trimmed,
                  disputeUpdatedAt: stamp,
                }
              : p,
          ),
        }));
        get().toast("Dispute reason updated — agency notified", "success");
      },
      escalatePrPvDispute: (id) => {
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv || pv.status !== "DISPUTED") {
          get().toast("No open dispute on this PV", "warn");
          return;
        }
        if (pv.disputeEscalatedAt) {
          get().toast("Already escalated to InnocenZ Admin", "info");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, disputeEscalatedAt: stamp } : p,
          ),
          prNotifications: [
            {
              id: "n-esc-" + Date.now().toString(36),
              kind: "pv",
              title: "Dispute escalated",
              body: `${id} — agency missed 7-day window · InnocenZ Admin reviewing`,
              at: stamp,
              read: false,
              pvId: id,
              href: "/host/history",
            },
            ...st.prNotifications,
          ],
        }));
        get().toast("Escalated to InnocenZ Admin — payment remains held", "warn");
      },
      demoFreelancerLowRatingStrike: () => {
        if (get().prSubRole !== "pr_free") return;
        set((st) => ({ prFreelancerLowRatingStrikes: st.prFreelancerLowRatingStrikes + 1 }));
        const strikes = get().prFreelancerLowRatingStrikes;
        get().toast(
          strikes >= 3
            ? "3 strikes below 3.0★ — marketplace suspended (demo)"
            : `Low rating strike ${strikes}/3 logged (demo)`,
          strikes >= 3 ? "warn" : "info",
        );
      },

      prReceiptScans: SEED_RECEIPT_SCANS,
      addReceiptScan: (draft) => {
        const shift = get().prActiveShift;
        if (!get().checkedIn || get().checkedOut) {
          get().toast("Check in first — receipts only attach to your current shift PV", "warn");
          return "";
        }
        if (!shift) {
          get().toast("No active shift session — check in again", "warn");
          return "";
        }
        const id = `rc-${Date.now().toString(36)}`;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const comm = calcReceiptCommissions(draft.items);
        const outlet = draft.outlet.replace(/\s+KL$/i, "").trim() || draft.outlet;
        const scan: PrReceiptScan = {
          id,
          scannedAt: stamp,
          date: [...shift.date] as [number, number, number],
          outlet,
          prCode: draft.prCode,
          prName: draft.prName,
          items: draft.items,
          totalLogged: draft.totalLogged,
          ...comm,
          shiftSessionId: shift.id,
          pvId: shift.pvId,
          status: "attached",
        };
        set((st) => ({
          prReceiptScans: [scan, ...(st.prReceiptScans ?? SEED_RECEIPT_SCANS)],
          prActiveShift: shift
            ? { ...shift, receiptIds: [...shift.receiptIds, id] }
            : null,
          drinks: st.drinks + draft.items.filter((i) => i.category === "drinks").reduce((s, i) => s + i.qty, 0),
          tables: st.tables + draft.items.filter((i) => i.category === "tables").reduce((s, i) => s + i.qty, 0),
        }));
        get().toast(
          `Receipt logged → ${shift.pvId} · receipt #${shift.receiptIds.length + 1} on this shift`,
          "success",
        );
        return id;
      },

      editAgencyPv: (id, patch) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) => {
            if (p.id !== id) return p;
            const rows = patch.rows ?? p.rows;
            const subtotal = rows.reduce((s, r) => s + r.amt, 0);
            const deduct = patch.deduct ?? p.deduct;
            const net = Math.max(0, subtotal - deduct);
            return {
              ...p,
              ...patch,
              rows,
              subtotal,
              deduct,
              net,
            };
          }),
        }));
        get().toast("PV updated — line items recalculated", "success");
      },
      resendAgencyPv: (id) => {
        const pvs = get().prPaymentVouchers ?? SEED_PR_PVS;
        const pv = pvs.find((p) => p.id === id);
        if (!pv) return;
        const dup = pvs.some(
          (p) =>
            p.id !== id &&
            p.status === "PAID" &&
            p.prName === pv.prName &&
            pv.rows.some((r) => p.paidRefs?.includes(`${r.date}-${r.outlet}-${r.ref}`)),
        );
        if (dup) {
          get().toast("Blocked — duplicate payment detected for same shift ref", "warn");
          return;
        }
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "PENDING_REVIEW" as const, disputeNote: undefined, prDisputeReason: undefined, disputedAt: undefined } : p,
          ),
        }));
        get().toast(`PV ${id} re-sent to ${pv.prName} for e-signature`, "info");
      },
      resolveAgencyPvDispute: (id) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "PENDING_REVIEW" as const, disputeNote: undefined, prDisputeReason: undefined, disputedAt: undefined } : p,
          ),
        }));
        get().toast("Dispute resolved — PV re-sent to PR", "success");
      },
      raiseAgencyPvFromHistory: (shiftHistoryId) => {
        const row = get().shiftHistory.find((h) => h.id === shiftHistoryId);
        if (!row) {
          get().toast("Shift not found", "warn");
          return;
        }
        const pr = get().agencyPRs.find((p) => p.id === row.prId);
        if (!pr || pr.suspended || pr.detached) {
          get().toast("PR unavailable for PV", "warn");
          return;
        }
        const pvs = get().prPaymentVouchers ?? SEED_PR_PVS;
        if (historyRowHasPv(row, pvs)) {
          get().toast("PV already raised for this shift", "warn");
          return;
        }
        const pv = buildPvFromShiftHistoryRow(row, pr);
        set((st) => ({
          prPaymentVouchers: [pv, ...(st.prPaymentVouchers ?? SEED_PR_PVS)],
        }));
        get().toast(`PV ${pv.id} raised · Finance Head pre-signed · sent to ${pr.name}`, "success");
      },
      overrideSignedAgencyPv: (id, reason) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Override reason required — audit logged", "warn");
          return;
        }
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv || (pv.status !== "SIGNED" && pv.status !== "PAID")) {
          get().toast("Only signed or paid PVs can be overridden", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const by = get().agencySubRole === "agency_finance" ? "Finance Head" : "Agency Owner";
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "PENDING_REVIEW" as const,
                  prSignedAt: undefined,
                  paidAt: undefined,
                  bankRef: undefined,
                  overrideAudit: { at: stamp, reason: trimmed, by, previousStatus: p.status },
                }
              : p,
          ),
        }));
        get().toast(`PV overridden — audit logged · re-opened for PR review`, "warn");
      },

      agencyOwner: { ...DEFAULT_AGENCY_OWNER },
      saveAgencyOwner: (patch) => {
        set((st) => ({ agencyOwner: { ...st.agencyOwner, ...patch } }));
        get().toast("Agency settings saved", "success");
      },
      sendAgencyOtp: () => {
        const ch = get().agencyOwner.otpChannel;
        get().toast(`OTP sent to your ${ch === "email" ? "email" : "mobile"}`, "info");
      },
      verifyAgencyOtp: (code) => {
        if (code === "123456" || code.length === 6) {
          set((st) => ({ agencyOwner: { ...st.agencyOwner, accountActivated: true } }));
          get().toast("Account activated ✓", "success");
          return true;
        }
        get().toast("Invalid OTP — try 123456 for demo", "warn");
        return false;
      },

      agencyFinanceHead: { ...DEFAULT_FINANCE_HEAD },
      saveAgencyFinanceHead: (patch) => {
        set((st) => ({ agencyFinanceHead: { ...st.agencyFinanceHead, ...patch } }));
        get().toast("Finance Head profile saved — e-signature ready for PV dual-sign", "success");
      },

      agencyCollections: demoSnapshot.agencyCollections,
      markCollectionSettled: (id) => {
        set((st) => ({
          agencyCollections: st.agencyCollections.map((c) =>
            c.id === id ? { ...c, status: "SETTLED" as const, aging: "current" as const } : c,
          ),
        }));
        get().toast("Invoice marked received · status SETTLED", "success");
      },
      sendCollectionReminder: (id) => {
        set((st) => ({
          agencyCollections: st.agencyCollections.map((c) =>
            c.id === id ? { ...c, reminderSent: true } : c,
          ),
        }));
        get().toast("Auto-reminder sent to outlet", "info");
      },

      agencyReconciliation: demoSnapshot.agencyReconciliation,
      confirmAgencyReconciliation: () => {
        set((st) => ({
          agencyReconciliation: { ...st.agencyReconciliation, agencyConfirmed: true },
        }));
        get().toast("Today's reconciliation confirmed · agency side locked", "success");
      },
      confirmOutletReconciliation: () => {
        set((st) => ({
          agencyReconciliation: { ...st.agencyReconciliation, outletConfirmed: true },
        }));
        get().toast("Outlet daily reconciliation confirmed · synced to agency", "success");
      },
      syncReconciliationFromLedger: () => {
        set((st) => syncLedgerState(st, {}));
      },

      agencyRoster: demoSnapshot.agencyRoster,
      editRosterSlot: (id, patch) => {
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
        get().toast("Roster updated", "success");
      },
      requestOutletSwap: (id, targetOutlet, agencyNote) => {
        const slot = get().agencyRoster.find((s) => s.id === id);
        if (!slot) return;
        if (targetOutlet === slot.outlet) {
          get().toast("Choose a different outlet", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const swap: OutletSwapRequest = {
          targetOutlet,
          status: "pending_pr",
          agencyName: "Atlas Agency",
          agencyNote,
          requestedAt: stamp,
          requestedAtMs: Date.now(),
        };
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === id ? { ...s, status: "swap-pending" as const, outletSwap: swap } : s,
          ),
        }));
        get().toast(`Outlet swap sent to ${slot.prName} — awaiting PR approval`, "success");
      },
      cancelOutletSwap: (id) => {
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: s.status === "swap-pending" ? ("scheduled" as const) : s.status,
                  outletSwap: undefined,
                }
              : s,
          ),
        }));
        get().toast("Outlet swap request cancelled", "info");
      },
      approveOutletSwapByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot?.outletSwap || slot.outletSwap.status !== "pending_pr") return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  outlet: s.outletSwap!.targetOutlet,
                  status: "scheduled" as const,
                  outletSwap: { ...s.outletSwap!, status: "approved" as const, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast(`Approved — shift moved to ${slot.outletSwap.targetOutlet}`, "success");
      },
      assignPrToOutlet: ({ prId, outlet, dateIso, dateLabel, shiftStart, shiftEnd }) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        if (pr.suspended || pr.detached) {
          get().toast(`${pr.name} is suspended or detached`, "warn");
          return;
        }
        const existing = get().agencyRoster.find(
          (s) => s.prId === prId && s.dateIso === dateIso,
        );
        if (
          existing &&
          existing.status !== "unavailable" &&
          existing.status !== "assignment-pending"
        ) {
          get().toast(`${pr.name} already has a shift on this date`, "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const id = existing?.id ?? "rs" + Date.now().toString(36).slice(-6);
        const slot: AgencyRosterSlot = {
          id,
          prId,
          prName: pr.name,
          outlet,
          date: dateLabel,
          dateIso,
          shift: `${shiftStart} — ${shiftEnd}`,
          shiftStart,
          shiftEnd,
          status: "assignment-pending",
          agencyAssignment: {
            agencyName: "Atlas Agency",
            assignedAt: stamp,
            assignedAtMs: Date.now(),
          },
        };
        set((st) => ({
          agencyRoster: existing
            ? st.agencyRoster.map((s) => (s.id === existing.id ? slot : s))
            : [slot, ...st.agencyRoster],
        }));
        get().toast(`Assignment sent to ${pr.name} — awaiting Approve or Reject on Shifts`, "success");
      },
      approveAgencyAssignmentByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "assignment-pending") return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  status: "scheduled" as const,
                  agencyAssignment: s.agencyAssignment
                    ? { ...s.agencyAssignment, respondedAt: stamp }
                    : { assignedAt: stamp, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast(`Approved — ${slot.outlet} shift locked on your roster`, "success");
      },
      declineAgencyAssignmentByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "assignment-pending") return;
        set((st) => ({
          agencyRoster: st.agencyRoster.filter((s) => s.id !== rosterSlotId),
        }));
        get().toast(`Rejected agency assignment at ${slot.outlet}`, "warn");
      },
      declineOutletSwapByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot?.outletSwap) return;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  status: "scheduled" as const,
                  outletSwap: { ...s.outletSwap!, status: "declined" as const, respondedAt: stamp },
                }
              : s,
          ),
        }));
        get().toast("Declined agency outlet swap", "warn");
      },
      approvePrSwapRequest: (swapId) => {
        const swap = get().prSwapRequests.find((s) => s.id === swapId);
        if (!swap || swap.status !== "pending_agency") return;
        set((st) => ({
          prSwapRequests: st.prSwapRequests.map((s) =>
            s.id === swapId ? { ...s, status: "approved" as const } : s,
          ),
        }));
        get().toast(`Swap approved — ${swap.replacementPrName} confirmed for ${swap.outlet}`, "success");
      },
      declinePrSwapRequest: (swapId) => {
        set((st) => ({
          prSwapRequests: st.prSwapRequests.map((s) =>
            s.id === swapId ? { ...s, status: "declined" as const } : s,
          ),
        }));
        get().toast("Swap request declined", "info");
      },
      demoAutoAssignPr: (dateIso) => {
        const free = getFreePrsWithDistances(get().agencyPRs.filter((p) => !p.suspended && !p.detached), get().agencyRoster, dateIso);
        const pick = free[0];
        if (!pick) {
          get().toast("No free PRs to auto-assign", "warn");
          return;
        }
        const outlet = pick.distances[0]?.outlet ?? "Velvet 23";
        const [y, m, d] = dateIso.split("-").map(Number);
        const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-MY", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        get().assignPrToOutlet({
          prId: pick.pr.id,
          outlet,
          dateIso,
          dateLabel,
          shiftStart: "22:00",
          shiftEnd: "04:00",
        });
        get().toast(`AI auto-assign · ${pick.pr.name} → ${outlet}`, "success");
      },
      flagRosterAttendance: (slotId, flag) => {
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === slotId
              ? { ...s, lateFlag: flag === "late" ? true : s.lateFlag, noShowFlag: flag === "no-show" ? true : s.noShowFlag }
              : s,
          ),
        }));
        get().toast(flag === "late" ? "Late flag (+15 min)" : "No-show flag (+30 min)", "warn");
      },
      adjustAgencyReconciliation: ({ drinks, tips, reason }) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Adjustment reason required", "warn");
          return;
        }
        set((st) => {
          const adj = (st.agencyReconciliation.agencyAdjustDrinks ?? 0) + (drinks ?? 0);
          const adjTips = (st.agencyReconciliation.agencyAdjustTips ?? 0) + (tips ?? 0);
          const varianceDelta = (drinks ?? 0) * 15 + (tips ?? 0);
          return {
            agencyReconciliation: {
              ...st.agencyReconciliation,
              agencyAdjustDrinks: adj,
              agencyAdjustTips: adjTips,
              agencyAdjustReason: trimmed,
              pvTotal: st.agencyReconciliation.pvTotal + varianceDelta,
              variance: st.agencyReconciliation.outletSalesTotal - (st.agencyReconciliation.pvTotal + varianceDelta),
              agencyConfirmed: false,
            },
          };
        });
        get().toast("Reconciliation adjusted — re-confirm required", "info");
      },

      agencyPRs: demoSnapshot.agencyPRs,
      outletCommissionRules: [...OUTLET_COMMISSION_RULES],
      scalingTierMultipliers: { ...SCALING_TIER_MULTIPLIERS },
      suspendAgencyPr: (prId) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        set((st) => ({
          agencyPRs: st.agencyPRs.map((p) => (p.id === prId ? { ...p, suspended: true } : p)),
        }));
        get().toast(`${pr.name} suspended — shifts paused`, "warn");
      },
      detachAgencyPr: (prId) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        const tiedSince = pr.tiedSince ? new Date(pr.tiedSince).getTime() : Date.now() - 400 * 86400000;
        if (Date.now() - tiedSince < 365 * 86400000) {
          get().toast("Tied < 1 year — detach requires admin process", "warn");
          return;
        }
        set((st) => ({
          agencyPRs: st.agencyPRs.map((p) => (p.id === prId ? { ...p, detached: true, suspended: true } : p)),
        }));
        get().toast(`${pr.name} detached from agency roster`, "info");
      },
      setAgencyPrKpiTier: (prId, tier) => {
        set((st) => ({
          agencyPRs: st.agencyPRs.map((p) => (p.id === prId ? { ...p, kpiTier: tier } : p)),
        }));
        get().toast(`KPI tier set to ${tier}`, "success");
      },
      setAgencyPrTrainingTier: (prId, tier) => {
        set((st) => ({
          agencyPRs: st.agencyPRs.map((p) => (p.id === prId ? { ...p, trainingLevel: tier } : p)),
        }));
        get().toast(`Training tier set to ${tier}`, "success");
      },
      saveOutletCommissionRule: (outlet, patch) => {
        set((st) => ({
          outletCommissionRules: st.outletCommissionRules.map((r) =>
            r.outlet === outlet ? { ...r, ...patch } : r,
          ),
        }));
        get().toast(`Commission rules updated for ${outlet}`, "success");
      },
      saveScalingMultipliers: (multipliers) => {
        set({ scalingTierMultipliers: multipliers });
        get().toast("Scaling tier multipliers saved", "success");
      },
      inviteFinanceHead: (email) => {
        if (!email.trim()) return;
        set((st) => ({
          agencyFinanceHead: { ...st.agencyFinanceHead, email: email.trim(), eSignatureStored: false },
        }));
        get().toast(`Invite sent to ${email} — Finance Head must complete IC + e-signature`, "info");
      },
      shiftHistory: demoSnapshot.shiftHistory,

      prs: demoSnapshot.prs,
      shifts: demoSnapshot.shifts,
      outletPnl: demoSnapshot.outletPnl,
      outletPnlSyncAt: demoSnapshot.outletPnlSyncAt,
      outletMoneyEditCount: demoSnapshot.outletMoneyEditCount,
      updateOutletShiftMoney: (shiftId, patch) => {
        const st = get();
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const merged = withShiftFinancialDefaults({ ...sh, ...patch });
          return { ...merged, liveSales: computeShiftLiveSales(merged) };
        });
        const sync = applyOutletFinancialSync(
          nextShifts,
          st.outletMoneyEditCount + 1,
          Date.now(),
          st.agencyRoster,
          st.agencyReconciliation,
        );
        set(sync);
        get().toast("Synced to Atlas Agency · PNL & PR commission updated", "success");
      },
      adjustOutletShiftUnits: (shiftId, kind, delta) => {
        const st = get();
        const shift = st.shifts.find((sh) => sh.id === shiftId);
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const drinkUnits =
            kind === "drink"
              ? Math.max(0, (sh.drinkUnits ?? 0) + delta)
              : (sh.drinkUnits ?? 0);
          const tableUnits =
            kind === "table"
              ? Math.max(0, (sh.tableUnits ?? 0) + delta)
              : (sh.tableUnits ?? 0);
          const merged = withShiftFinancialDefaults({ ...sh, drinkUnits, tableUnits });
          return { ...merged, liveSales: computeShiftLiveSales(merged) };
        });
        const nextRoster =
          shift && delta > 0
            ? st.agencyRoster.map((slot) => {
                if (slot.status !== "on-duty" || !outletMatches(slot.outlet, shift.outletName)) {
                  return slot;
                }
                if (kind === "drink") {
                  return { ...slot, floorDrinks: (slot.floorDrinks ?? 0) + delta };
                }
                return { ...slot, floorTips: (slot.floorTips ?? 0) + delta * 10 };
              })
            : st.agencyRoster;
        const sync = applyOutletFinancialSync(
          nextShifts,
          st.outletMoneyEditCount + 1,
          Date.now(),
          nextRoster,
          st.agencyReconciliation,
        );
        set({ ...sync, agencyRoster: nextRoster });
        get().toast("Live sales updated · agency payroll view synced", "info");
      },
      bookings: demoSnapshot.bookings,
      pvs: demoSnapshot.pvs,
      walletBalance: demoSnapshot.walletBalance,
      ratings: demoSnapshot.ratings,
      outletWorkspace: demoSnapshot.outletWorkspace,
      outletSettings: demoSnapshot.outletSettings,
      shiftApplicants: demoSnapshot.shiftApplicants,
      postSealRatePrompt: demoSnapshot.postSealRatePrompt,
      paymentCardLast4: demoSnapshot.paymentCardLast4,
      pendingPRs: demoSnapshot.pendingPRs,
      pendingFreelancerPayrolls: demoSnapshot.pendingFreelancerPayrolls,

      approvePendingPR: (id) => {
        const pending = get().pendingPRs.find((p) => p.id === id);
        if (!pending || pending.status !== "pending") return;
        const managed = pendingPRToManagedPR(pending);
        set((st) => {
          const alreadyOnRoster = st.agencyPRs.some((p) => p.id === managed.id);
          const nextAgencyPRs = alreadyOnRoster ? st.agencyPRs : [...st.agencyPRs, managed];
          return {
            pendingPRs: st.pendingPRs.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p)),
            agencyPRs: nextAgencyPRs,
            prs: marketplacePrsFromAgency(nextAgencyPRs),
          };
        });
        get().toast(`${pending.name} approved — added to roster & marketplace`, "success");
      },
      rejectPendingPR: (id, reason) => {
        set((st) => ({
          pendingPRs: st.pendingPRs.map((p) =>
            p.id === id ? { ...p, status: "rejected", rejectReason: reason ?? "Did not meet agency criteria" } : p,
          ),
        }));
        get().toast("PR rejected — notification sent", "warn");
      },
      invitePendingPR: ({ name, ic, mobile, email }) => {
        const id = "pr-inv-" + Date.now();
        const now = new Date();
        const submittedAt = `${now.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })} · ${now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`;
        set((st) => ({
          pendingPRs: [
            {
              id,
              name,
              ic,
              mobile,
              email,
              languages: "Pending profile",
              status: "pending",
              source: "owner-invite",
              hasIcPhotos: false,
              hasSelfie: false,
              hasComcard3d: false,
              portfolioCount: 0,
              submittedAt,
            },
            ...st.pendingPRs,
          ],
        }));
        get().toast(`Invite sent to ${name} — awaiting profile completion`, "success");
      },
      approveFreelancerPayroll: (id) => {
        const req = get().pendingFreelancerPayrolls.find((p) => p.id === id);
        if (!req) return;
        set((st) => ({
          pendingFreelancerPayrolls: st.pendingFreelancerPayrolls.map((p) =>
            p.id === id ? { ...p, status: "approved" as const } : p,
          ),
          prPayrollAgencyId:
            st.prSubRole === "pr_free" && req.prId === FREELANCER_DEMO_PR_ID
              ? req.agencyId
              : st.prPayrollAgencyId,
          prFreelancerPayrollLinks:
            req.prId === FREELANCER_DEMO_PR_ID && !st.prFreelancerPayrollLinks.includes(req.agencyId)
              ? [...st.prFreelancerPayrollLinks, req.agencyId]
              : st.prFreelancerPayrollLinks,
        }));
        get().toast(`${req.prName} approved for payroll — PVs can now be raised`, "success");
      },
      rejectFreelancerPayroll: (id) => {
        const req = get().pendingFreelancerPayrolls.find((p) => p.id === id);
        if (!req) return;
        set((st) => ({
          pendingFreelancerPayrolls: st.pendingFreelancerPayrolls.map((p) =>
            p.id === id ? { ...p, status: "rejected" as const } : p,
          ),
          prPayrollAgencyId:
            st.prPayrollAgencyId === req.agencyId && req.prId === FREELANCER_DEMO_PR_ID
              ? null
              : st.prPayrollAgencyId,
        }));
        get().toast(`${req.prName} payroll request declined`, "warn");
      },

      createShift: (s) => {
        const id = "s" + Math.random().toString(36).slice(2, 7);
        const row = withShiftFinancialDefaults({
          ...s,
          id,
          status: "draft",
          filled: 0,
          prs: [],
        });
        set((st) => ({
          shifts: [row, ...st.shifts],
        }));
        get().toast("Shift request created", "success");
        return id;
      },
      createShifts: (items) => {
        if (items.length === 0) return;
        const st = get();
        const ws = st.outletWorkspace;
        const newShifts: ShiftRequest[] = items.map((s) => {
          const prs = s.prs ?? [];
          const hours = shiftHoursFromLabel(s.shift);
          const pay = s.payPerHour ?? ws.basePayPerHour;
          return withShiftFinancialDefaults({
            ...s,
            id: "s" + Math.random().toString(36).slice(2, 7),
            status: "open",
            filled: prs.length,
            prs,
            payPerHour: pay,
            estimatedCost: s.estimatedCost ?? Math.round(prs.length * pay * hours * 100) / 100,
            perDrinkRm: s.perDrinkRm ?? ws.perDrinkRm,
            perTableRm: s.perTableRm ?? ws.perTableRm,
          });
        });
        const applicantPool = st.prs.filter((p) => !newShifts.some((sh) => sh.prs.includes(p.id)));
        const newApplicants: ShiftApplicant[] = newShifts.flatMap((sh) => {
          if (sh.destination === "agency") return [];
          const picks = applicantPool
            .filter((p) => p.rating >= (sh.preferredRating ?? 4))
            .slice(0, Math.max(0, sh.quantity - sh.prs.length));
          return picks.map((p) => ({
            id: `app-${sh.id}-${p.id}`,
            shiftId: sh.id,
            prId: p.id,
            prName: p.name,
            rating: p.rating,
            status: "pending" as const,
          }));
        });
        set((cur) => ({
          shifts: [...newShifts, ...cur.shifts],
          shiftApplicants: [...newApplicants, ...cur.shiftApplicants],
        }));
        get().toast(
          `${newShifts.length} shift${newShifts.length !== 1 ? "s" : ""} posted · PRs notified`,
          "success",
        );
      },
      deleteShift: (shiftId) => {
        const shift = get().shifts.find((s) => s.id === shiftId);
        if (!shift || shift.status === "sealed") return;
        set((st) => ({
          shifts: st.shifts.filter((s) => s.id !== shiftId),
          shiftApplicants: st.shiftApplicants.filter((a) => a.shiftId !== shiftId),
        }));
        get().toast("Shift removed", "info");
      },
      saveOutletWorkspace: (patch) => {
        set((st) => {
          const next = { ...st.outletWorkspace, ...patch };
          const nextShifts = st.shifts.map((sh) => {
            const merged = withShiftFinancialDefaults({
              ...sh,
              payPerHour: patch.basePayPerHour ?? sh.payPerHour,
              perDrinkRm: patch.perDrinkRm ?? sh.perDrinkRm,
              perTableRm: patch.perTableRm ?? sh.perTableRm,
            });
            return { ...merged, liveSales: computeShiftLiveSales(merged) };
          });
          return { outletWorkspace: next, shifts: nextShifts };
        });
        get().toast("Workspace saved · applies to new shifts", "success");
      },
      saveOutletSettings: (patch) => {
        set((st) => ({ outletSettings: { ...st.outletSettings, ...patch } }));
        get().toast("Settings saved", "success");
      },
      setReconciliationVarianceReason: (reason) => {
        set((st) => ({
          agencyReconciliation: { ...st.agencyReconciliation, varianceReason: reason.trim() },
        }));
      },
      respondToApplicant: (applicantId, accept) => {
        const st = get();
        const app = st.shiftApplicants.find((a) => a.id === applicantId);
        if (!app || app.status !== "pending") return;
        const shift = st.shifts.find((s) => s.id === app.shiftId);
        if (!shift || shift.status === "sealed") return;
        if (accept && shift.prs.length >= shift.quantity) {
          get().toast("Shift is already full", "warn");
          return;
        }
        set((cur) => ({
          shiftApplicants: cur.shiftApplicants.map((a) =>
            a.id === applicantId ? { ...a, status: accept ? "accepted" : "declined" } : a,
          ),
          shifts: accept
            ? cur.shifts.map((sh) =>
                sh.id === app.shiftId
                  ? {
                      ...sh,
                      prs: [...sh.prs, app.prId],
                      filled: sh.prs.length + 1,
                    }
                  : sh,
              )
            : cur.shifts,
        }));
        get().toast(accept ? `${app.prName} added to shift` : `Declined ${app.prName}`, accept ? "success" : "info");
      },
      payOutletInvoice: (collectionId) => {
        get().markCollectionSettled(collectionId);
        get().toast("Payment processed · receipt emailed", "success");
      },
      updateOutletPaymentCard: (last4) => {
        set({ paymentCardLast4: last4.replace(/\D/g, "").slice(-4) });
        get().toast("Card updated for subscription billing", "success");
      },
      clearPostSealRatePrompt: () => set({ postSealRatePrompt: null }),
      togglePrOnShift: (shiftId, prId) =>
        set((st) => ({
          shifts: st.shifts.map((sh) => {
            if (sh.id !== shiftId) return sh;
            const has = sh.prs.includes(prId);
            const prs = has ? sh.prs.filter((p) => p !== prId) : [...sh.prs, prId];
            return { ...sh, prs, filled: prs.length };
          }),
        })),
      confirmShift: (shiftId) => {
        set((st) => ({
          shifts: st.shifts.map((sh) => sh.id === shiftId ? { ...sh, status: "confirmed" } : sh),
        }));
        get().toast("Booking confirmed · PRs notified", "success");
      },
      sealShift: (shiftId) => {
        const st = get();
        const shift = st.shifts.find((sh) => sh.id === shiftId);
        if (!shift) return;
        const today = new Date();
        const dateIso = DEFAULT_ROSTER_DATE_ISO;
        const dateDisplay = today.toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const newRows: ShiftHistoryRow[] = shift.prs.map((prId) => {
          const pr = st.agencyPRs.find((p) => p.id === prId);
          const payout = Math.round((shift.estimatedCost / Math.max(shift.prs.length, 1)) * 100) / 100;
          return buildShiftHistoryRow({
            prId,
            prName: pr?.name ?? prId,
            outlet: shift.outletName,
            dateIso,
            dateDisplay,
            totalPayout: payout,
            totalDrinks: Math.round((shift.drinkUnits ?? 0) / Math.max(shift.prs.length, 1)),
            totalTips: Math.round(((shift.tableUnits ?? 0) * 20) / Math.max(shift.prs.length, 1)),
            durationHours: 6,
          });
        });
        set({
          ...syncLedgerState(st, {
            shifts: st.shifts.map((sh) => (sh.id === shiftId ? { ...sh, status: "sealed" } : sh)),
            shiftHistory: mergeShiftHistory(st.shiftHistory, newRows),
          }),
          postSealRatePrompt: { shiftId, prIds: [...shift.prs] },
        });
        get().toast("Shift sealed · rate PRs within 24h · PVs synced", "success");
      },

      acceptBooking: (id) => {
        set((st) => ({ bookings: st.bookings.map((b) => b.id === id ? { ...b, status: "accepted" } : b) }));
        get().toast("Shift accepted", "success");
      },
      checkIn: (id) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        set((st) => ({
          bookings: st.bookings.map((b) =>
            b.id === id ? { ...b, status: "checked-in", checkedInAt: time } : b,
          ),
        }));
        get().toast("Checked in · GPS verified", "success");
      },
      checkOut: (id) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        set((st) => ({
          bookings: st.bookings.map((b) =>
            b.id === id ? { ...b, status: "completed", checkedOutAt: time } : b,
          ),
        }));
        get().toast("Checked out · shift saved to history", "info");
      },

      signPv: (id) => {
        const pv = get().pvs.find((p) => p.id === id);
        if (!pv) return;
        const total = pv.wages + pv.drinkCommission + pv.tipCommission + pv.tableCommission;
        set((st) => ({
          pvs: st.pvs.map((p) => p.id === id ? { ...p, status: "signed" } : p),
          walletBalance: st.walletBalance + total,
        }));
        get().toast(`PV signed · RM ${total} credited to wallet`, "success");
      },
      disputePv: (id, reason) => {
        set((st) => ({ pvs: st.pvs.map((p) => p.id === id ? { ...p, status: "disputed" } : p) }));
        get().toast(`Dispute raised: ${reason}`, "warn");
      },
      withdraw: (amount) => {
        if (amount > get().walletBalance) return get().toast("Insufficient balance", "warn");
        set((st) => ({ walletBalance: st.walletBalance - amount }));
        get().toast(`RM ${amount} withdrawal queued · T+1`, "success");
      },
      ratePr: (prId, stars, note, tags) => {
        const pr = get().prs.find((p) => p.id === prId);
        if (!pr) return;
        set((st) => {
          const prompt = st.postSealRatePrompt;
          const nextPrompt =
            prompt && prompt.prIds.includes(prId)
              ? {
                  ...prompt,
                  prIds: prompt.prIds.filter((id) => id !== prId),
                }
              : prompt;
          return {
            ratings: [
              {
                id: "r" + Date.now(),
                pr: pr.name,
                stars,
                note,
                tags,
                date: new Date().toLocaleDateString(),
              },
              ...st.ratings,
            ],
            postSealRatePrompt: nextPrompt && nextPrompt.prIds.length > 0 ? nextPrompt : null,
          };
        });
        get().toast("Rating submitted · PR can rate your outlet too", "success");
      },

      toasts: [],
      toast: (message, tone = "info") => {
        const id = ++toastId;
        set((st) => ({ toasts: [...st.toasts, { id, message, tone }] }));
        setTimeout(() => get().dismissToast(id), 2800);
      },
      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "innocenz-store",
      onRehydrateStorage: () => () => {
        if (isWelcomePath()) {
          queueMicrotask(() => useStore.getState().resetDemo());
        }
      },
      partialize: (s) => ({
        role: s.role,
        prSubRole: s.prSubRole,
        outletSubRole: s.outletSubRole,
        agencySubRole: s.agencySubRole,
        user: s.user,
        shifts: s.shifts,
        outletPnl: s.outletPnl,
        outletPnlSyncAt: s.outletPnlSyncAt,
        outletMoneyEditCount: s.outletMoneyEditCount,
        bookings: s.bookings,
        pvs: s.pvs,
        walletBalance: s.walletBalance,
        ratings: s.ratings,
        pendingPRs: s.pendingPRs,
        pendingFreelancerPayrolls: s.pendingFreelancerPayrolls,
        shiftAccepted: s.shiftAccepted,
        pendingApproval: s.pendingApproval,
        acceptedShiftIndex: s.acceptedShiftIndex,
        checkedIn: s.checkedIn,
        checkedOut: s.checkedOut,
        drinks: s.drinks,
        tables: s.tables,
        prPaymentVouchers: s.prPaymentVouchers,
        prComcard: s.prComcard,
        prPortfolio: s.prPortfolio,
        prLanguages: s.prLanguages,
        prDisplayName: s.prDisplayName,
        prAvatarPhoto: s.prAvatarPhoto,
        prPayrollAgencyId: s.prPayrollAgencyId,
        prNotifications: s.prNotifications,
        prDeclinedOfferIds: s.prDeclinedOfferIds,
        prMarketplaceApplication: s.prMarketplaceApplication,
        prUpcomingShifts: s.prUpcomingShifts,
        prSelfLogs: s.prSelfLogs,
        prSwapRequests: s.prSwapRequests,
        prAgencyTiedAt: s.prAgencyTiedAt,
        prFreelancerPayrollLinks: s.prFreelancerPayrollLinks,
        prPendingRatings: s.prPendingRatings,
        prRatingHistory: s.prRatingHistory,
        prFreelancerLowRatingStrikes: s.prFreelancerLowRatingStrikes,
        prCheckInMeta: s.prCheckInMeta,
        prLeaveRequest: s.prLeaveRequest,
        prReceiptScans: s.prReceiptScans,
        prActiveShift: s.prActiveShift,
        agencyOwner: s.agencyOwner,
        agencyFinanceHead: s.agencyFinanceHead,
        agencyCollections: s.agencyCollections,
        agencyReconciliation: s.agencyReconciliation,
        agencyRoster: s.agencyRoster,
        agencyPRs: s.agencyPRs,
        outletCommissionRules: s.outletCommissionRules,
        scalingTierMultipliers: s.scalingTierMultipliers,
        shiftHistory: s.shiftHistory,
        outletWorkspace: s.outletWorkspace,
        outletSettings: s.outletSettings,
        shiftApplicants: s.shiftApplicants,
        paymentCardLast4: s.paymentCardLast4,
        postSealRatePrompt: s.postSealRatePrompt,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        const seedById = Object.fromEntries(SEED_PR_PVS.map((s) => [s.id, s]));
        const mergedPvs =
          p?.prPaymentVouchers && p.prPaymentVouchers.length > 0
            ? p.prPaymentVouchers.map((pv) => {
                const seed = seedById[pv.id];
                if (!seed) return pv;
                return {
                  ...seed,
                  ...pv,
                  prName: pv.prName ?? seed.prName,
                  issued: pv.issued ?? seed.issued,
                  due: pv.due ?? seed.due,
                  cycle: pv.cycle ?? seed.cycle,
                  financeHeadName: pv.financeHeadName ?? seed.financeHeadName,
                  financeHeadSignedAt: pv.financeHeadSignedAt ?? seed.financeHeadSignedAt,
                  prDisputeReason: pv.prDisputeReason ?? seed.prDisputeReason,
                  disputedAt: pv.disputedAt ?? seed.disputedAt,
                  disputeUpdatedAt: pv.disputeUpdatedAt ?? seed.disputeUpdatedAt,
                  disputeNote: pv.disputeNote ?? seed.disputeNote,
                  shiftSessionId: pv.shiftSessionId ?? seed.shiftSessionId,
                  timeIn: pv.timeIn ?? seed.timeIn,
                  timeOut: pv.timeOut ?? seed.timeOut,
                  shiftTime: pv.shiftTime ?? seed.shiftTime,
                  receiptIds: pv.receiptIds?.length ? pv.receiptIds : seed.receiptIds,
                  rows: pv.rows?.length
                    ? pv.rows.map((row, idx) => ({ ...seed.rows[idx], ...row, receiptIds: row.receiptIds ?? seed.rows[idx]?.receiptIds }))
                    : seed.rows,
                };
              })
            : current.prPaymentVouchers;
        const seedScanById = Object.fromEntries(SEED_RECEIPT_SCANS.map((s) => [s.id, s]));
        const persistedScans = p?.prReceiptScans ?? [];
        const userScans = persistedScans.filter((s) => !seedScanById[s.id]);
        const mergedScans = [
          ...userScans,
          ...SEED_RECEIPT_SCANS.map((seed) => {
            const saved = persistedScans.find((s) => s.id === seed.id);
            return saved ? { ...seed, ...saved } : seed;
          }),
        ].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
        return {
          ...current,
          ...p,
          prPaymentVouchers: mergedPvs,
          prPortfolio:
            p?.prPortfolio && p.prPortfolio.length > 0
              ? [
                  ...p.prPortfolio,
                  ...Array(Math.max(0, PORTFOLIO_SLOT_COUNT - p.prPortfolio.length)).fill(null),
                ].slice(0, PORTFOLIO_SLOT_COUNT)
              : current.prPortfolio,
          prComcard: p?.prComcard ?? current.prComcard,
          prLanguages: p?.prLanguages?.length ? p.prLanguages : current.prLanguages,
          prDisplayName: p?.prDisplayName ?? current.prDisplayName,
          prPayrollAgencyId: p?.prPayrollAgencyId ?? current.prPayrollAgencyId,
          prNotifications: p?.prNotifications?.length ? p.prNotifications : current.prNotifications,
          prDeclinedOfferIds: p?.prDeclinedOfferIds ?? current.prDeclinedOfferIds,
          prMarketplaceApplication: p?.prMarketplaceApplication ?? current.prMarketplaceApplication,
          prUpcomingShifts: p?.prUpcomingShifts?.length ? p.prUpcomingShifts : current.prUpcomingShifts,
          prSelfLogs: p?.prSelfLogs ?? current.prSelfLogs,
          prSwapRequests: p?.prSwapRequests ?? current.prSwapRequests,
          prAgencyTiedAt: p?.prAgencyTiedAt ?? current.prAgencyTiedAt,
          prFreelancerPayrollLinks: p?.prFreelancerPayrollLinks ?? current.prFreelancerPayrollLinks,
          prPendingRatings: p?.prPendingRatings?.length ? p.prPendingRatings : current.prPendingRatings,
          prRatingHistory: p?.prRatingHistory?.length ? p.prRatingHistory : current.prRatingHistory,
          prFreelancerLowRatingStrikes: p?.prFreelancerLowRatingStrikes ?? current.prFreelancerLowRatingStrikes,
          prCheckInMeta: p?.prCheckInMeta ?? current.prCheckInMeta,
          prLeaveRequest: p?.prLeaveRequest ?? current.prLeaveRequest,
          prAvatarPhoto: p?.prAvatarPhoto ?? current.prAvatarPhoto,
          prReceiptScans: mergedScans.length ? mergedScans : current.prReceiptScans,
          prActiveShift: p?.prActiveShift ?? current.prActiveShift,
          shiftHistory: mergeShiftHistory(p?.shiftHistory ?? [], current.shiftHistory),
          pendingPRs: mergePendingPRs(p?.pendingPRs, current.pendingPRs),
          pendingFreelancerPayrolls: mergePendingFreelancerPayrolls(
            p?.pendingFreelancerPayrolls,
            current.pendingFreelancerPayrolls,
          ),
          agencyPRs: p?.agencyPRs?.length ? p.agencyPRs : current.agencyPRs,
          prs: marketplacePrsFromAgency(p?.agencyPRs?.length ? p.agencyPRs : current.agencyPRs),
          agencyRoster: mergeAgencyRoster(p?.agencyRoster, current.agencyRoster),
          outletCommissionRules: p?.outletCommissionRules?.length
            ? p.outletCommissionRules
            : current.outletCommissionRules,
          scalingTierMultipliers: p?.scalingTierMultipliers ?? current.scalingTierMultipliers,
          shifts: (p?.shifts ?? current.shifts).map(withShiftFinancialDefaults),
          outletPnl: recomputeAllOutletPnl(
            (p?.shifts ?? current.shifts).map(withShiftFinancialDefaults),
            undefined,
            mergeAgencyRoster(p?.agencyRoster, current.agencyRoster),
          ),
          outletPnlSyncAt: p?.outletPnlSyncAt ?? current.outletPnlSyncAt,
          outletMoneyEditCount: p?.outletMoneyEditCount ?? current.outletMoneyEditCount,
          outletWorkspace: p?.outletWorkspace ?? current.outletWorkspace ?? DEFAULT_OUTLET_WORKSPACE,
          outletSettings: p?.outletSettings ?? current.outletSettings ?? DEFAULT_OUTLET_SETTINGS,
          shiftApplicants: p?.shiftApplicants ?? current.shiftApplicants ?? [],
          paymentCardLast4: p?.paymentCardLast4 ?? current.paymentCardLast4 ?? "4242",
          postSealRatePrompt: p?.postSealRatePrompt ?? null,
        };
      },
    }
  )
);