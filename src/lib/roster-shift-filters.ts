import type { AgencyRosterSlot, RosterSlotStatus } from "@/lib/agency-demo";

export type RosterShiftFilterState = {
  nameQuery: string;
  outlet: string;
  status: "" | RosterSlotStatus | "late" | "no-show";
  payoutMin: string;
  payoutMax: string;
};

export const EMPTY_ROSTER_SHIFT_FILTERS: RosterShiftFilterState = {
  nameQuery: "",
  outlet: "",
  status: "",
  payoutMin: "",
  payoutMax: "",
};

export function rosterShiftFiltersActive(f: RosterShiftFilterState): boolean {
  return Boolean(f.nameQuery || f.outlet || f.status || f.payoutMin || f.payoutMax);
}

export function filterRosterShifts(
  slots: AgencyRosterSlot[],
  f: RosterShiftFilterState,
): AgencyRosterSlot[] {
  const q = f.nameQuery.trim().toLowerCase();
  const min = f.payoutMin ? parseFloat(f.payoutMin) : null;
  const max = f.payoutMax ? parseFloat(f.payoutMax) : null;

  return slots.filter((s) => {
    if (q && !s.prName.toLowerCase().includes(q)) return false;
    if (f.outlet && s.outlet !== f.outlet) return false;
    if (f.status === "late" && !s.lateFlag) return false;
    if (f.status === "no-show" && !s.noShowFlag) return false;
    if (f.status && f.status !== "late" && f.status !== "no-show" && s.status !== f.status) return false;
    const payout = s.estPayout ?? 0;
    if (min != null && !Number.isNaN(min) && payout < min) return false;
    if (max != null && !Number.isNaN(max) && payout > max) return false;
    return true;
  });
}
