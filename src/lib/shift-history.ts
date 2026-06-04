/** Shared shift transaction log — agency & outlet read the same records */

/** Demo outlet venue — outlet history shows rows for this venue only */
export const OUTLET_VENUE_NAME = "Velvet Room KL";

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

export const SEED_SHIFT_HISTORY: ShiftHistoryRow[] = [
  {
    id: "h1",
    prName: "Luna",
    prId: "p1",
    outlet: "Velvet Room KL",
    agencyName: "Atlas Agency",
    dateDisplay: "10 Jun 2026",
    dateIso: "2026-06-10",
    totalPayout: 420,
    totalDrinks: 86,
    totalTips: 42,
    durationHours: 6,
  },
  {
    id: "h2",
    prName: "Mia",
    prId: "p2",
    outlet: "Velvet Room KL",
    agencyName: "Atlas Agency",
    dateDisplay: "10 Jun 2026",
    dateIso: "2026-06-10",
    totalPayout: 395,
    totalDrinks: 74,
    totalTips: 38,
    durationHours: 5.5,
  },
  {
    id: "h3",
    prName: "Vivi",
    prId: "p3",
    outlet: "Velvet Room KL",
    agencyName: "Atlas Agency",
    dateDisplay: "9 Jun 2026",
    dateIso: "2026-06-09",
    totalPayout: 510,
    totalDrinks: 92,
    totalTips: 55,
    durationHours: 6,
  },
  {
    id: "h4",
    prName: "Yuki",
    prId: "p6",
    outlet: "Velvet Room KL",
    agencyName: "Atlas Agency",
    dateDisplay: "8 Jun 2026",
    dateIso: "2026-06-08",
    totalPayout: 480,
    totalDrinks: 68,
    totalTips: 48,
    durationHours: 6.5,
  },
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
];

export function shiftHistorySubline(row: ShiftHistoryRow, portal: "agency" | "outlet") {
  if (portal === "agency") return row.outlet;
  return `${row.agencyName} · ${row.outlet}`;
}
