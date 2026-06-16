import type { AgencyRosterSlot } from "@/lib/agency-demo";
import { DEFAULT_PR_AGENCY_NAME, fmtHistDate } from "@/lib/pr-demo";
import type { PrUpcomingShift } from "@/lib/pr-features";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";

/** Atlas payroll cycle window — agency publishes shifts here */
export const AGENCY_SCHEDULE_FROM_ISO = "2026-05-04";
export const AGENCY_SCHEDULE_TO_ISO = "2026-06-10";

export type ShiftDataSource = "agency" | "outlet";

export type TimetableEntry = {
  id: string;
  dateIso: string;
  dateLabel: string;
  outlet: string;
  time: string;
  statusLabel: string;
  statusVariant: "green" | "amber" | "red" | "ink";
  source: ShiftDataSource;
  sourceLabel: string;
  sourceDetail: string;
  slot?: AgencyRosterSlot;
  upcoming?: PrUpcomingShift;
};
export type PrScheduleDayKind =
  | "past"
  | "open"
  | "unavailable"
  | "assigned"
  | "pending"
  | "active";

export interface PrScheduleDay {
  dateIso: string;
  label: string;
  kind: PrScheduleDayKind;
  slots: AgencyRosterSlot[];
  upcoming?: PrUpcomingShift;
}

function dateKeyFromTuple(d: [number, number, number]) {
  const [y, m, day] = d;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function eachDateIsoInRange(fromIso: string, toIso: string): string[] {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const out: string[] = [];
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cursor <= end) {
    out.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const ACTIVE_STATUSES = new Set<AgencyRosterSlot["status"]>(["on-duty", "en-route"]);

function classifyDay(
  dateIso: string,
  slots: AgencyRosterSlot[],
  upcoming: PrUpcomingShift | undefined,
  baselineIso: string,
): PrScheduleDayKind {
  if (dateIso < baselineIso) return "past";
  if (slots.some((s) => s.status === "unavailable")) return "unavailable";
  if (slots.some((s) => ACTIVE_STATUSES.has(s.status))) return "active";
  if (slots.some((s) => s.status === "assignment-pending" || s.status === "outlet-pending")) return "pending";
  if (slots.some((s) => s.status === "scheduled" || s.status === "swap-pending")) return "assigned";
  if (upcoming) return upcoming.status === "pending" ? "pending" : "assigned";
  return "open";
}

export function buildPrScheduleDays(
  prId: string,
  roster: AgencyRosterSlot[],
  upcoming: PrUpcomingShift[],
  baselineIso = DEFAULT_ROSTER_DATE_ISO,
): PrScheduleDay[] {
  const upcomingByDate = new Map(
    upcoming.map((u) => [dateKeyFromTuple(u.date), u] as const),
  );

  return eachDateIsoInRange(AGENCY_SCHEDULE_FROM_ISO, AGENCY_SCHEDULE_TO_ISO).map((dateIso) => {
    const [y, m, d] = dateIso.split("-").map(Number);
    const slots = roster.filter((s) => s.prId === prId && s.dateIso === dateIso);
    const up = upcomingByDate.get(dateIso);
    return {
      dateIso,
      label: fmtHistDate(y, m, d),
      kind: classifyDay(dateIso, slots, up, baselineIso),
      slots,
      upcoming: up,
    };
  });
}

export function scheduleDaysInMonth(days: PrScheduleDay[], viewMonth: Date): PrScheduleDay[] {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  return days.filter((d) => {
    const [dy, dm] = d.dateIso.split("-").map(Number);
    return dy === y && dm - 1 === m;
  });
}

export function primarySlotForDay(day: PrScheduleDay): AgencyRosterSlot | undefined {
  if (day.slots.length === 0) return undefined;
  const priority: AgencyRosterSlot["status"][] = [
    "on-duty",
    "en-route",
    "scheduled",
    "assignment-pending",
    "outlet-pending",
    "swap-pending",
    "unavailable",
  ];
  return [...day.slots].sort(
    (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status),
  )[0];
}

export function dayCanMarkUnavailable(day: PrScheduleDay): boolean {
  if (day.kind === "past" || day.kind === "active") return false;
  if (day.kind === "unavailable" || day.kind === "open") return true;
  return false;
}

/** Tap-to-toggle only on open or unavailable days (not booked/pending shifts). */
export function dayCanToggleAvailability(day: PrScheduleDay): boolean {
  return dayCanMarkUnavailable(day);
}

export function dayCanCancelShift(day: PrScheduleDay): boolean {
  if (day.kind === "past" || day.kind === "active" || day.kind === "open" || day.kind === "unavailable") {
    return false;
  }
  return Boolean(primarySlotForDay(day) || day.upcoming);
}

function slotHasRosterCoverage(slot: AgencyRosterSlot, upcoming: PrUpcomingShift): boolean {
  const key = dateKeyFromTuple(upcoming.date);
  return slot.dateIso === key && slot.outlet === upcoming.outlet;
}

function resolveSlotEntry(slot: AgencyRosterSlot): TimetableEntry {
  const [y, m, d] = slot.dateIso.split("-").map(Number);
  const agency = slot.agencyAssignment?.agencyName ?? slot.outletSwap?.agencyName ?? DEFAULT_PR_AGENCY_NAME;

  if (slot.status === "assignment-pending") {
    return {
      id: slot.id,
      dateIso: slot.dateIso,
      dateLabel: fmtHistDate(y, m, d),
      outlet: slot.outlet,
      time: slot.shift,
      statusLabel: "Agency assignment",
      statusVariant: "amber",
      source: "agency",
      sourceLabel: agency,
      sourceDetail: slot.agencyAssignment?.agencyNote ?? "Atlas assigned you — approve or decline",
      slot,
    };
  }

  if (slot.status === "outlet-pending") {
    return {
      id: slot.id,
      dateIso: slot.dateIso,
      dateLabel: fmtHistDate(y, m, d),
      outlet: slot.outlet,
      time: slot.shift,
      statusLabel: "Awaiting outlet",
      statusVariant: "amber",
      source: "outlet",
      sourceLabel: slot.outlet,
      sourceDetail: `${slot.outlet} must confirm your slot on their roster`,
      slot,
    };
  }

  if (slot.outletSwap?.status === "pending_pr") {
    return {
      id: slot.id,
      dateIso: slot.dateIso,
      dateLabel: fmtHistDate(y, m, d),
      outlet: slot.outlet,
      time: slot.shift,
      statusLabel: "Outlet swap",
      statusVariant: "amber",
      source: "agency",
      sourceLabel: agency,
      sourceDetail: `Move to ${slot.outletSwap.targetOutlet} — ${slot.outletSwap.agencyNote ?? "agency request"}`,
      slot,
    };
  }

  if (slot.status === "scheduled" || slot.status === "swap-pending") {
    return {
      id: slot.id,
      dateIso: slot.dateIso,
      dateLabel: fmtHistDate(y, m, d),
      outlet: slot.outlet,
      time: slot.shift,
      statusLabel: "Scheduled",
      statusVariant: "green",
      source: "outlet",
      sourceLabel: slot.outlet,
      sourceDetail: "Outlet sealed this shift on their roster · synced via Atlas",
      slot,
    };
  }

  if (slot.status === "on-duty" || slot.status === "en-route") {
    return {
      id: slot.id,
      dateIso: slot.dateIso,
      dateLabel: fmtHistDate(y, m, d),
      outlet: slot.outlet,
      time: slot.shift,
      statusLabel: slot.status === "on-duty" ? "On duty" : "En route",
      statusVariant: "green",
      source: "outlet",
      sourceLabel: slot.outlet,
      sourceDetail: "Live shift from outlet check-in roster",
      slot,
    };
  }

  return {
    id: slot.id,
    dateIso: slot.dateIso,
    dateLabel: fmtHistDate(y, m, d),
    outlet: slot.outlet,
    time: slot.shift,
    statusLabel: slot.status,
    statusVariant: "ink",
    source: "agency",
    sourceLabel: agency,
    sourceDetail: "Atlas agency roster",
    slot,
  };
}

function resolveUpcomingEntry(up: PrUpcomingShift): TimetableEntry {
  const [y, m, d] = up.date;
  const dateIso = dateKeyFromTuple(up.date);
  const confirmed = up.status === "confirmed";

  return {
    id: up.id,
    dateIso,
    dateLabel: fmtHistDate(y, m, d),
    outlet: up.outlet,
    time: up.time,
    statusLabel: confirmed ? "Outlet confirmed" : "Outlet reviewing",
    statusVariant: confirmed ? "green" : "amber",
    source: confirmed ? "outlet" : "agency",
    sourceLabel: confirmed ? up.outlet : DEFAULT_PR_AGENCY_NAME,
    sourceDetail: confirmed
      ? `${up.outlet} confirmed you on their bookings roster`
      : "Atlas proposed this shift — outlet has not confirmed yet",
    upcoming: up,
  };
}

/** One row per shift — labels whether data came from Atlas Agency or the outlet roster */
export function buildTimetableEntries(
  prId: string,
  roster: AgencyRosterSlot[],
  upcoming: PrUpcomingShift[],
  viewMonth: Date,
  baselineIso = DEFAULT_ROSTER_DATE_ISO,
): TimetableEntry[] {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();

  const slots = roster.filter((s) => {
    if (s.prId !== prId || s.status === "unavailable" || s.dateIso < baselineIso) return false;
    const [dy, dm] = s.dateIso.split("-").map(Number);
    return dy === y && dm - 1 === m;
  });

  const entries: TimetableEntry[] = slots.map(resolveSlotEntry);

  for (const up of upcoming) {
    const covered = slots.some((s) => slotHasRosterCoverage(s, up));
    if (covered) continue;
    const [uy, um] = up.date;
    if (uy !== y || um - 1 !== m) continue;
    if (dateKeyFromTuple(up.date) < baselineIso) continue;
    entries.push(resolveUpcomingEntry(up));
  }

  return entries.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.outlet.localeCompare(b.outlet));
}

export function entryCanDecline(entry: TimetableEntry): boolean {
  return entry.slot?.status === "assignment-pending";
}

export function entryCanCancel(entry: TimetableEntry): boolean {
  const st = entry.slot?.status;
  if (!st) return Boolean(entry.upcoming?.status === "confirmed");
  return st === "scheduled" || st === "swap-pending" || st === "outlet-pending";
}