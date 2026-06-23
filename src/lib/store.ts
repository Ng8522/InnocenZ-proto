import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type PrSubRole,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrComcard,
  type PrReceiptScan,
  type ReceiptEntryMethod,
  type PrActiveShiftSession,
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  SEED_PR_PVS,
  LIVE_SEED_PR_PVS,
  LIVE_SEED_RECEIPT_SCANS,
  remapSeedPaymentVoucher,
  remapSeedPaymentVouchers,
  remapSeedReceiptScan,
  remapSeedReceiptScans,
  getShiftToday,
  SEED_RECEIPT_SCANS,
  COMCARD,
  PORTFOLIO_SLOT_COUNT,
  calcReceiptCommissions,
  findDuplicateReceiptScan,
  receiptScanFingerprint,
  buildManualReceiptItems,
  receiptPrimaryCategory,
  buildPaymentVoucherFromShift,
  getPrProfile,
  makeShiftSessionId,
  makeShiftPvId,
  FREELANCER_DEMO_PR_ID,
  formatPrDisplayName,
  DEFAULT_TIED_AGENCY_ID,
  getPrAgencyById,
  getPrRosterId,
  filterPvsForPrProfile,
  filterReceiptScansForPrProfile,
  isFreelancerPrId,
  TIED_DEMO_ROSTER_PR_ID,
  fmtDateLabelFromIso,
  formatPvSignTimestamp,
  reconcilePvTotals,
  migratePrPortfolioAssetPath,
} from "@/lib/pr-demo";
import { writePersistedPrSubRole } from "@/lib/use-pr-sub-role";
import { DEMO_SOS_LOCATION, type OpsNotification, type SosIncident } from "@/lib/ops-notifications";
import {
  applyPushEvent,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
  type PushEvent,
} from "@/lib/push-notifications";
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
  normalizeOutletTierMultipliers,
  normalizeTierRates,
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  migrateCommissionRuleToTierIBase,
  migrateTierMultipliersToTierIBase,
  buildDefaultTierRates,
  cloneTierRates,
  estimateShiftLaborCost,
  snapTierWage,
  languagesFromPr,
  syncAgencyPrFromPrPortal,
  type OutletCommissionRule,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { buildPvFromShiftHistoryRow, historyRowHasPv } from "@/lib/agency-actions";
import {
  financeHeadStampFromProfile,
  LEGACY_FINANCE_HEAD_SIGNER,
  buildDemoESignatureDataUrl,
} from "@/lib/finance-head-stamp";
import { validateReceiptScan } from "@/lib/receipt-scan-utils";
import {
  applyDisputeTargetsToRows,
  buildSentWeeklyPv,
  buildWeeklyPaymentSummary,
  getPreviousWeekBounds,
  isWeekPvIssued,
  type WeeklyDisputeTarget,
} from "@/lib/pr-weekly-payment";
import { mergeAgencyCollections } from "@/lib/agency-payroll";
import { getFreePrsWithDistances } from "@/lib/roster-availability";
import { buildPlanningWeekOutletShiftMap } from "@/lib/agency-outlet-shifts";
import type { AgencySubRole } from "@/lib/agency-rbac";
import type { OutletSubRole } from "@/lib/outlet-rbac";
import {
  computeDrinkSales,
  computeShiftLiveSales,
  recomputeAllOutletPnl,
  withShiftFinancialDefaults,
  type OutletPnlSynced,
} from "@/lib/outlet-financial-sync";
import { mergeHistoryDemoLedger, syncStoreHistoryLedger } from "@/lib/history-demo-sync";
import {
  mergeShiftHistory,
  migrateShiftHistoryPrNames,
  prepareShiftHistoryForDisplay,
  shiftHistorySlotKey,
  type ShiftHistoryRow,
} from "@/lib/shift-history";
import {
  buildReconciliationFromLedger,
  isWeeklyReconciliationSunday,
} from "@/lib/reconciliation-weekly";
import {
  buildShiftHistoryRow,
  marketplacePrsFromAgency,
  rosterCheckIn,
  syncPrAttendanceToRoster,
  rosterCheckOut,
  rosterEnRoute,
  ensureRosterSlot,
  shiftDateIso,
  canonicalOutlet,
  outletMatches,
  addPrToOutletShift,
  addPrToPostedOutletShift,
  parseShiftWindow,
  patchPrRosterAttendanceFlags,
} from "@/lib/portal-sync";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { migrateDemoDateIso } from "@/lib/demo-clock";
import {
  buildAvailabilityOpsNotifications,
  canTogglePrDayAvailability,
  isPrMarkedDayOff,
  prDayIsUnavailable,
} from "@/lib/pr-availability-sync";
import { evaluateShiftCancellation, CANCEL_RULES } from "@/lib/pr-schedule-cancellation";
import {
  type OutletSettings,
  type OutletWorkspaceSettings,
  type OutletOwnerSettings,
  type OutletFinanceHead,
  type OutletOpsHead,
  type ShiftApplicant,
  type ShiftDestination,
  DEFAULT_OUTLET_SETTINGS,
  DEFAULT_OUTLET_WORKSPACE,
  DEFAULT_OUTLET_OWNER,
  DEFAULT_OUTLET_FINANCE_HEAD,
  DEFAULT_OUTLET_OPS_HEAD,
  DEFAULT_OUTLET_DRINK_MENU,
  averageDrinkPrice,
  normalizeOutletWorkspace,
  migrateShiftTierRates,
  shiftHoursFromLabel,
} from "@/lib/outlet-demo";
import { buildDemoStoreReset, buildPrDemoReset } from "@/lib/demo-seed";
import {
  SEED_SPECIAL_SERVICES,
  mergeSpecialServiceOrders,
  specialServiceTypeLabel,
  type SpecialServiceRecord,
} from "@/lib/special-service-demo";
import {
  acceptSpecialServiceByOutlet,
  acceptSpecialServiceByPr,
  approveSpecialServiceByAgency,
  buildSpecialServiceOrder,
  declineSpecialServiceByAgency,
  declineSpecialServiceByOutlet,
  declineSpecialServiceByPr,
  type SubmitSpecialServiceInput,
} from "@/lib/special-service-actions";
import {
  applyPrShiftSession,
  defaultPrShiftSessionForRole,
  extractPrShiftSession,
  clearPrShiftSession,
  patchFreelancerPrSession,
  patchPrSessionForRole,
  findAgencyRosterTonight,
  resolvePrShiftOfferForPr,
  shiftIndexForOutlet,
  type PrShiftSessionState,
} from "@/lib/pr-session";
import { calcDutyWagesFromOutlet, shiftPayoutTotal, receiptItemsForShift } from "@/lib/pr-shift-status";
import {
  syncCommissionRulesFromWorkspace,
  syncWorkspaceFromCommissionRules,
} from "@/lib/outlet-agency-sync";
import {
  type PrNotification,
  type PrSwapRequest,
  type PrPendingRating,
  type PrRatingRecord,
  type PrUpcomingShift,
  PR_AGENCY_CODES,
  SEED_PR_NOTIFICATIONS,
  SEED_PENDING_RATINGS,
  SEED_RATING_HISTORY,
  SEED_UPCOMING_SHIFTS,
  remapSeedUpcomingShifts,
  SEED_PR_SWAP_REQUESTS,
  mergePrSwapRequests,
  PR_AGENCY_TIED_OFFERS,
  swapTargetOptionsForPr,
  type PrSwapTargetOption,
  DEMO_AGENCY_TIED_AT,
  offerToShiftIndex,
  listingById,
} from "@/lib/pr-features";
import {
  CONSECUTIVE_LOW_SUSPEND_COUNT,
  RATING_SUSPEND_SHIFT_THRESHOLD,
} from "@/lib/agency-pr-flags";

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
  /** Outlet floor pricing — syncs to agency PNL reconciliation */
  perDrinkRm?: number;
  perTableRm?: number;
  drinkUnits?: number;
  /** Per-drink-type unit counts keyed by drink menu id */
  drinkUnitCounts?: Record<string, number>;
  /** Drink $ logged before per-item counts (legacy unit total frozen on first tap) */
  legacyDrinkSalesRm?: number;
  tableUnits?: number;
  /** Baseline live sales when PNL was seeded — delta rolls into gross revenue */
  anchorLiveSales?: number;
  status: "draft" | "open" | "confirmed" | "sealed";
  prs: string[];
  payPerHour: number;
  /** Per-shift wage & commission by PR training tier */
  tierRates?: Record<OutletPrTier, OutletTierRateSettings>;
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

interface Toast {
  id: number;
  message: string;
  tone?: "success" | "info" | "warn";
}

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
  /** Restore full demo snapshot — manual reset from welcome screen only */
  resetDemo: () => void;

  /** PR Talent shift lifecycle (prototype flow) */
  prSessionByRole: Partial<Record<PrSubRole, PrShiftSessionState>>;
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
  applyFreelancerListing: (listingId: string) => boolean;
  simulateOutletAcceptApplication: () => void;
  simulateOutletDeclineApplication: () => void;
  cancelPrShift: () => void;
  /** Restore PR shift-flow snapshot only (used internally; not on role switch) */
  resetPrDemo: () => void;
  /** Prototype: accept shift (if needed) and check in without GPS/selfie */
  demoPrShiftIn: () => void;
  /** Prototype: accept shift (if needed) and mark en-route only */
  demoPrEnRoute: () => void;
  /** Prototype: check out without selfie / GPS hold */
  demoPrCheckOut: () => void;
  /** PR started heading to venue — outlet roster shows EN-ROUTE until check-in */
  prMarkEnRoute: () => void;
  prCheckIn: (opts?: {
    selfieDataUrl?: string;
    gpsFallback?: boolean;
    simulateLate?: boolean;
  }) => void;
  simulatePrLate: (enabled: boolean) => void;
  simulatePrNoShow: () => void;
  prCheckOut: () => void;
  setOutletRatingStars: (n: number) => void;

  prNotifications: PrNotification[];
  opsNotifications: OpsNotification[];
  sosIncidents: SosIncident[];
  notificationPrefs: NotificationPrefs;
  pushNotify: (event: PushEvent) => void;
  markOpsNotificationRead: (id: string) => void;
  prDeclinedOfferIds: string[];
  prMarketplaceApplication: {
    listingId: string;
    status: "pending" | "accepted" | "declined";
    applicantId?: string;
    shiftId?: string;
  } | null;
  prUpcomingShifts: PrUpcomingShift[];
  prSwapRequests: PrSwapRequest[];
  prAgencyTiedAt: string;
  prFreelancerPayrollLinks: string[];
  prPendingRatings: PrPendingRating[];
  prRatingHistory: PrRatingRecord[];
  prFreelancerLowRatingStrikes: number;
  prCheckInMeta: {
    late?: boolean;
    noShowRisk?: boolean;
    selfieDataUrl?: string | null;
    gpsFallback?: boolean;
    closedShift?: PrActiveShiftSession | null;
  };
  prLeaveRequest: {
    type: "leave" | "transfer";
    note: string;
    newAgencyCode?: string;
    at: string;
  } | null;
  markPrNotificationRead: (id: string) => void;
  requestPrSwap: (targetId: string, reason: string) => void;
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
  prEmail: string | null;
  prAvatarPhoto: string | null;
  prPayrollAgencyId: string | null;
  setPrPayrollAgency: (agencyId: string) => void;
  savePrProfile: (data: {
    displayName: string;
    email: string;
    avatarPhoto: string | null;
    comcard: PrComcard;
    portfolio: (string | null)[];
    languages: string[];
  }) => void;

  prPaymentVouchers: PrPaymentVoucher[];
  ensurePreviousWeekPv: () => void;
  signPrPv: (id: string, signatureDataUrl: string) => void;
  disputePrPv: (id: string, reason: string, photoDataUrls?: string[], targets?: WeeklyDisputeTarget[]) => void;
  updatePrPvDisputeReason: (
    id: string,
    reason: string,
    photoDataUrls?: string[],
    targets?: WeeklyDisputeTarget[],
  ) => void;
  escalatePrPvDispute: (id: string) => void;
  demoFreelancerLowRatingStrike: () => void;

  prReceiptScans: PrReceiptScan[];
  addReceiptScan: (draft: {
    receiptRef: string;
    outlet: string;
    prCode: string;
    prName: string;
    prId: string;
    items: PrReceiptScan["items"];
    totalLogged: number;
    manualSelfLog?: {
      reason: string;
      category: "drinks" | "tips" | "tables";
      amount: number;
    };
    /** Replace a wrong scan on the current shift (keeps slot on shift) */
    replaceScanId?: string;
    entryMethod?: ReceiptEntryMethod;
  }) => string;
  updateReceiptSelfLog: (
    scanId: string,
    patch: {
      amount: number;
      reason?: string;
      category?: "drinks" | "tips" | "tables";
    },
  ) => void;
  verifyAgencyReceiptSelfLog: (scanId: string, decision: "approved" | "rejected") => void;
  editAgencyPv: (
    id: string,
    patch: { rows?: PrPvRow[]; deduct?: number; disputeNote?: string },
  ) => void;
  resendAgencyPv: (id: string) => void;
  sendAgencyPvToPr: (id: string) => void;
  resolveAgencyPvDispute: (id: string) => void;
  raiseAgencyPvFromHistory: (shiftHistoryId: string) => void;
  overrideSignedAgencyPv: (id: string, reason: string) => void;

  agencyOwner: AgencyOwnerSettings;
  agencyFinanceHead: AgencyFinanceHead;
  saveAgencyOwner: (patch: Partial<AgencyOwnerSettings>) => void;
  saveAgencyFinanceHead: (patch: Partial<AgencyFinanceHead>) => void;
  saveAgencyProfileSettings: (data: {
    owner: AgencyOwnerSettings;
    financeHead: AgencyFinanceHead;
    scalingTierMultipliers: Record<string, number>;
    outletCommissionRules: OutletCommissionRule[];
  }) => void;
  sendAgencyOtp: () => void;
  verifyAgencyOtp: (code: string) => boolean;

  agencyCollections: AgencyCollectionInvoice[];
  markCollectionSettled: (id: string) => void;
  sendCollectionReminder: (id: string) => void;
  agencyReconciliation: AgencyReconciliationDay;
  confirmAgencyReconciliation: () => void;
  confirmOutletReconciliation: () => void;
  confirmPrReconciliation: (prId: string) => void;
  syncReconciliationFromLedger: () => void;
  adjustAgencyReconciliation: (patch: { drinks?: number; tips?: number; reason: string }) => void;

  agencyRoster: AgencyRosterSlot[];
  editRosterSlot: (id: string, patch: Partial<AgencyRosterSlot>) => void;
  cancelRosterShift: (rosterSlotId: string) => void;
  requestOutletSwap: (id: string, targetOutlet: string, agencyNote?: string) => void;
  cancelOutletSwap: (id: string) => void;
  approveOutletSwapByPr: (rosterSlotId: string) => void;
  declineOutletSwapByPr: (rosterSlotId: string) => void;
  approveAgencyAssignmentByPr: (rosterSlotId: string) => void;
  confirmOutletRosterSlot: (rosterSlotId: string) => void;
  declineAgencyAssignmentByPr: (rosterSlotId: string) => void;
  togglePrDayAvailability: (dateIso: string) => void;
  setPrDayUnavailable: (dateIso: string, note?: string) => void;
  clearPrDayUnavailable: (dateIso: string) => void;
  cancelPrRosterShift: (rosterSlotId: string) => void;
  assignPrToOutlet: (input: {
    prId: string;
    outlet: string;
    dateIso: string;
    dateLabel: string;
    shiftStart: string;
    shiftEnd: string;
    shift?: string;
    outletShiftId?: string;
    event?: string;
    payEstimate?: number;
  }) => void;
  approvePrSwapRequest: (swapId: string, replacementPrId: string) => void;
  declinePrSwapRequest: (swapId: string) => void;
  acceptSwapReplacement: (swapId: string) => void;
  rejectSwapReplacement: (swapId: string, reason: string) => void;
  demoAutoAssignPr: (dateIso: string) => void;
  flagRosterAttendance: (slotId: string, flag: "late" | "no-show") => void;

  agencyPRs: AgencyManagedPR[];
  suspendAgencyPr: (prId: string) => void;
  detachAgencyPr: (prId: string) => void;
  requestAgencyPrDetach: (prId: string) => void;
  broadcastAgencyPr: (
    prIds: string[],
    payload: { kind: "shift" | "message"; title: string; body: string },
  ) => void;
  setAgencyPrKpiTier: (prId: string, tier: string) => void;
  setAgencyPrTrainingTier: (prId: string, tier: string) => void;
  updateAgencyPrProfile: (
    prId: string,
    patch: Partial<
      Pick<
        AgencyManagedPR,
        | "name"
        | "mobile"
        | "email"
        | "age"
        | "height"
        | "weight"
        | "race"
        | "languages"
        | "place"
        | "yearsExp"
        | "kpiTier"
        | "trainingLevel"
      >
    >,
  ) => void;

  specialServiceOrders: SpecialServiceRecord[];
  submitSpecialServiceOrder: (input: SubmitSpecialServiceInput) => string;
  approveSpecialServiceByAgency: (orderId: string) => void;
  declineSpecialServiceByAgency: (orderId: string, reason?: string) => void;
  acceptSpecialServiceByPr: (orderId: string) => void;
  declineSpecialServiceByPr: (orderId: string, reason?: string) => void;
  acceptSpecialServiceByOutlet: (orderId: string) => void;
  declineSpecialServiceByOutlet: (orderId: string, reason?: string) => void;

  outletCommissionRules: OutletCommissionRule[];
  scalingTierMultipliers: Record<string, number>;
  saveOutletCommissionRule: (outlet: string, patch: Partial<OutletCommissionRule>) => void;
  saveScalingMultipliers: (multipliers: Record<string, number>) => void;
  inviteFinanceHead: (email: string) => void;
  /** Shared transaction log — agency & outlet history screens */
  shiftHistory: ShiftHistoryRow[];

  prs: PR[];
  shifts: ShiftRequest[];
  /** Agency outlet PNL — recomputed when outlet edits floor money */
  outletPnl: OutletPnlSynced[];
  outletPnlSyncAt: number;
  outletMoneyEditCount: number;
  updateOutletShiftMoney: (
    shiftId: string,
    patch: { perDrinkRm?: number; perTableRm?: number },
  ) => void;
  adjustOutletShiftUnits: (shiftId: string, kind: "drink" | "table", delta: number) => void;
  adjustOutletDrinkSale: (shiftId: string, drinkId: string, delta: number) => void;
  bookings: Booking[];
  pvs: PV[];
  walletBalance: number;
  ratings: { id: string; pr: string; stars: number; note: string; date: string; tags?: string[] }[];
  outletWorkspace: OutletWorkspaceSettings;
  outletSettings: OutletSettings;
  outletOwner: OutletOwnerSettings;
  outletFinanceHead: OutletFinanceHead;
  outletOpsHead: OutletOpsHead;
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
  saveOutletOwner: (patch: Partial<OutletOwnerSettings>) => void;
  saveOutletProfileSettings: (data: {
    owner: OutletOwnerSettings;
    financeHead: OutletFinanceHead;
    opsHead: OutletOpsHead;
    location: string;
  }) => void;
  sendOutletOtp: () => void;
  verifyOutletOtp: (code: string) => boolean;
  setReconciliationVarianceReason: (reason: string) => void;
  respondToApplicant: (applicantId: string, accept: boolean) => void;
  payOutletInvoice: (collectionId: string) => void;
  updateOutletPaymentCard: (last4: string) => void;
  clearPostSealRatePrompt: () => void;
  /** Repair agency roster when PR checked in before roster slot existed (freelancers) */
  syncLivePrCheckInToRoster: () => void;

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

function normalizeAgencyPrs(list: AgencyManagedPR[]): AgencyManagedPR[] {
  return list.map((pr) => ({
    ...pr,
    name: pr.name ?? "PR",
    languages: languagesFromPr(pr),
    rating: typeof pr.rating === "number" ? pr.rating : 0,
    age: typeof pr.age === "number" ? pr.age : 22,
    height: typeof pr.height === "number" ? pr.height : 165,
    yearsExp: typeof pr.yearsExp === "number" ? pr.yearsExp : 0,
    totalPaid: typeof pr.totalPaid === "number" ? pr.totalPaid : 0,
    attendancePct: typeof pr.attendancePct === "number" ? pr.attendancePct : 0,
    kpiScore: typeof pr.kpiScore === "number" ? pr.kpiScore : 0,
  }));
}

function prIdForPayeeName(
  prName: string,
  prIc: string | undefined,
  agencyPRs: AgencyManagedPR[],
): string {
  const match = agencyPRs.find((p) => p.name === prName || (prIc && p.ic === prIc));
  if (match) return match.id;
  return FREELANCER_DEMO_PR_ID;
}

function receiptQtyDelta(items: PrReceiptScan["items"]) {
  return {
    drinks: items.filter((i) => i.category === "drinks").reduce((s, i) => s + i.qty, 0),
    tables: items.filter((i) => i.category === "tables").reduce((s, i) => s + i.qty, 0),
  };
}

function activePrShiftOffer(
  st: Pick<StoreState, "prSubRole" | "acceptedShiftIndex" | "agencyRoster" | "shifts">,
) {
  if (st.prSubRole === "pr_free") {
    const idx = st.acceptedShiftIndex ?? 0;
    return PR_SHIFT_OFFERS[idx] ?? PR_SHIFT_OFFERS[0];
  }
  return resolvePrShiftOfferForPr(
    st.agencyRoster,
    getPrRosterId(st.prSubRole),
    st.acceptedShiftIndex,
    st.shifts,
  );
}

function demoAttendanceContext(
  st: Pick<StoreState, "prSubRole" | "acceptedShiftIndex" | "agencyRoster" | "shifts">,
) {
  const offer = activePrShiftOffer(st);
  return {
    prId: getPrRosterId(st.prSubRole),
    outlet: offer.outlet,
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    offer,
  };
}

function resolveTiedPrAttendance(st: Pick<
  StoreState,
  "prSubRole" | "checkedIn" | "checkedOut" | "prActiveShift" | "prSessionByRole" | "agencyPRs"
>) {
  const tiedCache = st.prSessionByRole?.pr_tied;
  const liveOnTiedRole = st.prSubRole === "pr_tied";
  const checkedIn = liveOnTiedRole ? st.checkedIn : tiedCache?.checkedIn ?? st.checkedIn;
  const checkedOut = liveOnTiedRole ? st.checkedOut : tiedCache?.checkedOut ?? st.checkedOut;
  const session =
    (liveOnTiedRole ? st.prActiveShift : tiedCache?.prActiveShift) ?? st.prActiveShift;
  if (!checkedIn || checkedOut || !session) return null;
  const prId = TIED_DEMO_ROSTER_PR_ID;
  const prName =
    st.agencyPRs.find((p) => p.id === prId)?.name ??
    getPrProfile("pr_tied").name;
  return { prId, prName, session };
}

function rosterWithTiedPrAttendance(
  roster: AgencyRosterSlot[],
  st: Pick<
    StoreState,
    "prSubRole" | "checkedIn" | "checkedOut" | "prActiveShift" | "prSessionByRole" | "agencyPRs"
  >,
): AgencyRosterSlot[] {
  const attendance = resolveTiedPrAttendance(st);
  if (!attendance) return roster;
  return syncPrAttendanceToRoster(roster, {
    prId: attendance.prId,
    prName: attendance.prName,
    checkedIn: true,
    session: attendance.session,
  });
}

function applyOutletFinancialSync(
  shifts: ShiftRequest[],
  editCount: number,
  syncAt: number,
  roster: AgencyRosterSlot[] = [],
  reconciliation?: AgencyReconciliationDay,
  drinkMenu = DEFAULT_OUTLET_DRINK_MENU,
  commissionRules = OUTLET_COMMISSION_RULES,
): Pick<
  StoreState,
  "shifts" | "outletPnl" | "outletPnlSyncAt" | "outletMoneyEditCount" | "agencyReconciliation"
> {
  const normalized = shifts.map((sh) => withShiftFinancialDefaults(sh, drinkMenu));
  const outletPnl = recomputeAllOutletPnl(
    normalized,
    undefined,
    roster,
    drinkMenu,
    commissionRules,
  );
  const nextRecon =
    reconciliation ??
    buildReconciliationFromLedger(
      {
        agencyReconciliation: {
          ...SEED_RECONCILIATION,
          dateIso: DEFAULT_ROSTER_DATE_ISO,
          dateLabel: fmtDateLabelFromIso(DEFAULT_ROSTER_DATE_ISO),
        },
        shiftHistory: [],
        prPaymentVouchers: [],
      },
      {},
    );
  return {
    shifts: normalized,
    outletPnl,
    outletPnlSyncAt: syncAt,
    outletMoneyEditCount: editCount,
    agencyReconciliation: nextRecon,
  };
}

function ensureOutletRuleTierMultipliers(
  rules: OutletCommissionRule[],
  legacyGlobal?: Record<string, number>,
): OutletCommissionRule[] {
  return rules.map((r) => {
    const partial = { ...r.tierMultipliers };
    if (legacyGlobal) {
      for (const tier of OUTLET_PR_TIERS) {
        if (partial[tier] == null && legacyGlobal[tier] != null) {
          partial[tier] = legacyGlobal[tier];
        }
      }
    }
    const migrated = migrateCommissionRuleToTierIBase({
      ...r,
      tierMultipliers: migrateTierMultipliersToTierIBase(partial),
    });
    if (!migrated.tierRates) {
      const tierBase = {
        wagePerHour: snapTierWage(migrated.wagePerHour),
        drinkPct: migrated.drinkPct,
        tipPct: migrated.tipPct,
        tablePct: migrated.tablePct,
        otAfterHours: migrated.otAfterHours,
      };
      return {
        ...migrated,
        wagePerHour: tierBase.wagePerHour,
        tierRates: buildDefaultTierRates(tierBase),
      };
    }
    const baseTier = migrated.tierRates[OUTLET_BASE_TIER] ?? {
      wagePerHour: migrated.wagePerHour,
      drinkPct: migrated.drinkPct,
      tipPct: migrated.tipPct,
      tablePct: migrated.tablePct,
      otAfterHours: migrated.otAfterHours,
    };
    const tierRates = normalizeTierRates(baseTier, migrated.tierRates);
    return {
      ...migrated,
      wagePerHour: snapTierWage(tierRates[OUTLET_BASE_TIER].wagePerHour),
      tierRates,
    };
  });
}

function syncLedgerState(
  st: StoreState,
  patch: Partial<
    Pick<StoreState, "shifts" | "agencyRoster" | "shiftHistory" | "prPaymentVouchers">
  >,
): Partial<StoreState> {
  const shifts = patch.shifts ?? st.shifts;
  const roster = patch.agencyRoster ?? st.agencyRoster;
  const pvs = patch.prPaymentVouchers ?? st.prPaymentVouchers;
  const drinkMenu = st.outletWorkspace.drinkMenu ?? DEFAULT_OUTLET_DRINK_MENU;
  const commissionRules = st.outletCommissionRules;
  const outletPnl = recomputeAllOutletPnl(shifts, undefined, roster, drinkMenu, commissionRules);
  const reconciliation = buildReconciliationFromLedger(st, patch);
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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      role: null,
      prSubRole: null,
      outletSubRole: null,
      agencySubRole: null,
      user: null,
      setRole: (r) => set({ role: r }),
      setPrSubRole: (r) => {
        const st = get();
        const prev = st.prSubRole;
        const cache: Partial<Record<PrSubRole, PrShiftSessionState>> = { ...st.prSessionByRole };

        if (prev && prev !== r) {
          cache[prev] = extractPrShiftSession(st);
        }

        const next: Partial<StoreState> = { prSubRole: r, prSessionByRole: cache };
        if (r) {
          const session =
            cache[r] ??
            defaultPrShiftSessionForRole(r, {
              agencyRoster: st.agencyRoster,
              prSwapRequests: st.prSwapRequests,
            });
          Object.assign(next, applyPrShiftSession(session));
        }
        writePersistedPrSubRole(r);
        set(next);
      },
      setOutletSubRole: (r) => set({ outletSubRole: r }),
      setAgencySubRole: (r) => set({ agencySubRole: r }),
      signIn: (name, email) => set({ user: { name, email } }),
      signOut: () => {
        set({
          user: null,
          role: null,
          prSubRole: null,
          outletSubRole: null,
          agencySubRole: null,
        });
      },
      resetDemo: () => {
        const demo = buildDemoStoreReset();
        set({
          ...demo,
          prSwapRequests: [],
          prSessionByRole: demo.prSessionByRole ?? {},
          role: null,
          prSubRole: null,
          outletSubRole: null,
          agencySubRole: null,
          user: null,
          toasts: [],
        });
      },
      resetPrDemo: () => {
        set(buildPrDemoReset(get().agencyRoster));
      },
      demoPrShiftIn: () => {
        const st = get();
        if (st.checkedIn && !st.checkedOut) {
          get().toast("Already checked in", "info");
          return;
        }
        if (st.checkedOut) {
          get().toast(
            "Shift complete — use Reset all demo data on the welcome screen to start fresh",
            "warn",
          );
          return;
        }
        if (!st.shiftAccepted) {
          set({
            shiftAccepted: true,
            pendingApproval: false,
            acceptedShiftIndex: st.acceptedShiftIndex ?? 0,
            prMarketplaceApplication:
              st.prMarketplaceApplication?.status === "pending"
                ? { ...st.prMarketplaceApplication, status: "accepted" }
                : st.prMarketplaceApplication,
          });
        }
        const late = get().prCheckInMeta.late ?? false;
        get().prCheckIn({ simulateLate: late, gpsFallback: get().prCheckInMeta.gpsFallback });
      },
      demoPrEnRoute: () => {
        const st = get();
        if (st.checkedIn && !st.checkedOut) {
          get().toast("Already on duty", "info");
          return;
        }
        if (!st.shiftAccepted) {
          set({
            shiftAccepted: true,
            pendingApproval: false,
            acceptedShiftIndex: st.acceptedShiftIndex ?? 0,
            prMarketplaceApplication:
              st.prMarketplaceApplication?.status === "pending"
                ? { ...st.prMarketplaceApplication, status: "accepted" }
                : st.prMarketplaceApplication,
          });
        }
        get().prMarkEnRoute();
      },
      demoPrCheckOut: () => {
        const st = get();
        if (!st.checkedIn || st.checkedOut) {
          get().toast("Check in first to demo check-out", "warn");
          return;
        }
        get().prCheckOut();
      },
      prMarkEnRoute: () => {
        const st = get();
        if (!st.shiftAccepted) {
          get().toast("Accept a shift first", "warn");
          return;
        }
        if (st.checkedIn) {
          get().toast("Already checked in", "info");
          return;
        }
        const ctx = demoAttendanceContext(st);
        const offer = ctx.offer;
        const prId = getPrRosterId(st.prSubRole);
        const pr = st.agencyPRs.find((p) => p.id === prId);
        const prName = pr?.name ?? getPrProfile(st.prSubRole).name;
        const next = rosterEnRoute(st.agencyRoster, prId, offer.outlet, {
          prName,
          dateIso: ctx.dateIso,
          shift: offer.time,
        });
        const before = st.agencyRoster.find(
          (s) =>
            s.prId === prId && s.dateIso === ctx.dateIso && outletMatches(s.outlet, offer.outlet),
        );
        const after = next.find(
          (s) =>
            s.prId === prId && s.dateIso === ctx.dateIso && outletMatches(s.outlet, offer.outlet),
        );
        if (after?.status === before?.status) {
          get().toast("Already en route", "info");
          return;
        }
        set({ agencyRoster: next });
        get().toast("En route — outlet sees you on Live GPS", "success");
      },

      shiftAccepted: demoSnapshot.shiftAccepted,
      pendingApproval: demoSnapshot.pendingApproval,
      acceptedShiftIndex: demoSnapshot.acceptedShiftIndex,
      checkedIn: demoSnapshot.checkedIn,
      checkedOut: demoSnapshot.checkedOut,
      drinks: demoSnapshot.drinks,
      tables: demoSnapshot.tables,
      outletRatingStars: demoSnapshot.outletRatingStars,
      prActiveShift: demoSnapshot.prActiveShift,
      prSessionByRole: demoSnapshot.prSessionByRole ?? {},

      prNotifications: [...SEED_PR_NOTIFICATIONS],
      opsNotifications: [],
      sosIncidents: [],
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
      pushNotify: (event) => {
        set((st) => {
          const pushed = applyPushEvent(
            {
              prNotifications: st.prNotifications,
              opsNotifications: st.opsNotifications,
              notificationPrefs: st.notificationPrefs,
            },
            event,
          );
          return pushed;
        });
      },
      markOpsNotificationRead: (id) =>
        set((st) => ({
          opsNotifications: st.opsNotifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),
      prDeclinedOfferIds: [],
      prMarketplaceApplication: null,
      prUpcomingShifts: [...SEED_UPCOMING_SHIFTS],
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
        if (get().prSubRole !== "pr_free") {
          get().toast(
            "Freelancer mode required — enter as Freelancer from the welcome screen",
            "warn",
          );
          return false;
        }
        if (get().prFreelancerLowRatingStrikes >= 3) {
          get().toast("Account suspended — 3 ratings below 3.0★", "warn");
          return false;
        }
        const st = get();
        if (st.prMarketplaceApplication?.status === "pending") {
          get().toast("You already have a pending application", "info");
          return false;
        }
        const listing = listingById(listingId);
        if (!listing) {
          get().toast("Listing not found", "warn");
          return false;
        }
        const prId = FREELANCER_DEMO_PR_ID;
        const agencyPr = st.agencyPRs.find((p) => p.id === prId);
        const prName = formatPrDisplayName(
          prId,
          st.prDisplayName?.trim() || agencyPr?.name || getPrProfile("pr_free").name,
        );
        const shift = st.shifts.find(
          (s) =>
            outletMatches(s.outletName, listing.outlet) &&
            s.status !== "sealed" &&
            s.filled < s.quantity,
        );
        const applicantId = shift
          ? `app-${shift.id}-${prId}-${Date.now().toString(36)}`
          : undefined;
        set((cur) => ({
          prMarketplaceApplication: {
            listingId,
            status: "pending",
            applicantId,
            shiftId: shift?.id,
          },
          acceptedShiftIndex: offerToShiftIndex(listingId),
          shiftApplicants: shift
            ? [
                ...cur.shiftApplicants,
                {
                  id: applicantId!,
                  shiftId: shift.id,
                  prId,
                  prName,
                  rating: agencyPr?.rating ?? 4.6,
                  status: "pending" as const,
                },
              ]
            : cur.shiftApplicants,
        }));
        get().toast(
          shift
            ? "Application sent — outlet will review on Bookings"
            : "Application sent — outlet or agency will accept or decline",
          "info",
        );
        return true;
      },
      simulateOutletAcceptApplication: () => {
        const app = get().prMarketplaceApplication;
        if (!app || app.status !== "pending") return;
        set({
          prMarketplaceApplication: { ...app, status: "accepted" },
          shiftAccepted: true,
          pendingApproval: false,
        });
        const st = get();
        const idx = st.acceptedShiftIndex ?? 0;
        const offer = PR_SHIFT_OFFERS[idx] ?? PR_SHIFT_OFFERS[0];
        const profile = getPrProfile("pr_free");
        get().pushNotify({
          type: "shift_assigned",
          prId: FREELANCER_DEMO_PR_ID,
          prName: profile.name,
          outlet: offer.outlet,
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
        const st = get();
        const ctx = demoAttendanceContext(st);
        const profile = getPrProfile(st.prSubRole);
        get().pushNotify({
          type: "shift_assigned",
          prId: ctx.prId,
          prName: profile.name,
          outlet: ctx.outlet,
        });
        get().toast("Agency approved — slot locked", "success");
      },
      cancelPrShift: () => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        const slot = findAgencyRosterTonight(st.agencyRoster, prId);
        let deductionRm = 0;
        if (slot) {
          const evalResult = evaluateShiftCancellation(
            new Date(),
            slot.dateIso,
            slot.shiftStart,
            slot.estPayout ?? CANCEL_RULES.defaultDailyWagesRm,
          );
          deductionRm = evalResult.deductionRm;
          const stamp = new Date().toLocaleString("en-MY", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          set((cur) => ({
            agencyRoster: cur.agencyRoster.map((s) =>
              s.id === slot.id
                ? {
                    ...s,
                    status: "unavailable" as const,
                    payDeductionRm: deductionRm,
                    cancelledAt: stamp,
                    prUnavailableNote: "Tonight shift cancelled by PR",
                  }
                : s,
            ),
          }));
        }
        set({
          shiftAccepted: false,
          pendingApproval: false,
          acceptedShiftIndex: null,
          checkedIn: false,
          checkedOut: false,
          drinks: 0,
          tables: 0,
          prActiveShift: null,
          prCheckInMeta: {},
        });
        get().toast(
          deductionRm > 0
            ? `Shift cancelled — −RM ${deductionRm} logged on next PV`
            : "Shift cancelled — no pay deduction",
          deductionRm > 0 ? "warn" : "info",
        );
      },
      requestPrSwap: (targetId, reason) => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        const sourceSlot = findAgencyRosterTonight(st.agencyRoster, prId);
        if (!sourceSlot) {
          get().toast("No confirmed shift to swap from", "warn");
          return;
        }
        if (!["scheduled", "en-route", "on-duty"].includes(sourceSlot.status)) {
          get().toast("Only confirmed shifts can be swapped", "warn");
          return;
        }
        const target = swapTargetOptionsForPr(
          st.agencyRoster,
          prId,
          sourceSlot,
          PR_AGENCY_TIED_OFFERS,
          st.prDeclinedOfferIds,
        ).find((t) => t.id === targetId);
        if (!target) {
          get().toast("Pick a different shift to swap into", "warn");
          return;
        }
        const alreadyPending = st.prSwapRequests.some(
          (s) =>
            s.rosterSlotId === sourceSlot.id &&
            (s.status === "pending_agency" || s.status === "pending_replacement"),
        );
        if (alreadyPending) {
          get().toast("Swap already pending for this shift", "info");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const profile = getPrProfile(st.prSubRole);
        set((cur) => ({
          prSwapRequests: [
            {
              id: "swap-" + Date.now().toString(36),
              rosterSlotId: sourceSlot.id,
              requestingPrId: prId,
              requestingPrName: profile.name,
              outlet: sourceSlot.outlet,
              date: sourceSlot.date,
              dateIso: sourceSlot.dateIso,
              shift: sourceSlot.shift,
              targetOutlet: target.outlet,
              targetDate: target.date,
              targetDateIso: target.dateIso,
              targetShift: target.shift,
              targetRosterSlotId: target.rosterSlotId,
              targetOfferId: target.offerId,
              reason: reason.trim(),
              status: "pending_agency" as const,
              requestedAt: stamp,
            },
            ...cur.prSwapRequests,
          ],
        }));
        get().pushNotify({
          type: "swap_update",
          prId,
          prName: profile.name,
          outlet: `${sourceSlot.outlet} → ${target.outlet}`,
          status: "pending",
          notifyPr: false,
        });
        get().toast(`Swap request sent — ${sourceSlot.outlet} → ${target.outlet}`, "info");
      },
      prCheckIn: (opts) => {
        const st0 = get();
        const offer = activePrShiftOffer(st0);
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const date = getShiftToday();
        const dutyWages = calcDutyWagesFromOutlet(offer.outlet, offer.time);
        const session: PrActiveShiftSession = {
          id: makeShiftSessionId(date, offer.outlet),
          pvId: makeShiftPvId(date, offer.outlet),
          outlet: offer.outlet,
          date,
          shiftTime: offer.time,
          baseWages: dutyWages.wages,
          wagePerHour: dutyWages.wagePerHour,
          shiftHours: dutyWages.shiftHours,
          timeIn: stamp,
          receiptIds: [],
        };
        const prId = getPrRosterId(get().prSubRole);
        const checkInTime = new Date().toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const late = opts?.simulateLate ?? get().prCheckInMeta.late ?? false;
        const gpsFallback = opts?.gpsFallback ?? get().prCheckInMeta.gpsFallback ?? false;
        const ctx = demoAttendanceContext(get());
        set((st) => {
          const pr = st.agencyPRs.find((p) => p.id === prId);
          const prName = pr?.name ?? getPrProfile(st.prSubRole).name;
          let roster = rosterCheckIn(st.agencyRoster, prId, offer.outlet, checkInTime, {
            prName,
            dateIso: ctx.dateIso,
            shift: offer.time,
          });
          roster = patchPrRosterAttendanceFlags(roster, ctx.prId, ctx.outlet, ctx.dateIso, {
            lateFlag: late,
            noShowFlag: false,
          });
          return {
            checkedIn: true,
            prActiveShift: session,
            agencyRoster: roster,
            prCheckInMeta: {
              late,
              noShowRisk: false,
              selfieDataUrl: opts?.selfieDataUrl ?? st.prCheckInMeta.selfieDataUrl ?? null,
              gpsFallback,
              closedShift: null,
            },
          };
        });
        const lateNote = late ? " · Late flag (+15 min)" : "";
        const gpsNote = gpsFallback ? " · Manual maps fallback" : "";
        const profile = getPrProfile(get().prSubRole);
        get().pushNotify({
          type: "check_in",
          prId,
          prName: profile.name,
          outlet: offer.outlet,
          late,
        });
        get().toast(
          `Checked in ✓ Time-In locked · PV ${session.pvId}${lateNote}${gpsNote}`,
          "success",
        );
      },
      simulatePrLate: (enabled) => {
        if (!get().shiftAccepted || get().checkedIn) {
          get().toast("Accept a shift first", "warn");
          return;
        }
        const ctx = demoAttendanceContext(get());
        set((st) => ({
          agencyRoster: patchPrRosterAttendanceFlags(
            st.agencyRoster,
            ctx.prId,
            ctx.outlet,
            ctx.dateIso,
            enabled ? { lateFlag: true, noShowFlag: false } : { lateFlag: false },
          ),
          prCheckInMeta: {
            ...st.prCheckInMeta,
            late: enabled,
            noShowRisk: enabled ? false : st.prCheckInMeta.noShowRisk,
          },
        }));
        get().toast(
          enabled
            ? "Late flag active (+15 min) — synced to agency roster"
            : "Late simulation cleared",
          enabled ? "warn" : "info",
        );
      },
      simulatePrNoShow: () => {
        if (!get().shiftAccepted || get().checkedIn) {
          get().toast("Accept a shift first", "warn");
          return;
        }
        const ctx = demoAttendanceContext(get());
        set((st) => ({
          agencyRoster: patchPrRosterAttendanceFlags(
            st.agencyRoster,
            ctx.prId,
            ctx.outlet,
            ctx.dateIso,
            { noShowFlag: true, lateFlag: false },
          ),
          prCheckInMeta: {
            ...st.prCheckInMeta,
            noShowRisk: true,
            late: false,
          },
        }));
        get().toast("No-show flag logged (+30 min) — synced to agency roster", "warn");
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
        const overtimeMinutes = 11;
        const dutyWages = calcDutyWagesFromOutlet(shift.outlet, shift.shiftTime, overtimeMinutes);
        const closed: PrActiveShiftSession = {
          ...shift,
          timeOut: stamp,
          overtimeMinutes,
          baseWages: dutyWages.wages,
          wagePerHour: dutyWages.wagePerHour,
          shiftHours: dutyWages.shiftHours,
        };
        const scans = receiptItemsForShift(shift, get().prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS).filter(
          (r) => r.shiftSessionId === shift.id || shift.receiptIds.includes(r.id),
        );
        const profile = getPrProfile(get().prSubRole);
        const shiftPayout = shiftPayoutTotal(closed.baseWages, scans);
        const scanIds = new Set(scans.map((s) => s.id));
        const [y, m, d] = shift.date;
        const dateIso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const managedPr = get().agencyPRs.find((p) => p.id === prId);
        const historyRow = buildShiftHistoryRow({
          prId,
          prName: managedPr?.name ?? profile.name,
          outlet: shift.outlet,
          dateIso,
          dateDisplay: stamp.split("·")[0]?.trim() ?? stamp,
          totalPayout: shiftPayout,
          totalDrinks: scans.reduce((s, r) => s + r.drinkCommission, 0),
          totalTips: scans.reduce((s, r) => s + r.tipCommission, 0),
          durationHours: 6,
        });
        const checkOutTime = new Date().toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          ...syncLedgerState(st, {
            agencyRoster: rosterCheckOut(st.agencyRoster, prId, shift.outlet, checkOutTime),
            shiftHistory: mergeShiftHistory(
              st.shiftHistory.filter(
                (r) => shiftHistorySlotKey(r) !== shiftHistorySlotKey(historyRow),
              ),
              [historyRow],
            ),
          }),
          checkedOut: true,
          prActiveShift: null,
          prCheckInMeta: {
            ...st.prCheckInMeta,
            closedShift: closed,
          },
          prReceiptScans: (st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS).map((r) =>
            scanIds.has(r.id)
              ? {
                  ...r,
                  shiftSessionId: shift.id,
                  status: "pending" as const,
                }
              : r,
          ),
        }));
        get().toast(
          `Checked out ✓ shift sealed · ${scans.length} receipt(s) · weekly PV issues Sunday`,
          "success",
        );
        get().pushNotify({
          type: "rating_prompt",
          prId,
          prName: managedPr?.name ?? profile.name,
          outlet: shift.outlet,
          audience: "pr",
        });
      },
      setOutletRatingStars: (n) => set({ outletRatingStars: n }),

      markPrNotificationRead: (id) =>
        set((st) => ({
          prNotifications: st.prNotifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
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
          prPayrollAgencyId:
            st.prPayrollAgencyId === agencyId ? (nextLinks[0] ?? null) : st.prPayrollAgencyId,
        });
        get().toast("Payroll unlinked — future PVs blocked until you link again", "warn");
      },
      submitPrOutletRating: (pendingId, stars) => {
        const pending = get().prPendingRatings.find((p) => p.id === pendingId);
        if (!pending) return;
        if (stars < 1 || stars > 5) return;
        const stamp = new Date().toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        set((st) => {
          let strikes = st.prFreelancerLowRatingStrikes;
          if (st.prSubRole === "pr_free" && stars < 3) strikes += 1;
          return {
            prPendingRatings: st.prPendingRatings.filter((p) => p.id !== pendingId),
            prRatingHistory: [
              {
                id: "rh-" + Date.now().toString(36),
                outlet: pending.outlet,
                stars,
                direction: "pr_rates_outlet",
                date: stamp,
              },
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
        const st = get();
        const profile = getPrProfile(st.prSubRole);
        const prId = getPrRosterId(st.prSubRole);
        const prType = st.prSubRole === "pr_free" ? "freelancer" : "agency_tied";
        const offer = activePrShiftOffer(st);
        const outlet = st.prActiveShift?.outlet ?? offer.outlet ?? "Velvet 23";
        const agencyName =
          st.prSubRole === "pr_free"
            ? (getPrAgencyById(st.prPayrollAgencyId)?.name ?? "Atlas Agency")
            : (getPrAgencyById(DEFAULT_TIED_AGENCY_ID)?.name ?? "Atlas Agency");
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const sosId = "sos-" + Date.now().toString(36);
        const incident: SosIncident = {
          id: sosId,
          at: stamp,
          note: note.trim(),
          photoDataUrl,
          locationLabel: DEMO_SOS_LOCATION.label,
          lat: DEMO_SOS_LOCATION.lat,
          lng: DEMO_SOS_LOCATION.lng,
          prId,
          prName: profile.name,
          prIc: profile.ic,
          prType,
          outlet,
          agencyName,
        };
        set((st) => ({ sosIncidents: [incident, ...st.sosIncidents] }));
        get().pushNotify({ type: "sos", incident });
        get().toast("SOS alert sent · Agency, outlet, admin & emergency contacts notified", "warn");
      },
      requestLeaveAgency: (note) => {
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        set({ prLeaveRequest: { type: "leave", note, at: stamp } });
        get().toast("Support ticket raised — agency will review early leave request", "info");
      },
      requestTransferAgency: (code, note) => {
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        set({ prLeaveRequest: { type: "transfer", note, newAgencyCode: code, at: stamp } });
        get().toast("Transfer request sent to InnocenZ support", "info");
      },

      prComcard: { ...COMCARD },
      prPortfolio: demoSnapshot.prPortfolio,
      prLanguages: ["English", "Mandarin", "Cantonese"],
      prDisplayName: null,
      prEmail: null,
      prAvatarPhoto: demoSnapshot.prAvatarPhoto,
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
        const prId = getPrRosterId(get().prSubRole);
        const displayName = data.displayName.trim();
        const email = data.email.trim();
        set((st) => {
          const portal = {
            prDisplayName: displayName,
            prEmail: email,
            prAvatarPhoto: data.avatarPhoto,
            prComcard: data.comcard,
            prPortfolio: data.portfolio,
            prLanguages: data.languages,
          };
          const nextAgencyPRs = st.agencyPRs.map((p) =>
            syncAgencyPrFromPrPortal(p, prId, portal),
          );
          const nextRoster = st.agencyRoster.map((slot) =>
            slot.prId === prId ? { ...slot, prName: displayName || slot.prName } : slot,
          );
          return {
            prDisplayName: displayName,
            prEmail: email,
            prAvatarPhoto: data.avatarPhoto,
            prComcard: data.comcard,
            prPortfolio: data.portfolio,
            prLanguages: data.languages,
            agencyPRs: nextAgencyPRs,
            agencyRoster: nextRoster,
            prs: marketplacePrsFromAgency(nextAgencyPRs),
          };
        });
        get().toast("Profile saved — synced across agency roster & outlet", "success");
      },

      prPaymentVouchers: demoSnapshot.prPaymentVouchers,
      ensurePreviousWeekPv: () => {
        const st = get();
        const role = st.prSubRole;
        if (!role) return;
        const profile = getPrProfile(role);
        const prId = getPrRosterId(role);
        const prev = getPreviousWeekBounds();
        if (!isWeekPvIssued(prev.endIso)) return;

        const pvs = st.prPaymentVouchers ?? SEED_PR_PVS;
        const mine = filterPvsForPrProfile(pvs, profile, role);
        const existing = mine.find((p) => p.weekStartIso === prev.startIso);
        if (existing && (existing.status === "SIGNED" || existing.status === "PAID")) return;

        const scans = filterReceiptScansForPrProfile(st.prReceiptScans ?? [], profile, role, mine);
        const summary = buildWeeklyPaymentSummary({
          weekStartIso: prev.startIso,
          pv: existing,
          shiftHistory: st.shiftHistory,
          scans,
          prId,
        });
        if (summary.totals.net <= 0 && !existing) return;

        const sentPv = buildSentWeeklyPv({
          profile,
          prSuffix: prId.charAt(0).toUpperCase(),
          summary,
          existing,
          fallbackOutlet: existing?.outlet ?? "Velvet 23",
        });
        const nextPv =
          existing?.status === "DISPUTED"
            ? {
                ...sentPv,
                status: "DISPUTED" as const,
                prDisputeReason: existing.prDisputeReason,
                disputedAt: existing.disputedAt,
                prDisputePhotoDataUrl: existing.prDisputePhotoDataUrl,
                prDisputePhotoDataUrls: existing.prDisputePhotoDataUrls,
              }
            : sentPv;

        if (
          existing &&
          existing.status === nextPv.status &&
          existing.net === nextPv.net &&
          existing.rows.length === nextPv.rows.length
        ) {
          return;
        }

        set((state) => {
          const all = state.prPaymentVouchers ?? SEED_PR_PVS;
          const without = existing ? all.filter((p) => p.id !== existing.id) : all;
          return { prPaymentVouchers: [reconcilePvTotals(nextPv), ...without] };
        });
      },
      signPrPv: (id, signatureDataUrl) => {
        if (!signatureDataUrl?.startsWith("data:image/")) {
          get().toast("Draw your signature before confirming", "warn");
          return;
        }
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        const stamp = formatPvSignTimestamp();
        const bankRef = `INZ-TRF-${Date.now().toString(36).toUpperCase().slice(-8)}`;
        set((st) => {
          const nextPvs = (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "PAID" as const,
                  prSignedAt: stamp,
                  prSignatureDataUrl: signatureDataUrl,
                  paidAt: stamp,
                  bankRef,
                }
              : p,
          );
          const ledger = syncStoreHistoryLedger(
            st.shiftHistory,
            st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS,
            nextPvs,
          );
          return {
            prPaymentVouchers: ledger.pvs,
            prReceiptScans: ledger.scans,
          };
        });
        const prId = prIdForPayeeName(pv.prName, pv.prIc, get().agencyPRs);
        get().pushNotify({
          type: "pv_signed",
          pvId: id,
          prName: pv.prName,
          net: pv.net,
        });
        get().pushNotify({
          type: "pv_paid",
          pvId: id,
          prId,
          prName: pv.prName,
          net: pv.net,
        });
        get().toast(
          `Signed ✓ · ${pv.net.toLocaleString("en-MY", { style: "currency", currency: "MYR" })} sent to your bank (${bankRef})`,
          "success",
        );
      },
      disputePrPv: (id, reason, photoDataUrls, targets) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Describe the issue so your agency can verify", "warn");
          return;
        }
        const photos = photoDataUrls?.filter(Boolean) ?? [];
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        const year = pv.weekStartIso ? parseInt(pv.weekStartIso.slice(0, 4), 10) : new Date().getFullYear();
        const rows = targets?.length
          ? applyDisputeTargetsToRows(pv.rows, targets, year)
          : pv.rows;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => {
          const nextPvs = (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "DISPUTED" as const,
                  prDisputeReason: trimmed,
                  disputedAt: stamp,
                  prDisputePhotoDataUrls: photos.length ? photos : undefined,
                  prDisputePhotoDataUrl: photos[0],
                  rows,
                }
              : p,
          );
          const ledger = syncStoreHistoryLedger(
            st.shiftHistory,
            st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS,
            nextPvs,
          );
          return {
            prPaymentVouchers: ledger.pvs,
            prReceiptScans: ledger.scans,
          };
        });
        get().pushNotify({
          type: "dispute_raised",
          pvId: id,
          prName: pv.prName,
          outlet: pv.outlet,
        });
        get().toast(
          "Dispute submitted — your agency will review and adjust the PV",
          "warn",
        );
      },
      updatePrPvDisputeReason: (id, reason, photoDataUrls, targets) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Dispute reason cannot be empty", "warn");
          return;
        }
        const photos = photoDataUrls?.filter(Boolean) ?? [];
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        const year = pv.weekStartIso ? parseInt(pv.weekStartIso.slice(0, 4), 10) : new Date().getFullYear();
        const rows = targets?.length
          ? applyDisputeTargetsToRows(pv.rows, targets, year)
          : pv.rows;
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
                  prDisputePhotoDataUrls: photos.length ? photos : undefined,
                  prDisputePhotoDataUrl: photos[0],
                  rows,
                }
              : p,
          ),
        }));
        get().toast("Dispute reason updated — agency notified", "success");
      },
      escalatePrPvDispute: (id) => {
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        if (pv.status !== "DISPUTED") {
          get().toast("Only open disputes can be escalated", "warn");
          return;
        }
        if (pv.disputeEscalatedAt) {
          get().toast("Dispute already escalated — InnocenZ support notified", "info");
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
        }));
        get().pushNotify({
          type: "dispute_raised",
          pvId: id,
          prName: pv.prName,
          outlet: pv.outlet,
        });
        get().toast("Dispute escalated — InnocenZ support notified", "warn");
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

      prReceiptScans: demoSnapshot.prReceiptScans,
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
        const manual = draft.manualSelfLog;
        const items = manual
          ? buildManualReceiptItems(manual.category, manual.amount)
          : draft.items;
        const totalLogged = manual ? manual.amount : draft.totalLogged;
        const fingerprint = receiptScanFingerprint({
          outlet: draft.outlet,
          totalLogged,
          items,
          receiptRef: draft.receiptRef,
        });
        const existing = findDuplicateReceiptScan(
          get().prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS,
          fingerprint,
          draft.replaceScanId,
        );
        if (existing) {
          get().toast(
            `Duplicate receipt — already logged as ${existing.id}${existing.receiptRef ? ` (${existing.receiptRef})` : ""}`,
            "warn",
          );
          return "";
        }
        const scans = get().prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS;
        const replaced = draft.replaceScanId
          ? scans.find((s) => s.id === draft.replaceScanId)
          : undefined;
        if (draft.replaceScanId) {
          if (!replaced) {
            get().toast("Original receipt not found — scan as new instead", "warn");
            return "";
          }
          if (replaced.shiftSessionId !== shift.id) {
            get().toast("Can only replace receipts on your current shift", "warn");
            return "";
          }
        }
        const id = replaced?.id ?? `rc-${Date.now().toString(36)}`;
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const comm = calcReceiptCommissions(items);
        const outlet = draft.outlet.replace(/\s+KL$/i, "").trim() || draft.outlet;
        const scan: PrReceiptScan = {
          id,
          receiptRef: draft.receiptRef.trim(),
          scannedAt: stamp,
          entryMethod: draft.entryMethod ?? (manual ? "manual" : "scan"),
          date: [...shift.date] as [number, number, number],
          outlet,
          prCode: draft.prCode,
          prName: draft.prName,
          prId: draft.prId,
          items,
          totalLogged,
          ...comm,
          shiftSessionId: shift.id,
          pvId: shift.pvId,
          status: "attached",
          logSource: manual ? "manual" : "ocr",
          manualReason: manual?.reason ?? (manual ? "OCR unreadable — water / blur on receipt" : undefined),
          agencyVerification: manual ? "pending" : undefined,
        };
        set((st) => {
          const allScans = st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS;
          const withoutReplaced = replaced ? allScans.filter((s) => s.id !== replaced.id) : allScans;
          const oldQty = replaced ? receiptQtyDelta(replaced.items) : { drinks: 0, tables: 0 };
          const newQty = receiptQtyDelta(items);
          const receiptIds = replaced
            ? shift.receiptIds.map((rid) => (rid === replaced.id ? id : rid))
            : [...shift.receiptIds, id];
          return {
            prReceiptScans: [scan, ...withoutReplaced],
            prActiveShift: shift ? { ...shift, receiptIds } : null,
            drinks: st.drinks - oldQty.drinks + newQty.drinks,
            tables: st.tables - oldQty.tables + newQty.tables,
          };
        });
        if (manual) {
          get().pushNotify({
            type: "receipt_self_log",
            scanId: id,
            receiptRef: scan.receiptRef,
            prId: draft.prId,
            prName: draft.prName,
            outlet,
            amount: totalLogged,
            category: manual.category,
          });
          get().toast(
            replaced
              ? `Self-log updated · RM ${totalLogged.toFixed(2)} — agency will re-verify`
              : `Self-log submitted · RM ${totalLogged.toFixed(2)} — agency will verify before it counts`,
            "success",
          );
        } else {
          get().toast(
            replaced
              ? `Receipt re-scanned · replaced ${replaced.receiptRef}`
              : `Receipt logged → ${shift.pvId} · receipt #${shift.receiptIds.length + 1} on this shift`,
            "success",
          );
        }
        return id;
      },

      updateReceiptSelfLog: (scanId, patch) => {
        const shift = get().prActiveShift;
        if (!get().checkedIn || get().checkedOut) {
          get().toast("Check in on your shift to edit self-logs", "warn");
          return;
        }
        if (!shift) {
          get().toast("No active shift session", "warn");
          return;
        }
        const scans = get().prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS;
        const scan = scans.find((s) => s.id === scanId);
        if (!scan || scan.logSource !== "manual" || scan.agencyVerification !== "pending") {
          get().toast("Only pending self-logs on this shift can be edited", "warn");
          return;
        }
        if (scan.shiftSessionId !== shift.id) {
          get().toast("This self-log belongs to another shift", "warn");
          return;
        }
        const amount = Math.max(0, Math.round(patch.amount * 100) / 100);
        if (amount <= 0) {
          get().toast("Enter a valid amount", "warn");
          return;
        }
        const category = patch.category ?? receiptPrimaryCategory(scan);
        const items = buildManualReceiptItems(category, amount);
        const comm = calcReceiptCommissions(items);
        const oldQty = receiptQtyDelta(scan.items);
        const newQty = receiptQtyDelta(items);
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prReceiptScans: (st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS).map((s) =>
            s.id === scanId
              ? {
                  ...s,
                  items,
                  totalLogged: amount,
                  ...comm,
                  manualReason:
                    patch.reason?.trim() ||
                    s.manualReason ||
                    "OCR unreadable — water / blur on receipt",
                  scannedAt: `${stamp} (edited)`,
                  agencyVerification: "pending" as const,
                  agencyVerifiedAt: undefined,
                }
              : s,
          ),
          drinks: st.drinks - oldQty.drinks + newQty.drinks,
          tables: st.tables - oldQty.tables + newQty.tables,
        }));
        if (scan.prId) {
          get().pushNotify({
            type: "receipt_self_log",
            scanId,
            receiptRef: scan.receiptRef,
            prId: scan.prId,
            prName: scan.prName,
            outlet: scan.outlet,
            amount,
            category,
          });
        }
        get().toast(`Self-log updated · RM ${amount.toFixed(2)} — agency notified`, "success");
      },

      verifyAgencyReceiptSelfLog: (scanId, decision) => {
        const scans = get().prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS;
        const scan = scans.find((s) => s.id === scanId);
        if (!scan || scan.logSource !== "manual" || scan.agencyVerification !== "pending") {
          get().toast("This self-log is not awaiting verification", "warn");
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
          prReceiptScans: (st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS).map((s) =>
            s.id === scanId
              ? {
                  ...s,
                  agencyVerification: decision,
                  agencyVerifiedAt: stamp,
                }
              : s,
          ),
        }));
        if (scan.prId) {
          get().pushNotify({
            type: "receipt_self_log_verified",
            scanId,
            prId: scan.prId,
            prName: scan.prName,
            approved: decision === "approved",
            amount: scan.totalLogged,
          });
        }
        get().toast(
          decision === "approved"
            ? `Self-log approved · ${scan.prName} · RM ${scan.totalLogged.toFixed(2)}`
            : `Self-log rejected · ${scan.prName} notified`,
          decision === "approved" ? "success" : "warn",
        );
      },

      editAgencyPv: (id, patch) => {
        set((st) => ({
          prPaymentVouchers: (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) => {
            if (p.id !== id) return p;
            const rows = patch.rows ?? p.rows;
            const deduct = patch.deduct ?? p.deduct;
            return reconcilePvTotals({ ...p, ...patch, rows, deduct });
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
            p.id === id
              ? {
                  ...p,
                  status: "PENDING_REVIEW" as const,
                  disputeNote: undefined,
                  prDisputeReason: undefined,
                  disputedAt: undefined,
                }
              : p,
          ),
        }));
        get().toast(`PV ${id} re-sent to ${pv.prName} for e-signature`, "info");
      },
      sendAgencyPvToPr: (id) => {
        const pv = (get().prPaymentVouchers ?? SEED_PR_PVS).find((p) => p.id === id);
        if (!pv) return;
        if (pv.status !== "PENDING_REVIEW") {
          get().toast("Only draft / pending-review PVs can be sent to PR", "warn");
          return;
        }
        const pvs = get().prPaymentVouchers ?? SEED_PR_PVS;
        const dup = pvs.some(
          (p) =>
            p.id !== id &&
            p.status === "PAID" &&
            p.prName === pv.prName &&
            pv.rows.some((r) => p.paidRefs?.includes(`${r.date}-${r.outlet}-${r.ref}`)),
        );
        if (dup) {
          get().toast("Blocked — duplicate payment (Golden Audit Σ≠0)", "warn");
          return;
        }
        set((st) => {
          const nextPvs = (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id ? { ...p, status: "SENT" as const } : p,
          );
          const ledger = syncStoreHistoryLedger(
            st.shiftHistory,
            st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS,
            nextPvs,
          );
          return {
            prPaymentVouchers: ledger.pvs,
            prReceiptScans: ledger.scans,
          };
        });
        const prId = prIdForPayeeName(pv.prName, pv.prIc, get().agencyPRs);
        get().pushNotify({
          type: "pv_sent",
          pvId: id,
          prId,
          prName: pv.prName,
          net: pv.net,
        });
        get().toast(`PV sent to ${pv.prName} · awaiting PR e-signature`, "success");
      },
      resolveAgencyPvDispute: (id) => {
        set((st) => {
          const nextPvs = (st.prPaymentVouchers ?? SEED_PR_PVS).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "PENDING_REVIEW" as const,
                  disputeNote: undefined,
                  prDisputeReason: undefined,
                  disputedAt: undefined,
                }
              : p,
          );
          const ledger = syncStoreHistoryLedger(
            st.shiftHistory,
            st.prReceiptScans ?? LIVE_SEED_RECEIPT_SCANS,
            nextPvs,
          );
          return {
            prPaymentVouchers: ledger.pvs,
            prReceiptScans: ledger.scans,
          };
        });
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
        const fh = financeHeadStampFromProfile(get().agencyFinanceHead);
        const pv = buildPvFromShiftHistoryRow(row, pr, fh);
        set((st) => ({
          prPaymentVouchers: [pv, ...(st.prPaymentVouchers ?? SEED_PR_PVS)],
        }));
        get().pushNotify({
          type: "pv_sent",
          pvId: pv.id,
          prId: pr.id,
          prName: pr.name,
          net: pv.net,
        });
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
                  prSignatureDataUrl: undefined,
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
      saveAgencyProfileSettings: (data) => {
        set((st) => ({
          agencyOwner: data.owner,
          agencyFinanceHead: data.financeHead,
          scalingTierMultipliers: data.scalingTierMultipliers,
          outletCommissionRules: data.outletCommissionRules,
          outletWorkspace: syncWorkspaceFromCommissionRules(
            st.outletWorkspace,
            data.outletCommissionRules,
          ),
        }));
        get().toast("Agency settings saved · outlet workspace synced", "success");
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
        const col = get().agencyCollections.find((c) => c.id === id);
        if (!col) {
          get().toast("Invoice not found", "warn");
          return;
        }
        set((st) => ({
          agencyCollections: st.agencyCollections.map((c) =>
            c.id === id ? { ...c, reminderSent: true } : c,
          ),
        }));
        get().pushNotify({
          type: "collection_reminder",
          collectionId: col.id,
          outlet: col.outlet,
          amount: col.amount,
          dueDate: col.dueDate,
        });
        get().toast(
          `Reminder sent to ${col.counterparty ?? col.outlet} · check outlet bell`,
          "success",
        );
      },

      agencyReconciliation: demoSnapshot.agencyReconciliation,
      confirmAgencyReconciliation: () => {
        set((st) => ({
          agencyReconciliation: { ...st.agencyReconciliation, agencyConfirmed: true },
        }));
        get().toast("Weekly reconciliation confirmed · agency side locked", "success");
      },
      confirmOutletReconciliation: () => {
        set((st) => ({
          agencyReconciliation: { ...st.agencyReconciliation, outletConfirmed: true },
        }));
        get().toast("Outlet weekly reconciliation confirmed · synced to agency", "success");
      },
      confirmPrReconciliation: (prId) => {
        set((st) => {
          const ids = st.agencyReconciliation.prConfirmedIds ?? [];
          if (ids.includes(prId)) return st;
          return {
            agencyReconciliation: {
              ...st.agencyReconciliation,
              prConfirmedIds: [...ids, prId],
            },
          };
        });
        get().toast("PR weekly earnings confirmed", "success");
      },
      syncReconciliationFromLedger: () => {
        set((st) => syncLedgerState(st, {}));
      },

      agencyRoster: demoSnapshot.agencyRoster,
      editRosterSlot: (id, patch) => {
        const slot = get().agencyRoster.find((s) => s.id === id);
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
        if (slot) {
          const detail = [
            patch.outlet && patch.outlet !== slot.outlet ? `outlet → ${patch.outlet}` : null,
            patch.shift && patch.shift !== slot.shift ? `shift → ${patch.shift}` : null,
            patch.status && patch.status !== slot.status ? `status → ${patch.status}` : null,
          ]
            .filter(Boolean)
            .join(", ");
          if (detail) {
            get().pushNotify({
              type: "shift_edit",
              prId: slot.prId,
              prName: slot.prName,
              outlet: patch.outlet ?? slot.outlet,
              detail,
            });
          }
        }
        get().toast("Roster updated", "success");
      },
      cancelRosterShift: (rosterSlotId) => {
        const st = get();
        const slot = st.agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot) return;
        if (slot.checkedOutAt) {
          get().toast("Cannot cancel a completed shift", "warn");
          return;
        }
        const isTonight = slot.dateIso === DEFAULT_ROSTER_DATE_ISO;
        set((cur) => {
          const prSwapRequests = cur.prSwapRequests.map((s) =>
            s.rosterSlotId === rosterSlotId &&
            (s.status === "pending_agency" || s.status === "pending_replacement")
              ? { ...s, status: "declined" as const }
              : s,
          );
          let next: typeof cur = {
            ...cur,
            agencyRoster: cur.agencyRoster.filter((s) => s.id !== rosterSlotId),
            prSwapRequests,
            shifts: cur.shifts.map((sh) => {
              if (!outletMatches(sh.outletName, slot.outlet) || !sh.prs.includes(slot.prId))
                return sh;
              const prs = sh.prs.filter((id) => id !== slot.prId);
              return { ...sh, prs, filled: prs.length };
            }),
          };
          if (slot.prId === TIED_DEMO_ROSTER_PR_ID && isTonight) {
            next = { ...next, ...patchPrSessionForRole(cur, "pr_tied", clearPrShiftSession()) };
          }
          if (isFreelancerPrId(slot.prId) && isTonight) {
            next = { ...next, ...patchFreelancerPrSession(cur, clearPrShiftSession()) };
          }
          return next;
        });
        get().pushNotify({
          type: "shift_edit",
          prId: slot.prId,
          prName: slot.prName,
          outlet: slot.outlet,
          detail: "shift cancelled by agency",
        });
        get().toast(`Shift cancelled — ${slot.prName} freed for ${slot.date}`, "info");
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
        get().pushNotify({
          type: "swap_update",
          prId: slot.prId,
          prName: slot.prName,
          outlet: slot.outlet,
          status: "pending",
          notifyAgency: false,
        });
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
      assignPrToOutlet: ({
        prId,
        outlet,
        dateIso,
        dateLabel,
        shiftStart,
        shiftEnd,
        shift: shiftLabel,
        outletShiftId,
        event,
        payEstimate,
      }) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        if (pr.suspended || pr.detached) {
          get().toast(`${pr.name} is suspended or detached`, "warn");
          return;
        }
        const existing = get().agencyRoster.find((s) => s.prId === prId && s.dateIso === dateIso);
        if (existing && isPrMarkedDayOff(existing)) {
          get().toast(
            `${pr.name} marked ${dateLabel} unavailable on their schedule — they must reopen the day first`,
            "warn",
          );
          return;
        }
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
        const shift = shiftLabel ?? `${shiftStart} — ${shiftEnd}`;
        const postedShiftId =
          outletShiftId?.startsWith("posted-") ? outletShiftId.slice("posted-".length) : undefined;
        const slot: AgencyRosterSlot = {
          id,
          prId,
          prName: pr.name,
          outlet,
          date: dateLabel,
          dateIso,
          shift,
          shiftStart,
          shiftEnd,
          status: "assignment-pending",
          estPayout: payEstimate,
          agencyAssignment: {
            agencyName: "Atlas Agency",
            assignedAt: stamp,
            assignedAtMs: Date.now(),
            agencyNote: event,
            outletShiftId,
          },
        };
        set((st) => ({
          agencyRoster: existing
            ? st.agencyRoster.map((s) => (s.id === existing.id ? slot : s))
            : [slot, ...st.agencyRoster],
          shifts: postedShiftId
            ? addPrToPostedOutletShift(st.shifts, postedShiftId, prId, outlet)
            : addPrToOutletShift(st.shifts, outlet, prId),
        }));
        get().toast(
          `Assignment sent to ${pr.name} — awaiting Approve or Reject on Shifts`,
          "success",
        );
        get().pushNotify({
          type: "shift_assigned",
          prId,
          prName: pr.name,
          outlet,
        });
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
      confirmOutletRosterSlot: (rosterSlotId) => {
        const st = get();
        const slot = st.agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "outlet-pending") return;
        const prId = getPrRosterId(st.prSubRole);
        if (slot.prId !== prId) {
          get().toast("This shift is not assigned to you", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isTonight = slot.dateIso === DEFAULT_ROSTER_DATE_ISO;
        set((cur) => ({
          agencyRoster: cur.agencyRoster.map((s) =>
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
          ...(slot.prId === TIED_DEMO_ROSTER_PR_ID && isTonight
            ? patchPrSessionForRole(cur, "pr_tied", {
                shiftAccepted: true,
                pendingApproval: false,
                acceptedShiftIndex: shiftIndexForOutlet(slot.outlet),
                checkedIn: false,
                checkedOut: false,
              })
            : {}),
        }));
        get().toast(`${slot.outlet} confirmed your shift — check in when ready`, "success");
        get().pushNotify({
          type: "shift_assigned",
          prId: slot.prId,
          prName: slot.prName,
          outlet: slot.outlet,
        });
      },
      declineAgencyAssignmentByPr: (rosterSlotId) => {
        const slot = get().agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.status !== "assignment-pending") return;
        set((st) => ({
          agencyRoster: st.agencyRoster.filter((s) => s.id !== rosterSlotId),
        }));
        get().toast(`Rejected agency assignment at ${slot.outlet}`, "warn");
      },
      togglePrDayAvailability: (dateIso) => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        const profile = getPrProfile(st.prSubRole);
        if (!prId) return;

        const daySlots = st.agencyRoster.filter((s) => s.prId === prId && s.dateIso === dateIso);
        const dateLabel = fmtDateLabelFromIso(dateIso);
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        if (prDayIsUnavailable(daySlots)) {
          const unavailableSlot = daySlots.find((s) => s.status === "unavailable");
          if (!unavailableSlot) return;
          const syncNotes = buildAvailabilityOpsNotifications({
            prName: profile.name,
            dateLabel,
            available: true,
            at: stamp,
          });
          set((cur) => ({
            agencyRoster: cur.agencyRoster.filter((s) => s.id !== unavailableSlot.id),
            opsNotifications: [...syncNotes, ...cur.opsNotifications],
          }));
          get().pushNotify({
            type: "shift_edit",
            prId,
            prName: profile.name,
            outlet: "—",
            detail: `${dateLabel} open again on PR schedule`,
          });
          get().toast(`${dateLabel} open again — Atlas & outlets synced`, "success");
          return;
        }

        if (!canTogglePrDayAvailability(daySlots)) {
          get().toast("Cancel or decline booked shifts on this day first", "warn");
          return;
        }

        const unavailableSlot: AgencyRosterSlot = {
          id: `rs-unavail-${prId}-${dateIso}`,
          prId,
          prName: profile.name,
          outlet: "—",
          date: dateLabel,
          dateIso,
          shift: "—",
          shiftStart: "00:00",
          shiftEnd: "00:00",
          status: "unavailable",
          prUnavailableNote: "PR marked day off on schedule",
          cancelledAt: stamp,
        };
        const syncNotes = buildAvailabilityOpsNotifications({
          prName: profile.name,
          dateLabel,
          available: false,
          at: stamp,
        });
        set((cur) => ({
          agencyRoster: [
            ...cur.agencyRoster.filter(
              (s) =>
                !(s.prId === prId && s.dateIso === dateIso && s.status === "assignment-pending"),
            ),
            unavailableSlot,
          ],
          opsNotifications: [...syncNotes, ...cur.opsNotifications],
        }));
        get().pushNotify({
          type: "shift_edit",
          prId,
          prName: profile.name,
          outlet: "—",
          detail: `${dateLabel} marked unavailable on PR schedule`,
        });
        get().toast(`${dateLabel} blocked — synced to Atlas & outlets`, "success");
      },
      setPrDayUnavailable: (dateIso, note) => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        if (!prId) return;
        const daySlots = st.agencyRoster.filter((s) => s.prId === prId && s.dateIso === dateIso);
        if (prDayIsUnavailable(daySlots)) return;
        if (!canTogglePrDayAvailability(daySlots)) {
          get().toast("Cancel or decline the shift first — then mark the day unavailable", "warn");
          return;
        }
        get().togglePrDayAvailability(dateIso);
        if (note) {
          set((cur) => ({
            agencyRoster: cur.agencyRoster.map((s) =>
              s.prId === prId && s.dateIso === dateIso && s.status === "unavailable"
                ? { ...s, prUnavailableNote: note }
                : s,
            ),
          }));
        }
      },
      clearPrDayUnavailable: (dateIso) => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        if (!prId) return;
        const daySlots = st.agencyRoster.filter((s) => s.prId === prId && s.dateIso === dateIso);
        if (!prDayIsUnavailable(daySlots)) return;
        get().togglePrDayAvailability(dateIso);
      },
      cancelPrRosterShift: (rosterSlotId) => {
        const st = get();
        const prId = getPrRosterId(st.prSubRole);
        const slot = st.agencyRoster.find((s) => s.id === rosterSlotId);
        if (!slot || slot.prId !== prId) return;
        if (["on-duty", "en-route"].includes(slot.status)) {
          get().toast("Check out first — cannot cancel while on duty", "warn");
          return;
        }
        const evalResult = evaluateShiftCancellation(
          new Date(),
          slot.dateIso,
          slot.shiftStart,
          slot.estPayout
            ? Math.min(slot.estPayout, CANCEL_RULES.defaultDailyWagesRm)
            : CANCEL_RULES.defaultDailyWagesRm,
        );
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((cur) => ({
          agencyRoster: cur.agencyRoster.map((s) =>
            s.id === rosterSlotId
              ? {
                  ...s,
                  status: "unavailable" as const,
                  payDeductionRm: evalResult.deductionRm,
                  cancelledAt: stamp,
                  prUnavailableNote: "Shift cancelled by PR",
                }
              : s,
          ),
          prUpcomingShifts: cur.prUpcomingShifts.filter((u) => {
            const key = `${u.date[0]}-${String(u.date[1]).padStart(2, "0")}-${String(u.date[2]).padStart(2, "0")}`;
            return !(key === slot.dateIso && u.outlet === slot.outlet);
          }),
          ...(slot.dateIso === DEFAULT_ROSTER_DATE_ISO && slot.prId === getPrRosterId(cur.prSubRole)
            ? {
                shiftAccepted: false,
                pendingApproval: false,
                acceptedShiftIndex: null,
                checkedIn: false,
                checkedOut: false,
              }
            : {}),
        }));
        const penalty =
          evalResult.deductionRm > 0
            ? ` · −RM ${evalResult.deductionRm} on next PV`
            : " · no deduction";
        get().toast(
          `Shift cancelled at ${slot.outlet}${penalty}`,
          evalResult.tier === "safe" ? "info" : "warn",
        );
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
      approvePrSwapRequest: (swapId, replacementPrId) => {
        const st = get();
        const swap = st.prSwapRequests.find((s) => s.id === swapId);
        if (!swap || swap.status !== "pending_agency") return;
        const replacement = st.agencyPRs.find((p) => p.id === replacementPrId);
        if (!replacement || replacement.suspended || replacement.detached) {
          get().toast("Pick an active PR for replacement", "warn");
          return;
        }
        if (replacementPrId === swap.requestingPrId) {
          get().toast("Replacement must be a different PR", "warn");
          return;
        }
        const slot = st.agencyRoster.find((s) => s.id === swap.rosterSlotId);
        if (!slot) {
          get().toast("Roster slot no longer exists", "warn");
          return;
        }
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((cur) => ({
          prSwapRequests: cur.prSwapRequests.map((s) =>
            s.id === swapId
              ? {
                  ...s,
                  status: "pending_replacement" as const,
                  replacementPrId,
                  replacementPrName: replacement.name,
                  replacementOfferedAt: stamp,
                  replacementDeclineReason: undefined,
                  replacementDeclinedAt: undefined,
                }
              : s,
          ),
          ...(swap.requestingPrId === TIED_DEMO_ROSTER_PR_ID
            ? patchPrSessionForRole(cur, "pr_tied", clearPrShiftSession())
            : {}),
        }));
        get().toast(`Offer sent to ${replacement.name} — awaiting their response`, "success");
        get().pushNotify({
          type: "swap_update",
          prId: replacementPrId,
          prName: replacement.name,
          outlet: swap.outlet,
          status: "offer",
          requestingPrName: swap.requestingPrName,
          notifyAgency: true,
          notifyPr: true,
        });
      },
      acceptSwapReplacement: (swapId) => {
        const st = get();
        const swap = st.prSwapRequests.find((s) => s.id === swapId);
        if (!swap || swap.status !== "pending_replacement" || !swap.replacementPrId) return;
        const prId = getPrRosterId(st.prSubRole);
        if (swap.replacementPrId !== prId) {
          get().toast("This swap offer is not assigned to you", "warn");
          return;
        }
        const replacement = st.agencyPRs.find((p) => p.id === swap.replacementPrId);
        if (!replacement) return;
        const slot = st.agencyRoster.find((s) => s.id === swap.rosterSlotId);
        if (!slot) {
          get().toast("Roster slot no longer exists", "warn");
          return;
        }
        const targetSlot = swap.targetRosterSlotId
          ? st.agencyRoster.find((s) => s.id === swap.targetRosterSlotId)
          : undefined;
        const targetOutlet = swap.targetOutlet ?? targetSlot?.outlet;
        const targetDateIso = swap.targetDateIso ?? targetSlot?.dateIso;
        const targetShift = swap.targetShift ?? targetSlot?.shift;
        if (!targetOutlet || !targetDateIso || !targetShift) {
          get().toast("Swap target shift is missing — request a new swap", "warn");
          return;
        }
        const sourceIdx = shiftIndexForOutlet(swap.outlet);
        const requestingPr = st.agencyPRs.find((p) => p.id === swap.requestingPrId);
        const swapStamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const outletPendingMeta = {
          agencyName: "Atlas Agency",
          agencyNote: `Swap from ${swap.outlet} — outlet must confirm before check-in`,
          assignedAt: swapStamp,
          assignedAtMs: Date.now(),
        };
        set((cur) => {
          const replacementSession = isFreelancerPrId(swap.replacementPrId!)
            ? patchFreelancerPrSession(cur, {
                shiftAccepted: true,
                pendingApproval: false,
                acceptedShiftIndex: sourceIdx,
                checkedIn: false,
                checkedOut: false,
              })
            : patchPrSessionForRole(cur, "pr_tied", {
                shiftAccepted: true,
                pendingApproval: false,
                acceptedShiftIndex: sourceIdx,
                checkedIn: false,
                checkedOut: false,
              });
          const requestingRole = isFreelancerPrId(swap.requestingPrId) ? "pr_free" : "pr_tied";
          const requestingSession = patchPrSessionForRole(
            { ...cur, ...replacementSession },
            requestingRole,
            clearPrShiftSession(),
          );
          let agencyRoster = cur.agencyRoster.map((s) =>
            s.id === swap.rosterSlotId
              ? {
                  ...s,
                  prId: swap.replacementPrId!,
                  prName: replacement.name,
                  status:
                    s.status === "on-duty" || s.status === "en-route"
                      ? ("scheduled" as const)
                      : s.status,
                  checkedInAt: undefined,
                  floorDrinks: 0,
                  floorTips: 0,
                }
              : s,
          );
          if (swap.targetRosterSlotId) {
            agencyRoster = agencyRoster.map((s) =>
              s.id === swap.targetRosterSlotId
                ? {
                    ...s,
                    prId: swap.requestingPrId,
                    prName: swap.requestingPrName,
                    status: "outlet-pending" as const,
                    agencyAssignment: outletPendingMeta,
                  }
                : s,
            );
          } else {
            agencyRoster = ensureRosterSlot(
              agencyRoster,
              {
                prId: swap.requestingPrId,
                prName: requestingPr?.name ?? swap.requestingPrName,
                outlet: targetOutlet,
                dateIso: targetDateIso,
                shift: targetShift,
              },
              "outlet-pending",
              { agencyAssignment: outletPendingMeta },
            );
          }
          const shiftsAfterSource = cur.shifts.map((sh) => {
            if (
              shiftDateIso(sh.date) !== swap.dateIso ||
              !outletMatches(sh.outletName, swap.outlet)
            ) {
              return sh;
            }
            if (!sh.prs.includes(swap.requestingPrId)) return sh;
            return {
              ...sh,
              prs: sh.prs.map((id) => (id === swap.requestingPrId ? swap.replacementPrId! : id)),
            };
          });
          return {
            ...replacementSession,
            ...requestingSession,
            prSwapRequests: cur.prSwapRequests.map((s) => {
              if (s.id === swapId) return { ...s, status: "approved" as const };
              if (
                s.rosterSlotId === swap.rosterSlotId &&
                s.requestingPrId === swap.requestingPrId &&
                s.id !== swapId &&
                (s.status === "pending_agency" || s.status === "pending_replacement")
              ) {
                return { ...s, status: "declined" as const };
              }
              return s;
            }),
            agencyRoster,
            shifts: addPrToOutletShift(shiftsAfterSource, targetOutlet, swap.requestingPrId),
          };
        });
        get().toast(
          `Swap approved — ${targetOutlet} awaiting outlet confirmation. ${replacement.name} covers ${swap.outlet}.`,
          "success",
        );
        get().pushNotify({
          type: "swap_update",
          prId: swap.requestingPrId,
          prName: swap.requestingPrName,
          outlet: targetOutlet,
          status: "approved",
          notifyAgency: true,
        });
        get().pushNotify({
          type: "shift_assigned",
          prId: swap.replacementPrId,
          prName: replacement.name,
          outlet: swap.outlet,
        });
        get().pushNotify({
          type: "shift_assigned",
          prId: swap.requestingPrId,
          prName: swap.requestingPrName,
          outlet: targetOutlet,
        });
      },
      rejectSwapReplacement: (swapId, reason) => {
        const trimmed = reason.trim();
        if (!trimmed) {
          get().toast("Please give a reason for declining", "warn");
          return;
        }
        const st = get();
        const swap = st.prSwapRequests.find((s) => s.id === swapId);
        if (!swap || swap.status !== "pending_replacement" || !swap.replacementPrId) return;
        const prId = getPrRosterId(st.prSubRole);
        if (swap.replacementPrId !== prId) {
          get().toast("This swap offer is not assigned to you", "warn");
          return;
        }
        const replacement = st.agencyPRs.find((p) => p.id === swap.replacementPrId);
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((cur) => ({
          prSwapRequests: cur.prSwapRequests.map((s) =>
            s.id === swapId
              ? {
                  ...s,
                  status: "pending_agency" as const,
                  replacementPrId: undefined,
                  replacementPrName: undefined,
                  replacementOfferedAt: undefined,
                  replacementDeclineReason: trimmed,
                  replacementDeclinedAt: stamp,
                }
              : s,
          ),
          ...(swap.requestingPrId === TIED_DEMO_ROSTER_PR_ID
            ? patchPrSessionForRole(
                cur,
                "pr_tied",
                defaultPrShiftSessionForRole("pr_tied", {
                  agencyRoster: cur.agencyRoster,
                  prSwapRequests: cur.prSwapRequests,
                }),
              )
            : {}),
        }));
        get().toast("Declined — agency will find another replacement", "info");
        get().pushNotify({
          type: "swap_update",
          prId: swap.replacementPrId,
          prName: replacement?.name ?? "PR",
          outlet: swap.outlet,
          status: "replacement_declined",
          requestingPrName: swap.requestingPrName,
          reason: trimmed,
          notifyPr: false,
          notifyAgency: true,
        });
      },
      declinePrSwapRequest: (swapId) => {
        const swap = get().prSwapRequests.find((s) => s.id === swapId);
        set((st) => ({
          prSwapRequests: st.prSwapRequests.map((s) =>
            s.id === swapId ? { ...s, status: "declined" as const } : s,
          ),
        }));
        if (swap) {
          get().pushNotify({
            type: "swap_update",
            prId: swap.requestingPrId,
            prName: swap.requestingPrName,
            outlet: swap.outlet,
            status: "declined",
          });
        }
        get().toast("Swap request declined", "info");
      },
      demoAutoAssignPr: (dateIso) => {
        const st = get();
        const openShifts =
          buildPlanningWeekOutletShiftMap({
            weekDays: [dateIso],
            shifts: st.shifts,
            roster: st.agencyRoster,
            tiedOffers: PR_AGENCY_TIED_OFFERS,
            todayIso: DEFAULT_ROSTER_DATE_ISO,
            commissionRules: st.outletCommissionRules,
            outletWorkspace: st.outletWorkspace,
          })[dateIso] ?? [];
        const outletShift = openShifts.find((s) => s.openSlots > 0);
        if (!outletShift) {
          get().toast("No open outlet shifts on this date", "warn");
          return;
        }
        const free = getFreePrsWithDistances(
          st.agencyPRs.filter((p) => !p.suspended && !p.detached),
          st.agencyRoster,
          dateIso,
        );
        const pick = free[0];
        if (!pick) {
          get().toast("No free PRs to auto-assign", "warn");
          return;
        }
        const [y, m, d] = dateIso.split("-").map(Number);
        const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-MY", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const { shiftStart, shiftEnd } = parseShiftWindow(outletShift.shift);
        get().assignPrToOutlet({
          prId: pick.pr.id,
          outlet: outletShift.outlet,
          dateIso,
          dateLabel,
          shiftStart,
          shiftEnd,
          shift: outletShift.shift,
          outletShiftId: outletShift.id,
          event: outletShift.event,
          payEstimate: outletShift.payEstimate,
        });
        get().toast(`AI auto-assign · ${pick.pr.name} → ${outletShift.outlet}`, "success");
      },
      flagRosterAttendance: (slotId, flag) => {
        const slot = get().agencyRoster.find((s) => s.id === slotId);
        if (!slot) return;
        const togglingOff =
          (flag === "late" && slot.lateFlag) || (flag === "no-show" && slot.noShowFlag);
        set((st) => ({
          agencyRoster: st.agencyRoster.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  lateFlag: flag === "late" ? !s.lateFlag : s.lateFlag,
                  noShowFlag: flag === "no-show" ? !s.noShowFlag : s.noShowFlag,
                }
              : s,
          ),
        }));
        if (togglingOff) {
          get().toast(flag === "late" ? "Late flag removed" : "No-show flag removed", "info");
        } else {
          get().toast(flag === "late" ? "Late flag (+15 min)" : "No-show flag (+30 min)", "warn");
        }
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
              variance:
                st.agencyReconciliation.outletSalesTotal -
                (st.agencyReconciliation.pvTotal + varianceDelta),
              agencyConfirmed: false,
            },
          };
        });
        get().toast("Reconciliation adjusted — re-confirm required", "info");
      },

      agencyPRs: demoSnapshot.agencyPRs,
      specialServiceOrders: SEED_SPECIAL_SERVICES.map((r) => ({ ...r })),
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
        const tiedSince = pr.tiedSince
          ? new Date(pr.tiedSince).getTime()
          : Date.now() - 400 * 86400000;
        if (Date.now() - tiedSince < 365 * 86400000) {
          get().toast("Tied < 1 year — use Request admin detach", "warn");
          return;
        }
        set((st) => ({
          agencyPRs: st.agencyPRs.map((p) =>
            p.id === prId ? { ...p, detached: true, suspended: true } : p,
          ),
        }));
        get().toast(`${pr.name} detached from agency roster`, "info");
      },
      requestAgencyPrDetach: (prId) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        get().toast(`Detach request sent for ${pr.name} — InnocenZ admin will review`, "info");
      },
      broadcastAgencyPr: (prIds, payload) => {
        if (prIds.length === 0) return;
        const names = get()
          .agencyPRs.filter((p) => prIds.includes(p.id))
          .map((p) => p.name)
          .join(", ");
        const verb = payload.kind === "shift" ? "Shift offer" : "Message";
        const stamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => ({
          prNotifications: [
            ...prIds.map((id, i) => ({
              id: `n-bcast-${Date.now()}-${i}-${id}`,
              kind: (payload.kind === "shift"
                ? "assignment"
                : "application") as PrNotification["kind"],
              title: payload.title,
              body: payload.body,
              at: stamp,
              read: false,
              href: "/host",
              prId: id,
            })),
            ...st.prNotifications,
          ],
        }));
        get().toast(
          `${verb} broadcast to ${prIds.length} PR${prIds.length !== 1 ? "s" : ""}: ${names}`,
          "success",
        );
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
      updateAgencyPrProfile: (prId, patch) => {
        const pr = get().agencyPRs.find((p) => p.id === prId);
        if (!pr) return;
        const myPrId = getPrRosterId(get().prSubRole);
        const syncPortal =
          prId === myPrId
            ? {
                ...(patch.name?.trim() ? { prDisplayName: patch.name.trim() } : {}),
                ...(patch.email?.trim() ? { prEmail: patch.email.trim() } : {}),
              }
            : {};
        set((st) => ({
          ...syncPortal,
          agencyPRs: st.agencyPRs.map((p) => (p.id === prId ? { ...p, ...patch } : p)),
          agencyRoster:
            patch.name && patch.name !== pr.name
              ? st.agencyRoster.map((slot) =>
                  slot.prId === prId ? { ...slot, prName: patch.name! } : slot,
                )
              : st.agencyRoster,
        }));
        get().toast(`${patch.name ?? pr.name} profile updated`, "success");
      },

      submitSpecialServiceOrder: (input) => {
        const st = get();
        const id = `SS-2026-${String(st.specialServiceOrders.length + 18).padStart(3, "0")}`;
        const order = buildSpecialServiceOrder(input, id);
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        set({ specialServiceOrders: [order, ...st.specialServiceOrders] });

        if (input.initiatedBy === "agency") {
          get().pushNotify({
            type: "special_service_requested",
            orderId: id,
            serviceLabel,
            initiatedBy: "agency",
            prId: order.prId,
            prName: order.prName,
            outlet: order.outlet,
            notifyPr: order.prAcceptance === "pending",
            notifyOutlet: order.outletAcceptance === "pending",
          });
          get().toast(`${serviceLabel} booked — awaiting confirmation`, "info");
        } else {
          get().pushNotify({
            type: "special_service_requested",
            orderId: id,
            serviceLabel,
            initiatedBy: input.initiatedBy,
            prId: order.prId,
            prName: order.prName,
            outlet: order.outlet,
            notifyAgency: true,
          });
          get().toast(`${serviceLabel} submitted — agency will review`, "info");
        }
        return id;
      },

      approveSpecialServiceByAgency: (orderId) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.agencyAccepted !== "pending") return;
        const order = approveSpecialServiceByAgency(current);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        const isConfirmed = order.status === "confirmed";

        if (order.prAcceptance === "pending") {
          get().pushNotify({
            type: "special_service_requested",
            orderId,
            serviceLabel,
            initiatedBy: order.initiatedBy,
            prId: order.prId,
            prName: order.prName,
            outlet: order.outlet,
            notifyPr: true,
          });
        }

        if (isConfirmed) {
          get().pushNotify({
            type: "special_service_update",
            orderId,
            serviceLabel,
            status: "confirmed",
            prId: order.prId,
            prName: order.prName,
            outlet: order.outlet,
            by: "agency",
            notifyPr: order.initiatedBy === "pr",
            notifyOutlet: order.initiatedBy === "outlet",
          });
        }

        get().toast(
          order.prAcceptance === "pending"
            ? `${serviceLabel} approved — awaiting PR`
            : isConfirmed
              ? `${serviceLabel} confirmed`
              : `${serviceLabel} approved — awaiting acceptance`,
          "success",
        );
      },

      declineSpecialServiceByAgency: (orderId, reason) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.agencyAccepted !== "pending") return;
        const order = declineSpecialServiceByAgency(current, reason);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        get().pushNotify({
          type: "special_service_update",
          orderId,
          serviceLabel,
          status: "declined",
          prId: order.prId,
          prName: order.prName,
          outlet: order.outlet,
          by: "agency",
          notifyPr: order.initiatedBy === "pr",
          notifyOutlet: order.initiatedBy === "outlet",
        });
        get().toast("Job posting request declined", "warn");
      },

      acceptSpecialServiceByPr: (orderId) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.prAcceptance !== "pending") return;
        const order = acceptSpecialServiceByPr(current);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        get().pushNotify({
          type: "special_service_update",
          orderId,
          serviceLabel,
          status: order.status === "confirmed" ? "confirmed" : "accepted",
          prId: order.prId,
          prName: order.prName,
          outlet: order.outlet,
          by: "pr",
          notifyAgency: true,
          notifyOutlet: order.initiatedBy === "outlet" || order.initiatedBy === "agency",
        });
        get().toast(
          order.status === "confirmed" ? `${serviceLabel} confirmed` : "Accepted — awaiting outlet",
          "success",
        );
      },

      declineSpecialServiceByPr: (orderId, reason) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.prAcceptance !== "pending") return;
        const order = declineSpecialServiceByPr(current, reason);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        get().pushNotify({
          type: "special_service_update",
          orderId,
          serviceLabel,
          status: "declined",
          prId: order.prId,
          prName: order.prName,
          outlet: order.outlet,
          by: "pr",
          notifyAgency: true,
          notifyOutlet: order.initiatedBy === "outlet" || order.initiatedBy === "agency",
        });
        get().toast("Service declined", "warn");
      },

      acceptSpecialServiceByOutlet: (orderId) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.outletAcceptance !== "pending") return;
        const order = acceptSpecialServiceByOutlet(current);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        get().pushNotify({
          type: "special_service_update",
          orderId,
          serviceLabel,
          status: order.status === "confirmed" ? "confirmed" : "accepted",
          prId: order.prId,
          prName: order.prName,
          outlet: order.outlet,
          by: "outlet",
          notifyAgency: true,
          notifyPr: order.prAcceptance === "pending",
        });
        get().toast(
          order.status === "confirmed" ? `${serviceLabel} confirmed` : "Accepted — awaiting PR",
          "success",
        );
      },

      declineSpecialServiceByOutlet: (orderId, reason) => {
        const st = get();
        const current = st.specialServiceOrders.find((r) => r.id === orderId);
        if (!current || current.outletAcceptance !== "pending") return;
        const order = declineSpecialServiceByOutlet(current, reason);
        set({
          specialServiceOrders: st.specialServiceOrders.map((r) => (r.id === orderId ? order : r)),
        });
        const serviceLabel = specialServiceTypeLabel(order.serviceType);
        get().pushNotify({
          type: "special_service_update",
          orderId,
          serviceLabel,
          status: "declined",
          prId: order.prId,
          prName: order.prName,
          outlet: order.outlet,
          by: "outlet",
          notifyAgency: true,
          notifyPr: order.initiatedBy === "agency",
        });
        get().toast("Service declined", "warn");
      },

      saveOutletCommissionRule: (outlet, patch) => {
        set((st) => {
          const nextRules = st.outletCommissionRules.map((r) =>
            r.outlet === outlet ? { ...r, ...patch } : r,
          );
          return {
            outletCommissionRules: nextRules,
            outletWorkspace: syncWorkspaceFromCommissionRules(st.outletWorkspace, nextRules),
          };
        });
        get().toast(`Commission rules updated for ${outlet} · outlet workspace synced`, "success");
      },
      saveScalingMultipliers: (multipliers) => {
        set({ scalingTierMultipliers: multipliers });
        get().toast("Scaling tier multipliers saved", "success");
      },
      inviteFinanceHead: (email) => {
        if (!email.trim()) return;
        set((st) => ({
          agencyFinanceHead: {
            ...st.agencyFinanceHead,
            email: email.trim(),
            eSignatureStored: false,
          },
        }));
        get().toast(
          `Invite sent to ${email} — Finance Head must complete IC + e-signature`,
          "info",
        );
      },
      shiftHistory: demoSnapshot.shiftHistory,

      prs: demoSnapshot.prs,
      shifts: demoSnapshot.shifts,
      outletPnl: demoSnapshot.outletPnl,
      outletPnlSyncAt: demoSnapshot.outletPnlSyncAt,
      outletMoneyEditCount: demoSnapshot.outletMoneyEditCount,
      updateOutletShiftMoney: (shiftId, patch) => {
        const st = get();
        const menu = st.outletWorkspace.drinkMenu ?? DEFAULT_OUTLET_DRINK_MENU;
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const merged = withShiftFinancialDefaults({ ...sh, ...patch }, menu);
          return { ...merged, liveSales: computeShiftLiveSales(merged, menu) };
        });
        const sync = applyOutletFinancialSync(
          nextShifts,
          st.outletMoneyEditCount + 1,
          Date.now(),
          st.agencyRoster,
          st.agencyReconciliation,
          menu,
          st.outletCommissionRules,
        );
        set(sync);
        get().toast("Synced to Atlas Agency · PNL & PR commission updated", "success");
      },
      adjustOutletShiftUnits: (shiftId, kind, delta) => {
        const st = get();
        const menu = st.outletWorkspace.drinkMenu ?? DEFAULT_OUTLET_DRINK_MENU;
        const shift = st.shifts.find((sh) => sh.id === shiftId);
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const drinkUnits =
            kind === "drink" ? Math.max(0, (sh.drinkUnits ?? 0) + delta) : (sh.drinkUnits ?? 0);
          const tableUnits =
            kind === "table" ? Math.max(0, (sh.tableUnits ?? 0) + delta) : (sh.tableUnits ?? 0);
          const merged = withShiftFinancialDefaults({ ...sh, drinkUnits, tableUnits }, menu);
          return { ...merged, liveSales: computeShiftLiveSales(merged, menu) };
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
          menu,
          st.outletCommissionRules,
        );
        set({ ...sync, agencyRoster: nextRoster });
        get().toast("Live sales updated · agency payroll view synced", "info");
      },
      adjustOutletDrinkSale: (shiftId, drinkId, delta) => {
        const st = get();
        const menu = st.outletWorkspace.drinkMenu ?? DEFAULT_OUTLET_DRINK_MENU;
        const drink = menu.find((d) => d.id === drinkId);
        if (!drink) return;
        const shift = st.shifts.find((sh) => sh.id === shiftId);
        const nextShifts = st.shifts.map((sh) => {
          if (sh.id !== shiftId) return sh;
          const hadPerDrinkCounts = Boolean(
            sh.drinkUnitCounts && Object.keys(sh.drinkUnitCounts).length > 0,
          );
          const counts = { ...(sh.drinkUnitCounts ?? {}) };
          const nextQty = Math.max(0, (counts[drinkId] ?? 0) + delta);
          if (nextQty === 0) delete counts[drinkId];
          else counts[drinkId] = nextQty;
          let legacyDrinkSalesRm = sh.legacyDrinkSalesRm;
          if (!hadPerDrinkCounts && delta > 0) {
            legacyDrinkSalesRm = computeDrinkSales(
              { drinkUnits: sh.drinkUnits, perDrinkRm: sh.perDrinkRm },
              [],
            );
          }
          const drinkUnits = Object.values(counts).reduce((sum, qty) => sum + qty, 0);
          const merged = withShiftFinancialDefaults(
            { ...sh, drinkUnitCounts: counts, drinkUnits, legacyDrinkSalesRm },
            menu,
          );
          return { ...merged, liveSales: computeShiftLiveSales(merged, menu) };
        });
        const nextRoster =
          shift && delta > 0
            ? st.agencyRoster.map((slot) => {
                if (slot.status !== "on-duty" || !outletMatches(slot.outlet, shift.outletName)) {
                  return slot;
                }
                return { ...slot, floorDrinks: (slot.floorDrinks ?? 0) + delta };
              })
            : st.agencyRoster;
        const sync = applyOutletFinancialSync(
          nextShifts,
          st.outletMoneyEditCount + 1,
          Date.now(),
          nextRoster,
          st.agencyReconciliation,
          menu,
          st.outletCommissionRules,
        );
        set({ ...sync, agencyRoster: nextRoster });
        const label = delta > 0 ? `+1 ${drink.name}` : `-1 ${drink.name}`;
        get().toast(`${label} · RM ${drink.priceRm}`, "info");
      },
      bookings: demoSnapshot.bookings,
      pvs: demoSnapshot.pvs,
      walletBalance: demoSnapshot.walletBalance,
      ratings: demoSnapshot.ratings,
      outletWorkspace: demoSnapshot.outletWorkspace,
      outletSettings: demoSnapshot.outletSettings,
      outletOwner: demoSnapshot.outletOwner,
      outletFinanceHead: demoSnapshot.outletFinanceHead,
      outletOpsHead: demoSnapshot.outletOpsHead,
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
            pendingPRs: st.pendingPRs.map((p) =>
              p.id === id ? { ...p, status: "approved" as const } : p,
            ),
            agencyPRs: nextAgencyPRs,
            prs: marketplacePrsFromAgency(nextAgencyPRs),
          };
        });
        get().toast(`${pending.name} approved — added to roster & marketplace`, "success");
      },
      rejectPendingPR: (id, reason) => {
        set((st) => ({
          pendingPRs: st.pendingPRs.map((p) =>
            p.id === id
              ? { ...p, status: "rejected", rejectReason: reason ?? "Did not meet agency criteria" }
              : p,
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
            req.prId === FREELANCER_DEMO_PR_ID &&
            !st.prFreelancerPayrollLinks.includes(req.agencyId)
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
          const tierRates = s.tierRates ?? cloneTierRates(ws.tierRates);
          const tierIPay = tierRates["Tier I"].wagePerHour;
          return withShiftFinancialDefaults({
            ...s,
            id: "s" + Math.random().toString(36).slice(2, 7),
            status: "open",
            filled: prs.length,
            prs,
            payPerHour: tierIPay,
            tierRates,
            estimatedCost:
              s.estimatedCost ??
              estimateShiftLaborCost({
                tierRates,
                hours,
                quantity: Math.max(prs.length, s.quantity),
                prIds: prs,
                prTierById: Object.fromEntries(
                  st.agencyPRs.map((p) => [p.id, p.trainingLevel]),
                ),
              }),
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
          const next = normalizeOutletWorkspace({ ...st.outletWorkspace, ...patch });
          if (patch.drinkMenu) {
            next.perDrinkRm = averageDrinkPrice(next.drinkMenu);
          }
          const menu = next.drinkMenu;
          const nextRules = syncCommissionRulesFromWorkspace(next, st.outletCommissionRules);
          const nextShifts = st.shifts.map((sh) => {
            if (!outletMatches(sh.outletName, next.outletName)) return sh;
            const merged = withShiftFinancialDefaults(
              {
                ...sh,
                perDrinkRm: next.perDrinkRm,
                perTableRm: next.perTableRm,
              },
              menu,
            );
            return { ...merged, liveSales: computeShiftLiveSales(merged, menu) };
          });
          const outletPnl = recomputeAllOutletPnl(
            nextShifts,
            undefined,
            st.agencyRoster,
            menu,
            nextRules,
          );
          const reconciliation = buildReconciliationFromLedger(st, {
            prPaymentVouchers: st.prPaymentVouchers,
          });
          const sync = applyOutletFinancialSync(
            nextShifts,
            st.outletMoneyEditCount,
            Date.now(),
            st.agencyRoster,
            reconciliation,
            menu,
            nextRules,
          );
          return { outletWorkspace: next, outletCommissionRules: nextRules, ...sync };
        });
        get().toast("Workspace saved · synced to agency commission & PNL", "success");
      },
      saveOutletSettings: (patch) => {
        set((st) => ({ outletSettings: { ...st.outletSettings, ...patch } }));
        get().toast("Settings saved", "success");
      },
      saveOutletOwner: (patch) => {
        set((st) => ({ outletOwner: { ...st.outletOwner, ...patch } }));
      },
      saveOutletProfileSettings: (data) => {
        const orgName = data.owner.orgName.trim();
        set({
          outletOwner: {
            ...data.owner,
            ownerName: data.owner.ownerName.trim(),
            orgName,
          },
          outletFinanceHead: { ...data.financeHead },
          outletOpsHead: { ...data.opsHead },
          outletSettings: {
            ...get().outletSettings,
            venueName: orgName,
            location: data.location.trim(),
          },
          outletWorkspace: {
            ...get().outletWorkspace,
            outletName: orgName,
          },
        });
        get().toast("Outlet settings saved", "success");
      },
      sendOutletOtp: () => {
        const ch = get().outletOwner.otpChannel;
        get().toast(`OTP sent to your ${ch === "email" ? "email" : "mobile"}`, "info");
      },
      verifyOutletOtp: (code) => {
        if (code === "123456" || code.length === 6) {
          set((st) => ({ outletOwner: { ...st.outletOwner, accountActivated: true } }));
          get().toast("Account activated ✓", "success");
          return true;
        }
        get().toast("Invalid OTP — try 123456 for demo", "warn");
        return false;
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
        const isFreelancerApplicant = app.prId === FREELANCER_DEMO_PR_ID;
        set((cur) => {
          const marketplaceApp = cur.prMarketplaceApplication;
          const syncMarketplace =
            isFreelancerApplicant &&
            marketplaceApp?.status === "pending" &&
            (!marketplaceApp.applicantId || marketplaceApp.applicantId === applicantId)
              ? {
                  ...marketplaceApp,
                  status: accept ? ("accepted" as const) : ("declined" as const),
                }
              : marketplaceApp;
          const agencyPr = cur.agencyPRs.find((p) => p.id === app.prId);
          const rosterSeed = {
            prId: app.prId,
            prName: agencyPr?.name ?? app.prName,
            outlet: shift.outletName,
            dateIso: shiftDateIso(shift.date),
            shift: shift.shift,
          };
          return {
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
            agencyRoster: accept
              ? ensureRosterSlot(cur.agencyRoster, rosterSeed, "scheduled")
              : cur.agencyRoster,
            prMarketplaceApplication: syncMarketplace,
            ...(accept && isFreelancerApplicant
              ? patchFreelancerPrSession(cur, {
                  shiftAccepted: true,
                  pendingApproval: false,
                  acceptedShiftIndex: shiftIndexForOutlet(shift.outletName),
                })
              : {}),
          };
        });
        get().toast(
          accept ? `${app.prName} added to shift` : `Declined ${app.prName}`,
          accept ? "success" : "info",
        );
        if (accept && shift) {
          get().pushNotify({
            type: "shift_assigned",
            prId: app.prId,
            prName: app.prName,
            outlet: shift.outletName,
          });
        }
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
      syncLivePrCheckInToRoster: () => {
        const st = get();
        const attendance = resolveTiedPrAttendance(st);
        if (attendance) {
          const checkInTime =
            attendance.session.timeIn.match(/\d{1,2}:\d{2}/)?.[0] ??
            new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
          const next = rosterCheckIn(
            st.agencyRoster,
            attendance.prId,
            attendance.session.outlet,
            checkInTime,
            {
              prName: attendance.prName,
              dateIso: DEFAULT_ROSTER_DATE_ISO,
              shift: attendance.session.shiftTime,
            },
          );
          const match = (roster: typeof next) =>
            roster.find(
              (s) =>
                s.prId === attendance.prId &&
                s.dateIso === DEFAULT_ROSTER_DATE_ISO &&
                outletMatches(s.outlet, attendance.session.outlet),
            );
          const before = match(st.agencyRoster);
          const after = match(next);
          if (after?.status !== before?.status || after?.checkedInAt !== before?.checkedInAt) {
            set({ agencyRoster: next });
          }
          return;
        }

        const offer = activePrShiftOffer(st);
        const outlet = st.prActiveShift?.outlet ?? offer.outlet;
        const prId = getPrRosterId(st.prSubRole);
        let changed = false;
        const next = st.agencyRoster.map((s) => {
          if (
            s.prId === prId &&
            s.dateIso === DEFAULT_ROSTER_DATE_ISO &&
            outletMatches(s.outlet, outlet) &&
            s.status === "on-duty" &&
            !st.checkedIn
          ) {
            changed = true;
            return {
              ...s,
              status: "scheduled" as const,
              checkedInAt: undefined,
              floorDrinks: 0,
              floorTips: 0,
            };
          }
          return s;
        });
        if (changed) set({ agencyRoster: next });
      },
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
        const shift = get().shifts.find((sh) => sh.id === shiftId);
        set((st) => ({
          shifts: st.shifts.map((sh) => (sh.id === shiftId ? { ...sh, status: "confirmed" } : sh)),
        }));
        if (shift) {
          shift.prs.forEach((prId) => {
            const pr = get().agencyPRs.find((p) => p.id === prId);
            get().pushNotify({
              type: "shift_assigned",
              prId,
              prName: pr?.name ?? prId,
              outlet: shift.outletName,
            });
          });
        }
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
          const payout =
            Math.round((shift.estimatedCost / Math.max(shift.prs.length, 1)) * 100) / 100;
          return buildShiftHistoryRow({
            prId,
            prName: pr?.name ?? prId,
            outlet: shift.outletName,
            dateIso,
            dateDisplay,
            totalPayout: payout,
            totalDrinks: Math.round((shift.drinkUnits ?? 0) / Math.max(shift.prs.length, 1)),
            totalTips: Math.round(((shift.tableUnits ?? 0) * 20) / Math.max(shift.prs.length, 1)),
            totalTables: Math.round((shift.tableUnits ?? 0) / Math.max(shift.prs.length, 1)),
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
        shift.prs.forEach((pid) => {
          const pr = st.agencyPRs.find((p) => p.id === pid);
          get().pushNotify({
            type: "rating_prompt",
            prId: pid,
            prName: pr?.name ?? pid,
            outlet: shift.outletName,
            audience: "outlet",
          });
        });
        const recon = get().agencyReconciliation;
        if (isWeeklyReconciliationSunday() && !recon.outletConfirmed) {
          get().pushNotify({ type: "reconciliation_due", outlet: shift.outletName });
        }
        get().toast("Shift sealed · rate PRs within 24h · PVs synced", "success");
      },

      acceptBooking: (id) => {
        set((st) => ({
          bookings: st.bookings.map((b) => (b.id === id ? { ...b, status: "accepted" } : b)),
        }));
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
          pvs: st.pvs.map((p) => (p.id === id ? { ...p, status: "signed" } : p)),
          walletBalance: st.walletBalance + total,
        }));
        get().toast(`PV signed · RM ${total} credited to wallet`, "success");
      },
      disputePv: (id, reason) => {
        set((st) => ({ pvs: st.pvs.map((p) => (p.id === id ? { ...p, status: "disputed" } : p)) }));
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
        const outletName = get().outletWorkspace.outletName || "Velvet 23";
        const lowShift = stars < RATING_SUSPEND_SHIFT_THRESHOLD;
        const stamp = new Date().toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const notifyStamp = new Date().toLocaleString("en-MY", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        set((st) => {
          const prompt = st.postSealRatePrompt;
          const nextPrompt =
            prompt && prompt.prIds.includes(prId)
              ? {
                  ...prompt,
                  prIds: prompt.prIds.filter((id) => id !== prId),
                }
              : prompt;
          const agencyPr = st.agencyPRs.find((p) => p.id === prId);
          const nextConsecutive = lowShift ? (agencyPr?.consecutiveLowRatings ?? 0) + 1 : 0;
          const nextRating = agencyPr
            ? Math.round(((agencyPr.rating * 9 + stars) / 10) * 10) / 10
            : stars;
          const suspendStreak = nextConsecutive >= CONSECUTIVE_LOW_SUSPEND_COUNT;
          const nextAgencyPRs = st.agencyPRs.map((p) =>
            p.id === prId
              ? {
                  ...p,
                  rating: nextRating,
                  consecutiveLowRatings: nextConsecutive,
                  suspended: suspendStreak ? true : p.suspended,
                }
              : p,
          );
          const syncDemoPr = prId === FREELANCER_DEMO_PR_ID || prId === getPrRosterId("pr_tied");
          const pendingRating: PrPendingRating = {
            id: "pr-rate-" + Date.now().toString(36),
            outlet: outletName,
            shiftDate: stamp,
            expiresAt: Date.now() + 18 * 60 * 60 * 1000,
          };
          return {
            ratings: [
              {
                id: "r" + Date.now(),
                pr: pr.name,
                stars,
                note,
                tags,
                date: stamp,
              },
              ...st.ratings,
            ],
            postSealRatePrompt: nextPrompt && nextPrompt.prIds.length > 0 ? nextPrompt : null,
            agencyPRs: nextAgencyPRs,
            prs: marketplacePrsFromAgency(nextAgencyPRs),
            prFreelancerLowRatingStrikes:
              prId === FREELANCER_DEMO_PR_ID && lowShift
                ? st.prFreelancerLowRatingStrikes + 1
                : st.prFreelancerLowRatingStrikes,
            prPendingRatings: syncDemoPr
              ? [pendingRating, ...st.prPendingRatings.filter((p) => p.outlet !== outletName)]
              : st.prPendingRatings,
            prNotifications: syncDemoPr
              ? [
                  {
                    id: "n-rate-" + Date.now().toString(36),
                    kind: "rating" as const,
                    title: `Rate ${outletName}`,
                    body: `You received ${stars}★ — mutual rating window open (18h).`,
                    at: notifyStamp,
                    read: false,
                    href: "/host/profile",
                    prId,
                  },
                  ...st.prNotifications,
                ]
              : st.prNotifications,
            prRatingHistory: syncDemoPr
              ? [
                  {
                    id: "rh-out-" + Date.now().toString(36),
                    outlet: outletName,
                    stars,
                    direction: "outlet_rates_pr" as const,
                    date: stamp,
                  },
                  ...st.prRatingHistory,
                ]
              : st.prRatingHistory,
          };
        });
        get().toast("Rating submitted · PR notified to rate your outlet too", "success");
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
      onRehydrateStorage: () => (state) => {
        if (!state?.prSubRole) return;
        writePersistedPrSubRole(state.prSubRole);
        const role = state.prSubRole;
        const cached = state.prSessionByRole?.[role];
        const session =
          cached ??
          defaultPrShiftSessionForRole(role, {
            agencyRoster: state.agencyRoster ?? [],
            prSwapRequests: state.prSwapRequests ?? [],
          });
        Object.assign(state, applyPrShiftSession(session));
      },
      partialize: (s) => {
        const role = s.prSubRole;
        const prSessionByRole = role
          ? { ...s.prSessionByRole, [role]: extractPrShiftSession(s) }
          : s.prSessionByRole;
        return {
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
          prSessionByRole,
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
          prEmail: s.prEmail,
          prAvatarPhoto: s.prAvatarPhoto,
          prPayrollAgencyId: s.prPayrollAgencyId,
          prNotifications: s.prNotifications,
          opsNotifications: s.opsNotifications,
          sosIncidents: s.sosIncidents,
          notificationPrefs: s.notificationPrefs,
          prDeclinedOfferIds: s.prDeclinedOfferIds,
          prMarketplaceApplication: s.prMarketplaceApplication,
          prUpcomingShifts: s.prUpcomingShifts,
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
          specialServiceOrders: s.specialServiceOrders,
          outletCommissionRules: s.outletCommissionRules,
          scalingTierMultipliers: s.scalingTierMultipliers,
          shiftHistory: s.shiftHistory,
          outletWorkspace: s.outletWorkspace,
          outletSettings: s.outletSettings,
          outletOwner: s.outletOwner,
          outletFinanceHead: s.outletFinanceHead,
          outletOpsHead: s.outletOpsHead,
          shiftApplicants: s.shiftApplicants,
          paymentCardLast4: s.paymentCardLast4,
          postSealRatePrompt: s.postSealRatePrompt,
        };
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        const seedById = Object.fromEntries(LIVE_SEED_PR_PVS.map((s) => [s.id, s]));
        const persistedPvs = p?.prPaymentVouchers ?? [];
        const mergedFromPersisted =
          persistedPvs.length > 0
            ? persistedPvs.map((pv) => {
                const seed = seedById[pv.id];
                if (!seed) {
                  const prName = pv.prName === "Luna" ? "Vicky" : pv.prName;
                  if (pv.financeHeadName === LEGACY_FINANCE_HEAD_SIGNER) {
                    return {
                      ...pv,
                      prName,
                      ...financeHeadStampFromProfile(DEFAULT_FINANCE_HEAD, pv.financeHeadSignedAt),
                    };
                  }
                  if (!pv.financeHeadSignatureDataUrl && pv.financeHeadName) {
                    const stamp = financeHeadStampFromProfile(
                      { ...DEFAULT_FINANCE_HEAD, name: pv.financeHeadName },
                      pv.financeHeadSignedAt,
                    );
                    return {
                      ...pv,
                      prName,
                      financeHeadSignatureDataUrl: stamp.financeHeadSignatureDataUrl,
                    };
                  }
                  if (
                    !pv.prSignatureDataUrl &&
                    (pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED") &&
                    prName
                  ) {
                    return { ...pv, prName, prSignatureDataUrl: buildDemoESignatureDataUrl(prName) };
                  }
                  return { ...pv, prName };
                }
                return {
                  ...seed,
                  ...pv,
                  prName: seed.prName,
                  prIc: seed.prIc,
                  status:
                    seed.status === "PAID" || seed.status === "SIGNED"
                      ? seed.status
                      : (pv.status ?? seed.status),
                  issued: seed.weekStartIso ? seed.issued : (pv.issued ?? seed.issued),
                  due: pv.due ?? seed.due,
                  cycle: seed.weekStartIso ? seed.cycle : (pv.cycle ?? seed.cycle),
                  weekStartIso: seed.weekStartIso ?? pv.weekStartIso,
                  weekEndIso: seed.weekEndIso ?? pv.weekEndIso,
                  outlet: seed.weekStartIso ? seed.outlet : (pv.outlet ?? seed.outlet),
                  financeHeadName:
                    pv.financeHeadName === LEGACY_FINANCE_HEAD_SIGNER
                      ? seed.financeHeadName
                      : (pv.financeHeadName ?? seed.financeHeadName),
                  financeHeadSignedAt: pv.financeHeadSignedAt ?? seed.financeHeadSignedAt,
                  financeHeadSignatureDataUrl:
                    pv.financeHeadSignatureDataUrl ?? seed.financeHeadSignatureDataUrl,
                  prSignatureDataUrl:
                    pv.prSignatureDataUrl ??
                    seed.prSignatureDataUrl ??
                    (pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED"
                      ? buildDemoESignatureDataUrl(pv.prName ?? seed.prName)
                      : undefined),
                  prDisputeReason: pv.prDisputeReason ?? seed.prDisputeReason,
                  disputedAt: pv.disputedAt ?? seed.disputedAt,
                  disputeUpdatedAt: pv.disputeUpdatedAt ?? seed.disputeUpdatedAt,
                  disputeNote: pv.disputeNote ?? seed.disputeNote,
                  shiftSessionId: seed.weekStartIso
                    ? seed.shiftSessionId
                    : (pv.shiftSessionId ?? seed.shiftSessionId),
                  timeIn: seed.weekStartIso ? undefined : (pv.timeIn ?? seed.timeIn),
                  timeOut: seed.weekStartIso ? undefined : (pv.timeOut ?? seed.timeOut),
                  shiftTime: seed.weekStartIso ? undefined : (pv.shiftTime ?? seed.shiftTime),
                  receiptIds: pv.receiptIds?.length ? pv.receiptIds : seed.receiptIds,
                  rows: seed.weekStartIso
                    ? seed.rows
                    : pv.rows?.length
                      ? pv.rows.map((row, idx) => ({
                          ...seed.rows[idx],
                          ...row,
                          receiptIds: row.receiptIds ?? seed.rows[idx]?.receiptIds,
                        }))
                      : seed.rows,
                };
              })
            : [];
        const persistedIds = new Set(mergedFromPersisted.map((pv) => pv.id));
        const missingSeedPvs = LIVE_SEED_PR_PVS.filter((s) => !persistedIds.has(s.id));
        const mergedPvsBase = remapSeedPaymentVouchers(
          persistedPvs.length > 0
            ? [...mergedFromPersisted, ...missingSeedPvs]
            : LIVE_SEED_PR_PVS,
        );
        const seedScanById = Object.fromEntries(LIVE_SEED_RECEIPT_SCANS.map((s) => [s.id, s]));
        const persistedScans = p?.prReceiptScans ?? [];
        const userScans = persistedScans
          .filter((s) => !seedScanById[s.id])
          .map((s) => ({
            ...s,
            receiptRef: s.receiptRef ?? `LEGACY-${s.id}`,
          }));
        const mergedScansBase = [
          ...userScans,
          ...LIVE_SEED_RECEIPT_SCANS.map((seed) => {
            const saved = persistedScans.find((s) => s.id === seed.id);
            return remapSeedReceiptScan(
              saved
                ? {
                    ...seed,
                    ...saved,
                    receiptRef: saved.receiptRef ?? seed.receiptRef,
                    prId: saved.prId ?? seed.prId,
                  }
                : seed,
            );
          }),
        ].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
        const persistedShiftRows = migrateShiftHistoryPrNames(
          (p?.shiftHistory ?? []).map((row) => {
            const dateIso = migrateDemoDateIso(row.dateIso);
            return dateIso === row.dateIso
              ? row
              : { ...row, dateIso, dateDisplay: fmtDateLabelFromIso(dateIso) };
          }),
          current.shiftHistory,
        );
        const mergedShiftHistory = prepareShiftHistoryForDisplay(
          migrateShiftHistoryPrNames(
            mergeShiftHistory(persistedShiftRows, current.shiftHistory),
            current.shiftHistory,
          ),
        );
        const demoLedger = mergeHistoryDemoLedger({
          shiftHistory: mergedShiftHistory,
          scans: mergedScansBase,
          pvs: mergedPvsBase,
          profile: getPrProfile("pr_tied"),
        });
        const mergedPvs = demoLedger.pvs;
        const mergedScans = demoLedger.scans;
        const portalForAgencySync = {
          prDisplayName:
            p?.prDisplayName === "Luna" ? null : (p?.prDisplayName ?? current.prDisplayName),
          prEmail: (() => {
            const raw = p?.prEmail ?? current.prEmail;
            if (!raw || raw.toLowerCase() === "luna@inz.my") return null;
            return raw;
          })(),
          prAvatarPhoto: migratePrPortfolioAssetPath(p?.prAvatarPhoto ?? current.prAvatarPhoto),
          prComcard: {
            ...(p?.prComcard ?? current.prComcard),
            imageUrl:
              migratePrPortfolioAssetPath(
                p?.prComcard?.imageUrl ?? current.prComcard.imageUrl,
              ) ?? undefined,
          },
          prPortfolio: (p?.prPortfolio?.some(Boolean)
            ? (p!.prPortfolio as (string | null)[])
            : current.prPortfolio
          ).map((slot) => migratePrPortfolioAssetPath(slot)),
          prLanguages: p?.prLanguages?.length ? p.prLanguages : current.prLanguages,
        };
        const seedAgencyById = Object.fromEntries(demoSnapshot.agencyPRs.map((s) => [s.id, s]));
        const mergedAgencyPRs = normalizeAgencyPrs(
          p?.agencyPRs?.length ? p.agencyPRs : current.agencyPRs,
        ).map((pr) => {
          let next = syncAgencyPrFromPrPortal(pr, TIED_DEMO_ROSTER_PR_ID, portalForAgencySync);
          const seed = seedAgencyById[pr.id];
          if (seed && pr.id === TIED_DEMO_ROSTER_PR_ID) {
            next = {
              ...next,
              name: next.name === "Luna" ? seed.name : next.name,
              email:
                !next.email || next.email.toLowerCase() === "luna@inz.my" ? seed.email : next.email,
              avatarPhoto:
                migratePrPortfolioAssetPath(next.avatarPhoto ?? seed.avatarPhoto ?? null) ??
                seed.avatarPhoto ??
                null,
              comcardImageUrl:
                migratePrPortfolioAssetPath(next.comcardImageUrl ?? seed.comcardImageUrl) ??
                seed.comcardImageUrl,
              portfolioPhotos: (next.portfolioPhotos?.some(Boolean)
                ? next.portfolioPhotos
                : seed.portfolioPhotos
              )?.map((photo) => migratePrPortfolioAssetPath(photo) ?? photo),
            };
          }
          return next;
        });
        const merged = {
          ...current,
          ...p,
          prPaymentVouchers: mergedPvs,
          prPortfolio: (p?.prPortfolio?.some(Boolean)
            ? [
                ...p.prPortfolio,
                ...Array(Math.max(0, PORTFOLIO_SLOT_COUNT - p.prPortfolio.length)).fill(null),
              ].slice(0, PORTFOLIO_SLOT_COUNT)
            : current.prPortfolio
          ).map((slot) => migratePrPortfolioAssetPath(slot)),
          prComcard: {
            ...(p?.prComcard ?? current.prComcard),
            imageUrl:
              migratePrPortfolioAssetPath(
                p?.prComcard?.imageUrl ?? current.prComcard.imageUrl,
              ) ?? undefined,
          },
          prLanguages: p?.prLanguages?.length ? p.prLanguages : current.prLanguages,
          prDisplayName:
            p?.prDisplayName === "Luna" ? null : (p?.prDisplayName ?? current.prDisplayName),
          prEmail: (() => {
            const raw = p?.prEmail ?? current.prEmail;
            if (!raw || raw.toLowerCase() === "luna@inz.my") return null;
            return raw;
          })(),
          prPayrollAgencyId: p?.prPayrollAgencyId ?? current.prPayrollAgencyId,
          prNotifications: p?.prNotifications?.length ? p.prNotifications : current.prNotifications,
          opsNotifications: p?.opsNotifications ?? current.opsNotifications,
          sosIncidents: p?.sosIncidents ?? current.sosIncidents,
          notificationPrefs: p?.notificationPrefs ?? current.notificationPrefs,
          prDeclinedOfferIds: p?.prDeclinedOfferIds ?? current.prDeclinedOfferIds,
          prMarketplaceApplication: p?.prMarketplaceApplication ?? current.prMarketplaceApplication,
          prUpcomingShifts: remapSeedUpcomingShifts(
            p?.prUpcomingShifts?.length ? p.prUpcomingShifts : current.prUpcomingShifts,
          ),
          prSwapRequests: mergePrSwapRequests(
            p?.prSwapRequests,
            current.prSwapRequests,
            mergeAgencyRoster(p?.agencyRoster, demoSnapshot.agencyRoster),
          ),
          prAgencyTiedAt: p?.prAgencyTiedAt ?? current.prAgencyTiedAt,
          prFreelancerPayrollLinks: p?.prFreelancerPayrollLinks ?? current.prFreelancerPayrollLinks,
          prPendingRatings: p?.prPendingRatings?.length
            ? p.prPendingRatings
            : current.prPendingRatings,
          prRatingHistory: p?.prRatingHistory?.length ? p.prRatingHistory : current.prRatingHistory,
          prFreelancerLowRatingStrikes:
            p?.prFreelancerLowRatingStrikes ?? current.prFreelancerLowRatingStrikes,
          prCheckInMeta: p?.prCheckInMeta ?? current.prCheckInMeta,
          prAvatarPhoto: migratePrPortfolioAssetPath(p?.prAvatarPhoto ?? current.prAvatarPhoto),
          prReceiptScans: mergedScans.length ? mergedScans : current.prReceiptScans,
          prActiveShift: p?.prActiveShift ?? current.prActiveShift,
          shiftHistory: migrateShiftHistoryPrNames(
            mergedShiftHistory,
            current.shiftHistory,
            mergedAgencyPRs,
          ),
          pendingPRs: mergePendingPRs(p?.pendingPRs, current.pendingPRs),
          pendingFreelancerPayrolls: mergePendingFreelancerPayrolls(
            p?.pendingFreelancerPayrolls,
            current.pendingFreelancerPayrolls,
          ),
          agencyPRs: mergedAgencyPRs,
          specialServiceOrders: mergeSpecialServiceOrders(
            p?.specialServiceOrders,
            current.specialServiceOrders,
            mergedAgencyPRs,
          ),
          prs: marketplacePrsFromAgency(mergedAgencyPRs),
          agencyRoster: rosterWithTiedPrAttendance(
            mergeAgencyRoster(p?.agencyRoster, demoSnapshot.agencyRoster),
            {
              prSubRole: p?.prSubRole ?? current.prSubRole,
              checkedIn: p?.checkedIn ?? current.checkedIn,
              checkedOut: p?.checkedOut ?? current.checkedOut,
              prActiveShift: p?.prActiveShift ?? current.prActiveShift,
              prSessionByRole: p?.prSessionByRole ?? current.prSessionByRole ?? {},
              agencyPRs: mergedAgencyPRs,
            },
          ),
          outletCommissionRules: (() => {
            const ws = normalizeOutletWorkspace(p?.outletWorkspace ?? current.outletWorkspace);
            const legacyMult = p?.scalingTierMultipliers ?? current.scalingTierMultipliers;
            const rules = ensureOutletRuleTierMultipliers(
              p?.outletCommissionRules?.length
                ? p.outletCommissionRules
                : current.outletCommissionRules,
              legacyMult,
            );
            return syncCommissionRulesFromWorkspace(ws, rules);
          })(),
          scalingTierMultipliers: p?.scalingTierMultipliers ?? current.scalingTierMultipliers,
          outletWorkspace: normalizeOutletWorkspace(p?.outletWorkspace ?? current.outletWorkspace),
          shifts: (() => {
            const ws = normalizeOutletWorkspace(p?.outletWorkspace ?? current.outletWorkspace);
            const menu = ws.drinkMenu;
            return (p?.shifts ?? current.shifts).map((sh) =>
              migrateShiftTierRates(withShiftFinancialDefaults(sh, menu), ws),
            );
          })(),
          outletPnl: (() => {
            const ws = normalizeOutletWorkspace(p?.outletWorkspace ?? current.outletWorkspace);
            const menu = ws.drinkMenu;
            const rules = p?.outletCommissionRules?.length
              ? syncCommissionRulesFromWorkspace(ws, p.outletCommissionRules)
              : syncCommissionRulesFromWorkspace(ws, current.outletCommissionRules);
            const shifts = (p?.shifts ?? current.shifts).map((sh) =>
              migrateShiftTierRates(withShiftFinancialDefaults(sh, menu), ws),
            );
            return recomputeAllOutletPnl(
              shifts,
              undefined,
              mergeAgencyRoster(p?.agencyRoster, demoSnapshot.agencyRoster),
              menu,
              rules,
            );
          })(),
          outletPnlSyncAt: p?.outletPnlSyncAt ?? current.outletPnlSyncAt,
          outletMoneyEditCount: p?.outletMoneyEditCount ?? current.outletMoneyEditCount,
          outletSettings: p?.outletSettings ?? current.outletSettings ?? DEFAULT_OUTLET_SETTINGS,
          outletOwner: p?.outletOwner ?? current.outletOwner ?? DEFAULT_OUTLET_OWNER,
          outletFinanceHead:
            p?.outletFinanceHead ?? current.outletFinanceHead ?? DEFAULT_OUTLET_FINANCE_HEAD,
          outletOpsHead: p?.outletOpsHead ?? current.outletOpsHead ?? DEFAULT_OUTLET_OPS_HEAD,
          shiftApplicants: p?.shiftApplicants ?? current.shiftApplicants ?? [],
          agencyFinanceHead: (() => {
            const saved = p?.agencyFinanceHead;
            const base = current.agencyFinanceHead;
            if (!saved) return base;
            return {
              ...base,
              ...saved,
              signatureDataUrl: saved.signatureDataUrl ?? base.signatureDataUrl,
            };
          })(),
          agencyCollections: mergeAgencyCollections(
            p?.agencyCollections,
            current.agencyCollections,
          ),
          paymentCardLast4: p?.paymentCardLast4 ?? current.paymentCardLast4 ?? "4242",
          postSealRatePrompt: p?.postSealRatePrompt ?? null,
          prSessionByRole: p?.prSessionByRole ?? current.prSessionByRole ?? {},
        };
        if (merged.prSubRole) {
          const role = merged.prSubRole;
          const cached = merged.prSessionByRole?.[role];
          const session =
            cached ??
            defaultPrShiftSessionForRole(role, {
              agencyRoster: merged.agencyRoster ?? [],
              prSwapRequests: merged.prSwapRequests ?? [],
            });
          Object.assign(merged, applyPrShiftSession(session));
        }
        return merged;
      },
    },
  ),
);
