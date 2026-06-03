/** PR Talent demo data — mirrors InnocenZ_Prototype.html */

export type PrSubRole = "pr_tied" | "pr_free";

export interface PrProfile {
  name: string;
  first: string;
  ic: string;
  mobile: string;
  email: string;
  bank: string;
  acc: string;
  av: string;
  avg: string;
  tier: string;
  rep: string;
  shifts: string;
  noshow: string;
  langs: string[];
  prog: number;
  next: string;
}

export const PR_PROFILES: Record<PrSubRole, PrProfile> = {
  pr_tied: {
    name: "Maggie Chan",
    first: "Maggie",
    ic: "000001-08-7778",
    mobile: "+60 12-345 6778",
    email: "maggie.chan@inz.my",
    bank: "Maybank",
    acc: "5142 8890 1123",
    av: "M",
    avg: "linear-gradient(135deg,#C99B4E,#8a5e22)",
    tier: "TIER V",
    rep: "4.8",
    shifts: "42",
    noshow: "0",
    langs: ["English", "Mandarin", "Cantonese"],
    prog: 72,
    next: "8 more 5★ shifts to unlock Tier VI perks & priority VIP requests.",
  },
  pr_free: {
    name: "Jaya Nair",
    first: "Jaya",
    ic: "880214-10-5566",
    mobile: "+60 17-662 3391",
    email: "jaya.nair@inz.my",
    bank: "CIMB",
    acc: "7029 1183 4420",
    av: "J",
    avg: "linear-gradient(135deg,#5BA8FF,#2d63b8)",
    tier: "TIER III",
    rep: "4.6",
    shifts: "19",
    noshow: "1",
    langs: ["English", "Cantonese"],
    prog: 45,
    next: "12 more 5★ shifts to reach Tier IV.",
  },
};

export interface PrShiftOffer {
  outlet: string;
  event: string;
  date: [number, number, number];
  time: string;
  endNext: boolean;
  distance: string;
  addr: string;
  base: number;
  comm: number;
  vip: boolean;
  rating: string;
}

export const PR_SHIFT_OFFERS: PrShiftOffer[] = [
  {
    outlet: "Velvet 23",
    event: "VIP Night",
    date: [2026, 6, 3],
    time: "9:00 PM – 2:00 AM",
    endNext: true,
    distance: "1.2 km",
    addr: "Jalan Changkat, KL",
    base: 280,
    comm: 40,
    vip: true,
    rating: "4.8",
  },
  {
    outlet: "Onyx KL",
    event: "Regular",
    date: [2026, 6, 4],
    time: "10:00 PM – 3:00 AM",
    endNext: true,
    distance: "3.4 km",
    addr: "Jalan P. Ramlee, KL",
    base: 240,
    comm: 40,
    vip: false,
    rating: "4.6",
  },
  {
    outlet: "Pearl Lounge",
    event: "Launch Party",
    date: [2026, 6, 5],
    time: "8:00 PM – 1:00 AM",
    endNext: true,
    distance: "5.1 km",
    addr: "Bukit Bintang, KL",
    base: 220,
    comm: 40,
    vip: true,
    rating: "4.9",
  },
];

export const SHIFT_TODAY: [number, number, number] = [2026, 6, 3];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayName(y: number, m: number, d: number) {
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

export function fmtDFriendly(y: number, m: number, d: number) {
  return `${dayName(y, m, d)} · ${String(d).padStart(2, "0")} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function fmtDShort(y: number, m: number, d: number) {
  return `${dayName(y, m, d)} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function fmtDtable(y: number, m: number, d: number) {
  return `${String(d).padStart(2, "0")} ${MONTH_NAMES[m - 1]}`;
}

export function addDay(y: number, m: number, d: number): [number, number, number] {
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()];
}

export function getPrProfile(role: PrSubRole | null): PrProfile {
  return PR_PROFILES[role ?? "pr_tied"];
}

export type PrPvStatus = "SENT" | "SIGNED" | "PAID" | "DISPUTED";

export interface PrPvRow {
  i: number;
  date: string;
  day: string;
  outlet: string;
  desc: string;
  qty: number;
  amt: number;
  ref: string;
}

export interface PrPaymentVoucher {
  id: string;
  prName: string;
  outlet: string;
  cycle: string;
  issued: string;
  due: string;
  rows: PrPvRow[];
  subtotal: number;
  deduct: number;
  net: number;
  status: PrPvStatus;
}

export const PAYROLL_CYCLE = {
  label: "Current payroll cycle",
  range: "4 May \u2013 10 Jun 2026",
  nextTransfer: "Friday, 13 Jun 2026 \u00b7 23:59",
};

export const SEED_PR_PVS: PrPaymentVoucher[] = [
  {
    id: "PV-2026-0512",
    prName: "Maggie Chan",
    outlet: "Multi-Outlet (3)",
    cycle: "4 May \u2013 10 May 2026",
    issued: "10 May 2026",
    due: "17 May 2026",
    rows: [],
    subtotal: 1830,
    deduct: 200,
    net: 1630,
    status: "SENT",
  },
  {
    id: "PV-2026-0498",
    prName: "Maggie Chan",
    outlet: "Mermate",
    cycle: "27 Apr \u2013 3 May 2026",
    issued: "3 May 2026",
    due: "10 May 2026",
    rows: [
      { i: 1, date: "27 Apr", day: "Sun", outlet: "Mermate", desc: "Daily Wages", qty: 1, amt: 350, ref: "Sealed" },
      { i: 2, date: "27 Apr", day: "Sun", outlet: "Mermate", desc: "Commission – Drinks", qty: 1, amt: 170, ref: "Tap log" },
      { i: 3, date: "27 Apr", day: "Sun", outlet: "Mermate", desc: "Commission – Tips", qty: 1, amt: 80, ref: "Tap log" },
    ],
    subtotal: 600,
    deduct: 0,
    net: 600,
    status: "SIGNED",
  },
  {
    id: "PV-2026-0521",
    prName: "Maggie Chan",
    outlet: "Bear Lounge",
    cycle: "4 May \u2013 10 May 2026",
    issued: "10 May 2026",
    due: "17 May 2026",
    rows: [
      { i: 1, date: "9 May", day: "Sat", outlet: "Bear Lounge", desc: "Daily Wages", qty: 1, amt: 350, ref: "Sealed" },
      { i: 2, date: "9 May", day: "Sat", outlet: "Bear Lounge", desc: "Commission – Drinks", qty: 1, amt: 120, ref: "Disputed" },
    ],
    subtotal: 470,
    deduct: 0,
    net: 470,
    status: "DISPUTED",
  },
];

export interface HistRow {
  d: [number, number, number];
  venue: string;
  wages: number;
  sales: number;
  table: number;
  drinks: number;
  tips: number;
  st: "PAID" | "SIGNED" | "SENT" | "DISPUTED";
  pill: "green" | "amber" | "ink" | "red";
}

export const HIST_ROWS: HistRow[] = [
  { d: [2026, 5, 4], venue: "Mermate", wages: 350, sales: 510, table: 60, drinks: 24, tips: 40, st: "PAID", pill: "green" },
  { d: [2026, 5, 5], venue: "Mermate", wages: 350, sales: 520, table: 60, drinks: 22, tips: 50, st: "PAID", pill: "green" },
  { d: [2026, 5, 6], venue: "Bear Lounge", wages: 350, sales: 420, table: 120, drinks: 17, tips: 50, st: "PAID", pill: "green" },
  { d: [2026, 5, 7], venue: "Urban Soul", wages: 350, sales: 480, table: 0, drinks: 19, tips: 60, st: "SIGNED", pill: "amber" },
  { d: [2026, 5, 11], venue: "Mermate", wages: 380, sales: 620, table: 120, drinks: 28, tips: 65, st: "PAID", pill: "green" },
  { d: [2026, 5, 14], venue: "Bear Lounge", wages: 350, sales: 380, table: 60, drinks: 15, tips: 30, st: "SIGNED", pill: "amber" },
  { d: [2026, 5, 18], venue: "Urban Soul", wages: 350, sales: 550, table: 60, drinks: 21, tips: 55, st: "SENT", pill: "ink" },
  { d: [2026, 5, 21], venue: "Mermate", wages: 400, sales: 710, table: 180, drinks: 32, tips: 80, st: "DISPUTED", pill: "red" },
];

export const COMCARD = { height: 168, weight: 52, age: 25 };
