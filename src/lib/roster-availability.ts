import type { AgencyManagedPR, AgencyRosterSlot } from "@/lib/agency-demo";
import { OUTLET_NAMES } from "@/lib/agency-demo";

/** Demo “today” for roster availability filters */
export const DEFAULT_ROSTER_DATE_ISO = "2026-06-04";

export type PrScheduleState = "free" | "booked" | "unavailable";

/** km from PR home base (place) to outlet — demo matrix */
export const DISTANCE_KM_FROM_PLACE: Record<string, Partial<Record<string, number>>> = {
  KL: { "Velvet 23": 1.2, Mermate: 3.8, "Bear Lounge": 4.5, "Onyx KL": 2.1, "Urban Soul": 1.6 },
  PJ: { "Velvet 23": 7.8, Mermate: 5.2, "Bear Lounge": 6.1, "Onyx KL": 8.4, "Urban Soul": 9.0 },
  "Shah Alam": { "Velvet 23": 18.2, Mermate: 14.5, "Bear Lounge": 16.0, "Onyx KL": 17.1, "Urban Soul": 19.3 },
  "Mont Kiara": { "Velvet 23": 3.4, Mermate: 4.1, "Bear Lounge": 5.0, "Onyx KL": 2.8, "Urban Soul": 3.9 },
};

export function getDistanceKm(place: string, outlet: string): number {
  return DISTANCE_KM_FROM_PLACE[place]?.[outlet] ?? 12.0;
}

export function getPrScheduleState(
  prId: string,
  roster: AgencyRosterSlot[],
  dateIso: string,
): PrScheduleState {
  const slots = roster.filter((s) => s.prId === prId && s.dateIso === dateIso);
  if (slots.length === 0) return "free";
  if (slots.some((s) => s.status === "unavailable")) return "unavailable";
  return "booked";
}

export function getPrSlotForDate(
  prId: string,
  roster: AgencyRosterSlot[],
  dateIso: string,
): AgencyRosterSlot | undefined {
  return roster.find((s) => s.prId === prId && s.dateIso === dateIso);
}

export interface RosterAvailabilityStats {
  free: number;
  booked: number;
  unavailable: number;
  total: number;
}

export function computeAvailabilityStats(
  agencyPRs: AgencyManagedPR[],
  roster: AgencyRosterSlot[],
  dateIso: string,
): RosterAvailabilityStats {
  let free = 0;
  let booked = 0;
  let unavailable = 0;
  for (const pr of agencyPRs) {
    const st = getPrScheduleState(pr.id, roster, dateIso);
    if (st === "free") free += 1;
    else if (st === "booked") booked += 1;
    else unavailable += 1;
  }
  return { free, booked, unavailable, total: agencyPRs.length };
}

export interface FreePrWithDistances {
  pr: AgencyManagedPR;
  distances: { outlet: string; km: number }[];
}

export function getFreePrsWithDistances(
  agencyPRs: AgencyManagedPR[],
  roster: AgencyRosterSlot[],
  dateIso: string,
  sortByOutlet?: string,
): FreePrWithDistances[] {
  return agencyPRs
    .filter((pr) => !pr.suspended && !pr.detached && getPrScheduleState(pr.id, roster, dateIso) === "free")
    .map((pr) => {
      const distances = OUTLET_NAMES.map((outlet) => ({
        outlet,
        km: getDistanceKm(pr.place, outlet),
      })).sort((a, b) => a.km - b.km);
      return { pr, distances };
    })
    .sort((a, b) => {
      if (!sortByOutlet) return b.pr.rating - a.pr.rating;
      const da = a.distances.find((d) => d.outlet === sortByOutlet)?.km ?? 99;
      const db = b.distances.find((d) => d.outlet === sortByOutlet)?.km ?? 99;
      return da - db;
    });
}
