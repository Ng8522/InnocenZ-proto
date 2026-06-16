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

export function slotForPrOnDate(
  roster: AgencyRosterSlot[],
  prId: string,
  dateIso: string,
): AgencyRosterSlot | undefined {
  return roster.find((s) => s.prId === prId && s.dateIso === dateIso);
}

export function shiftWeek(dateIso: string, deltaWeeks: number): string {
  return format(addDays(parseISO(dateIso), deltaWeeks * 7), "yyyy-MM-dd");
}
