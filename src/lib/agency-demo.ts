/** Agency portal demo data — roster, commission rules, history, PR roster */

import type { PendingFreelancerPayroll, PendingPR } from "@/lib/store";
import { buildDemoESignatureDataUrl } from "@/lib/finance-head-stamp";
import {
  addDaysToIso,
  migrateDemoDateIso,
} from "@/lib/demo-clock";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { SEED_COMCARD_AGENCY_PRS } from "@/lib/agency-pr-comcards";
import {
  buildSeedPrPortfolio,
  fmtDateLabelFromIso,
  DEFAULT_PR_AGENCY_NAME,
  isFreelancerPrId,
  SEED_PR_AVATAR_IMAGE,
  SEED_PR_COMCARD_IMAGE,
  TIED_DEMO_ROSTER_PR_ID,
  type PrComcard,
} from "@/lib/pr-demo";

export interface OutletCommissionRule {
  outlet: string;
  wagePerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  platformPct: number;
  /** Per PR training tier — outlet workspace edits sync here */
  tierRates?: Partial<Record<OutletPrTier, OutletTierRateSettings>>;
  /** Payout multipliers by PR training tier (per outlet) */
  tierMultipliers?: Record<OutletPrTier, number>;
}

export const OUTLET_PR_TIERS = ["Tier I", "Tier II", "Tier III", "Tier IV", "Tier V"] as const;
export type OutletPrTier = (typeof OUTLET_PR_TIERS)[number];
/** Canonical base tier — flat commission fields and 1× multiplier */
export const OUTLET_BASE_TIER: OutletPrTier = "Tier I";

export interface OutletTierRateSettings {
  wagePerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  /** Optional per-shift sales target (RM) — set on Post Job only */
  targetSalesRm?: number;
}

const TIER_WAGE_MULTIPLIERS: Record<OutletPrTier, number> = {
  "Tier I": 1,
  "Tier II": 1.08,
  "Tier III": 1.18,
  "Tier IV": 1.29,
  "Tier V": 1.59,
};

export function defaultTierWageMultipliers(): Record<OutletPrTier, number> {
  return { ...TIER_WAGE_MULTIPLIERS };
}

export const TIER_WAGE_STEP = 5;
export const TIER_WAGE_MIN = 40;
export const TIER_WAGE_MAX = 120;

export function snapTierWage(value: number): number {
  const snapped = Math.round(value / TIER_WAGE_STEP) * TIER_WAGE_STEP;
  return Math.min(TIER_WAGE_MAX, Math.max(TIER_WAGE_MIN, snapped));
}

export function tierWageFromMultiplier(baseWage: number, multiplier: number): number {
  return snapTierWage(snapTierWage(baseWage) * multiplier);
}

/** Derive tier multipliers from actual per-tier wages (outlet workspace → agency rules). */
export function deriveTierMultipliersFromRates(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): Record<OutletPrTier, number> {
  const baseWage = tierRates[OUTLET_BASE_TIER]?.wagePerHour ?? 0;
  if (baseWage <= 0) return normalizeOutletTierMultipliers();
  const partial = {} as Partial<Record<OutletPrTier, number>>;
  for (const tier of OUTLET_PR_TIERS) {
    partial[tier] =
      tier === OUTLET_BASE_TIER
        ? 1
        : Math.round((tierRates[tier].wagePerHour / baseWage) * 100) / 100;
  }
  return normalizeOutletTierMultipliers(partial);
}

function snapTierRatesWages(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): Record<OutletPrTier, OutletTierRateSettings> {
  const out = { ...tierRates };
  for (const tier of OUTLET_PR_TIERS) {
    out[tier] = { ...out[tier], wagePerHour: snapTierWage(out[tier].wagePerHour) };
  }
  return out;
}

export function buildDefaultTierRates(base: OutletTierRateSettings): Record<OutletPrTier, OutletTierRateSettings> {
  const baseWage = snapTierWage(base.wagePerHour);
  const out = {} as Record<OutletPrTier, OutletTierRateSettings>;
  for (const tier of OUTLET_PR_TIERS) {
    out[tier] = {
      wagePerHour: tierWageFromMultiplier(baseWage, TIER_WAGE_MULTIPLIERS[tier]),
      drinkPct: base.drinkPct,
      tipPct: base.tipPct,
      tablePct: base.tablePct,
      otAfterHours: base.otAfterHours,
    };
  }
  return out;
}

export function tierWagesAreDistinct(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): boolean {
  const wages = OUTLET_PR_TIERS.map((t) => tierRates[t].wagePerHour);
  if (new Set(wages).size <= 1) return false;
  for (let i = 1; i < OUTLET_PR_TIERS.length; i++) {
    if (wages[i]! <= wages[i - 1]!) return false;
  }
  return true;
}

/** Rebuild wages from Tier I base when tiers share the same pay (legacy flat data). */
export function ensureAscendingTierWages(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): Record<OutletPrTier, OutletTierRateSettings> {
  if (tierWagesAreDistinct(tierRates)) return tierRates;
  const base = tierRates[OUTLET_BASE_TIER];
  const rebuilt = buildDefaultTierRates(base);
  const out = { ...tierRates };
  for (const tier of OUTLET_PR_TIERS) {
    out[tier] = { ...out[tier], wagePerHour: rebuilt[tier].wagePerHour };
  }
  return out;
}

export function cloneTierRates(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): Record<OutletPrTier, OutletTierRateSettings> {
  return OUTLET_PR_TIERS.reduce(
    (acc, tier) => {
      acc[tier] = { ...tierRates[tier] };
      return acc;
    },
    {} as Record<OutletPrTier, OutletTierRateSettings>,
  );
}

export function getTierWageFromRates(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  tier: OutletPrTier,
): number {
  const wage = tierRates[tier]?.wagePerHour ?? tierRates[OUTLET_BASE_TIER].wagePerHour;
  return snapTierWage(wage);
}

export function averageTierWage(tierRates: Record<OutletPrTier, OutletTierRateSettings>): number {
  const wages = OUTLET_PR_TIERS.map((t) => tierRates[t].wagePerHour);
  return Math.round(wages.reduce((a, b) => a + b, 0) / wages.length);
}

export function estimateShiftLaborCost(opts: {
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  hours: number;
  quantity: number;
  prIds?: string[];
  prTierById?: Record<string, string | undefined>;
}): number {
  const { tierRates, hours, quantity, prIds, prTierById } = opts;
  if (prIds?.length) {
    return Math.round(
      prIds.reduce((sum, id) => {
        const tier = (prTierById?.[id] ?? OUTLET_BASE_TIER) as OutletPrTier;
        return sum + getTierWageFromRates(tierRates, tier) * hours;
      }, 0),
    );
  }
  return Math.round(averageTierWage(tierRates) * quantity * hours);
}

export function formatTierWageRange(tierRates: Record<OutletPrTier, OutletTierRateSettings>): string {
  const wages = OUTLET_PR_TIERS.map((t) => tierRates[t].wagePerHour);
  const min = Math.min(...wages);
  const max = Math.max(...wages);
  if (min === max) return `RM ${min}/hr`;
  return `RM ${min}–${max}/hr`;
}

export function formatTierSalesTargets(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): string | null {
  const targets = OUTLET_PR_TIERS.map((t) => tierRates[t].targetSalesRm).filter(
    (v): v is number => v != null && v > 0,
  );
  if (targets.length === 0) return null;
  const min = Math.min(...targets);
  const max = Math.max(...targets);
  if (min === max) return `RM ${min.toLocaleString()} sales target`;
  return `RM ${min.toLocaleString()}–${max.toLocaleString()} sales targets`;
}

export function normalizeTierRates(
  base: OutletTierRateSettings,
  partial?: Partial<Record<OutletPrTier, OutletTierRateSettings>>,
): Record<OutletPrTier, OutletTierRateSettings> {
  const snappedBase = { ...base, wagePerHour: snapTierWage(base.wagePerHour) };
  const defaults = buildDefaultTierRates(snappedBase);
  if (!partial) return defaults;
  const out = { ...defaults };
  for (const tier of OUTLET_PR_TIERS) {
    if (partial[tier]) {
      out[tier] = {
        ...defaults[tier],
        ...partial[tier],
        wagePerHour: snapTierWage(partial[tier].wagePerHour ?? defaults[tier].wagePerHour),
      };
    }
  }
  return ensureAscendingTierWages(snapTierRatesWages(out));
}

const DEFAULT_TIER_MULTIPLIERS: Record<OutletPrTier, number> = {
  "Tier I": 1,
  "Tier II": 1.08,
  "Tier III": 1.18,
  "Tier IV": 1.29,
  "Tier V": 1.59,
};

export function usesLegacyTierIIIBaseMultipliers(
  multipliers: Partial<Record<OutletPrTier, number>> | undefined,
): boolean {
  const m = { ...DEFAULT_TIER_MULTIPLIERS, ...multipliers };
  return m["Tier III"] === 1 && m["Tier I"] < 1;
}

export function migrateTierMultipliersToTierIBase(
  multipliers: Partial<Record<OutletPrTier, number>> | undefined,
): Record<OutletPrTier, number> {
  const m = normalizeOutletTierMultipliers(multipliers);
  if (!usesLegacyTierIIIBaseMultipliers(m)) return m;
  const scale = 1 / m["Tier I"];
  const scaled = {} as Record<OutletPrTier, number>;
  for (const tier of OUTLET_PR_TIERS) {
    scaled[tier] = Math.round(m[tier] * scale * 100) / 100;
  }
  return normalizeOutletTierMultipliers(scaled);
}

export function migrateCommissionRuleToTierIBase(rule: OutletCommissionRule): OutletCommissionRule {
  const tierMultipliers = migrateTierMultipliersToTierIBase(rule.tierMultipliers);
  if (!usesLegacyTierIIIBaseMultipliers(rule.tierMultipliers)) {
    return { ...rule, tierMultipliers };
  }
  const legacyMult = normalizeOutletTierMultipliers(rule.tierMultipliers);
  const tierIBase = rule.tierRates?.[OUTLET_BASE_TIER] ?? {
    wagePerHour: Math.round(rule.wagePerHour * legacyMult["Tier I"]),
    drinkPct: rule.drinkPct,
    tipPct: rule.tipPct,
    tablePct: rule.tablePct,
    otAfterHours: rule.otAfterHours,
  };
  return {
    ...rule,
    wagePerHour: tierIBase.wagePerHour,
    drinkPct: tierIBase.drinkPct,
    tipPct: tierIBase.tipPct,
    tablePct: tierIBase.tablePct,
    otAfterHours: tierIBase.otAfterHours,
    tierMultipliers,
    tierRates: rule.tierRates ?? buildDefaultTierRates(tierIBase),
  };
}

export function normalizeOutletTierMultipliers(
  partial?: Partial<Record<OutletPrTier, number>>,
): Record<OutletPrTier, number> {
  return { ...DEFAULT_TIER_MULTIPLIERS, ...partial };
}

export function getTierWageForRule(rule: OutletCommissionRule, tier: OutletPrTier): number {
  const tierRate = rule.tierRates?.[tier];
  if (tierRate?.wagePerHour != null) return snapTierWage(tierRate.wagePerHour);
  const mult = normalizeOutletTierMultipliers(rule.tierMultipliers)[tier];
  return tierWageFromMultiplier(rule.wagePerHour, mult);
}

export function getEffectiveOutletRule(
  outlet: string,
  prTier: string | undefined,
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
  shiftTierRates?: Record<OutletPrTier, OutletTierRateSettings>,
): OutletCommissionRule {
  const base = getOutletRule(outlet, rules);
  const tier = prTier as OutletPrTier;
  const shiftRate = tier && shiftTierRates?.[tier];
  if (shiftRate) {
    return {
      ...base,
      wagePerHour: snapTierWage(shiftRate.wagePerHour),
      drinkPct: shiftRate.drinkPct,
      tipPct: shiftRate.tipPct,
      tablePct: shiftRate.tablePct,
      otAfterHours: shiftRate.otAfterHours,
    };
  }
  const tierRate = tier && base.tierRates?.[tier];
  const mult = tier ? (base.tierMultipliers?.[tier] ?? 1) : 1;
  if (tierRate) {
    return {
      ...base,
      wagePerHour: snapTierWage(tierRate.wagePerHour),
      drinkPct: tierRate.drinkPct,
      tipPct: tierRate.tipPct,
      tablePct: tierRate.tablePct,
      otAfterHours: tierRate.otAfterHours,
    };
  }
  if (tier && mult !== 1) {
    return {
      ...base,
      wagePerHour: tierWageFromMultiplier(base.wagePerHour, mult),
    };
  }
  return { ...base, wagePerHour: snapTierWage(base.wagePerHour) };
}

export const SCALING_TIER_MULTIPLIERS: Record<string, number> = {
  ...DEFAULT_TIER_MULTIPLIERS,
};

function commissionRuleSeed(
  rule: Omit<OutletCommissionRule, "tierRates" | "tierMultipliers"> & {
    tierRates?: Partial<Record<OutletPrTier, OutletTierRateSettings>>;
    tierMultipliers?: Partial<Record<OutletPrTier, number>>;
  },
): OutletCommissionRule {
  const tierBase = {
    wagePerHour: snapTierWage(rule.wagePerHour),
    drinkPct: rule.drinkPct,
    tipPct: rule.tipPct,
    tablePct: rule.tablePct,
    otAfterHours: rule.otAfterHours,
  };
  return {
    ...rule,
    wagePerHour: tierBase.wagePerHour,
    tierMultipliers: normalizeOutletTierMultipliers(rule.tierMultipliers),
    tierRates: rule.tierRates
      ? snapTierRatesWages(normalizeTierRates(tierBase, rule.tierRates))
      : buildDefaultTierRates(tierBase),
  };
}

export const OUTLET_COMMISSION_RULES: OutletCommissionRule[] = [
  commissionRuleSeed({
    outlet: "Velvet 23",
    wagePerHour: 50,
    drinkPct: 8,
    tipPct: 15,
    tablePct: 10,
    otAfterHours: 6,
    platformPct: 5,
  }),
  commissionRuleSeed({ outlet: "Mermate", wagePerHour: 45, drinkPct: 10, tipPct: 12, tablePct: 8, otAfterHours: 6, platformPct: 5 }),
  commissionRuleSeed({ outlet: "Bear Lounge", wagePerHour: 50, drinkPct: 9, tipPct: 14, tablePct: 10, otAfterHours: 5, platformPct: 5 }),
  commissionRuleSeed({ outlet: "Onyx KL", wagePerHour: 55, drinkPct: 7, tipPct: 16, tablePct: 12, otAfterHours: 6, platformPct: 5 }),
  commissionRuleSeed({ outlet: "Urban Soul", wagePerHour: 45, drinkPct: 11, tipPct: 10, tablePct: 8, otAfterHours: 6, platformPct: 5 }),
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
    /** PR training tier — uses tier-specific wage & commission when set */
    prTier?: string;
    /** Per-shift tier rate snapshot — overrides outlet commission rules */
    shiftTierRates?: Record<OutletPrTier, OutletTierRateSettings>;
  },
  rules: OutletCommissionRule[] = OUTLET_COMMISSION_RULES,
) {
  const rule = getEffectiveOutletRule(input.outlet, input.prTier, rules, input.shiftTierRates);
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
  | "outlet-pending"
  | "outlet-request-pending";

/** Agency roster UI — en-route is shown as scheduled (only Scheduled / On duty labels). */
export function rosterPageDisplayStatus(status: RosterSlotStatus): RosterSlotStatus {
  return status === "en-route" ? "scheduled" : status;
}

export interface AgencyAssignmentMeta {
  agencyName?: string;
  agencyNote?: string;
  /** Posted / tied outlet shift id from Manage Outlet (e.g. posted-s4) */
  outletShiftId?: string;
  assignedAt: string;
  /** Epoch ms — used for "12 min ago" on PR Shifts */
  assignedAtMs?: number;
  respondedAt?: string;
  /** Event-wide headcount for Manage Outlet demand/supplied (defaults to 1). */
  eventDemand?: number;
  /** PRs already assigned to this event. */
  eventSupplied?: number;
  /** Linked outlet shift applicant row when outlet requested this PR */
  shiftApplicantId?: string;
  requestedByOutlet?: boolean;
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

/** Agency tied to this roster shift — assignment, swap request, or default tied agency. */
export function rosterSlotAgencyName(
  slot: AgencyRosterSlot,
  fallback = DEFAULT_PR_AGENCY_NAME,
): string {
  return slot.agencyAssignment?.agencyName ?? slot.outletSwap?.agencyName ?? fallback;
}

/** Agency label for a managed PR row — roster assignment, payroll link, or default tied agency. */
export function managedPrAgencyLabel(
  prId: string,
  roster: AgencyRosterSlot[],
  options: {
    agencyName?: string;
    freelancerPayrollByPrId?: Map<string, string>;
  } = {},
): string {
  const slotAgency = roster.find(
    (s) => s.prId === prId && (s.agencyAssignment?.agencyName || s.outletSwap?.agencyName),
  );
  if (slotAgency) return rosterSlotAgencyName(slotAgency, options.agencyName);

  if (isFreelancerPrId(prId)) {
    return options.freelancerPayrollByPrId?.get(prId) ?? "—";
  }

  return options.agencyName ?? DEFAULT_PR_AGENCY_NAME;
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
    prName: "Vicky",
    outlet: "Velvet 23",
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "scheduled",
    floorDrinks: 0,
    floorTips: 0,
    estPayout: 480,
  }),
  withRosterDate({
    id: "rs2",
    prId: "pr-comcard-alice",
    prName: "Alice",
    outlet: "Velvet 23",
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "scheduled",
    floorDrinks: 0,
    floorTips: 0,
    estPayout: 390,
  }),
  withRosterDate({
    id: "rs3",
    prId: "pr-comcard-moon",
    prName: "Moon",
    outlet: "Onyx KL",
    dateIso: DEFAULT_ROSTER_DATE_ISO,
    shift: "21:00 — 03:00",
    shiftStart: "21:00",
    shiftEnd: "03:00",
    status: "swap-pending",
  }),
  withRosterDate({
    id: "rs4",
    prId: "pr-comcard-victoria",
    prName: "Victoria",
    outlet: "Mermate",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 1),
    shift: "20:00 — 02:00",
    shiftStart: "20:00",
    shiftEnd: "02:00",
    status: "unavailable",
  }),
  withRosterDate({
    id: "rs6",
    prId: "p1",
    prName: "Vicky",
    outlet: "Mermate",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 1),
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "You are needed at Mermate Friday — lounge relaunch coverage",
      assignedAt: "18 Jun 2026 · 11:36",
      assignedAtMs: Date.now() - 12 * 60 * 1000,
      eventDemand: 16,
      eventSupplied: 11,
    },
  }),
  withRosterDate({
    id: "rs5",
    prId: "pr-comcard-charlotte",
    prName: "Charlotte",
    outlet: "Bear Lounge",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 1),
    shift: "22:30 — 04:30",
    shiftStart: "22:30",
    shiftEnd: "04:30",
    status: "scheduled",
  }),
  withRosterDate({
    id: "rs7",
    prId: "pr-comcard-angie",
    prName: "Angie",
    outlet: "Bear Lounge",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 1),
    shift: "22:30 — 04:30",
    shiftStart: "22:30",
    shiftEnd: "04:30",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "Bear Lounge launch — host table coverage needed",
      assignedAt: "18 Jun 2026 · 09:12",
      assignedAtMs: Date.now() - 45 * 60 * 1000,
      eventDemand: 14,
      eventSupplied: 9,
    },
  }),
  withRosterDate({
    id: "rs8",
    prId: "pr-comcard-alice",
    prName: "Alice",
    outlet: "Onyx KL",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 2),
    shift: "20:00 — 02:00",
    shiftStart: "20:00",
    shiftEnd: "02:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "Onyx KL rooftop — VIP host slot awaiting PR",
      assignedAt: "18 Jun 2026 · 14:05",
      assignedAtMs: Date.now() - 90 * 60 * 1000,
      eventDemand: 15,
      eventSupplied: 10,
    },
  }),
  withRosterDate({
    id: "rs9",
    prId: "pr-comcard-sarah",
    prName: "Sarah",
    outlet: "Urban Soul",
    dateIso: addDaysToIso(DEFAULT_ROSTER_DATE_ISO, 1),
    shift: "20:00 — 01:00",
    shiftStart: "20:00",
    shiftEnd: "01:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "Urban Soul Friday party — floor PR needed",
      assignedAt: "18 Jun 2026 · 16:22",
      assignedAtMs: Date.now() - 25 * 60 * 1000,
      eventDemand: 18,
      eventSupplied: 13,
    },
  }),
];

export interface AgencyManagedPR {
  id: string;
  name: string;
  /** Legal full name as printed on IC / passport */
  icName: string;
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
  /** Synced from PR portal profile */
  avatarPhoto?: string | null;
  comcardImageUrl?: string | null;
  portfolioPhotos?: (string | null)[];
}

export function sortAgencyPrsByName(prs: AgencyManagedPR[]): AgencyManagedPR[] {
  return [...prs].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export const SEED_AGENCY_PRS: AgencyManagedPR[] = sortAgencyPrsByName([
  {
    id: "p1",
    name: "Vicky",
    icName: "Victoria Tan Mei Lin",
    ic: "950312-14-8821",
    mobile: "+60 12-881 2201",
    email: "Vicky@inz.my",
    age: 24,
    height: 153,
    weight: 40,
    race: "Chinese",
    languages: ["English", "Mandarin", "Cantonese"],
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
    avatarPhoto: SEED_PR_AVATAR_IMAGE,
    comcardImageUrl: SEED_PR_COMCARD_IMAGE,
    portfolioPhotos: buildSeedPrPortfolio(),
  },
  ...SEED_COMCARD_AGENCY_PRS,
]);

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

/** Push PR portal profile media onto the matching agency roster record */
export function syncAgencyPrFromPrPortal(
  agencyPr: AgencyManagedPR,
  prId: string,
  portal: {
    prDisplayName: string | null;
    prIcName: string | null;
    prMobile: string | null;
    prEmail: string | null;
    prAvatarPhoto: string | null;
    prComcard: PrComcard;
    prPortfolio: (string | null)[];
    prLanguages: string[];
  },
): AgencyManagedPR {
  if (agencyPr.id !== prId) return agencyPr;
  const displayName = portal.prDisplayName?.trim();
  const icName = portal.prIcName?.trim();
  const mobile = portal.prMobile?.trim();
  const email = portal.prEmail?.trim();
  return {
    ...agencyPr,
    ...(displayName ? { name: displayName } : {}),
    ...(icName ? { icName } : {}),
    ...(mobile ? { mobile } : {}),
    ...(email ? { email } : {}),
    avatarPhoto: portal.prAvatarPhoto ?? agencyPr.avatarPhoto,
    comcardImageUrl: portal.prComcard.imageUrl ?? agencyPr.comcardImageUrl,
    portfolioPhotos: portal.prPortfolio.some(Boolean)
      ? portal.prPortfolio
      : agencyPr.portfolioPhotos,
    languages: portal.prLanguages.length ? portal.prLanguages : agencyPr.languages,
    height: portal.prComcard.height,
    weight: portal.prComcard.weight,
    age: portal.prComcard.age,
  };
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
];

/** Dropped from pending sign-ups — male names / legacy demo rows */
export const RETIRED_PENDING_PR_IDS = new Set(["signup-raj", "signup-kevin-invite"]);

export const SEED_PENDING_FREELANCER_PAYROLLS: PendingFreelancerPayroll[] = [];

/** Legacy freelancer payroll demo row (Jaya Nair) — strip on hydrate */
export const RETIRED_PENDING_FREELANCER_PAYROLL_IDS = new Set(["fp-seed-jaya"]);

export function pendingPRToManagedPR(p: PendingPR): AgencyManagedPR {
  const langs =
    p.languages === "Pending profile" ? ["English"] : parsePendingLanguages(p.languages);
  return {
    id: p.targetPrId ?? `p-new-${p.id}`,
    name: p.name,
    icName: p.name,
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

export type AgencySubscriptionPlanId =
  | "starter"
  | "plus"
  | "growth"
  | "enterprise"
  | "scale"
  | "renego";

export interface AgencySubscriptionPlan {
  id: AgencySubscriptionPlanId;
  label: string;
  /** Monthly fee — null when price is negotiated with admin */
  monthlyRm: number | null;
  priceLabel?: string;
  /** Max PVs/week on this plan (upper bound for ranged tiers) */
  pvLimit: number;
  /** Shown on plan cards — e.g. "5 PV/Week" */
  capacityLabel: string;
  description: string;
  /** Requires InnocenZ admin to quote pricing */
  renegotiate?: boolean;
}

export const AGENCY_SUBSCRIPTION_PLANS: AgencySubscriptionPlan[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyRm: 499,
    pvLimit: 5,
    capacityLabel: "5 PV/Week",
    description: "InnocenZ Agency · core portal access",
  },
  {
    id: "plus",
    label: "Plus",
    monthlyRm: 999,
    pvLimit: 10,
    capacityLabel: "10 PV/Week",
    description: "Growing roster · payroll & history",
  },
  {
    id: "growth",
    label: "Growth",
    monthlyRm: 1999,
    pvLimit: 25,
    capacityLabel: "25 PV/Week",
    description: "Expanded roster · payroll & reporting",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyRm: 3999,
    pvLimit: 100,
    capacityLabel: "26–100 PV/Week",
    description: "Large roster · priority support",
  },
  {
    id: "scale",
    label: "Scale",
    monthlyRm: 5999,
    pvLimit: 200,
    capacityLabel: "101–200 PV/Week",
    description: "High volume · dedicated success",
  },
  {
    id: "renego",
    label: "Custom",
    monthlyRm: null,
    priceLabel: "Renegotiate Price",
    pvLimit: Number.POSITIVE_INFINITY,
    capacityLabel: "201+ PV/Week",
    description: "Enterprise volume · custom terms with InnocenZ admin",
    renegotiate: true,
  },
];

/** Demo billing: 1 PV issued per active PR per payroll week. */
export const AGENCY_PVS_PER_PR_PER_WEEK = 1;

/** @deprecated use AGENCY_PVS_PER_PR_PER_WEEK */
export const AGENCY_PVS_PER_PR_PER_MONTH = AGENCY_PVS_PER_PR_PER_WEEK;

export function agencyActivePrCount(
  agencyPRs: Pick<AgencyManagedPR, "detached">[],
): number {
  return agencyPRs.filter((p) => !p.detached).length;
}

export function agencyExpectedWeeklyPvFromPrCount(prCount: number): number {
  return Math.max(0, prCount) * AGENCY_PVS_PER_PR_PER_WEEK;
}

/** @deprecated use agencyExpectedWeeklyPvFromPrCount */
export const agencyExpectedMonthlyPvFromPrCount = agencyExpectedWeeklyPvFromPrCount;

export function resolveAgencySubscriptionPlanForWeeklyPv(
  weeklyPv: number,
): AgencySubscriptionPlan {
  for (const plan of AGENCY_SUBSCRIPTION_PLANS) {
    if (plan.renegotiate) continue;
    if (weeklyPv <= plan.pvLimit) return plan;
  }
  return getAgencySubscriptionPlan("renego");
}

/** @deprecated use resolveAgencySubscriptionPlanForWeeklyPv */
export const resolveAgencySubscriptionPlanForMonthlyPv = resolveAgencySubscriptionPlanForWeeklyPv;

export function resolveAgencySubscriptionPlanForRoster(
  agencyPRs: Pick<AgencyManagedPR, "detached">[],
): AgencySubscriptionPlan {
  return resolveAgencySubscriptionPlanForWeeklyPv(
    agencyExpectedWeeklyPvFromPrCount(agencyActivePrCount(agencyPRs)),
  );
}

export function agencySubscriptionAllowsWeeklyPv(
  plan: AgencySubscriptionPlan,
  weeklyPv: number,
): boolean {
  if (plan.renegotiate) return true;
  return weeklyPv <= plan.pvLimit;
}

export function syncAgencyOwnerSubscriptionPlan(
  owner: AgencyOwnerSettings,
  agencyPRs: Pick<AgencyManagedPR, "detached">[],
): AgencyOwnerSettings {
  const plan = resolveAgencySubscriptionPlanForRoster(agencyPRs);
  return { ...owner, subscriptionPlanId: plan.id };
}

export function agencyWeeklyPvCount(
  pvs: { weekStartIso?: string; issued: string }[],
  weekStartIso: string,
): number {
  return pvs.filter((pv) => pv.weekStartIso === weekStartIso).length;
}

/** @deprecated use agencyWeeklyPvCount */
export function agencyMonthlyPvCount(
  pvs: { weekStartIso?: string; issued: string }[],
  _agencyPRs: { id: string; name: string; ic?: string }[] = [],
  reference = new Date(),
): number {
  void reference;
  return pvs.filter((pv) => Boolean(pv.weekStartIso)).length;
}

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
  subscriptionPlanId: resolveAgencySubscriptionPlanForRoster(SEED_AGENCY_PRS).id,
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
      { label: "Daily wages", detail: "Vicky · 18 Jun sealed shift", amount: 360, group: "payroll" },
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
      { label: "Daily wages", detail: "Bernice · 27 Apr + Hazel · 20–22 May shifts", amount: 1050, group: "payroll" },
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
      { label: "Daily wages", detail: "Charlotte · 9 May sealed shift", amount: 350, group: "payroll" },
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
      { label: "Daily wages", detail: "Alice + guest PR · 2 shifts", amount: 1420, group: "payroll" },
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
      { label: "Daily wages", detail: "Grace · 14 May shift", amount: 350, group: "payroll" },
      { label: "Commission – Drinks", detail: "Urban Soul tap log", amount: 1420, group: "commissions" },
      { label: "Platform fee (5%)", detail: "InnocenZ cycle fee", amount: 180, group: "fees" },
    ],
  },
  {
    id: "AINV-2026-0601",
    outlet: "Platform fee",
    amount: 3999,
    issueDate: "1 Jun 2026",
    issueTime: "08:00",
    dueDate: "1 Jun 2026",
    status: "SETTLED",
    aging: "current",
    linkedPvIds: [],
    kind: "agency",
    counterparty: "InnocenZ Platform",
    lines: [
      {
        label: "Atlas Agency subscription",
        detail: "Jun 2026 · Enterprise · SaaS",
        amount: 3999,
        group: "fees",
      },
    ],
  },
];

export interface AgencyReconciliationDay {
  dateIso: string;
  dateLabel: string;
  /** Sun–Sat week start (inclusive). */
  weekStartIso?: string;
  /** Sat week end (inclusive). */
  weekEndIso?: string;
  outletSalesTotal: number;
  pvTotal: number;
  variance: number;
  /** Sum of sealed shift earnings for agency PRs this week (agency–PR reconcile). */
  prIncomeTotal?: number;
  /** PR earnings − PV net for the week. */
  prVariance?: number;
  varianceReason?: string;
  agencyAdjustDrinks?: number;
  agencyAdjustTips?: number;
  agencyAdjustReason?: string;
  agencyConfirmed: boolean;
  outletConfirmed: boolean;
  /** PR ids who confirmed weekly earnings in the PR portal. */
  prConfirmedIds?: string[];
}

export const SEED_RECONCILIATION: AgencyReconciliationDay = {
  dateIso: DEFAULT_ROSTER_DATE_ISO,
  dateLabel: fmtDateLabelFromIso(DEFAULT_ROSTER_DATE_ISO),
  outletSalesTotal: 14820,
  pvTotal: 14760,
  variance: 60,
  prIncomeTotal: 0,
  prVariance: 0,
  agencyConfirmed: false,
  outletConfirmed: true,
  prConfirmedIds: [],
};

export const OUTLET_NAMES = [...new Set(OUTLET_COMMISSION_RULES.map((r) => r.outlet))];

export function nowAgencyDateTime() {
  const d = new Date();
  return {
    date: d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
  };
}

const DEMO_LAYOUT_ROSTER_IDS = new Set(["rs2", "rs3", "rs4"]);
/** Demo slots — seed outletSwap state wins on hydrate (clears stale agency swap requests). */
const FORCE_SEED_OUTLET_SWAP_IDS = new Set(["rs1", "rs3"]);
/** Removed from seed — drop stale extras on hydrate */
const RETIRED_DEMO_ROSTER_IDS = new Set([
  "rs-demo-p7",
  "rs7",
  "rs-demo-p3",
  "rs-demo-p4",
  "rs-demo-p5",
]);

/** Placeholder demo PRs removed from Manage PR — migrate roster slots on hydrate. */
export const RETIRED_DEMO_PR_IDS = new Set([
  "p2",
  "p3",
  "p4",
  "p5",
  "p6",
  "p7",
  "freelancer-jaya",
]);

function rosterSlotUsesRetiredPr(slot: Pick<AgencyRosterSlot, "prId">): boolean {
  return RETIRED_DEMO_PR_IDS.has(slot.prId);
}

function mergeRosterSlotFromSeed(
  saved: AgencyRosterSlot,
  seedSlot: AgencyRosterSlot,
  dateIso: string,
): AgencyRosterSlot {
  const preserveFloor = saved.status === "on-duty" && !!saved.checkedInAt;
  return {
    ...seedSlot,
    dateIso,
    prId: seedSlot.prId,
    prName: seedSlot.prName,
    outlet: seedSlot.outlet,
    status: preserveFloor ? saved.status : seedSlot.status,
    checkedInAt: preserveFloor ? saved.checkedInAt : seedSlot.checkedInAt,
    floorDrinks: preserveFloor ? (saved.floorDrinks ?? seedSlot.floorDrinks) : seedSlot.floorDrinks,
    floorTips: preserveFloor ? (saved.floorTips ?? seedSlot.floorTips) : seedSlot.floorTips,
    estPayout: preserveFloor ? (saved.estPayout ?? seedSlot.estPayout) : seedSlot.estPayout,
    outletSwap: seedSlot.outletSwap ?? saved.outletSwap,
    agencyAssignment: seedSlot.agencyAssignment ?? saved.agencyAssignment,
  };
}

/** Prefer canonical agency PR name over stale roster slot labels (e.g. Luna → Vicky). */
export function resolveRosterPrName(
  prId: string,
  rosterName?: string,
  agencyPRs?: { id: string; name: string }[],
): string {
  const canonical = agencyPRs?.find((p) => p.id === prId)?.name?.trim();
  if (canonical) return canonical;
  if (rosterName === "Luna" && prId === TIED_DEMO_ROSTER_PR_ID) return "Vicky";
  return rosterName?.trim() || prId;
}

function mergeRosterSlotPrName(
  saved: AgencyRosterSlot,
  seedSlot: AgencyRosterSlot,
  reassigned: boolean,
): string {
  if (reassigned) return saved.prName;
  if (saved.prName === "Luna" && seedSlot.prName !== "Luna") return seedSlot.prName;
  return saved.prName ?? seedSlot.prName;
}

/** Keep demo agency inbox (assignments / swaps) visible after localStorage hydrate */
export function mergeAgencyRoster(
  persisted: AgencyRosterSlot[] | undefined,
  seed: AgencyRosterSlot[] = SEED_AGENCY_ROSTER,
): AgencyRosterSlot[] {
  const normalize = (slot: AgencyRosterSlot): AgencyRosterSlot => {
    const dateIso = migrateDemoDateIso(slot.dateIso);
    return withRosterDate({ ...slot, dateIso });
  };

  if (!persisted?.length) return seed.map(normalize);
  const seedIds = new Set(seed.map((s) => s.id));
  const extras = persisted
    .filter(
      (s) =>
        !seedIds.has(s.id) &&
        !RETIRED_DEMO_ROSTER_IDS.has(s.id) &&
        !rosterSlotUsesRetiredPr(s),
    )
    .map((slot) =>
      slot.prId === TIED_DEMO_ROSTER_PR_ID && slot.prName === "Luna"
        ? { ...slot, prName: "Vicky" }
        : slot,
    );
  const merged = [
    ...extras,
    ...seed.map((seedSlot) => {
      const saved = persisted.find((s) => s.id === seedSlot.id);
      if (!saved) return seedSlot;
      const dateIso = migrateDemoDateIso(
        saved.dateIso < DEFAULT_ROSTER_DATE_ISO && seedSlot.dateIso >= DEFAULT_ROSTER_DATE_ISO
          ? seedSlot.dateIso
          : saved.dateIso ?? seedSlot.dateIso,
      );
      if (rosterSlotUsesRetiredPr(saved)) {
        return normalize(mergeRosterSlotFromSeed(saved, seedSlot, dateIso));
      }
      if (DEMO_LAYOUT_ROSTER_IDS.has(seedSlot.id)) {
        const layoutReassigned = saved.prId !== seedSlot.prId;
        return normalize({
          ...seedSlot,
          ...saved,
          status: seedSlot.status,
          dateIso,
          outlet: seedSlot.outlet,
          prId: layoutReassigned ? saved.prId : (saved.prId ?? seedSlot.prId),
          prName: mergeRosterSlotPrName(saved, seedSlot, layoutReassigned),
          checkedInAt: saved.checkedInAt ?? seedSlot.checkedInAt,
          floorDrinks: saved.floorDrinks ?? seedSlot.floorDrinks,
          floorTips: saved.floorTips ?? seedSlot.floorTips,
          estPayout: saved.estPayout ?? seedSlot.estPayout,
          outletSwap: seedSlot.outletSwap ?? saved.outletSwap,
        });
      }
      const keepAssignmentPending =
        seedSlot.status === "assignment-pending" && saved.status !== "scheduled";
      const keepOutletRequestPending =
        seedSlot.status === "outlet-request-pending" &&
        saved.status !== "scheduled" &&
        saved.status !== "assignment-pending";
      const keepSwapPending =
        seedSlot.outletSwap?.status === "pending_pr" &&
        saved.outletSwap?.status !== "approved";
      const preserveLiveOnDuty =
        saved.status === "on-duty" &&
        seedSlot.status !== "on-duty" &&
        !!saved.checkedInAt;
      const staleOnDuty =
        saved.status === "on-duty" &&
        seedSlot.status !== "on-duty" &&
        !saved.checkedInAt;
      const seedFloorActive =
        seedSlot.status === "en-route" ||
        (seedSlot.status === "on-duty" && !!seedSlot.checkedInAt);
      const savedFloorIdle = saved.status === "scheduled" && !saved.checkedInAt;
      const restoreSeedFloor =
        seedFloorActive && savedFloorIdle && !preserveLiveOnDuty && !staleOnDuty;
      const reassigned =
        !rosterSlotUsesRetiredPr(saved) && saved.prId !== seedSlot.prId;
      return normalize({
        ...seedSlot,
        ...saved,
        dateIso,
        prId: reassigned ? saved.prId : saved.prId ?? seedSlot.prId,
        prName: mergeRosterSlotPrName(saved, seedSlot, reassigned),
        status: keepOutletRequestPending
          ? seedSlot.status
          : keepAssignmentPending
          ? seedSlot.status
          : preserveLiveOnDuty
            ? "on-duty"
            : staleOnDuty
              ? seedSlot.status
              : restoreSeedFloor
                ? seedSlot.status
                : saved.status,
        checkedInAt: preserveLiveOnDuty
          ? saved.checkedInAt
          : staleOnDuty
            ? undefined
            : restoreSeedFloor
              ? seedSlot.checkedInAt
              : saved.checkedInAt ?? seedSlot.checkedInAt,
        floorDrinks: staleOnDuty || restoreSeedFloor
          ? seedSlot.floorDrinks
          : saved.floorDrinks ?? seedSlot.floorDrinks,
        floorTips: staleOnDuty || restoreSeedFloor
          ? seedSlot.floorTips
          : saved.floorTips ?? seedSlot.floorTips,
        agencyAssignment: keepOutletRequestPending || keepAssignmentPending
          ? seedSlot.agencyAssignment
          : saved.agencyAssignment ?? seedSlot.agencyAssignment,
        outletSwap: FORCE_SEED_OUTLET_SWAP_IDS.has(seedSlot.id)
          ? seedSlot.outletSwap
          : keepSwapPending
            ? seedSlot.outletSwap
            : saved.outletSwap ?? seedSlot.outletSwap,
      });
    }),
  ];
  return merged.map(normalize);
}
