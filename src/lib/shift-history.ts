/** Shared shift transaction log — agency & outlet read the same records */

import { buildAllVelvetSeedShiftHistory } from "@/lib/velvet-week-demo";
import {
  mergeShiftHistory,
  type ShiftHistoryRow,
} from "@/lib/shift-history-utils";

export type { ShiftHistoryRow } from "@/lib/shift-history-utils";
export {
  compareShiftHistoryDesc,
  mergeShiftHistory,
  sortShiftHistoryDesc,
} from "@/lib/shift-history-utils";

/** Demo outlet venue — outlet history shows rows for this venue only */
export const OUTLET_VENUE_NAME = "Velvet 23";

const SEED_SHIFT_HISTORY_OTHER: ShiftHistoryRow[] = [
  {
    id: "h5",
    prName: "Nina",
    prId: "p5",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "7 Jun 2026",
    dateIso: "2026-06-07",
    totalPayout: 360,
    totalDrinks: 55,
    totalTips: 32,
    durationHours: 5,
  },
  {
    id: "h6",
    prName: "Chen Wei",
    prId: "p7",
    outlet: "Bear Lounge",
    agencyName: "Atlas Agency",
    dateDisplay: "6 Jun 2026",
    dateIso: "2026-06-06",
    totalPayout: 445,
    totalDrinks: 78,
    totalTips: 41,
    durationHours: 6,
  },
  {
    id: "h7",
    prName: "Luna",
    prId: "p1",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "04 May 2026",
    dateIso: "2026-05-04",
    totalPayout: 510,
    totalDrinks: 24,
    totalTips: 40,
    durationHours: 6,
  },
  {
    id: "h8",
    prName: "Luna",
    prId: "p1",
    outlet: "Mermate",
    agencyName: "Atlas Agency",
    dateDisplay: "05 May 2026",
    dateIso: "2026-05-05",
    totalPayout: 520,
    totalDrinks: 22,
    totalTips: 50,
    durationHours: 6,
  },
  {
    id: "h9",
    prName: "Luna",
    prId: "p1",
    outlet: "Bear Lounge",
    agencyName: "Atlas Agency",
    dateDisplay: "06 May 2026",
    dateIso: "2026-05-06",
    totalPayout: 420,
    totalDrinks: 17,
    totalTips: 50,
    durationHours: 6,
  },
];

export const SEED_SHIFT_HISTORY: ShiftHistoryRow[] = mergeShiftHistory(
  buildAllVelvetSeedShiftHistory(),
  SEED_SHIFT_HISTORY_OTHER,
);

export function shiftHistorySubline(row: ShiftHistoryRow, portal: "agency" | "outlet") {
  if (portal === "agency") return row.outlet;
  return `${row.agencyName} · ${row.outlet}`;
}
