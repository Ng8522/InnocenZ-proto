/** Shared shift transaction log — agency & outlet read the same records */

import { resolveRosterPrName } from "@/lib/agency-demo";
import { buildAllVelvetSeedShiftHistory } from "@/lib/velvet-week-demo";
import { sealedShiftTotalPayout } from "@/lib/pr-weekly-payment";
import {
  prepareShiftHistoryForDisplay,
  mergeShiftHistory,
  type ShiftHistoryRow,
} from "@/lib/shift-history-utils";

export type { ShiftHistoryRow } from "@/lib/shift-history-utils";
export {
  compareShiftHistoryDesc,
  dedupeShiftHistorySlots,
  filterShiftHistoryThroughToday,
  isCheckoutShiftHistoryRow,
  isPayrollSyncedShiftHistoryRow,
  isDateInCurrentPayrollWeek,
  mergeShiftHistory,
  prepareShiftHistoryForDisplay,
  shiftHistorySlotKey,
  sortShiftHistoryDesc,
} from "@/lib/shift-history-utils";

/** Demo outlet venue — outlet history shows rows for this venue only */
export const OUTLET_VENUE_NAME = "Velvet 23";

const SEED_SHIFT_HISTORY_OTHER: ShiftHistoryRow[] = [
  {
    id: "h5",
    prName: "Victoria",
    prId: "pr-comcard-victoria",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "7 Jun 2026",
    dateIso: "2026-06-07",
    totalDrinks: 55,
    totalTips: 32,
    totalTables: 2,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 55, totalTips: 32, totalTables: 2 }),
    durationHours: 5,
  },
  {
    id: "h6",
    prName: "Sarah",
    prId: "pr-comcard-sarah",
    outlet: "Bear Lounge",
    agencyName: "Atlas Agency",
    dateDisplay: "6 Jun 2026",
    dateIso: "2026-06-06",
    totalDrinks: 78,
    totalTips: 41,
    totalTables: 3,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 78, totalTips: 41, totalTables: 3 }),
    durationHours: 6,
  },
  {
    id: "h7",
    prName: "Vicky",
    prId: "p1",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "04 May 2026",
    dateIso: "2026-05-04",
    totalDrinks: 24,
    totalTips: 40,
    totalTables: 1,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 24, totalTips: 40, totalTables: 1 }),
    durationHours: 6,
  },
  {
    id: "h8",
    prName: "Vicky",
    prId: "p1",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "05 May 2026",
    dateIso: "2026-05-05",
    totalDrinks: 22,
    totalTips: 50,
    totalTables: 1,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 22, totalTips: 50, totalTables: 1 }),
    durationHours: 6,
  },
  {
    id: "h9",
    prName: "Vicky",
    prId: "p1",
    outlet: "Bear Lounge",
    agencyName: "Atlas Agency",
    dateDisplay: "06 May 2026",
    dateIso: "2026-05-06",
    totalDrinks: 17,
    totalTips: 50,
    totalTables: 1,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 17, totalTips: 50, totalTables: 1 }),
    durationHours: 6,
  },
  // --- Delta Agency's own sealed shifts (peer-agency demo) ---
  // Tagged "Delta Agency" so they only surface in Delta's History, never Atlas's.
  // Dated in early June (before the payroll demo weeks) so they survive the PV sync.
  {
    id: "hd1",
    prName: "Sofia",
    prId: "delta-p1",
    outlet: "Velvet 23",
    agencyName: "Delta Agency",
    dateDisplay: "05 Jun 2026",
    dateIso: "2026-06-05",
    totalDrinks: 38,
    totalTips: 44,
    totalTables: 2,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 38, totalTips: 44, totalTables: 2 }),
    durationHours: 6,
  },
  {
    id: "hd2",
    prName: "Rina",
    prId: "delta-p2",
    outlet: "Bear Lounge",
    agencyName: "Delta Agency",
    dateDisplay: "06 Jun 2026",
    dateIso: "2026-06-06",
    totalDrinks: 51,
    totalTips: 38,
    totalTables: 3,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 51, totalTips: 38, totalTables: 3 }),
    durationHours: 6,
  },
  {
    id: "hd3",
    prName: "Mei",
    prId: "delta-p3",
    outlet: "Mermate",
    agencyName: "Delta Agency",
    dateDisplay: "07 Jun 2026",
    dateIso: "2026-06-07",
    totalDrinks: 29,
    totalTips: 33,
    totalTables: 1,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 29, totalTips: 33, totalTables: 1 }),
    durationHours: 5,
  },
  {
    id: "hd4",
    prName: "Sofia",
    prId: "delta-p1",
    outlet: "Bear Lounge",
    agencyName: "Delta Agency",
    dateDisplay: "08 Jun 2026",
    dateIso: "2026-06-08",
    totalDrinks: 42,
    totalTips: 47,
    totalTables: 2,
    totalPayout: sealedShiftTotalPayout({ totalDrinks: 42, totalTips: 47, totalTables: 2 }),
    durationHours: 6,
  },
];

export const SEED_SHIFT_HISTORY: ShiftHistoryRow[] = prepareShiftHistoryForDisplay(
  mergeShiftHistory(buildAllVelvetSeedShiftHistory(), SEED_SHIFT_HISTORY_OTHER),
);

/** Canonical PR labels after localStorage hydrate (Luna → Vicky on p1; seed name wins). */
export function migrateShiftHistoryPrNames(
  rows: ShiftHistoryRow[],
  seed: ShiftHistoryRow[] = SEED_SHIFT_HISTORY,
  agencyPRs?: { id: string; name: string }[],
): ShiftHistoryRow[] {
  const seedById = Object.fromEntries(seed.map((s) => [s.id, s]));
  return rows.map((row) => {
    const seedRow = seedById[row.id];
    const seedName = seedRow && seedRow.prId === row.prId ? seedRow.prName : undefined;
    const prName = seedName ?? resolveRosterPrName(row.prId, row.prName, agencyPRs);
    return prName === row.prName ? row : { ...row, prName };
  });
}

export function shiftHistorySubline(row: ShiftHistoryRow, portal: "agency" | "outlet") {
  if (portal === "agency") return row.outlet;
  return `${row.agencyName} · ${row.outlet}`;
}
