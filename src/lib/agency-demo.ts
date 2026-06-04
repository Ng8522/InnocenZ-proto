/** Agency portal demo data — roster, commission rules, history, PR roster */

export interface OutletCommissionRule {
  outlet: string;
  wagePerHour: number;
  drinkPct: number;
  tipPct: number;
  tablePct: number;
  otAfterHours: number;
  platformPct: number;
}

export const OUTLET_COMMISSION_RULES: OutletCommissionRule[] = [
  { outlet: "Velvet 23", wagePerHour: 60, drinkPct: 8, tipPct: 15, tablePct: 10, otAfterHours: 6, platformPct: 5 },
  { outlet: "Mermate", wagePerHour: 55, drinkPct: 10, tipPct: 12, tablePct: 8, otAfterHours: 6, platformPct: 5 },
  { outlet: "Bear Lounge", wagePerHour: 58, drinkPct: 9, tipPct: 14, tablePct: 10, otAfterHours: 5, platformPct: 5 },
  { outlet: "Onyx KL", wagePerHour: 62, drinkPct: 7, tipPct: 16, tablePct: 12, otAfterHours: 6, platformPct: 5 },
  { outlet: "Urban Soul", wagePerHour: 52, drinkPct: 11, tipPct: 10, tablePct: 8, otAfterHours: 6, platformPct: 5 },
];

export function getOutletRule(outlet: string): OutletCommissionRule {
  return OUTLET_COMMISSION_RULES.find((r) => r.outlet === outlet) ?? OUTLET_COMMISSION_RULES[0];
}

/** Per-item payout from sealed shift log */
export function calcShiftPayout(input: {
  outlet: string;
  hoursWorked: number;
  drinks: number;
  drinkSales: number;
  tips: number;
  tableSales: number;
  checkOutAfterOt?: boolean;
}) {
  const rule = getOutletRule(input.outlet);
  const baseHours = Math.min(input.hoursWorked, rule.otAfterHours);
  const otHours = Math.max(0, input.hoursWorked - rule.otAfterHours);
  const wages = baseHours * rule.wagePerHour + otHours * rule.wagePerHour * 1.5;
  const drinkCommission = (input.drinkSales * rule.drinkPct) / 100;
  const tipCommission = (input.tips * rule.tipPct) / 100;
  const tableCommission = (input.tableSales * rule.tablePct) / 100;
  return {
    wages: Math.round(wages * 100) / 100,
    drinkCommission: Math.round(drinkCommission * 100) / 100,
    tipCommission: Math.round(tipCommission * 100) / 100,
    tableCommission: Math.round(tableCommission * 100) / 100,
    total: Math.round((wages + drinkCommission + tipCommission + tableCommission) * 100) / 100,
    rule,
  };
}

export type RosterSlotStatus =
  | "scheduled"
  | "on-duty"
  | "en-route"
  | "unavailable"
  | "swap-pending"
  | "assignment-pending";

export interface AgencyAssignmentMeta {
  agencyName?: string;
  agencyNote?: string;
  assignedAt: string;
  /** Epoch ms — used for "12 min ago" on PR Shifts */
  assignedAtMs?: number;
  respondedAt?: string;
}

export interface AgencyRosterSlot {
  id: string;
  prId: string;
  prName: string;
  outlet: string;
  date: string;
  dateIso: string;
  shift: string;
  shiftStart: string;
  shiftEnd: string;
  status: RosterSlotStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  /** Agency assigned PR to this outlet — PR must approve before shift locks */
  agencyAssignment?: AgencyAssignmentMeta;
  /** Agency requests moving PR to another outlet — PR approves or declines */
  outletSwap?: OutletSwapRequest;
}

export type OutletSwapStatus = "pending_pr" | "approved" | "declined";

export interface OutletSwapRequest {
  targetOutlet: string;
  status: OutletSwapStatus;
  agencyName?: string;
  agencyNote?: string;
  requestedAt: string;
  requestedAtMs?: number;
  respondedAt?: string;
}

export const SEED_AGENCY_ROSTER: AgencyRosterSlot[] = [
  {
    id: "rs1",
    prId: "p1",
    prName: "Luna",
    outlet: "Velvet 23",
    date: "Wed · 04 Jun 2026",
    dateIso: "2026-06-04",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "on-duty",
    checkedInAt: "21:58",
    outletSwap: {
      targetOutlet: "Bear Lounge",
      status: "pending_pr",
      agencyName: "Atlas Agency",
      agencyNote: "Relocate for lounge launch night — same shift time",
      requestedAt: "3 Jun 2026 · 11:28",
      requestedAtMs: Date.now() - 20 * 60 * 1000,
    },
  },
  {
    id: "rs2",
    prId: "p2",
    prName: "Mia",
    outlet: "Velvet 23",
    date: "Wed · 04 Jun 2026",
    dateIso: "2026-06-04",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "en-route",
  },
  {
    id: "rs3",
    prId: "p6",
    prName: "Yuki",
    outlet: "Onyx KL",
    date: "Wed · 04 Jun 2026",
    dateIso: "2026-06-04",
    shift: "21:00 — 03:00",
    shiftStart: "21:00",
    shiftEnd: "03:00",
    status: "swap-pending",
    outletSwap: {
      targetOutlet: "Mermate",
      status: "pending_pr",
      agencyNote: "VIP coverage — agency moving shift to Mermate",
      requestedAt: "4 Jun 2026 · 09:15",
    },
  },
  {
    id: "rs4",
    prId: "p5",
    prName: "Nina",
    outlet: "Mermate",
    date: "Thu · 05 Jun 2026",
    dateIso: "2026-06-05",
    shift: "20:00 — 02:00",
    shiftStart: "20:00",
    shiftEnd: "02:00",
    status: "unavailable",
  },
  {
    id: "rs6",
    prId: "p1",
    prName: "Luna",
    outlet: "Mermate",
    date: "Wed · 03 Jun 2026",
    dateIso: "2026-06-03",
    shift: "22:00 — 04:00",
    shiftStart: "22:00",
    shiftEnd: "04:00",
    status: "assignment-pending",
    agencyAssignment: {
      agencyName: "Atlas Agency",
      agencyNote: "You are needed at Mermate tonight — lounge relaunch coverage",
      assignedAt: "3 Jun 2026 · 11:36",
      assignedAtMs: Date.now() - 12 * 60 * 1000,
    },
  },
  {
    id: "rs5",
    prId: "p3",
    prName: "Vivi",
    outlet: "Bear Lounge",
    date: "Thu · 05 Jun 2026",
    dateIso: "2026-06-05",
    shift: "22:30 — 04:30",
    shiftStart: "22:30",
    shiftEnd: "04:30",
    status: "scheduled",
  },
];

export interface AgencyManagedPR {
  id: string;
  name: string;
  ic: string;
  mobile: string;
  email: string;
  age: number;
  height: number;
  race: string;
  languages: string[];
  place: string;
  yearsExp: number;
  rating: number;
  trainingLevel: string;
  totalPaid: number;
  attendancePct: number;
  checkIns: number;
  checkOuts: number;
  noShows: number;
  kpiScore: number;
}

export const SEED_AGENCY_PRS: AgencyManagedPR[] = [
  {
    id: "p1",
    name: "Luna",
    ic: "950312-14-8821",
    mobile: "+60 12-881 2201",
    email: "luna@inz.my",
    age: 26,
    height: 168,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "KL",
    yearsExp: 4,
    rating: 4.9,
    trainingLevel: "Tier V",
    totalPaid: 18420,
    attendancePct: 98,
    checkIns: 41,
    checkOuts: 41,
    noShows: 0,
    kpiScore: 92,
  },
  {
    id: "p2",
    name: "Mia",
    ic: "970801-08-4412",
    mobile: "+60 16-992 1103",
    email: "mia@inz.my",
    age: 24,
    height: 165,
    race: "Chinese",
    languages: ["English", "Mandarin", "Cantonese"],
    place: "PJ",
    yearsExp: 3,
    rating: 4.8,
    trainingLevel: "Tier IV",
    totalPaid: 14280,
    attendancePct: 96,
    checkIns: 38,
    checkOuts: 37,
    noShows: 1,
    kpiScore: 88,
  },
  {
    id: "p3",
    name: "Vivi",
    ic: "960515-10-7733",
    mobile: "+60 11-223 8890",
    email: "vivi@inz.my",
    age: 25,
    height: 170,
    race: "Malay",
    languages: ["English", "Malay"],
    place: "KL",
    yearsExp: 5,
    rating: 4.7,
    trainingLevel: "Tier V",
    totalPaid: 22100,
    attendancePct: 94,
    checkIns: 52,
    checkOuts: 51,
    noShows: 1,
    kpiScore: 85,
  },
  {
    id: "p5",
    name: "Nina",
    ic: "980220-06-5511",
    mobile: "+60 17-441 9922",
    email: "nina@inz.my",
    age: 23,
    height: 162,
    race: "Malay",
    languages: ["English", "Malay"],
    place: "Shah Alam",
    yearsExp: 2,
    rating: 4.5,
    trainingLevel: "Tier III",
    totalPaid: 8640,
    attendancePct: 91,
    checkIns: 19,
    checkOuts: 18,
    noShows: 1,
    kpiScore: 78,
  },
  {
    id: "p6",
    name: "Yuki",
    ic: "941108-12-9901",
    mobile: "+60 19-772 3301",
    email: "yuki@inz.my",
    age: 27,
    height: 166,
    race: "Japanese",
    languages: ["English", "Japanese", "Mandarin"],
    place: "Mont Kiara",
    yearsExp: 6,
    rating: 4.8,
    trainingLevel: "Tier VI",
    totalPaid: 31200,
    attendancePct: 99,
    checkIns: 58,
    checkOuts: 58,
    noShows: 0,
    kpiScore: 95,
  },
  {
    id: "p4",
    name: "Cici",
    ic: "990101-08-3344",
    mobile: "+60 18-220 6612",
    email: "cici@inz.my",
    age: 24,
    height: 163,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "PJ",
    yearsExp: 2,
    rating: 4.6,
    trainingLevel: "Tier III",
    totalPaid: 9200,
    attendancePct: 93,
    checkIns: 22,
    checkOuts: 21,
    noShows: 0,
    kpiScore: 82,
  },
  {
    id: "p7",
    name: "Chen Wei",
    ic: "970515-10-6622",
    mobile: "+60 16-772 4410",
    email: "chen.wei@inz.my",
    age: 25,
    height: 167,
    race: "Chinese",
    languages: ["English", "Mandarin"],
    place: "KL",
    yearsExp: 3,
    rating: 4.7,
    trainingLevel: "Tier IV",
    totalPaid: 11800,
    attendancePct: 95,
    checkIns: 28,
    checkOuts: 28,
    noShows: 0,
    kpiScore: 86,
  },
];

export interface LiveWorkforceEntry {
  id: string;
  prName: string;
  outlet: string;
  status: "on-duty" | "en-route" | "checked-out";
  checkIn?: string;
  checkOut?: string;
  estPayout: number;
  drinks: number;
  tips: number;
}

export const SEED_LIVE_WORKFORCE: LiveWorkforceEntry[] = [
  { id: "lw1", prName: "Luna", outlet: "Velvet 23", status: "on-duty", checkIn: "21:58", estPayout: 420, drinks: 12, tips: 45 },
  { id: "lw2", prName: "Mia", outlet: "Velvet 23", status: "en-route", estPayout: 380, drinks: 0, tips: 0 },
  { id: "lw3", prName: "Chen Wei", outlet: "Onyx KL", status: "on-duty", checkIn: "20:55", estPayout: 510, drinks: 15, tips: 62 },
];

export interface OutletPnlRow {
  outlet: string;
  grossRevenue: number;
  prPayout: number;
  agencyNet: number;
  outletNet: number;
  platformFee: number;
}

export const SEED_OUTLET_PNL: OutletPnlRow[] = [
  { outlet: "Velvet 23", grossRevenue: 14820, prPayout: 2180, agencyNet: 4200, outletNet: 7940, platformFee: 741 },
  { outlet: "Mermate", grossRevenue: 9200, prPayout: 1640, agencyNet: 2800, outletNet: 4380, platformFee: 460 },
  { outlet: "Bear Lounge", grossRevenue: 7600, prPayout: 1420, agencyNet: 2100, outletNet: 3740, platformFee: 380 },
  { outlet: "Onyx KL", grossRevenue: 11200, prPayout: 1980, agencyNet: 3200, outletNet: 5640, platformFee: 560 },
];

export interface AgencyOwnerSettings {
  ownerName: string;
  mobile: string;
  email: string;
  ic: string;
  orgName: string;
  otpChannel: "email" | "phone";
  accountActivated: boolean;
}

export const DEFAULT_AGENCY_OWNER: AgencyOwnerSettings = {
  ownerName: "Dato' Lim Wei Khoon",
  mobile: "+60 12-345 6789",
  email: "owner@atlas-agency.my",
  ic: "780101-14-5522",
  orgName: "Atlas Agency",
  otpChannel: "email",
  accountActivated: true,
};

export const OUTLET_NAMES = [...new Set(OUTLET_COMMISSION_RULES.map((r) => r.outlet))];

export function nowAgencyDateTime() {
  const d = new Date();
  return {
    date: d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Keep demo agency inbox (assignments / swaps) visible after localStorage hydrate */
export function mergeAgencyRoster(
  persisted: AgencyRosterSlot[] | undefined,
  seed: AgencyRosterSlot[] = SEED_AGENCY_ROSTER,
): AgencyRosterSlot[] {
  if (!persisted?.length) return seed;
  const seedIds = new Set(seed.map((s) => s.id));
  const extras = persisted.filter((s) => !seedIds.has(s.id));
  return [
    ...extras,
    ...seed.map((seedSlot) => {
      const saved = persisted.find((s) => s.id === seedSlot.id);
      if (!saved) return seedSlot;
      const keepAssignmentPending =
        seedSlot.status === "assignment-pending" && saved.status !== "scheduled";
      const keepSwapPending =
        seedSlot.outletSwap?.status === "pending_pr" &&
        saved.outletSwap?.status !== "approved";
      return {
        ...seedSlot,
        ...saved,
        status: keepAssignmentPending ? seedSlot.status : saved.status,
        agencyAssignment: keepAssignmentPending
          ? seedSlot.agencyAssignment
          : saved.agencyAssignment ?? seedSlot.agencyAssignment,
        outletSwap: keepSwapPending ? seedSlot.outletSwap : saved.outletSwap ?? seedSlot.outletSwap,
      };
    }),
  ];
}
