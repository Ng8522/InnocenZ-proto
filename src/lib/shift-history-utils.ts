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
  /** VIP / table units logged on shift */
  totalTables?: number;
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

export type ShiftHistoryVenueRollup = {
  venue: string;
  shiftCount: number;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
  totalTables: number;
  shifts: ShiftHistoryRow[];
};

/** Group a PR's shift rows by outlet (agency) or agency name (outlet portal). */
export function aggregateShiftHistoryByVenue(
  rows: ShiftHistoryRow[],
  portal: "agency" | "outlet",
): ShiftHistoryVenueRollup[] {
  const venueKey = portal === "agency" ? "outlet" : "agencyName";
  const map = new Map<string, ShiftHistoryVenueRollup>();

  for (const row of rows) {
    const venue = row[venueKey];
    const cur =
      map.get(venue) ??
      ({
        venue,
        shiftCount: 0,
        totalPayout: 0,
        totalDrinks: 0,
        totalTips: 0,
        totalTables: 0,
        shifts: [],
      } satisfies ShiftHistoryVenueRollup);

    cur.shiftCount += 1;
    cur.totalPayout += row.totalPayout;
    cur.totalDrinks += row.totalDrinks;
    cur.totalTips += row.totalTips;
    cur.totalTables += row.totalTables ?? 0;
    cur.shifts.push(row);
    map.set(venue, cur);
  }

  return [...map.values()].sort((a, b) => b.totalPayout - a.totalPayout);
}

export function sumShiftHistoryVenueRollups(rollups: ShiftHistoryVenueRollup[]) {
  return rollups.reduce(
    (acc, r) => ({
      shiftCount: acc.shiftCount + r.shiftCount,
      totalPayout: acc.totalPayout + r.totalPayout,
      totalDrinks: acc.totalDrinks + r.totalDrinks,
      totalTips: acc.totalTips + r.totalTips,
      totalTables: acc.totalTables + r.totalTables,
    }),
    { shiftCount: 0, totalPayout: 0, totalDrinks: 0, totalTips: 0, totalTables: 0 },
  );
}

export type ShiftHistoryPrRollup = {
  prId: string;
  prName: string;
  shiftCount: number;
  venues: string[];
  latestDateIso: string;
  latestDateDisplay: string;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
  totalTables: number;
};

/** One card per PR — totals across all filtered shift rows for that PR. */
export function aggregateShiftHistoryByPr(
  rows: ShiftHistoryRow[],
  portal: "agency" | "outlet",
): ShiftHistoryPrRollup[] {
  const venueKey = portal === "agency" ? "outlet" : "agencyName";
  const map = new Map<
    string,
    ShiftHistoryPrRollup & { latestDateIso: string; venueSet: Set<string> }
  >();

  for (const row of rows) {
    let cur = map.get(row.prId);
    if (!cur) {
      cur = {
        prId: row.prId,
        prName: row.prName,
        shiftCount: 0,
        venues: [],
        venueSet: new Set(),
        latestDateIso: row.dateIso,
        latestDateDisplay: row.dateDisplay,
        totalPayout: 0,
        totalDrinks: 0,
        totalTips: 0,
        totalTables: 0,
      };
      map.set(row.prId, cur);
    }
    cur.shiftCount += 1;
    cur.totalPayout += row.totalPayout;
    cur.totalDrinks += row.totalDrinks;
    cur.totalTips += row.totalTips;
    cur.totalTables += row.totalTables ?? 0;
    cur.venueSet.add(row[venueKey]);
    if (row.dateIso > cur.latestDateIso) {
      cur.latestDateIso = row.dateIso;
      cur.latestDateDisplay = row.dateDisplay;
    }
  }

  return [...map.values()]
    .map(({ venueSet, ...rollup }) => ({
      ...rollup,
      venues: [...venueSet].sort(),
    }))
    .sort(
      (a, b) =>
        b.latestDateIso.localeCompare(a.latestDateIso) || a.prName.localeCompare(b.prName),
    );
}
