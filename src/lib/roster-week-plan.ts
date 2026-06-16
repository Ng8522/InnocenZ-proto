import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { AgencyRosterSlot } from "@/lib/agency-demo";

export function mondayOfWeek(dateIso: string): string {
  return format(startOfWeek(parseISO(dateIso), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function weekDayIsos(weekStartIso: string): string[] {
  const start = parseISO(weekStartIso);
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export function weekRangeLabel(weekStartIso: string): string {
  const start = parseISO(weekStartIso);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")}–${format(end, "d MMM yyyy")}`;
}

export function dayColumnLabel(dateIso: string): { dow: string; dom: string } {
  const d = parseISO(dateIso);
  return { dow: format(d, "EEE"), dom: format(d, "d MMM") };
}

const SLOT_DISPLAY_PRIORITY: AgencyRosterSlot["status"][] = [
  "on-duty",
  "en-route",
  "scheduled",
  "assignment-pending",
  "outlet-pending",
  "swap-pending",
  "unavailable",
];

export function slotsForPrOnDate(
  roster: AgencyRosterSlot[],
  prId: string,
  dateIso: string,
): AgencyRosterSlot[] {
  return roster.filter((s) => s.prId === prId && s.dateIso === dateIso);
}

/** Prefer live / booked shifts over day-off markers when multiple slots exist */
export function primarySlotForPrOnDate(
  roster: AgencyRosterSlot[],
  prId: string,
  dateIso: string,
): AgencyRosterSlot | undefined {
  const slots = slotsForPrOnDate(roster, prId, dateIso);
  if (slots.length === 0) return undefined;
  return [...slots].sort(
    (a, b) => SLOT_DISPLAY_PRIORITY.indexOf(a.status) - SLOT_DISPLAY_PRIORITY.indexOf(b.status),
  )[0];
}

export function slotForPrOnDate(
  roster: AgencyRosterSlot[],
  prId: string,
  dateIso: string,
): AgencyRosterSlot | undefined {
  return primarySlotForPrOnDate(roster, prId, dateIso);
}

export function shiftWeek(dateIso: string, deltaWeeks: number): string {
  return format(addDays(parseISO(dateIso), deltaWeeks * 7), "yyyy-MM-dd");
}
