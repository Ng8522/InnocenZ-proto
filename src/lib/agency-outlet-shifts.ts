import {
  OUTLET_NAMES,
  getOutletRule,
  type AgencyRosterSlot,
  type OutletCommissionRule,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { fmtDShort } from "@/lib/pr-demo";
import { resolveOutletTierRates } from "@/lib/outlet-agency-sync";
import { PR_AGENCY_TIED_OFFERS, type AgencyTiedOffer } from "@/lib/pr-features";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { SHIFT_DESTINATION_LABELS, type ShiftDestination, type OutletWorkspaceSettings } from "@/lib/outlet-demo";
import type { ShiftRequest } from "@/lib/store";

export type OutletShiftSource = "posted" | "tied-offer" | "assignment-pending";

export type AgencyOutletAvailableShift = {
  id: string;
  source: OutletShiftSource;
  outlet: string;
  date: string;
  dateIso: string;
  shift: string;
  event: string;
  openSlots: number;
  payEstimate: number;
  languages?: string;
  destination?: ShiftDestination;
  vip?: boolean;
  briefing?: string;
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
};

export type AgencyOutletSummary = {
  outlet: string;
  rule: OutletCommissionRule;
  openShiftCount: number;
  totalOpenSlots: number;
  scheduledTonight: number;
  shifts: AgencyOutletAvailableShift[];
};

export type AgencyOutletFilterState = {
  outlet: string;
  date: string;
  minOpenSlots: string;
  source: "" | OutletShiftSource;
};

export const EMPTY_AGENCY_OUTLET_FILTERS: AgencyOutletFilterState = {
  outlet: "",
  date: "",
  minOpenSlots: "",
  source: "",
};

const SOURCE_LABEL: Record<OutletShiftSource, string> = {
  posted: "Posted shift",
  "tied-offer": "Outlet offer",
  "assignment-pending": "Awaiting PR",
};

export function outletShiftSourceLabel(source: OutletShiftSource) {
  return SOURCE_LABEL[source];
}

function ymdToIso([y, m, d]: [number, number, number]) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type TierRatesContext = {
  commissionRules: OutletCommissionRule[];
  workspace?: Pick<OutletWorkspaceSettings, "outletName" | "tierRates">;
};

function outletDefaultTierRates(outlet: string, ctx: TierRatesContext) {
  return resolveOutletTierRates(outlet, ctx.commissionRules, ctx.workspace);
}

function shiftsFromPosted(
  outlet: string,
  posted: ShiftRequest[],
  ctx: TierRatesContext,
): AgencyOutletAvailableShift[] {
  return posted
    .filter(
      (s) =>
        s.outletName === outlet &&
        s.status === "open" &&
        (s.destination === "agency" || s.destination === "both"),
    )
    .map((s) => {
      const openSlots = Math.max(0, s.quantity - s.filled);
      return {
        id: `posted-${s.id}`,
        source: "posted" as const,
        outlet,
        date: s.date,
        dateIso: s.date,
        shift: s.shift,
        event: s.event,
        openSlots,
        payEstimate: s.estimatedCost,
        languages: s.languages,
        destination: s.destination,
        tierRates: s.tierRates ?? outletDefaultTierRates(outlet, ctx),
      };
    })
    .filter((s) => s.openSlots > 0);
}

function shiftsFromTied(outlet: string, tied: AgencyTiedOffer[], ctx: TierRatesContext): AgencyOutletAvailableShift[] {
  return tied
    .filter((o) => o.outlet === outlet)
    .map((o) => ({
      id: `tied-${o.id}`,
      source: "tied-offer" as const,
      outlet,
      date: fmtDShort(...o.date),
      dateIso: ymdToIso(o.date),
      shift: o.time,
      event: o.event,
      openSlots: 1,
      payEstimate: o.base + o.comm,
      vip: o.vip,
      briefing: o.briefing,
      tierRates: outletDefaultTierRates(outlet, ctx),
    }));
}

function shiftsFromRoster(outlet: string, roster: AgencyRosterSlot[], ctx: TierRatesContext): AgencyOutletAvailableShift[] {
  return roster
    .filter((s) => s.outlet === outlet && s.status === "assignment-pending")
    .map((s) => ({
      id: `roster-${s.id}`,
      source: "assignment-pending" as const,
      outlet,
      date: s.date,
      dateIso: s.dateIso,
      shift: s.shift,
      event: s.agencyAssignment?.agencyNote?.trim() || "Agency slot · awaiting PR",
      openSlots: 1,
      payEstimate: s.estPayout ?? 350,
      tierRates: outletDefaultTierRates(outlet, ctx),
    }));
}

export function buildAgencyOutletSummaries(input: {
  outlets?: string[];
  shifts: ShiftRequest[];
  roster: AgencyRosterSlot[];
  tiedOffers?: AgencyTiedOffer[];
  todayIso?: string;
  commissionRules?: OutletCommissionRule[];
  outletWorkspace?: Pick<OutletWorkspaceSettings, "outletName" | "tierRates">;
}): AgencyOutletSummary[] {
  const outlets = input.outlets ?? OUTLET_NAMES;
  const tied = input.tiedOffers ?? PR_AGENCY_TIED_OFFERS;
  const todayIso = input.todayIso ?? DEFAULT_ROSTER_DATE_ISO;
  const commissionRules = input.commissionRules ?? [];
  const tierCtx: TierRatesContext = {
    commissionRules,
    workspace: input.outletWorkspace,
  };

  return outlets.map((outlet) => {
    const rule = getOutletRule(outlet, commissionRules.length ? commissionRules : undefined);
    const shifts = [
      ...shiftsFromPosted(outlet, input.shifts, tierCtx),
      ...shiftsFromTied(outlet, tied, tierCtx),
      ...shiftsFromRoster(outlet, input.roster, tierCtx),
    ];
    const scheduledTonight = input.roster.filter(
      (s) => s.outlet === outlet && s.dateIso === todayIso && s.status !== "unavailable",
    ).length;

    return {
      outlet,
      rule,
      openShiftCount: shifts.length,
      totalOpenSlots: shifts.reduce((sum, s) => sum + s.openSlots, 0),
      scheduledTonight,
      shifts,
    };
  });
}

function resolveShiftDateIso(shift: AgencyOutletAvailableShift): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(shift.dateIso)) return shift.dateIso;
  if (shift.dateIso === "Tonight" || shift.date === "Tonight") return DEFAULT_ROSTER_DATE_ISO;
  if (shift.dateIso === "Tomorrow" || shift.date === "Tomorrow") {
    const [y, m, d] = DEFAULT_ROSTER_DATE_ISO.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  }
  return shift.dateIso;
}

export function agencyOutletFiltersActive(f: AgencyOutletFilterState): boolean {
  return Boolean(f.outlet || f.date || f.minOpenSlots || f.source);
}

export function filterAgencyOutletSummaries(
  summaries: AgencyOutletSummary[],
  f: AgencyOutletFilterState,
): AgencyOutletSummary[] {
  const minOpen = f.minOpenSlots ? Number(f.minOpenSlots) : null;

  return summaries
    .map((summary) => {
      let shifts = summary.shifts;
      if (f.date) {
        shifts = shifts.filter((s) => resolveShiftDateIso(s) === f.date);
      }
      if (f.source) {
        shifts = shifts.filter((s) => s.source === f.source);
      }
      if (minOpen != null && !Number.isNaN(minOpen)) {
        shifts = shifts.filter((s) => s.openSlots >= minOpen);
      }
      return { ...summary, shifts, openShiftCount: shifts.length, totalOpenSlots: shifts.reduce((n, s) => n + s.openSlots, 0) };
    })
    .filter((summary) => {
      if (f.outlet && summary.outlet !== f.outlet) return false;
      if ((f.date || f.source || minOpen != null) && summary.shifts.length === 0) return false;
      return true;
    });
}

export function collectOutletShiftDateIsos(summaries: AgencyOutletSummary[]): string[] {
  return [...new Set(summaries.flatMap((s) => s.shifts.map((shift) => resolveShiftDateIso(shift))))]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

/** @deprecated Use collectOutletShiftDateIsos */
export function collectOutletShiftDates(summaries: AgencyOutletSummary[]): string[] {
  return collectOutletShiftDateIsos(summaries);
}

export function shiftDestinationLabel(destination?: ShiftDestination) {
  return destination ? SHIFT_DESTINATION_LABELS[destination] : undefined;
}
