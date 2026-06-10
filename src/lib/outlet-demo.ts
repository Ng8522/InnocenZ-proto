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

export interface OutletWorkspaceSettings {
  outletName: string;
  basePayPerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  perDrinkRm: number;
  perTableRm: number;
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
