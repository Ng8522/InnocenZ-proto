/** Shift history types + sort/merge helpers (no portal imports — avoids circular deps). */

export interface ShiftHistoryRow {
  id: string;
  prName: string;
  prId: string;
  outlet: string;
  agencyName: string;
  dateDisplay: string;
  dateIso: string;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
  durationHours: number;
}

/** Newest shift nights first; same-day rows sorted by PR name. */
export function compareShiftHistoryDesc(a: ShiftHistoryRow, b: ShiftHistoryRow): number {
  const byDate = (b.dateIso ?? "").localeCompare(a.dateIso ?? "");
  if (byDate !== 0) return byDate;
  return (a.prName ?? "").localeCompare(b.prName ?? "");
}

export function sortShiftHistoryDesc(rows: ShiftHistoryRow[]): ShiftHistoryRow[] {
  return [...(rows ?? [])].sort(compareShiftHistoryDesc);
}

/** Append rows without removing existing history (deduped by id). */
export function mergeShiftHistory(
  existing: ShiftHistoryRow[] | undefined,
  incoming: ShiftHistoryRow[] | undefined,
): ShiftHistoryRow[] {
  const byId = new Map<string, ShiftHistoryRow>();
  for (const row of existing ?? []) {
    if (row?.id) byId.set(row.id, row);
  }
  for (const row of incoming ?? []) {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  return sortShiftHistoryDesc([...byId.values()]);
}
