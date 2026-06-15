import type { AgencyRosterSlot, RosterSlotStatus } from "@/lib/agency-demo";

export type RosterShiftFilterState = {
  nameQuery: string;
  outlet: string;
  status: "" | RosterSlotStatus | "late" | "no-show";
  payoutMin: string;
  payoutMax: string;
  startTime: string;
  endTime: string;
};

export const EMPTY_ROSTER_SHIFT_FILTERS: RosterShiftFilterState = {
  nameQuery: "",
  outlet: "",
  status: "",
  payoutMin: "",
  payoutMax: "",
  startTime: "",
  endTime: "",
};

function hhmmToMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [h, m] = trimmed.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function rosterShiftFiltersActive(f: RosterShiftFilterState): boolean {
  return Boolean(
    f.nameQuery || f.outlet || f.status || f.payoutMin || f.payoutMax || f.startTime || f.endTime,
  );
}

export function filterRosterShifts(
  slots: AgencyRosterSlot[],
  f: RosterShiftFilterState,
): AgencyRosterSlot[] {
  const q = f.nameQuery.trim().toLowerCase();
  const min = f.payoutMin ? parseFloat(f.payoutMin) : null;
  const max = f.payoutMax ? parseFloat(f.payoutMax) : null;
  const startFrom = hhmmToMinutes(f.startTime);
  const endBy = hhmmToMinutes(f.endTime);

  return slots.filter((s) => {
    if (q && !s.prName.toLowerCase().includes(q)) return false;
    if (f.outlet && s.outlet !== f.outlet) return false;
    if (f.status === "late" && !s.lateFlag) return false;
    if (f.status === "no-show" && !s.noShowFlag) return false;
    if (f.status && f.status !== "late" && f.status !== "no-show" && s.status !== f.status) return false;
    const payout = s.estPayout ?? 0;
    if (min != null && !Number.isNaN(min) && payout < min) return false;
    if (max != null && !Number.isNaN(max) && payout > max) return false;
    if (startFrom != null) {
      const slotStart = hhmmToMinutes(s.shiftStart);
      if (slotStart == null || slotStart < startFrom) return false;
    }
    if (endBy != null) {
      const slotEnd = hhmmToMinutes(s.shiftEnd);
      if (slotEnd == null || slotEnd > endBy) return false;
    }
    return true;
  });
}
