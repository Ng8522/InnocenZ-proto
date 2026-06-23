/** Outlet portal demo config — workspace rates, tags, dress codes */

import {
  buildDefaultTierRates,
  cloneTierRates,
  getOutletRule,
  normalizeTierRates,
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  snapTierWage,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { DEFAULT_PER_DRINK_RM, DEFAULT_PER_TABLE_RM } from "@/lib/outlet-financial-sync";
import { outletMatches } from "@/lib/portal-sync";

export type ShiftDestination = "agency" | "marketplace" | "both";

export const SHIFT_DESTINATION_LABELS: Record<ShiftDestination, string> = {
  agency: "Linked agency only",
  marketplace: "Freelancers",
  both: "Agency + Freelancers",
};

export const DRESS_CODE_OPTIONS = [
  "Black elegant",
  "Cocktail attire",
  "Brand uniform",
  "Smart casual",
  "Formal gown",
] as const;

export const PR_RATING_TAGS = [
  "Punctual",
  "Friendly",
  "Professional",
  "Great upsell",
  "Team player",
  "Needs coaching",
] as const;

export interface OutletDrinkPrice {
  id: string;
  name: string;
  priceRm: number;
}

export const DEFAULT_OUTLET_DRINK_MENU: OutletDrinkPrice[] = [
  { id: "beer", name: "Beer", priceRm: 45 },
  { id: "wine", name: "Wine", priceRm: 85 },
  { id: "whisky", name: "Whisky", priceRm: 120 },
  { id: "champagne", name: "Champagne", priceRm: 350 },
  { id: "hennessy", name: "Hennessy VSOP", priceRm: 280 },
];

export function averageDrinkPrice(menu: OutletDrinkPrice[]): number {
  if (menu.length === 0) return DEFAULT_PER_DRINK_RM;
  const total = menu.reduce((sum, d) => sum + d.priceRm, 0);
  return Math.round(total / menu.length);
}

export function drinkMenuPriceRange(menu: OutletDrinkPrice[]): { min: number; max: number } {
  if (menu.length === 0) return { min: DEFAULT_PER_DRINK_RM, max: DEFAULT_PER_DRINK_RM };
  const prices = menu.map((d) => d.priceRm);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function workspaceBaseRates(ws: Pick<
  OutletWorkspaceSettings,
  "basePayPerHour" | "drinkPct" | "tipPct" | "tablePct" | "otAfterHours"
>): OutletTierRateSettings {
  return {
    wagePerHour: ws.basePayPerHour,
    drinkPct: ws.drinkPct,
    tipPct: ws.tipPct,
    tablePct: ws.tablePct,
    otAfterHours: ws.otAfterHours,
  };
}

export function normalizeOutletWorkspace(
  ws: Partial<OutletWorkspaceSettings> | undefined,
): OutletWorkspaceSettings {
  const drinkMenu =
    ws?.drinkMenu && ws.drinkMenu.length > 0
      ? ws.drinkMenu.map((d) => ({ ...d }))
      : DEFAULT_OUTLET_DRINK_MENU.map((d) => ({ ...d }));
  const merged = {
    ...DEFAULT_OUTLET_WORKSPACE,
    ...ws,
    drinkMenu,
  };
  const tierRates = normalizeTierRates(workspaceBaseRates(merged), ws?.tierRates);
  const baseTier = tierRates[OUTLET_BASE_TIER];
  return {
    ...merged,
    drinkMenu,
    perDrinkRm: ws?.perDrinkRm ?? averageDrinkPrice(drinkMenu),
    tierRates,
    basePayPerHour: baseTier.wagePerHour,
    drinkPct: baseTier.drinkPct,
    tipPct: baseTier.tipPct,
    tablePct: baseTier.tablePct,
    otAfterHours: baseTier.otAfterHours,
  };
}

export function resolveShiftTierRates(
  shift: { tierRates?: Record<OutletPrTier, OutletTierRateSettings>; payPerHour: number },
  workspace: Pick<OutletWorkspaceSettings, "tierRates">,
): Record<OutletPrTier, OutletTierRateSettings> {
  if (shift.tierRates) return shift.tierRates;
  const baseTier = workspace.tierRates[OUTLET_BASE_TIER];
  return buildDefaultTierRates({
    wagePerHour: shift.payPerHour,
    drinkPct: baseTier.drinkPct,
    tipPct: baseTier.tipPct,
    tablePct: baseTier.tablePct,
    otAfterHours: baseTier.otAfterHours,
  });
}

export function patchShiftTierWages(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  wages: Partial<Record<OutletPrTier, number>>,
): Record<OutletPrTier, OutletTierRateSettings> {
  const out = cloneTierRates(tierRates);
  for (const tier of OUTLET_PR_TIERS) {
    if (wages[tier] != null) {
      out[tier] = { ...out[tier], wagePerHour: snapTierWage(wages[tier]!) };
    }
  }
  return out;
}

export function patchShiftTierSalesTargets(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  targets: Partial<Record<OutletPrTier, number>>,
): Record<OutletPrTier, OutletTierRateSettings> {
  const out = cloneTierRates(tierRates);
  for (const tier of OUTLET_PR_TIERS) {
    if (targets[tier] != null) {
      out[tier] = { ...out[tier], targetSalesRm: targets[tier] };
    }
  }
  return out;
}

/** Demo per-shift PR sales targets (RM) — Post Job optional targets, seeded for outlet home */
export const DEMO_SHIFT_TIER_SALES_TARGETS: Record<string, Partial<Record<OutletPrTier, number>>> = {
  s1: {
    "Tier I": 800,
    "Tier II": 1000,
    "Tier III": 1200,
    "Tier IV": 1500,
    "Tier V": 2000,
  },
  s2: {
    "Tier I": 1000,
    "Tier II": 1200,
    "Tier III": 1400,
    "Tier IV": 1600,
    "Tier V": 2200,
  },
  s3: {
    "Tier I": 600,
    "Tier II": 750,
    "Tier III": 900,
    "Tier IV": 1100,
    "Tier V": 1400,
  },
  s4: { "Tier I": 700, "Tier II": 850, "Tier III": 1000, "Tier IV": 1200, "Tier V": 1500 },
  s5: { "Tier I": 800, "Tier II": 950, "Tier III": 1100, "Tier IV": 1300, "Tier V": 1600 },
  s6: { "Tier I": 900, "Tier II": 1050, "Tier III": 1200, "Tier IV": 1400, "Tier V": 1800 },
  s7: { "Tier I": 750, "Tier II": 900, "Tier III": 1050, "Tier IV": 1250, "Tier V": 1550 },
  s8: { "Tier I": 650, "Tier II": 800, "Tier III": 950, "Tier IV": 1150, "Tier V": 1450 },
  s9: { "Tier I": 850, "Tier II": 1000, "Tier III": 1150, "Tier IV": 1350, "Tier V": 1700 },
  s10: { "Tier I": 900, "Tier II": 1050, "Tier III": 1200, "Tier IV": 1400, "Tier V": 1750 },
  s11: { "Tier I": 700, "Tier II": 850, "Tier III": 1000, "Tier IV": 1200, "Tier V": 1500 },
  s12: { "Tier I": 750, "Tier II": 900, "Tier III": 1050, "Tier IV": 1250, "Tier V": 1600 },
  s8b: { "Tier I": 650, "Tier II": 800, "Tier III": 950, "Tier IV": 1150, "Tier V": 1450 },
};

/** Map agency PR training level to a valid outlet tier (defaults to base tier). */
export function resolveOutletPrTier(trainingLevel?: string): OutletPrTier {
  if (trainingLevel && OUTLET_PR_TIERS.includes(trainingLevel as OutletPrTier)) {
    return trainingLevel as OutletPrTier;
  }
  return OUTLET_BASE_TIER;
}

/** Per-PR sales target (RM) from outlet shift tier rates. */
export function tierSalesTargetForPr(
  tierRates: Record<OutletPrTier, OutletTierRateSettings> | undefined,
  trainingLevel?: string,
): number {
  if (!tierRates) return 0;
  const tier = resolveOutletPrTier(trainingLevel);
  return tierRates[tier]?.targetSalesRm ?? 0;
}

export function findOutletShiftForPr<
  T extends { id: string; outletName: string; status: string; prs: string[] },
>(shifts: T[], outlet: string, prId: string, shiftId?: string): T | undefined {
  if (shiftId) {
    const byId = shifts.find((s) => s.id === shiftId);
    if (byId && outletMatches(byId.outletName, outlet)) return byId;
  }
  const assigned = shifts.find(
    (s) =>
      outletMatches(s.outletName, outlet) &&
      s.status !== "sealed" &&
      s.prs.includes(prId),
  );
  if (assigned) return assigned;
  return shifts.find(
    (s) => outletMatches(s.outletName, outlet) && s.status !== "sealed",
  );
}

/** Match outlet shift row to an agency roster assignment (outlet + shift time). */
export function findOutletShiftForRosterSlot<
  T extends { outletName: string; shift: string; event?: string; date?: string; status?: string },
>(shifts: T[], slot: { outlet: string; shift: string }): T | undefined {
  const matches = shifts.filter(
    (s) => outletMatches(s.outletName, slot.outlet) && s.status !== "sealed",
  );
  if (matches.length === 0) return undefined;
  const byTime = matches.find((s) => s.shift === slot.shift);
  if (byTime) return byTime;
  return matches.find((s) => s.date === "Tonight") ?? matches[0];
}

export function ensureShiftSalesTargets<T extends {
  id: string;
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
}>(shift: T): T {
  const demo = DEMO_SHIFT_TIER_SALES_TARGETS[shift.id];
  if (!demo) return shift;
  const hasTargets = OUTLET_PR_TIERS.some((t) => (shift.tierRates[t].targetSalesRm ?? 0) > 0);
  if (hasTargets) return shift;
  return {
    ...shift,
    tierRates: patchShiftTierSalesTargets(shift.tierRates, demo),
  };
}

export function migrateShiftTierRates<T extends {
  id?: string;
  tierRates?: Record<OutletPrTier, OutletTierRateSettings>;
  payPerHour: number;
}>(
  shift: T,
  workspace: Pick<OutletWorkspaceSettings, "tierRates">,
): T & { tierRates: Record<OutletPrTier, OutletTierRateSettings>; payPerHour: number } {
  const tierRates = resolveShiftTierRates(shift, workspace);
  const migrated = {
    ...shift,
    tierRates,
    payPerHour: tierRates[OUTLET_BASE_TIER].wagePerHour,
  };
  if (shift.id) {
    return ensureShiftSalesTargets(migrated as T & { id: string; tierRates: Record<OutletPrTier, OutletTierRateSettings> });
  }
  return migrated;
}

export interface OutletWorkspaceSettings {
  outletName: string;
  basePayPerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  /** Wage & commission per PR training tier */
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  /** Legacy average — derived from drinkMenu on save */
  perDrinkRm: number;
  perTableRm: number;
  drinkMenu: OutletDrinkPrice[];
  happyHourStart: string;
  happyHourEnd: string;
  /** Multiplier applied to drink commission during happy hour (e.g. 1.15 = +15%) */
  happyHourDrinkBoost: number;
}

export interface OutletSettings {
  venueName: string;
  location: string;
  notifyShiftUpdates: boolean;
  notifyReconciliation: boolean;
  notifyInvoiceDue: boolean;
}

export interface OutletOwnerSettings {
  ownerName: string;
  mobile: string;
  email: string;
  ic: string;
  orgName: string;
  otpChannel: "email" | "phone";
  accountActivated: boolean;
  avatarPhoto?: string | null;
  subscriptionPlanId?: OutletSubscriptionPlanId;
}

export type OutletSubscriptionPlanId = "starter" | "plus" | "pro" | "enterprise";

export interface OutletSubscriptionPlan {
  id: OutletSubscriptionPlanId;
  label: string;
  monthlyRm: number;
  shiftLimit: number;
  capacityLabel: string;
  description: string;
}

export const OUTLET_SUBSCRIPTION_PLANS: OutletSubscriptionPlan[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyRm: 499,
    shiftLimit: 12,
    capacityLabel: "Up to 12 shifts / mo",
    description: "Single floor · core ops & reports",
  },
  {
    id: "plus",
    label: "Plus",
    monthlyRm: 799,
    shiftLimit: 30,
    capacityLabel: "Up to 30 shifts / mo",
    description: "Growing venue · sales dashboard & history",
  },
  {
    id: "pro",
    label: "Pro",
    monthlyRm: 1299,
    shiftLimit: 60,
    capacityLabel: "Up to 60 shifts / mo",
    description: "Multi-event nights · workspace & tier rules",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyRm: 1999,
    shiftLimit: 9999,
    capacityLabel: "Unlimited shifts",
    description: "Multi-venue groups · priority support",
  },
];

export function getOutletSubscriptionPlan(id?: OutletSubscriptionPlanId | null): OutletSubscriptionPlan {
  return OUTLET_SUBSCRIPTION_PLANS.find((p) => p.id === id) ?? OUTLET_SUBSCRIPTION_PLANS[1];
}

export interface OutletSubscriptionInvoice {
  id: string;
  issueDate: string;
  detail: string;
  amount: number;
  status: "SETTLED" | "PENDING";
}

export const OUTLET_SUBSCRIPTION_BILLING: OutletSubscriptionInvoice[] = [
  {
    id: "SUB-2026-0601",
    issueDate: "1 Jun 2026",
    detail: "Jun 2026 · Plus · InnocenZ Outlet SaaS",
    amount: 799,
    status: "SETTLED",
  },
  {
    id: "SUB-2026-0501",
    issueDate: "1 May 2026",
    detail: "May 2026 · Plus · InnocenZ Outlet SaaS",
    amount: 799,
    status: "SETTLED",
  },
];

export interface OutletFinanceHead {
  name: string;
  ic: string;
  email: string;
}

export interface OutletOpsHead {
  name: string;
  ic: string;
  email: string;
}

export interface ShiftApplicant {
  id: string;
  shiftId: string;
  prId: string;
  prName: string;
  rating: number;
  status: "pending" | "accepted" | "declined";
}

const velvetRule = getOutletRule("Velvet 23");
const velvetTierBase = {
  wagePerHour: velvetRule.wagePerHour,
  drinkPct: velvetRule.drinkPct,
  tipPct: velvetRule.tipPct,
  tablePct: velvetRule.tablePct,
  otAfterHours: velvetRule.otAfterHours,
};

export const DEFAULT_OUTLET_WORKSPACE: OutletWorkspaceSettings = {
  outletName: "Velvet 23",
  basePayPerHour: velvetRule.wagePerHour,
  drinkPct: velvetRule.drinkPct,
  tipPct: velvetRule.tipPct,
  tablePct: velvetRule.tablePct,
  otAfterHours: velvetRule.otAfterHours,
  tierRates: normalizeTierRates(velvetTierBase, velvetRule.tierRates),
  perDrinkRm: DEFAULT_PER_DRINK_RM,
  perTableRm: DEFAULT_PER_TABLE_RM,
  drinkMenu: DEFAULT_OUTLET_DRINK_MENU.map((d) => ({ ...d })),
  happyHourStart: "20:00",
  happyHourEnd: "22:00",
  happyHourDrinkBoost: 1.15,
};

export const DEFAULT_OUTLET_SETTINGS: OutletSettings = {
  venueName: "Velvet 23",
  location: "Bukit Bintang, KL",
  notifyShiftUpdates: true,
  notifyReconciliation: true,
  notifyInvoiceDue: true,
};

export const DEFAULT_OUTLET_OWNER: OutletOwnerSettings = {
  ownerName: "Chen Wei Jie",
  mobile: "+60 11-234 5678",
  email: "owner@velvet23.my",
  ic: "820315-10-8834",
  orgName: "Velvet 23",
  otpChannel: "email",
  accountActivated: true,
  avatarPhoto: null,
  subscriptionPlanId: "plus",
};

export const DEFAULT_OUTLET_FINANCE_HEAD: OutletFinanceHead = {
  name: "Michelle Lim",
  ic: "900412-14-2210",
  email: "finance@velvet23.my",
};

export const DEFAULT_OUTLET_OPS_HEAD: OutletOpsHead = {
  name: "Ahmad Razif",
  ic: "880707-08-5511",
  email: "ops@velvet23.my",
};

export {
  getOutletWeeklyReport,
  type OutletWeeklyDaySales,
  type OutletWeeklyReport,
} from "@/lib/velvet-week-demo";

export function shiftHoursFromLabel(shift: string): number {
  const segments = shift.replace(/—/g, "-").split(/\s*-\s*/);
  if (segments.length < 2) return 6;
  const parse = (s: string) => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  const start = parse(segments[0]);
  let end = parse(segments[1]);
  if (end <= start) end += 24 * 60;
  return Math.max(1, Math.round((end - start) / 60));
}
