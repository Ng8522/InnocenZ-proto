/**
 * Velvet 23 demo week — single source for Reports + History (slides with live payroll week).
 */

import { addDaysToIso, getLiveTodayIso, getPayrollWeekSundayIso } from "@/lib/demo-clock";
import { fmtDateLabelFromIso } from "@/lib/pr-demo";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";

export const VELVET_OUTLET_NAME = "Velvet 23";
const VELVET_AGENCY = "Atlas Agency";

interface VelvetPrNight {
  prId: string;
  prName: string;
  payout: number;
  drinks: number;
  tips: number;
  tables?: number;
  durationHours: number;
}

interface VelvetNightShift {
  dateIso: string;
  dateDisplay: string;
  day: string;
  sales: number;
  prs: VelvetPrNight[];
}

/** Current demo week — drives Reports dashboard (2–8 Jun 2026). */
export const VELVET_WEEKLY_NIGHTS: VelvetNightShift[] = [
  {
    dateIso: "2026-06-02",
    dateDisplay: "2 Jun 2026",
    day: "M",
    sales: 3_200,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 20, tips: 26, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 18, tips: 22, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-06-03",
    dateDisplay: "3 Jun 2026",
    day: "T",
    sales: 2_750,
    prs: [
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 17, tips: 20, durationHours: 8 },
      { prId: "p4", prName: "Cici", payout: 480, drinks: 15, tips: 18, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-06-04",
    dateDisplay: "4 Jun 2026",
    day: "W",
    sales: 4_600,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 26, tips: 32, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 24, tips: 28, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 22, tips: 26, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-06-05",
    dateDisplay: "5 Jun 2026",
    day: "T",
    sales: 5_350,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 30, tips: 36, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 28, tips: 34, durationHours: 8 },
      { prId: "p6", prName: "Yuki", payout: 480, drinks: 24, tips: 30, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-06-06",
    dateDisplay: "6 Jun 2026",
    day: "F",
    sales: 11_800,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 44, tips: 52, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 40, tips: 48, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 38, tips: 44, durationHours: 8 },
      { prId: "p4", prName: "Cici", payout: 480, drinks: 34, tips: 40, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-06-07",
    dateDisplay: "7 Jun 2026",
    day: "S",
    sales: 14_100,
    prs: [
      { prId: "p1", prName: "Luna", payout: 540, drinks: 50, tips: 58, durationHours: 9 },
      { prId: "p2", prName: "Mia", payout: 540, drinks: 46, tips: 54, durationHours: 9 },
      { prId: "p3", prName: "Vivi", payout: 540, drinks: 44, tips: 50, durationHours: 9 },
      { prId: "p5", prName: "Nina", payout: 540, drinks: 40, tips: 46, durationHours: 9 },
    ],
  },
  {
    dateIso: "2026-06-08",
    dateDisplay: "8 Jun 2026",
    day: "S",
    sales: 7_600,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 32, tips: 38, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 30, tips: 36, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 26, tips: 32, durationHours: 8 },
    ],
  },
];

/** Prior week — History only (26 May – 1 Jun 2026). */
const VELVET_PRIOR_WEEK_NIGHTS: VelvetNightShift[] = [
  {
    dateIso: "2026-05-26",
    dateDisplay: "26 May 2026",
    day: "M",
    sales: 2_850,
    prs: [
      { prId: "p1", prName: "Luna", payout: 450, drinks: 16, tips: 22, durationHours: 7.5 },
      { prId: "p4", prName: "Cici", payout: 450, drinks: 14, tips: 18, durationHours: 7.5 },
    ],
  },
  {
    dateIso: "2026-05-27",
    dateDisplay: "27 May 2026",
    day: "T",
    sales: 2_400,
    prs: [
      { prId: "p2", prName: "Mia", payout: 450, drinks: 13, tips: 16, durationHours: 7.5 },
      { prId: "p6", prName: "Yuki", payout: 450, drinks: 12, tips: 15, durationHours: 7.5 },
    ],
  },
  {
    dateIso: "2026-05-28",
    dateDisplay: "28 May 2026",
    day: "W",
    sales: 3_900,
    prs: [
      { prId: "p1", prName: "Luna", payout: 450, drinks: 22, tips: 28, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 450, drinks: 19, tips: 24, durationHours: 8 },
      { prId: "p5", prName: "Nina", payout: 450, drinks: 17, tips: 20, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-29",
    dateDisplay: "29 May 2026",
    day: "T",
    sales: 4_750,
    prs: [
      { prId: "p2", prName: "Mia", payout: 450, drinks: 24, tips: 30, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 450, drinks: 21, tips: 26, durationHours: 8 },
      { prId: "p4", prName: "Cici", payout: 450, drinks: 18, tips: 22, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-30",
    dateDisplay: "30 May 2026",
    day: "F",
    sales: 10_200,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 38, tips: 46, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 34, tips: 42, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 32, tips: 38, durationHours: 8 },
      { prId: "p6", prName: "Yuki", payout: 480, drinks: 28, tips: 34, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-31",
    dateDisplay: "31 May 2026",
    day: "S",
    sales: 12_400,
    prs: [
      { prId: "p1", prName: "Luna", payout: 520, drinks: 44, tips: 52, durationHours: 8.5 },
      { prId: "p2", prName: "Mia", payout: 520, drinks: 40, tips: 48, durationHours: 8.5 },
      { prId: "p5", prName: "Nina", payout: 520, drinks: 36, tips: 42, durationHours: 8.5 },
      { prId: "p4", prName: "Cici", payout: 520, drinks: 32, tips: 38, durationHours: 8.5 },
    ],
  },
  {
    dateIso: "2026-06-01",
    dateDisplay: "1 Jun 2026",
    day: "S",
    sales: 6_800,
    prs: [
      { prId: "p2", prName: "Mia", payout: 450, drinks: 26, tips: 32, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 450, drinks: 24, tips: 28, durationHours: 8 },
      { prId: "p6", prName: "Yuki", payout: 450, drinks: 20, tips: 24, durationHours: 8 },
    ],
  },
];

/** Two weeks back — lighter mid-month week (19–25 May 2026). */
const VELVET_OLDER_WEEK_NIGHTS: VelvetNightShift[] = [
  {
    dateIso: "2026-05-19",
    dateDisplay: "19 May 2026",
    day: "M",
    sales: 2_100,
    prs: [
      { prId: "p3", prName: "Vivi", payout: 420, drinks: 11, tips: 14, durationHours: 7 },
      { prId: "p4", prName: "Cici", payout: 420, drinks: 10, tips: 12, durationHours: 7 },
    ],
  },
  {
    dateIso: "2026-05-20",
    dateDisplay: "20 May 2026",
    day: "T",
    sales: 1_950,
    prs: [
      { prId: "p1", prName: "Luna", payout: 420, drinks: 10, tips: 12, durationHours: 7 },
      { prId: "p2", prName: "Mia", payout: 420, drinks: 9, tips: 11, durationHours: 7 },
    ],
  },
  {
    dateIso: "2026-05-21",
    dateDisplay: "21 May 2026",
    day: "W",
    sales: 3_400,
    prs: [
      { prId: "p1", prName: "Luna", payout: 420, drinks: 18, tips: 22, durationHours: 7.5 },
      { prId: "p2", prName: "Mia", payout: 420, drinks: 16, tips: 20, durationHours: 7.5 },
      { prId: "p6", prName: "Yuki", payout: 420, drinks: 14, tips: 18, durationHours: 7.5 },
    ],
  },
  {
    dateIso: "2026-05-22",
    dateDisplay: "22 May 2026",
    day: "T",
    sales: 4_100,
    prs: [
      { prId: "p2", prName: "Mia", payout: 450, drinks: 20, tips: 24, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 450, drinks: 18, tips: 22, durationHours: 8 },
      { prId: "p5", prName: "Nina", payout: 450, drinks: 15, tips: 18, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-23",
    dateDisplay: "23 May 2026",
    day: "F",
    sales: 9_600,
    prs: [
      { prId: "p1", prName: "Luna", payout: 480, drinks: 34, tips: 40, durationHours: 8 },
      { prId: "p2", prName: "Mia", payout: 480, drinks: 30, tips: 36, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 480, drinks: 28, tips: 32, durationHours: 8 },
      { prId: "p4", prName: "Cici", payout: 480, drinks: 24, tips: 28, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-24",
    dateDisplay: "24 May 2026",
    day: "S",
    sales: 11_200,
    prs: [
      { prId: "p1", prName: "Luna", payout: 500, drinks: 40, tips: 46, durationHours: 8 },
      { prId: "p3", prName: "Vivi", payout: 500, drinks: 36, tips: 42, durationHours: 8 },
      { prId: "p5", prName: "Nina", payout: 500, drinks: 32, tips: 38, durationHours: 8 },
      { prId: "p6", prName: "Yuki", payout: 500, drinks: 28, tips: 34, durationHours: 8 },
    ],
  },
  {
    dateIso: "2026-05-25",
    dateDisplay: "25 May 2026",
    day: "S",
    sales: 5_900,
    prs: [
      { prId: "p2", prName: "Mia", payout: 420, drinks: 22, tips: 26, durationHours: 7.5 },
      { prId: "p4", prName: "Cici", payout: 420, drinks: 18, tips: 22, durationHours: 7.5 },
      { prId: "p6", prName: "Yuki", payout: 420, drinks: 16, tips: 20, durationHours: 7.5 },
    ],
  },
];

function demoTablesForShift(night: VelvetNightShift, pr: VelvetPrNight): number {
  if (pr.tables != null) return pr.tables;
  const weekend = night.day === "F" || night.day === "S";
  if (night.sales >= 10_000) return pr.drinks >= 38 ? 3 : 2;
  if (night.sales >= 5_000 || weekend) return pr.drinks >= 24 ? 2 : 1;
  if (pr.drinks >= 16) return 1;
  return 0;
}

function nightsToShiftHistory(nights: VelvetNightShift[], weekSundayIso: string): ShiftHistoryRow[] {
  const todayIso = getLiveTodayIso();
  return nights.flatMap((night, index) => {
    const dateIso = addDaysToIso(weekSundayIso, index);
    if (dateIso > todayIso) return [];
    return night.prs.map((pr) => ({
      id: `vh-${dateIso}-${pr.prId}`,
      prName: pr.prName,
      prId: pr.prId,
      outlet: VELVET_OUTLET_NAME,
      agencyName: VELVET_AGENCY,
      dateDisplay: fmtDateLabelFromIso(dateIso),
      dateIso,
      totalPayout: pr.payout,
      totalDrinks: pr.drinks,
      totalTips: pr.tips,
      totalTables: demoTablesForShift(night, pr),
      durationHours: pr.durationHours,
    }));
  });
}

export interface OutletWeeklyDaySales {
  day: string;
  dateIso: string;
  dateDisplay: string;
  sales: number;
  manpowerCost: number;
  shifts: number;
}

export interface OutletWeeklyReport {
  weekLabel: string;
  days: OutletWeeklyDaySales[];
  totalSales: number;
  totalCost: number;
  margin: number;
  shifts: number;
  avgTicket: number;
  wowGrowthPct: number;
  topPrs: { prId: string; name: string; sales: number }[];
}

/**
 * All Velvet outlet seed weeks for History + Reports.
 * To add a new week: implement `buildVelvetWeek2ShiftHistory()` and spread it here.
 * The store uses `mergeShiftHistory` so older rows are never removed on append.
 */
/** All Velvet history seed rows — prior weeks only (current week = live checkouts). */
export function buildAllVelvetSeedShiftHistory(): ShiftHistoryRow[] {
  const currentSun = getPayrollWeekSundayIso();
  return [
    ...nightsToShiftHistory(VELVET_PRIOR_WEEK_NIGHTS, addDaysToIso(currentSun, -7)),
    ...nightsToShiftHistory(VELVET_OLDER_WEEK_NIGHTS, addDaysToIso(currentSun, -14)),
  ];
}

export function buildVelvetWeekShiftHistory(): ShiftHistoryRow[] {
  return nightsToShiftHistory(VELVET_WEEKLY_NIGHTS, getPayrollWeekSundayIso());
}

function attributedPrSales(night: VelvetNightShift, pr: VelvetPrNight): number {
  const totalDrinks = night.prs.reduce((a, p) => a + p.drinks, 0);
  if (totalDrinks === 0) return 0;
  return Math.round(night.sales * (pr.drinks / totalDrinks));
}

export function getOutletWeeklyReport(outletName: string): OutletWeeklyReport | null {
  if (outletName !== VELVET_OUTLET_NAME) return null;

  const days: OutletWeeklyDaySales[] = VELVET_WEEKLY_NIGHTS.map((night) => ({
    day: night.day,
    dateIso: night.dateIso,
    dateDisplay: night.dateDisplay,
    sales: night.sales,
    manpowerCost: night.prs.reduce((a, pr) => a + pr.payout, 0),
    shifts: 1,
  }));

  const totalSales = days.reduce((a, d) => a + d.sales, 0);
  const totalCost = days.reduce((a, d) => a + d.manpowerCost, 0);
  const prSales = new Map<string, { name: string; sales: number }>();
  for (const night of VELVET_WEEKLY_NIGHTS) {
    for (const pr of night.prs) {
      const attr = attributedPrSales(night, pr);
      const cur = prSales.get(pr.prId) ?? { name: pr.prName, sales: 0 };
      prSales.set(pr.prId, { name: pr.prName, sales: cur.sales + attr });
    }
  }

  const topPrs = [...prSales.entries()]
    .map(([prId, p]) => ({ prId, name: p.name, sales: p.sales }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return {
    weekLabel: "2–8 Jun 2026",
    days,
    totalSales,
    totalCost,
    margin: totalSales - totalCost,
    shifts: VELVET_WEEKLY_NIGHTS.length,
    avgTicket: Math.round(totalSales / 272),
    wowGrowthPct: 12,
    topPrs,
  };
}
