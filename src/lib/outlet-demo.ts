/** Outlet portal demo config — workspace rates, tags, dress codes */

import {
  buildDefaultTierRates,
  cloneTierRates,
  estimateShiftLaborCost,
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

export const DRESS_CODE_OTHER_ID = "Other";

export function isOtherDressCode(code: string | undefined): boolean {
  return code === DRESS_CODE_OTHER_ID;
}

export function formatDressCodeLabel(dressCode: string, customDressCode?: string): string {
  if (isOtherDressCode(dressCode)) {
    const name = customDressCode?.trim();
    return name || DRESS_CODE_OTHER_ID;
  }
  return dressCode;
}

export function resolveDressCode(dressCode: string, customDressCode?: string): string {
  if (isOtherDressCode(dressCode)) {
    return customDressCode?.trim() || DRESS_CODE_OTHER_ID;
  }
  return dressCode;
}

export type ShiftEventKind = "normal" | "special";

export const SHIFT_EVENT_KIND_LABELS: Record<ShiftEventKind, string> = {
  normal: "Normal event",
  special: "Special event",
};

/** Sub-types when posting a special-event shift */
export const SHIFT_SPECIAL_EVENT_OTHER_ID = "other";

export const SHIFT_SPECIAL_EVENT_OPTIONS = [
  { id: "vip", label: "VIP" },
  { id: "launch", label: "Product launch" },
  { id: "private_table", label: "Private table buyout" },
  { id: "brand_activation", label: "Brand activation" },
  { id: "corporate", label: "Corporate" },
  { id: "other", label: "Other" },
] as const;

export type ShiftSpecialEventType = (typeof SHIFT_SPECIAL_EVENT_OPTIONS)[number]["id"];

export function isOtherSpecialEvent(type: string | undefined): boolean {
  return type === SHIFT_SPECIAL_EVENT_OTHER_ID;
}

export function shiftSpecialEventLabel(type: string | undefined, customName?: string): string {
  if (isOtherSpecialEvent(type)) {
    const name = customName?.trim();
    return name || "Other";
  }
  return SHIFT_SPECIAL_EVENT_OPTIONS.find((o) => o.id === type)?.label ?? type ?? "";
}

export function formatShiftEventTypeSummary(
  eventKind: ShiftEventKind,
  specialEventType?: string,
  customSpecialEventName?: string,
): string {
  if (eventKind === "normal") return SHIFT_EVENT_KIND_LABELS.normal;
  const sub = shiftSpecialEventLabel(specialEventType, customSpecialEventName);
  return sub ? `${SHIFT_EVENT_KIND_LABELS.special} · ${sub}` : SHIFT_EVENT_KIND_LABELS.special;
}

export function formatShiftDrinkPricingSummary(
  shift: { eventKind?: ShiftEventKind; eventDrinkMenu?: OutletDrinkPrice[] },
  workspaceMenu: OutletDrinkPrice[] = [],
): string {
  if (shift.eventKind !== "special") {
    const menu = workspaceMenu.length > 0 ? workspaceMenu : DEFAULT_OUTLET_DRINK_MENU;
    const range = drinkMenuPriceRange(menu);
    return `Workspace · RM ${range.min}–${range.max}`;
  }
  const menu = effectiveShiftDrinkMenu(shift, workspaceMenu);
  const range = drinkMenuPriceRange(menu);
  return menu.length > 0 ? `Event-specific · RM ${range.min}–${range.max}` : "Event-specific";
}

export type ShiftDrinkMenuLine = {
  name: string;
  priceRm: number;
  changed: boolean;
};

/** Per-drink lines for event detail — flags prices that differ from workspace */
export function shiftDrinkMenuDetailLines(
  shift: { eventKind?: ShiftEventKind; eventDrinkMenu?: OutletDrinkPrice[] },
  workspaceMenu: OutletDrinkPrice[] = [],
): ShiftDrinkMenuLine[] {
  const menu = effectiveShiftDrinkMenu(shift, workspaceMenu);
  const workspaceById = Object.fromEntries(
    (workspaceMenu.length > 0 ? workspaceMenu : DEFAULT_OUTLET_DRINK_MENU).map((d) => [
      d.id,
      d.priceRm,
    ]),
  );
  return menu.map((d) => ({
    name: d.name,
    priceRm: d.priceRm,
    changed:
      shift.eventKind === "special" &&
      shift.eventDrinkMenu != null &&
      workspaceById[d.id] !== d.priceRm,
  }));
}

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

export function cloneDrinkMenu(menu: OutletDrinkPrice[]): OutletDrinkPrice[] {
  return menu.map((d) => ({ ...d }));
}

/** Special events may override workspace drink prices; normal events always use workspace menu. */
export function effectiveShiftDrinkMenu(
  shift: { eventKind?: ShiftEventKind; eventDrinkMenu?: OutletDrinkPrice[] },
  workspaceMenu: OutletDrinkPrice[] = [],
): OutletDrinkPrice[] {
  if (shift.eventKind === "special" && shift.eventDrinkMenu && shift.eventDrinkMenu.length > 0) {
    return shift.eventDrinkMenu;
  }
  if (workspaceMenu.length > 0) return workspaceMenu;
  return DEFAULT_OUTLET_DRINK_MENU;
}

export function workspaceBaseRates(
  ws: Pick<
    OutletWorkspaceSettings,
    "basePayPerHour" | "drinkPct" | "tipPct" | "tablePct" | "otAfterHours"
  >,
): OutletTierRateSettings {
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
export const DEMO_SHIFT_TIER_SALES_TARGETS: Record<
  string,
  Partial<Record<OutletPrTier, number>>
> = {
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
  s13: { "Tier I": 800, "Tier II": 950, "Tier III": 1100, "Tier IV": 1300, "Tier V": 1650 },
  s17: {
    "Tier I": 900,
    "Tier II": 1100,
    "Tier III": 1300,
    "Tier IV": 1600,
    "Tier V": 2200,
  },
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
    (s) => outletMatches(s.outletName, outlet) && s.status !== "sealed" && s.prs.includes(prId),
  );
  if (assigned) return assigned;
  return shifts.find((s) => outletMatches(s.outletName, outlet) && s.status !== "sealed");
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

export function ensureShiftSalesTargets<
  T extends {
    id: string;
    tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  },
>(shift: T): T {
  const demo = DEMO_SHIFT_TIER_SALES_TARGETS[shift.id];
  if (!demo) return shift;
  const hasTargets = OUTLET_PR_TIERS.some((t) => (shift.tierRates[t].targetSalesRm ?? 0) > 0);
  if (hasTargets) return shift;
  return {
    ...shift,
    tierRates: patchShiftTierSalesTargets(shift.tierRates, demo),
  };
}

export function migrateShiftTierRates<
  T extends {
    id?: string;
    tierRates?: Record<OutletPrTier, OutletTierRateSettings>;
    payPerHour: number;
  },
>(
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
    return ensureShiftSalesTargets(
      migrated as T & { id: string; tierRates: Record<OutletPrTier, OutletTierRateSettings> },
    );
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

export type OutletSubscriptionPlanId =
  | "starter"
  | "plus"
  | "pro"
  | "enterprise"
  | "scale"
  | "premier";

export interface OutletSubscriptionPlan {
  id: OutletSubscriptionPlanId;
  label: string;
  monthlyRm: number;
  /** Max outlet-requested specific PRs per calendar day (agency-assigned fill excluded) */
  prPerDayMax: number;
  /** Lower bound of daily PR band (display) */
  prPerDayMin?: number;
  /** PRs shown in Post Job special-service PR picker */
  prPoolSize: number;
  /** Max PRs selectable per shift from the pool */
  prSelectMax: number;
  capacityLabel: string;
  description: string;
}

export const OUTLET_SUBSCRIPTION_PLANS: OutletSubscriptionPlan[] = [
  {
    id: "starter",
    label: "Essential",
    monthlyRm: 999,
    prPerDayMax: 5,
    prPoolSize: 10,
    prSelectMax: 5,
    capacityLabel: "5 PRs / day",
    description: "Full InnocenZ service · choose 5 from 10 PRs per shift",
  },
  {
    id: "plus",
    label: "Plus",
    monthlyRm: 1699,
    prPerDayMin: 6,
    prPerDayMax: 10,
    prPoolSize: 20,
    prSelectMax: 10,
    capacityLabel: "6–10 PRs / day",
    description: "Growing venue · choose 10 from 20 PRs per shift",
  },
  {
    id: "pro",
    label: "Pro",
    monthlyRm: 2999,
    prPerDayMin: 11,
    prPerDayMax: 25,
    prPoolSize: 50,
    prSelectMax: 25,
    capacityLabel: "11–25 PRs / day",
    description: "Multi-event nights · choose 25 from 50 PRs per shift",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    monthlyRm: 3999,
    prPerDayMin: 26,
    prPerDayMax: 50,
    prPoolSize: 100,
    prSelectMax: 50,
    capacityLabel: "26–50 PRs / day",
    description: "Large venues · choose 50 from 100 PRs per shift",
  },
  {
    id: "scale",
    label: "Scale",
    monthlyRm: 6999,
    prPerDayMin: 51,
    prPerDayMax: 100,
    prPoolSize: 200,
    prSelectMax: 100,
    capacityLabel: "51–100 PRs / day",
    description: "High-volume nights · choose 100 from 200 PRs per shift",
  },
  {
    id: "premier",
    label: "Premier",
    monthlyRm: 9999,
    prPerDayMin: 101,
    prPerDayMax: 999,
    prPoolSize: 400,
    prSelectMax: 200,
    capacityLabel: "101+ PRs / day",
    description: "Flagship venues · choose more than 100 PRs per shift",
  },
];

export function getOutletSubscriptionPlan(
  id?: OutletSubscriptionPlanId | null,
): OutletSubscriptionPlan {
  return (
    OUTLET_SUBSCRIPTION_PLANS.find((p) => p.id === id) ??
    OUTLET_SUBSCRIPTION_PLANS.find((p) => p.id === "pro")!
  );
}

export function formatOutletPlanPrPickerRule(plan: OutletSubscriptionPlan): string {
  if (plan.id === "premier") return "Choose more than 100 PRs";
  return `Choose ${plan.prSelectMax} from ${plan.prPoolSize} PRs`;
}

export function formatOutletPlanDailyHeadcountHint(
  plan: OutletSubscriptionPlan,
  remaining: number,
  dateLabel: string,
): string {
  if (remaining <= 0) {
    return `${plan.label} plan · ${plan.prPerDayMax} PRs/day limit reached for ${dateLabel}`;
  }
  const band = plan.prPerDayMin ? `${plan.prPerDayMin}–${plan.prPerDayMax}` : String(plan.prPerDayMax);
  return `${plan.label} plan · ${band} PRs/day · ${remaining} available on ${dateLabel}`;
}

function canonicalOutletName(name: string): string {
  return name.trim().toLowerCase();
}

/** Total PR headcount (people needed) already booked for one outlet on a date */
export function outletPrHeadcountForDate(
  shifts: { outletName: string; dateIso?: string; quantity: number }[],
  outletName: string,
  dateIso: string,
): number {
  const canon = canonicalOutletName(outletName);
  return shifts
    .filter(
      (s) => canonicalOutletName(s.outletName) === canon && (s.dateIso ?? "") === dateIso,
    )
    .reduce((sum, s) => sum + s.quantity, 0);
}

/** PRs the outlet explicitly requested (Post Job picker) — not agency-assigned fill */
export function outletNamedPrCountForDate(
  shifts: { outletName: string; dateIso?: string; requestedPrIds?: string[] }[],
  outletName: string,
  dateIso: string,
): number {
  const canon = canonicalOutletName(outletName);
  return shifts
    .filter(
      (s) => canonicalOutletName(s.outletName) === canon && (s.dateIso ?? "") === dateIso,
    )
    .reduce((sum, s) => sum + (s.requestedPrIds?.length ?? 0), 0);
}

/** Peak daily outlet-requested PR count across all booked shift dates */
export function maxDailyOutletNamedPrCount(
  shifts: { outletName: string; dateIso?: string; requestedPrIds?: string[] }[],
  outletName: string,
): number {
  const canon = canonicalOutletName(outletName);
  const byDate = new Map<string, number>();
  for (const s of shifts) {
    if (canonicalOutletName(s.outletName) !== canon || !s.dateIso) continue;
    byDate.set(s.dateIso, (byDate.get(s.dateIso) ?? 0) + (s.requestedPrIds?.length ?? 0));
  }
  if (byDate.size === 0) return 0;
  return Math.max(...byDate.values());
}

/** Peak daily PR headcount across all booked shift dates for an outlet */
export function maxDailyOutletPrHeadcount(
  shifts: { outletName: string; dateIso?: string; quantity: number }[],
  outletName: string,
): number {
  const canon = canonicalOutletName(outletName);
  const byDate = new Map<string, number>();
  for (const s of shifts) {
    if (canonicalOutletName(s.outletName) !== canon || !s.dateIso) continue;
    byDate.set(s.dateIso, (byDate.get(s.dateIso) ?? 0) + s.quantity);
  }
  if (byDate.size === 0) return 0;
  return Math.max(...byDate.values());
}

export interface OutletSubscriptionInvoice {
  id: string;
  issueDate: string;
  detail: string;
  planLabel: string;
  amount: number;
  status: "SETTLED" | "PENDING";
}

export const OUTLET_SUBSCRIPTION_BILLING: OutletSubscriptionInvoice[] = [
  {
    id: "SUB-2026-0601",
    issueDate: "25 Jun 2026",
    detail: "Jun 2026 · Pro · InnocenZ Outlet SaaS",
    planLabel: "Pro",
    amount: 2999,
    status: "SETTLED",
  },
  {
    id: "SUB-2026-0501",
    issueDate: "1 May 2026",
    detail: "May 2026 · Plus · InnocenZ Outlet SaaS",
    planLabel: "Plus",
    amount: 1699,
    status: "SETTLED",
  },
];

export function outletSubscriptionInvoiceForPlan(
  plan: OutletSubscriptionPlan,
  issueDate = new Date(),
): OutletSubscriptionInvoice {
  const month = issueDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const day = issueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return {
    id: `SUB-${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, "0")}-${plan.id}`,
    issueDate: day,
    detail: `${month} · ${plan.label} · InnocenZ Outlet SaaS`,
    planLabel: plan.label,
    amount: plan.monthlyRm,
    status: "SETTLED",
  };
}

/** Backfill plan label/amount on invoices saved before planLabel existed */
export function normalizeOutletSubscriptionInvoice(
  inv: OutletSubscriptionInvoice & { planLabel?: string },
): OutletSubscriptionInvoice {
  if (inv.planLabel) return inv;
  if (inv.detail.includes("Premier")) {
    return { ...inv, planLabel: "Premier", amount: 9999 };
  }
  if (inv.detail.includes("Scale")) {
    return { ...inv, planLabel: "Scale", amount: 6999 };
  }
  if (inv.detail.includes("Enterprise")) {
    return { ...inv, planLabel: "Enterprise", amount: 3999 };
  }
  if (inv.detail.includes("Pro")) {
    return { ...inv, planLabel: "Pro", amount: 2999 };
  }
  if (inv.detail.includes("Essential")) {
    return { ...inv, planLabel: "Essential", amount: 999 };
  }
  return { ...inv, planLabel: "Plus", amount: inv.amount || 1699 };
}

/** Ensure billing reflects the active plan (e.g. after upgrade from persisted Plus history). */
export function syncOutletSubscriptionBilling(
  invoices: OutletSubscriptionInvoice[],
  planId?: OutletSubscriptionPlanId | null,
): OutletSubscriptionInvoice[] {
  const normalized = invoices.map(normalizeOutletSubscriptionInvoice);
  const plan = getOutletSubscriptionPlan(planId);
  const hasPlanInvoice = normalized.some(
    (inv) => inv.planLabel === plan.label && inv.amount === plan.monthlyRm,
  );
  if (hasPlanInvoice) return normalized;
  const upgrade = outletSubscriptionInvoiceForPlan(plan);
  const withoutDup = normalized.filter((inv) => inv.id !== upgrade.id);
  return [upgrade, ...withoutDup];
}

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

export type ShiftApplicantSource = "freelancer" | "outlet_request";

export interface ShiftApplicant {
  id: string;
  shiftId: string;
  prId: string;
  prName: string;
  rating: number;
  status: "pending" | "accepted" | "declined";
  /** outlet_request = agency approval flow; freelancer = marketplace applicant */
  source?: ShiftApplicantSource;
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
  subscriptionPlanId: "pro",
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

export function shiftStartTimeFromLabel(shiftLabel: string): string | null {
  const segments = shiftLabel.replace(/—/g, "-").split(/\s*-\s*/);
  const m = segments[0]?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function formatOutletShiftMetricAmount(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 1000) return `${(rounded / 1000).toFixed(1)}k`;
  return String(rounded);
}

export function formatOutletShiftDualMetric(target: number, actual: number): string {
  return `${formatOutletShiftMetricAmount(target)}/${formatOutletShiftMetricAmount(actual)}`;
}

export function outletShiftTargetSalesRm(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  headcount: number,
): number {
  const perPr = OUTLET_PR_TIERS.map((t) => tierRates[t].targetSalesRm ?? 0).filter((v) => v > 0);
  if (!perPr.length || headcount <= 0) return 0;
  return Math.min(...perPr) * headcount;
}

export function outletShiftActualLaborCost(
  shift: { shift: string; prs: string[] },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  if (shift.prs.length === 0) return 0;
  return estimateShiftLaborCost({
    tierRates,
    hours: shiftHoursFromLabel(shift.shift),
    quantity: shift.prs.length,
    prIds: shift.prs,
    prTierById,
  });
}

/** Planned labor for effective demand — scales from on-shift wages when partially staffed. */
export function outletShiftTargetLaborCost(
  shift: OutletCutLossShiftSlice & { shift: string; prs?: string[] },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  const demand = outletShiftEffectiveDemand(shift);
  if (demand <= 0) return 0;
  const supplied = outletShiftSuppliedCount(shift);
  const actual = outletShiftActualLaborCost(
    { shift: shift.shift, prs: shift.prs ?? [] },
    tierRates,
    prTierById,
  );
  if (supplied > 0) {
    return Math.round((actual * demand) / supplied);
  }
  return estimateShiftLaborCost({
    tierRates,
    hours: shiftHoursFromLabel(shift.shift),
    quantity: demand,
  });
}

export function outletShiftPlannedLaborPerSlot(
  shift: OutletCutLossShiftSlice & { shift: string; prs?: string[] },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  const demand = outletShiftEffectiveDemand(shift);
  if (demand <= 0) return 0;
  return outletShiftTargetLaborCost(shift, tierRates, prTierById) / demand;
}

export function outletShiftLaborCostForPrIds(
  prIds: string[],
  shiftLabel: string,
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  if (!prIds.length) return 0;
  return estimateShiftLaborCost({
    tierRates,
    hours: shiftHoursFromLabel(shiftLabel),
    quantity: prIds.length,
    prIds,
    prTierById,
  });
}

/** Share of (target labor cost − actual labor cost) counted as cutlost. */
export const OUTLET_CUTLOSS_COST_SHARE = 0.4;

export function outletShiftCutLoss(targetCost: number, actualCost: number): number {
  return Math.max(0, Math.round((targetCost - actualCost) * OUTLET_CUTLOSS_COST_SHARE));
}

export function outletShiftCutLossForShift(
  shift: OutletCutLossShiftSlice & { shift: string; prs?: string[] },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  const target = outletShiftTargetLaborCost(shift, tierRates, prTierById);
  const actual = outletShiftActualLaborCost(
    { shift: shift.shift, prs: shift.prs ?? [] },
    tierRates,
    prTierById,
  );
  return outletShiftCutLoss(target, actual);
}

export type OutletCutLossPatch = Partial<{
  releasedEarlyPrIds: string[];
  demandCut: number;
  salesTargetPct: number;
}>;

export function outletShiftCutLossAfterPatch(
  shift: OutletCutLossShiftSlice & {
    shift: string;
    prs: string[];
    releasedEarlyPrIds?: string[];
    demandCut?: number;
    salesTargetPct?: number;
  },
  patch: OutletCutLossPatch,
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
): number {
  const prevReleased = new Set(shift.releasedEarlyPrIds ?? []);
  const nextReleased = patch.releasedEarlyPrIds ?? shift.releasedEarlyPrIds ?? [];
  const newlyReleased = nextReleased.filter((id) => !prevReleased.has(id));
  let prs = [...shift.prs];
  if (newlyReleased.length) {
    prs = prs.filter((id) => !newlyReleased.includes(id));
  }

  return outletShiftCutLossForShift(
    {
      ...shift,
      ...patch,
      prs,
      demandCut: patch.demandCut ?? shift.demandCut,
      releasedEarlyPrIds: patch.releasedEarlyPrIds ?? shift.releasedEarlyPrIds,
    },
    tierRates,
    prTierById,
  );
}

export function outletShiftCutLossSavings(
  shift: OutletCutLossShiftSlice & {
    shift: string;
    prs: string[];
    releasedEarlyPrIds?: string[];
    demandCut?: number;
    salesTargetPct?: number;
  },
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  prTierById: Record<string, string | undefined>,
  patch: OutletCutLossPatch,
): number {
  const before = outletShiftCutLossForShift(shift, tierRates, prTierById);
  const after = outletShiftCutLossAfterPatch(shift, patch, tierRates, prTierById);
  return Math.max(0, before - after);
}

export type OutletCutLossShiftSlice = {
  quantity: number;
  releasedEarlyPrIds?: string[];
  demandCut?: number;
  salesTargetPct?: number;
};

export function outletShiftEffectiveDemand(shift: OutletCutLossShiftSlice): number {
  return Math.max(0, shift.quantity - (shift.demandCut ?? 0));
}

/** PRs booked onto this shift (scheduled or on the floor). */
export function outletShiftSuppliedCount(shift: { prs?: string[] }): number {
  return shift.prs?.length ?? 0;
}

export function outletShiftDemandSupplied(shift: OutletCutLossShiftSlice & { prs?: string[] }) {
  const demand = outletShiftEffectiveDemand(shift);
  const supplied = outletShiftSuppliedCount(shift);
  return {
    demand,
    supplied,
    openSlots: Math.max(0, demand - supplied),
  };
}

export function outletShiftSalesTargetHeadcount(shift: OutletCutLossShiftSlice): number {
  const released = shift.releasedEarlyPrIds?.length ?? 0;
  return Math.max(0, outletShiftEffectiveDemand(shift) - released);
}

export function outletShiftTargetSalesForShift(
  shift: OutletCutLossShiftSlice,
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): number {
  const headcount = outletShiftSalesTargetHeadcount(shift);
  const base = outletShiftTargetSalesRm(tierRates, headcount);
  const pct = Math.max(0, Math.min(100, shift.salesTargetPct ?? 100));
  return Math.round((base * pct) / 100);
}

export function outletUnfilledDemandSlots(
  shift: OutletCutLossShiftSlice & { prs?: string[] },
): number {
  return Math.max(0, outletShiftSalesTargetHeadcount(shift) - outletShiftSuppliedCount(shift));
}

export function outletShiftCutLossAdjustmentsLabel(shift: {
  releasedEarlyPrIds?: string[];
  demandCut?: number;
  salesTargetPct?: number;
}): string | null {
  const parts: string[] = [];
  const released = shift.releasedEarlyPrIds?.length ?? 0;
  if (released > 0) parts.push(`${released} released early`);
  if ((shift.demandCut ?? 0) > 0) parts.push(`${shift.demandCut} demand cut`);
  const pct = shift.salesTargetPct ?? 100;
  if (pct < 100) parts.push(`${pct}% target`);
  return parts.length ? parts.join(" · ") : null;
}
