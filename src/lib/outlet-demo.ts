/** Outlet portal demo config — workspace rates, tags, dress codes */

import { getOutletRule } from "@/lib/agency-demo";
import { DEFAULT_PER_DRINK_RM, DEFAULT_PER_TABLE_RM } from "@/lib/outlet-financial-sync";

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

export function normalizeOutletWorkspace(
  ws: Partial<OutletWorkspaceSettings> | undefined,
): OutletWorkspaceSettings {
  const drinkMenu =
    ws?.drinkMenu && ws.drinkMenu.length > 0
      ? ws.drinkMenu.map((d) => ({ ...d }))
      : DEFAULT_OUTLET_DRINK_MENU.map((d) => ({ ...d }));
  return {
    ...DEFAULT_OUTLET_WORKSPACE,
    ...ws,
    drinkMenu,
    perDrinkRm: ws?.perDrinkRm ?? averageDrinkPrice(drinkMenu),
  };
}

export interface OutletWorkspaceSettings {
  outletName: string;
  basePayPerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
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

export interface ShiftApplicant {
  id: string;
  shiftId: string;
  prId: string;
  prName: string;
  rating: number;
  status: "pending" | "accepted" | "declined";
}

const velvetRule = getOutletRule("Velvet 23");

export const DEFAULT_OUTLET_WORKSPACE: OutletWorkspaceSettings = {
  outletName: "Velvet 23",
  basePayPerHour: velvetRule.wagePerHour,
  drinkPct: velvetRule.drinkPct,
  tipPct: velvetRule.tipPct,
  tablePct: velvetRule.tablePct,
  otAfterHours: velvetRule.otAfterHours,
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
