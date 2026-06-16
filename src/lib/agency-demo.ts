/** Agency portal demo data — roster, commission rules, history, PR roster */

import type { PendingFreelancerPayroll, PendingPR } from "@/lib/store";
import { buildDemoESignatureDataUrl } from "@/lib/finance-head-stamp";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { DEFAULT_TIED_AGENCY_ID, FREELANCER_DEMO_PR_ID, fmtDateLabelFromIso } from "@/lib/pr-demo";

export interface OutletCommissionRule {
  outlet: string;
  wagePerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  platformPct: number;
}

export const OUTLET_COMMISSION_RULES: OutletCommissionRule[] = [
  { outlet: "Velvet 23", wagePerHour: 60, drinkPct: 8, tipPct: 15, tablePct: 10, otAfterHours: 6, platformPct: 5 },
  { outlet: "Mermate", wagePerHour: 55, drinkPct: 10, tipPct: 12, tablePct: 8, otAfterHours: 6, platformPct: 5 },
  { outlet: "Bear Lounge", wagePerHour: 58, drinkPct: 9, tipPct: 14, tablePct: 10, otAfterHours: 5, platformPct: 5 },
  { outlet: "Onyx KL", wagePerHour: 62, drinkPct: 7, tipPct: 16, tablePct: 12, otAfterHours: 6, platformPct: 5 },
  { outlet: "Urban Soul", wagePerHour: 52, drinkPct: 11, tipPct: 10, tablePct: 8, otAfterHours: 6, platformPct: 5 },
];

export function getOutletRule(
  outlet: string,
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
): OutletCommissionRule {
  return rules.find((r) => r.outlet === outlet) ?? rules[0] ?? OUTLET_COMMISSION_RULES[0];
}

/** Per-item payout from sealed shift log */
export function calcShiftPayout(
  input: {
    outlet: string;
    hoursWorked: number;
    drinks: number;
    drinkSales: number;
    tips: number;
    tableSales: number;
    checkOutAfterOt?: boolean;
  },
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
) {
  const rule = getOutletRule(input.outlet, rules);
  const baseHours = Math.min(input.hoursWorked, rule.otAfterHours);
  const otHours = Math.max(0, input.hoursWorked - rule.otAfterHours);
  const wages = baseHours * rule.wagePerHour + otHours * rule.wagePerHour * 1.5;
  const drinkCommission = (input.drinkSales * rule.drinkPct) / 100;
  const tipCommission = (input.tips * rule.tipPct) / 100;
  const tableCommission = (input.tableSales * rule.tablePct) / 100;
  return {
    wages: Math.round(wages * 100) / 100,
    drinkCommission: Math.round(drinkCommission * 100) / 100,
    tipCommission: Math.round(tipCommission * 100) / 100,
    tableCommission: Math.round(tableCommission * 100) / 100,
    total: Math.round((wages + drinkCommission + tipCommission + tableCommission) * 100) / 100,
    rule,
  };
}

export type RosterSlotStatus =
  | "scheduled"
  | "on-duty"
  | "en-route"
  | "unavailable"
  | "swap-pending"
  | "assignment-pending"
  | "outlet-pending";

export interface AgencyAssignmentMeta {
  agencyName?: string;
  agencyNote?: string;
  assignedAt: string;
  /** Epoch ms — used for "12 min ago" on PR Shifts */
  assignedAtMs?: number;
  respondedAt?: string;
}

export interface AgencyRosterSlot {
  id: string;
  prId: string;
  prName: string;
  outlet: string;
  date: string;
  dateIso: string;
  shift: string;
  shiftStart: string;
  shiftEnd: string;
  status: RosterSlotStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  lateFlag?: boolean;
  noShowFlag?: boolean;
  /** PR cancelled shift — wage deduction logged for next PV */
  payDeductionRm?: number;
  cancelledAt?: string;
  prUnavailableNote?: string;
  /** Live floor metrics — synced with outlet log sales & agency live view */
  floorDrinks?: number;
  floorTips?: number;
  estPayout?: number;
  /** Agency assigned PR to this outlet — PR must approve before shift locks */
  agencyAssignment?: AgencyAssignmentMeta;
  /** Agency requests moving PR to another outlet — PR approves or declines */
  outletSwap?: OutletSwapRequest;
}

export type OutletSwapStatus = "pending_pr" | "approved" | "declined";

export interface OutletSwapRequest {
  targetOutlet: string;
  status: OutletSwapStatus;
  agencyName?: string;
  agencyNote?: string;
  requestedAt: string;
  requestedAtMs?: number;
  respondedAt?: string;
}

function rosterDate(iso: string) {
  return fmtDateLabelFromIso(iso);
}

function withRosterDate<T extends Pick<AgencyRosterSlot, "dateIso">>(slot: T): T & { date: string } {
  return { ...slot, date: rosterDate(slot.dateIso) };
}

export const SEED_AGENCY_ROSTER: AgencyRosterSlot[] = [
  withRosterDate({
    id: "rs1",
    prId: "p1",
    prName: "Luna",
    outlet: "Velvet 23",
    dateIso: "2026-06-04",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "scheduled",
    floorDrinks: 0,
    floorTips: 0,
    estPayout: 420,
    outletSwap: {
      targetOutlet: "Bear Lounge",
      status: "pending_pr",
      agencyName: "Atlas Agency",
      agencyNote: "Relocate for lounge launch night — same shift time",
      requestedAt: "3 Jun 2026 · 11:28",
      requestedAtMs: Date.now() - 20 * 60 * 1000,
    },
  }),
  withRosterDate({
    id: "rs2",
    prId: "p2",
    prName: "Mia",
    outlet: "Velvet 23",
    dateIso: "2026-06-04",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "en-route",
    floorDrinks: 0,
    floorTips: 0,
    estPayout: 380,
  }),
  withRosterDate({
    id: "rs3",
    prId: "p6",
    prName: "Yuki",
    outlet: "Onyx KL",
    dateIso: "2026-06-04",
    shift: "21:00 — 03:00",
    shiftStart: "21:00",
    shiftEnd: "03:00",
    status: "swap-pending",
    outletSwap: {
      targetOutlet: "Mermate",
      status: "pending_pr",
      agencyNote: "VIP coverage — agency moving shift to Mermate",
      requestedAt: "4 Jun 2026 · 09:15",
    },
  }),
  withRosterDate({
    id: "rs4",
    prId: "p5",
    prName: "Nina",
    outlet: "Mermate",
    dateIso: "2026-06-05",
    shift: "20:00 — 02:00",
    shiftStart: "20:00",
    shiftEnd: "02:00",
    status: "unavailable",
  }),
  withRosterDate({
    id: "rs6",
    prId: "p1",
    prName: "Luna",
    outlet: "Mermate",
    dateIso: "2026-06-05",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "You are needed at Mermate Friday — lounge relaunch coverage",
      assignedAt: "4 Jun 2026 · 11:36",
      assignedAtMs: Date.now() - 12 * 60 * 1000,
    },
  }),
  withRosterDate({
    id: "rs7",
    prId: "p1",
    prName: "Luna",
    outlet: "Onyx KL",
    dateIso: "2026-06-04",
    shift: "21:00 — 03:00",
    shiftStart: "21:00",
    shiftEnd: "03:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "Same-night backup at Onyx — only if you can leave Velvet early",
      assignedAt: "4 Jun 2026 · 14:10",
      assignedAtMs: Date.now() - 45 * 60 * 1000,
    },
  }),
  withRosterDate({
    id: "rs5",
    prId: "p3",
    prName: "Vivi",
    outlet: "Bear Lounge",
    dateIso: "2026-06-05",
    shift: "22:30 — 04:30",
    shiftStart: "22:30",
    shiftEnd: "04:30",
    status: "scheduled",
  }),
];

export interface AgencyManagedPR {
  id: string;
  name: string;
  ic: string;
  mobile: string;
  email: string;
  age: number;
  height: number;
  race: string;
  languages: string[];
  place: string;
  yearsExp: number;
  rating: number;
  trainingLevel: string;
  totalPaid: number;
  attendancePct: number;
  checkIns: number;
  checkOuts: number;
  noShows: number;
  kpiScore: number;
  kpiTier?: string;
  suspended?: boolean;
  detached?: boolean;
  tiedSince?: string;
  /** Consecutive shift outlet ratings below 3.0★ (most recent streak) */
  consecutiveLowRatings?: number;
  weight?: number;
}

export const SEED_AGENCY_PRS: AgencyManagedPR[] = [
  {
    id: "p1",
    name: "Luna",
    ic: "950312-14-8821",
    mobile: "+60 12-881 2201",
    email: "luna@inz.my",
    age: 26,
    height: 168,
    weight: 50,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "KL",
    yearsExp: 4,
    rating: 4.9,
    trainingLevel: "Tier V",
    totalPaid: 18420,
    attendancePct: 98,
    checkIns: 41,
    checkOuts: 41,
    noShows: 0,
    kpiScore: 92,
    kpiTier: "A",
    tiedSince: "2022-03-01",
  },
  {
    id: "p2",
    name: "Mia",
    ic: "970801-08-4412",
    mobile: "+60 16-992 1103",
    email: "mia@inz.my",
    age: 24,
    height: 165,
    weight: 48,
    race: "Chinese",
    languages: ["English", "Mandarin", "Cantonese"],
    place: "PJ",
    yearsExp: 3,
    rating: 4.8,
    trainingLevel: "Tier IV",
    totalPaid: 14280,
    attendancePct: 96,
    checkIns: 38,
    checkOuts: 37,
    noShows: 1,
    kpiScore: 88,
    kpiTier: "B",
    tiedSince: "2025-08-01",
  },
  {
    id: "p3",
    name: "Vivi",
    ic: "960515-10-7733",
    mobile: "+60 11-223 8890",
    email: "vivi@inz.my",
    age: 25,
    height: 170,
    weight: 54,
    race: "Malay",
    languages: ["English", "Malay"],
    place: "KL",
    yearsExp: 5,
    rating: 4.7,
    trainingLevel: "Tier V",
    totalPaid: 22100,
    attendancePct: 94,
    checkIns: 52,
    checkOuts: 51,
    noShows: 1,
    kpiScore: 85,
  },
  {
    id: "p5",
    name: "Nina",
    ic: "980220-06-5511",
    mobile: "+60 17-441 9922",
    email: "nina@inz.my",
    age: 23,
    height: 162,
    weight: 47,
    race: "Malay",
    languages: ["English", "Malay"],
    place: "Shah Alam",
    yearsExp: 2,
    rating: 3.4,
    trainingLevel: "Tier III",
    totalPaid: 8640,
    attendancePct: 91,
    checkIns: 19,
    checkOuts: 18,
    noShows: 1,
    kpiScore: 78,
    consecutiveLowRatings: 1,
    tiedSince: "2024-06-01",
  },
  {
    id: "p6",
    name: "Yuki",
    ic: "941108-12-9901",
    mobile: "+60 19-772 3301",
    email: "yuki@inz.my",
    age: 27,
    height: 166,
    weight: 51,
    race: "Japanese",
    languages: ["English", "Japanese", "Mandarin"],
    place: "Mont Kiara",
    yearsExp: 6,
    rating: 4.8,
    trainingLevel: "Tier V",
    totalPaid: 31200,
    attendancePct: 99,
    checkIns: 58,
    checkOuts: 58,
    noShows: 0,
    kpiScore: 95,
  },
  {
    id: "p4",
    name: "Cici",
    ic: "990101-08-3344",
    mobile: "+60 18-220 6612",
    email: "cici@inz.my",
    age: 24,
    height: 163,
    weight: 49,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "PJ",
    yearsExp: 2,
    rating: 2.9,
    trainingLevel: "Tier III",
    totalPaid: 9200,
    attendancePct: 93,
    checkIns: 22,
    checkOuts: 21,
    noShows: 0,
    kpiScore: 82,
    consecutiveLowRatings: 3,
    tiedSince: "2023-01-15",
  },
  {
    id: "p7",
    name: "Chen Wei",
    ic: "970515-10-6622",
    mobile: "+60 16-772 4410",
    email: "chen.wei@inz.my",
    age: 25,
    height: 167,
    weight: 55,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "KL",
    yearsExp: 3,
    rating: 4.7,
    trainingLevel: "Tier IV",
    totalPaid: 11800,
    attendancePct: 95,
    checkIns: 28,
    checkOuts: 28,
    noShows: 0,
    kpiScore: 86,
  },
  {
    id: "freelancer-jaya",
    name: "Jaya Nair",
    ic: "880214-10-5566",
    mobile: "+60 17-662 3391",
    email: "jaya.nair@inz.my",
    age: 27,
    height: 166,
    weight: 52,
    race: "Indian",
    languages: ["English", "Cantonese"],
    place: "KL",
    yearsExp: 2,
    rating: 4.6,
    trainingLevel: "Tier III",
    totalPaid: 6840,
    attendancePct: 91,
    checkIns: 19,
    checkOuts: 18,
    noShows: 1,
    kpiScore: 78,
  },
];

function parsePendingLanguages(raw: string): string[] {
  return raw
    .split(/[·,|/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeLanguageToken(s))
    .filter(Boolean);
}

function normalizeLanguageToken(raw: string): string {
  const t = raw.trim();
  if (!t || t.toLowerCase() === "pending profile") return "";
  const u = t.toUpperCase();
  if (u === "EN") return "English";
  if (t === "中文") return "Mandarin";
  if (u === "MALAY") return "Malay";
  if (u === "MANDARIN") return "Mandarin";
  if (u === "CANTONESE") return "Cantonese";
  if (u === "JAPANESE") return "Japanese";
  if (u === "TAMIL") return "Tamil";
  if (u === "HINDI") return "Hindi";
  if (u === "ARABIC") return "Arabic";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Flatten PR language fields into normalized tokens for filters and display */
export function languagesFromPr(pr: Pick<AgencyManagedPR, "languages">): string[] {
  const raw = pr.languages as string[] | string | undefined;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((l) => normalizeLanguageToken(String(l))).filter(Boolean))];
  }
  if (typeof raw === "string") return parsePendingLanguages(raw);
  return [];
}

/** All distinct languages across agency PR personnel */
export function collectAgencyPrLanguages(
  prs: AgencyManagedPR[],
  opts?: { includeDetached?: boolean },
): string[] {
  const includeDetached = opts?.includeDetached ?? false;
  const set = new Set<string>();
  for (const pr of prs) {
    if (!includeDetached && pr.detached) continue;
    for (const lang of languagesFromPr(pr)) set.add(lang);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** New sign-ups awaiting owner approval — not yet on agency roster */
export const SEED_PENDING_PRS: PendingPR[] = [
  {
    id: "signup-siti",
    targetPrId: "p8",
    name: "Siti Rahman",
    languages: "EN · Malay",
    ic: "960101-14-7788",
    mobile: "+60 12-881 9901",
    email: "siti.r@inz.my",
    age: 24,
    height: 165,
    weight: 52,
    race: "Malay",
    hasIcPhotos: true,
    hasSelfie: true,
    hasComcard3d: true,
    portfolioCount: 4,
    submittedAt: "9 Jun 2026 · 09:14",
    source: "self-signup",
    status: "pending",
  },
  {
    id: "signup-amira",
    targetPrId: "p9",
    name: "Amira Hassan",
    languages: "EN · Malay · Arabic",
    ic: "980712-08-4410",
    mobile: "+60 13-220 7788",
    email: "amira.h@inz.my",
    age: 23,
    height: 163,
    weight: 50,
    race: "Malay",
    hasIcPhotos: true,
    hasSelfie: true,
    hasComcard3d: true,
    portfolioCount: 5,
    submittedAt: "8 Jun 2026 · 22:41",
    source: "self-signup",
    status: "pending",
  },
  {
    id: "signup-raj",
    targetPrId: "p10",
    name: "Raj Kumar",
    languages: "EN · Tamil · Hindi",
    ic: "950330-10-9922",
    mobile: "+60 16-550 3310",
    email: "raj.k@inz.my",
    age: 26,
    height: 172,
    weight: 68,
    race: "Indian",
    hasIcPhotos: true,
    hasSelfie: true,
    hasComcard3d: false,
    portfolioCount: 3,
    submittedAt: "7 Jun 2026 · 16:08",
    source: "self-signup",
    status: "pending",
  },
  {
    id: "signup-kevin-invite",
    targetPrId: "p11",
    name: "Kevin Lim",
    languages: "Pending profile",
    ic: "991205-14-2201",
    mobile: "+60 11-882 4400",
    email: "kevin.lim@inz.my",
    hasIcPhotos: false,
    hasSelfie: false,
    hasComcard3d: false,
    portfolioCount: 0,
    submittedAt: "9 Jun 2026 · 08:02",
    source: "owner-invite",
    status: "pending",
  },
];

export const SEED_PENDING_FREELANCER_PAYROLLS: PendingFreelancerPayroll[] = [
  {
    id: "fp-seed-jaya",
    prId: FREELANCER_DEMO_PR_ID,
    prName: "Jaya Nair",
    languages: "English · Cantonese",
    ic: "880214-10-5566",
    mobile: "+60 17-662 3391",
    email: "jaya.nair@inz.my",
    agencyId: DEFAULT_TIED_AGENCY_ID,
    agencyName: "Atlas Agency",
    status: "pending",
    requestedAt: "4 Jun 2026 · 10:42",
  },
];

export function pendingPRToManagedPR(p: PendingPR): AgencyManagedPR {
  const langs =
    p.languages === "Pending profile" ? ["English"] : parsePendingLanguages(p.languages);
  return {
    id: p.targetPrId ?? `p-new-${p.id}`,
    name: p.name,
    ic: p.ic ?? "—",
    mobile: p.mobile ?? "—",
    email: p.email ?? "—",
    age: p.age ?? 22,
    height: p.height ?? 165,
    weight: 52,
    race: p.race ?? "—",
    languages: langs,
    place: "KL",
    yearsExp: p.source === "owner-invite" ? 0 : 1,
    rating: 4.2,
    trainingLevel: p.hasComcard3d ? "Tier II" : "Tier I",
    totalPaid: 0,
    attendancePct: 0,
    checkIns: 0,
    checkOuts: 0,
    noShows: 0,
    kpiScore: 72,
  };
}

export interface LiveWorkforceEntry {
  id: string;
  prName: string;
  outlet: string;
  status: "on-duty" | "en-route" | "checked-out";
  checkIn?: string;
  checkOut?: string;
  estPayout: number;
  drinks: number;
  tips: number;
}

/** @deprecated Use deriveLiveWorkforce(agencyRoster) from portal-sync — kept for tip fallback only */
export const SEED_LIVE_WORKFORCE: LiveWorkforceEntry[] = [];

export interface OutletPnlRow {
  outlet: string;
  grossRevenue: number;
  prPayout: number;
  agencyNet: number;
  outletNet: number;
  platformFee: number;
}

export const SEED_OUTLET_PNL: OutletPnlRow[] = [
  { outlet: "Velvet 23", grossRevenue: 14820, prPayout: 2180, agencyNet: 4200, outletNet: 7940, platformFee: 741 },
  { outlet: "Mermate", grossRevenue: 9200, prPayout: 1640, agencyNet: 2800, outletNet: 4380, platformFee: 460 },
  { outlet: "Bear Lounge", grossRevenue: 7600, prPayout: 1420, agencyNet: 2100, outletNet: 3740, platformFee: 380 },
  { outlet: "Onyx KL", grossRevenue: 11200, prPayout: 1980, agencyNet: 3200, outletNet: 5640, platformFee: 560 },
];

export type AgencySubscriptionPlanId = "starter" | "growth" | "enterprise";

export interface AgencySubscriptionPlan {
  id: AgencySubscriptionPlanId;
  label: string;
  monthlyRm: number;
  /** Max PRs the agency can roster on this plan */
  prLimit: number;
  description: string;
}

export const AGENCY_SUBSCRIPTION_PLANS: AgencySubscriptionPlan[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyRm: 499,
    prLimit: 20,
    description: "InnocenZ Agency · core portal access",
  },
  {
    id: "growth",
    label: "Growth",
    monthlyRm: 1499,
    prLimit: 75,
    description: "Expanded roster · payroll & analytics",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyRm: 2499,
    prLimit: 200,
    description: "Maximum PR capacity · priority support",
  },
];

export function getAgencySubscriptionPlan(id?: AgencySubscriptionPlanId | null): AgencySubscriptionPlan {
  return AGENCY_SUBSCRIPTION_PLANS.find((p) => p.id === id) ?? AGENCY_SUBSCRIPTION_PLANS[0];
}

export interface AgencyOwnerSettings {
  ownerName: string;
  mobile: string;
  email: string;
  ic: string;
  orgName: string;
  otpChannel: "email" | "phone";
  accountActivated: boolean;
  avatarPhoto?: string | null;
  subscriptionPlanId?: AgencySubscriptionPlanId;
}

export const DEFAULT_AGENCY_OWNER: AgencyOwnerSettings = {
  ownerName: "Dato' Lim Wei Khoon",
  mobile: "+60 12-345 6789",
  email: "owner@atlas-agency.my",
  ic: "780101-14-5522",
  orgName: "Atlas Agency",
  otpChannel: "email",
  accountActivated: true,
  avatarPhoto: null,
  subscriptionPlanId: "starter",
};

export interface AgencyFinanceHead {
  name: string;
  ic: string;
  email: string;
  eSignatureStored: boolean;
  /** Stored e-signature image — stamped on every PV (1st of 2 sigs) */
  signatureDataUrl?: string;
}

export const DEFAULT_FINANCE_HEAD: AgencyFinanceHead = {
  name: "Sarah Tan",
  ic: "850622-08-4410",
  email: "finance@atlas-agency.my",
  eSignatureStored: true,
  signatureDataUrl: buildDemoESignatureDataUrl("Sarah Tan"),
};

export type CollectionAging = "current" | "7d" | "14d" | "30d" | "60d+";
export type CollectionStatus = "SETTLED" | "PENDING";

export type CollectionInvoiceKind = "outlet" | "agency";

export type CollectionLineGroup = "payroll" | "commissions" | "fees";

export interface CollectionLineItem {
  label: string;
  detail?: string;
  amount: number;
  group?: CollectionLineGroup;
}

export interface AgencyCollectionInvoice {
  id: string;
  outlet: string;
  amount: number;
  /** Invoice issue date (display) */
  issueDate: string;
  /** Optional issue time for filtering */
  issueTime?: string;
  dueDate: string;
  status: CollectionStatus;
  aging: CollectionAging;
  linkedPvIds: string[];
  /** What the outlet owes the agency — payroll passthrough, fees, etc. */
  lines?: CollectionLineItem[];
  reminderSent?: boolean;
  kind?: CollectionInvoiceKind;
  counterparty?: string;
}

export const SCALING_TIER_MULTIPLIERS: Record<string, number> = {
  "Tier III": 1.0,
  "Tier IV": 1.1,
  "Tier V": 1.35,
};

export const SEED_AGENCY_COLLECTIONS: AgencyCollectionInvoice[] = [
  {
    id: "COL-2026-0610",
    outlet: "Velvet 23",
    amount: 4280,
    issueDate: "3 Jun 2026",
    issueTime: "09:30",
    dueDate: "10 Jun 2026",
    status: "SETTLED",
    aging: "current",
    linkedPvIds: ["PV-2026-0611-A"],
    kind: "outlet",
    lines: [
      { label: "Daily wages", detail: "Luna · 4 Jun sealed shift", amount: 360, group: "payroll" },
      { label: "Commission – Drinks", detail: "Velvet 23 floor · tap log", amount: 2940, group: "commissions" },
      { label: "Commission – Tips", detail: "100% passthrough to PR payroll", amount: 680, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 300, group: "fees" },
    ],
  },
  {
    id: "COL-2026-0608",
    outlet: "Mermate",
    amount: 3120,
    issueDate: "1 Jun 2026",
    issueTime: "11:00",
    dueDate: "8 Jun 2026",
    status: "SETTLED",
    aging: "current",
    linkedPvIds: ["PV-2026-0498", "PV-2026-0548-J"],
    kind: "outlet",
    lines: [
      { label: "Daily wages", detail: "Jaya Nair · 27 Apr + 20–22 May shifts", amount: 1050, group: "payroll" },
      { label: "Commission – Drinks", detail: "Mermate POS reconciled", amount: 1620, group: "commissions" },
      { label: "Commission – Tips", detail: "Receipt scans rc-seed-1…3", amount: 350, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 100, group: "fees" },
    ],
  },
  {
    id: "COL-2026-0605",
    outlet: "Bear Lounge",
    amount: 2640,
    issueDate: "28 May 2026",
    issueTime: "14:15",
    dueDate: "5 Jun 2026",
    status: "PENDING",
    aging: "7d",
    linkedPvIds: ["PV-2026-0521"],
    reminderSent: true,
    kind: "outlet",
    lines: [
      { label: "Daily wages", detail: "Jaya Nair · 9 May sealed shift", amount: 350, group: "payroll" },
      { label: "Overtime (OT)", detail: "Check-out past shift end · 47 min", amount: 280, group: "payroll" },
      { label: "Commission – Drinks", detail: "Disputed · rc-seed-4 · outlet reconciling", amount: 1890, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 120, group: "fees" },
    ],
  },
  {
    id: "COL-2026-0528",
    outlet: "Onyx KL",
    amount: 3890,
    issueDate: "21 May 2026",
    issueTime: "10:45",
    dueDate: "28 May 2026",
    status: "PENDING",
    aging: "14d",
    linkedPvIds: [],
    kind: "outlet",
    lines: [
      { label: "Daily wages", detail: "Mia + guest PR · 2 shifts", amount: 1420, group: "payroll" },
      { label: "Commission – Drinks", detail: "Onyx KL · weekend cycle", amount: 1980, group: "commissions" },
      { label: "Commission – Tables", detail: "VIP tables · 3 units", amount: 360, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 130, group: "fees" },
    ],
  },
  {
    id: "COL-2026-0515",
    outlet: "Urban Soul",
    amount: 1950,
    issueDate: "8 May 2026",
    issueTime: "16:00",
    dueDate: "15 May 2026",
    status: "PENDING",
    aging: "30d",
    linkedPvIds: ["PV-2026-0535-J"],
    reminderSent: true,
    kind: "outlet",
    lines: [
      { label: "Daily wages", detail: "Jaya Nair · 14 May shift", amount: 350, group: "payroll" },
      { label: "Commission – Drinks", detail: "Urban Soul tap log", amount: 1420, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 180, group: "fees" },
    ],
  },
  {
    id: "AINV-2026-0601",
    outlet: "Platform fee",
    amount: 499,
    issueDate: "1 Jun 2026",
    issueTime: "08:00",
    dueDate: "1 Jun 2026",
    status: "SETTLED",
    aging: "current",
    linkedPvIds: [],
    kind: "agency",
    counterparty: "InnocenZ Platform",
    lines: [{ label: "Atlas Agency subscription", detail: "Jun 2026 · SaaS", amount: 499, group: "fees" }],
  },
  {
    id: "AINV-2026-0604",
    outlet: "InnocenZ escrow",
    amount: 1200,
    issueDate: "4 Jun 2026",
    issueTime: "09:15",
    dueDate: "4 Jun 2026",
    status: "PENDING",
    aging: "current",
    linkedPvIds: ["PV-2026-0604-L"],
    kind: "agency",
    counterparty: "InnocenZ Admin",
    lines: [
      { label: "Dispute escrow hold", detail: "Luna · Bear Lounge PV", amount: 850, group: "fees" },
      { label: "Admin processing fee", detail: "7-day dispute window", amount: 350, group: "fees" },
    ],
  },
];

export interface AgencyReconciliationDay {
  dateIso: string;
  dateLabel: string;
  outletSalesTotal: number;
  pvTotal: number;
  variance: number;
  varianceReason?: string;
  agencyAdjustDrinks?: number;
  agencyAdjustTips?: number;
  agencyAdjustReason?: string;
  agencyConfirmed: boolean;
  outletConfirmed: boolean;
}

export const SEED_RECONCILIATION: AgencyReconciliationDay = {
  dateIso: "2026-06-04",
  dateLabel: fmtDateLabelFromIso("2026-06-04"),
  outletSalesTotal: 14820,
  pvTotal: 14760,
  variance: 60,
  agencyConfirmed: false,
  outletConfirmed: true,
};

export const OUTLET_NAMES = [...new Set(OUTLET_COMMISSION_RULES.map((r) => r.outlet))];

export function nowAgencyDateTime() {
  const d = new Date();
  return {
    date: d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
  };
}

const DEMO_LAYOUT_ROSTER_IDS = new Set(["rs3", "rs4"]);
/** Removed from seed — drop on hydrate so PRs become free again */
const RETIRED_DEMO_ROSTER_IDS = new Set(["rs-demo-p3", "rs-demo-p4", "rs-demo-p7"]);

/** Keep demo agency inbox (assignments / swaps) visible after localStorage hydrate */
export function mergeAgencyRoster(
  persisted: AgencyRosterSlot[] | undefined,
  seed: AgencyRosterSlot[] = SEED_AGENCY_ROSTER,
): AgencyRosterSlot[] {
  const normalize = (slot: AgencyRosterSlot): AgencyRosterSlot =>
    withRosterDate({ ...slot, dateIso: slot.dateIso });

  if (!persisted?.length) return seed.map(normalize);
  const seedIds = new Set(seed.map((s) => s.id));
  const extras = persisted.filter((s) => !seedIds.has(s.id) && !RETIRED_DEMO_ROSTER_IDS.has(s.id));
  const merged = [
    ...extras,
    ...seed.map((seedSlot) => {
      const saved = persisted.find((s) => s.id === seedSlot.id);
      if (!saved) return seedSlot;
      const dateIso =
        saved.dateIso < DEFAULT_ROSTER_DATE_ISO && seedSlot.dateIso >= DEFAULT_ROSTER_DATE_ISO
          ? seedSlot.dateIso
          : saved.dateIso ?? seedSlot.dateIso;
      if (DEMO_LAYOUT_ROSTER_IDS.has(seedSlot.id)) {
        return normalize({
          ...seedSlot,
          ...saved,
          status: seedSlot.status,
          dateIso,
          outlet: seedSlot.outlet,
          checkedInAt: saved.checkedInAt ?? seedSlot.checkedInAt,
          floorDrinks: saved.floorDrinks ?? seedSlot.floorDrinks,
          floorTips: saved.floorTips ?? seedSlot.floorTips,
          estPayout: saved.estPayout ?? seedSlot.estPayout,
          outletSwap: seedSlot.outletSwap ?? saved.outletSwap,
        });
      }
      const keepAssignmentPending =
        seedSlot.status === "assignment-pending" && saved.status !== "scheduled";
      const keepSwapPending =
        seedSlot.outletSwap?.status === "pending_pr" &&
        saved.outletSwap?.status !== "approved";
      const staleOnDuty = saved.status === "on-duty" && seedSlot.status !== "on-duty";
      const reassigned = saved.prId !== seedSlot.prId;
      return normalize({
        ...seedSlot,
        ...saved,
        dateIso,
        prId: reassigned ? saved.prId : saved.prId ?? seedSlot.prId,
        prName: reassigned ? saved.prName : saved.prName ?? seedSlot.prName,
        status: keepAssignmentPending
          ? seedSlot.status
          : staleOnDuty
            ? seedSlot.status
            : saved.status,
        checkedInAt: staleOnDuty ? undefined : saved.checkedInAt ?? seedSlot.checkedInAt,
        floorDrinks: staleOnDuty ? seedSlot.floorDrinks : saved.floorDrinks ?? seedSlot.floorDrinks,
        floorTips: staleOnDuty ? seedSlot.floorTips : saved.floorTips ?? seedSlot.floorTips,
        agencyAssignment: keepAssignmentPending
          ? seedSlot.agencyAssignment
          : saved.agencyAssignment ?? seedSlot.agencyAssignment,
        outletSwap: keepSwapPending ? seedSlot.outletSwap : saved.outletSwap ?? seedSlot.outletSwap,
      });
    }),
  ];
  return merged.map(normalize);
}
