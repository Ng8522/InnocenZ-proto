import { addDays, format, parseISO } from "date-fns";
import { verifyReceiptScan } from "@/lib/pr-shift-status";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { addDaysToIso, isWeekPvIssuedOnCalendar } from "@/lib/demo-clock";
import { seedFinanceHeadStamp } from "@/lib/finance-head-stamp";
import {
  getShiftToday,
  fmtDtable,
  formatPvSignTimestamp,
  type PrPaymentVoucher,
  type PrProfile,
  type PrPvRow,
  type PrReceiptScan,
} from "@/lib/pr-demo";

/** Payroll week runs Sunday → Saturday; PV issues the following Sunday. */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeeklyDayStatus = "verified" | "pending" | "disputed" | "empty";

export type WeeklyDayColumn = {
  dateIso: string;
  dayLabel: string;
  dayNum: number;
  isToday: boolean;
  isFuture: boolean;
};

export type WeeklyIncomeRow = {
  key: "wages" | "drinks" | "tips" | "tables" | "others";
  label: string;
  cells: number[];
};

export type WeeklyPaymentSummary = {
  weekStartIso: string;
  weekEndIso: string;
  weekLabel: string;
  columns: WeeklyDayColumn[];
  rows: WeeklyIncomeRow[];
  dayStatus: WeeklyDayStatus[];
  totals: { wages: number; drinks: number; tips: number; tables: number; others: number; net: number };
  verifiedDayCount: number;
  /** Totals from verified checkout days only (current-week preview) */
  verifiedTotals: { wages: number; drinks: number; tips: number; tables: number; others: number; net: number };
  /** Sunday when this week's PV is issued (day after week ends) */
  issueDayLabel: string;
  issueDayIso: string;
  pvReady: boolean;
  dayOutlets: (string | undefined)[];
};

export type WeeklyDisputeTarget = {
  dateIso: string;
  dateLabel: string;
  dayLabel: string;
  incomeKey: WeeklyIncomeRow["key"];
  incomeLabel: string;
  amount: number;
  outlet?: string;
};

export type WeeklyDayBreakdown = {
  wages: number;
  drinks: number;
  tips: number;
  tables: number;
  others: number;
  status: WeeklyDayStatus;
  outlet?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateIso(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function referenceToIso(reference: [number, number, number]) {
  return toDateIso(reference[0], reference[1], reference[2]);
}

/** Sunday–Saturday week containing the reference date. */
export function getWeekBounds(reference: [number, number, number] = getShiftToday()) {
  const [y, m, d] = reference;
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const diffToSun = -dow;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToSun);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const issueDay = new Date(end);
  issueDay.setDate(end.getDate() + 1);
  const startIso = toDateIso(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const endIso = toDateIso(end.getFullYear(), end.getMonth() + 1, end.getDate());
  const issueDayIso = toDateIso(issueDay.getFullYear(), issueDay.getMonth() + 1, issueDay.getDate());
  const startLabel = fmtDtable(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const endLabel = fmtDtable(end.getFullYear(), end.getMonth() + 1, end.getDate());
  const issueDayLabel = fmtDtable(issueDay.getFullYear(), issueDay.getMonth() + 1, issueDay.getDate());
  return {
    start,
    end,
    issueDay,
    startIso,
    endIso,
    issueDayIso,
    label: `${startLabel} – ${endLabel} ${end.getFullYear()}`,
    issueDayLabel,
  };
}

export function getPreviousWeekBounds(reference: [number, number, number] = getShiftToday()) {
  const bounds = getWeekBounds(reference);
  const prevStart = new Date(bounds.start);
  prevStart.setDate(prevStart.getDate() - 7);
  return getWeekBounds([
    prevStart.getFullYear(),
    prevStart.getMonth() + 1,
    prevStart.getDate(),
  ]);
}

/** PV for a week is issued on the Sunday after that week ends. */
export function isWeekPvIssued(weekEndIso: string, reference: [number, number, number] = getShiftToday()) {
  return isWeekPvIssuedOnCalendar(weekEndIso, referenceToIso(reference));
}

export function makeWeeklyPvId(weekStartIso: string, prSuffix: string) {
  const [y, m, d] = weekStartIso.split("-");
  return `PV-${y}-W${m}${d}-${prSuffix}`;
}

export function isPvIssuedForWeek(pv: PrPaymentVoucher, weekStartIso: string) {
  return pv.weekStartIso === weekStartIso;
}

function parseRowDateIso(row: PrPvRow, year: number): string | null {
  const m = row.date.trim().match(/^(\d{1,2})\s+([A-Za-z]+)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = m[2].slice(0, 3).toLowerCase();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mi = months.findIndex((x) => x === mon);
  if (mi < 0) return null;
  return toDateIso(year, mi + 1, day);
}

function emptyWeekBreakdown(): WeeklyDayBreakdown {
  return { wages: 0, drinks: 0, tips: 0, tables: 0, others: 0, status: "empty" };
}

function addRowToBreakdown(b: WeeklyDayBreakdown, row: PrPvRow) {
  const desc = row.desc.toLowerCase();
  if (desc.includes("daily wage")) b.wages += row.amt;
  else if (desc.includes("drink")) b.drinks += row.amt;
  else if (desc.includes("tip")) b.tips += row.amt;
  else if (desc.includes("table")) b.tables += row.amt;
  else b.others += row.amt;
  b.outlet = row.outlet;
  if (row.ref.toLowerCase().includes("disput")) b.status = "disputed";
  else if (b.status !== "disputed") b.status = "verified";
}

function scansForHistoryRow(row: ShiftHistoryRow, scans: PrReceiptScan[]): PrReceiptScan[] {
  const dayScans = scans.filter(
    (s) => s.date && toDateIso(s.date[0], s.date[1], s.date[2]) === row.dateIso,
  );
  const isCheckoutRow = row.id.startsWith("h") && !row.id.startsWith("vh-");
  if (!isCheckoutRow) return dayScans;
  const sealed = dayScans.filter(
    (s) => s.shiftSessionId?.includes(row.dateIso) && s.outlet === row.outlet,
  );
  return sealed.length ? sealed : dayScans;
}

function breakdownFromHistoryRow(row: ShiftHistoryRow, scans: PrReceiptScan[]): WeeklyDayBreakdown {
  const dayScans = scansForHistoryRow(row, scans);
  let drinks = 0;
  let tips = 0;
  let tables = 0;
  let allVerified = dayScans.length === 0 || dayScans.every((s) => verifyReceiptScan(s).ok);
  for (const s of dayScans) {
    drinks += s.drinkCommission;
    tips += s.tipCommission;
    tables += s.tableCommission;
    if (!verifyReceiptScan(s).ok) allVerified = false;
  }
  if (dayScans.length === 0) {
    drinks = row.totalDrinks;
    tips = row.totalTips;
    allVerified = true;
  }
  const commission = drinks + tips + tables;
  const wages = Math.max(0, row.totalPayout - commission);
  return {
    wages,
    drinks,
    tips,
    tables,
    others: 0,
    status: allVerified ? "verified" : "pending",
    outlet: row.outlet,
  };
}

function buildColumns(weekStart: Date, reference: [number, number, number]): WeeklyDayColumn[] {
  const [ty, tm, td] = reference;
  const todayIso = toDateIso(ty, tm, td);
  const cols: WeeklyDayColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = toDateIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
    cols.push({
      dateIso: iso,
      dayLabel: WEEKDAY_SHORT[i],
      dayNum: d.getDate(),
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
    });
  }
  return cols;
}

function breakdownsFromPvRows(rows: PrPvRow[], year: number, weekStartIso: string, weekEndIso: string) {
  const map = new Map<string, WeeklyDayBreakdown>();
  for (const row of rows) {
    const iso = parseRowDateIso(row, year);
    if (!iso || iso < weekStartIso || iso > weekEndIso) continue;
    const b = map.get(iso) ?? emptyWeekBreakdown();
    addRowToBreakdown(b, row);
    map.set(iso, b);
  }
  return map;
}

function pickSealedHistoryRow(
  rows: ShiftHistoryRow[],
  prId: string,
  dateIso: string,
): ShiftHistoryRow | undefined {
  return rows.find(
    (r) =>
      r.prId === prId &&
      r.dateIso === dateIso &&
      r.id.startsWith("h") &&
      !r.id.startsWith("vh-"),
  );
}

function computeVerifiedTotals(
  columns: WeeklyDayColumn[],
  dayStatus: WeeklyDayStatus[],
  rows: WeeklyIncomeRow[],
) {
  const totals = { wages: 0, drinks: 0, tips: 0, tables: 0, others: 0, net: 0 };
  for (let i = 0; i < columns.length; i++) {
    if (dayStatus[i] !== "verified") continue;
    for (const row of rows) {
      totals[row.key] += row.cells[i];
      totals.net += row.cells[i];
    }
  }
  return totals;
}

/** Merge PV line items with week grid totals — single source for display & dispute. */
export function syncWeeklyPvWithSummary(
  pv: PrPaymentVoucher,
  summary: WeeklyPaymentSummary,
): PrPaymentVoucher {
  if (!pv.weekStartIso) return pv;
  const rows = mergePvRowsWithSummary(pv, summary);
  const subtotal = summary.totals.net;
  const outlets = new Set(rows.map((r) => r.outlet).filter(Boolean));
  return {
    ...pv,
    cycle: summary.weekLabel.replace(/\s+\d{4}$/, ""),
    outlet: outlets.size > 1 ? `Multi-outlet (${outlets.size})` : rows[0]?.outlet ?? pv.outlet,
    subtotal,
    net: Math.max(0, subtotal - pv.deduct),
    rows,
    shiftTime: undefined,
    timeIn: undefined,
    timeOut: undefined,
    shiftSessionId: undefined,
  };
}

function mergePvRowsWithSummary(pv: PrPaymentVoucher, summary: WeeklyPaymentSummary): PrPvRow[] {
  const generated = pvRowsFromWeeklySummary(summary, pv.outlet);
  return generated.map((row) => {
    const match = pv.rows.find(
      (r) =>
        r.date === row.date &&
        r.desc === row.desc &&
        Math.abs(r.amt - row.amt) < 0.02,
    );
    return match ? { ...row, receiptIds: match.receiptIds, ref: match.ref } : row;
  });
}

export function buildWeeklyDisputeMessage(target: WeeklyDisputeTarget): string {
  const amt = target.amount.toFixed(2);
  const where = target.outlet ? ` at ${target.outlet}` : "";
  return `${target.dayLabel} ${target.dateLabel} · ${target.incomeLabel}${where}: PV shows RM ${amt} but this does not match my sealed shift / receipt scans. Please verify with the outlet and correct this line before payment.`;
}

export function dayDisputeTargets(
  summary: WeeklyPaymentSummary,
  colIdx: number,
): WeeklyDisputeTarget[] {
  const col = summary.columns[colIdx];
  if (!col || summary.dayStatus[colIdx] === "empty") return [];
  const [y, m, d] = col.dateIso.split("-").map(Number);
  const dateLabel = fmtDtable(y, m, d);
  const outlet = summary.dayOutlets[colIdx];
  const targets: WeeklyDisputeTarget[] = [];
  for (const row of summary.rows) {
    const amount = row.cells[colIdx];
    if (amount <= 0) continue;
    targets.push({
      dateIso: col.dateIso,
      dateLabel,
      dayLabel: col.dayLabel,
      incomeKey: row.key,
      incomeLabel: row.label,
      amount,
      outlet,
    });
  }
  return targets;
}

export function buildWeeklyPaymentSummary(opts: {
  weekStartIso?: string;
  reference?: [number, number, number];
  pv?: PrPaymentVoucher | null;
  shiftHistory?: ShiftHistoryRow[];
  scans?: PrReceiptScan[];
  prId?: string;
  disputedDates?: string[];
}): WeeklyPaymentSummary {
  const reference = opts.reference ?? getShiftToday();
  const bounds = opts.weekStartIso
    ? getWeekBounds(opts.weekStartIso.split("-").map(Number) as [number, number, number])
    : getWeekBounds(reference);
  const weekStartIso = opts.weekStartIso ?? bounds.startIso;
  const weekEndIso = bounds.endIso;
  const year = parseIsoDate(weekStartIso).getFullYear();
  const columns = buildColumns(bounds.start, reference);
  const dayMap = new Map<string, WeeklyDayBreakdown>();
  const pvMatchesWeek = opts.pv?.weekStartIso === weekStartIso;
  const pvReady = isWeekPvIssued(weekEndIso, reference);
  const isCurrentWeek = weekStartIso === getWeekBounds(reference).startIso;
  const pvIsAuthoritative = pvMatchesWeek && pvReady && (opts.pv?.rows?.length ?? 0) > 0;

  if (pvIsAuthoritative) {
    for (const [iso, b] of breakdownsFromPvRows(opts.pv!.rows, year, weekStartIso, weekEndIso)) {
      dayMap.set(iso, b);
    }
  }

  if (opts.shiftHistory?.length && opts.prId && !pvIsAuthoritative) {
    for (const col of columns) {
      if (col.isFuture) continue;
      const row = pickSealedHistoryRow(opts.shiftHistory, opts.prId, col.dateIso);
      if (!row) continue;
      dayMap.set(col.dateIso, breakdownFromHistoryRow(row, opts.scans ?? []));
    }
  }

  // Current week before PV issue: only real check-out rows — never seed venue history or scans alone.
  if (isCurrentWeek && !pvReady) {
    const checkoutOnly = new Map<string, WeeklyDayBreakdown>();
    for (const col of columns) {
      if (col.isFuture) continue;
      const row = pickSealedHistoryRow(opts.shiftHistory ?? [], opts.prId ?? "", col.dateIso);
      if (row) checkoutOnly.set(col.dateIso, breakdownFromHistoryRow(row, opts.scans ?? []));
    }
    dayMap.clear();
    for (const [iso, b] of checkoutOnly) dayMap.set(iso, b);
  }

  for (const iso of opts.disputedDates ?? []) {
    const b = dayMap.get(iso);
    if (b) b.status = "disputed";
  }

  const dayStatus: WeeklyDayStatus[] = columns.map((col) => {
    const b = dayMap.get(col.dateIso);
    if (!b || (b.wages + b.drinks + b.tips + b.tables + b.others === 0)) return "empty";
    return b.status;
  });

  const rowKeys: WeeklyIncomeRow["key"][] = ["wages", "drinks", "tips", "tables", "others"];
  const rowLabels: Record<WeeklyIncomeRow["key"], string> = {
    wages: "Daily wages",
    drinks: "Drinks",
    tips: "Tips",
    tables: "Tables",
    others: "Others",
  };

  const rows: WeeklyIncomeRow[] = rowKeys.map((key) => ({
    key,
    label: rowLabels[key],
    cells: columns.map((col) => dayMap.get(col.dateIso)?.[key] ?? 0),
  }));

  const totals = rows.reduce(
    (acc, row) => {
      const sum = row.cells.reduce((s, v) => s + v, 0);
      acc[row.key] = sum;
      acc.net += sum;
      return acc;
    },
    { wages: 0, drinks: 0, tips: 0, tables: 0, others: 0, net: 0 },
  );

  const verifiedDayCount = dayStatus.filter((s) => s === "verified").length;
  const dayOutlets = columns.map((col) => dayMap.get(col.dateIso)?.outlet);
  const verifiedTotals = computeVerifiedTotals(columns, dayStatus, rows);

  return {
    weekStartIso,
    weekEndIso,
    weekLabel: bounds.label,
    columns,
    rows,
    dayStatus,
    totals,
    verifiedTotals,
    verifiedDayCount,
    issueDayLabel: bounds.issueDayLabel,
    issueDayIso: bounds.issueDayIso,
    pvReady,
    dayOutlets,
  };
}

export function pvRowsFromWeeklySummary(
  summary: WeeklyPaymentSummary,
  fallbackOutlet: string,
): PrPvRow[] {
  const rows: PrPvRow[] = [];
  let i = 1;
  for (let idx = 0; idx < summary.columns.length; idx++) {
    const col = summary.columns[idx];
    const outlet = summary.dayOutlets[idx] ?? fallbackOutlet;
    const wages = summary.rows.find((r) => r.key === "wages")?.cells[idx] ?? 0;
    const drinks = summary.rows.find((r) => r.key === "drinks")?.cells[idx] ?? 0;
    const tips = summary.rows.find((r) => r.key === "tips")?.cells[idx] ?? 0;
    const tables = summary.rows.find((r) => r.key === "tables")?.cells[idx] ?? 0;
    const others = summary.rows.find((r) => r.key === "others")?.cells[idx] ?? 0;
    const status = summary.dayStatus[idx];
    if (status === "empty") continue;
    const [y, m, d] = col.dateIso.split("-").map(Number);
    const dateLabel = fmtDtable(y, m, d);
    const day = WEEKDAY_SHORT[idx];
    const ref = status === "disputed" ? "Disputed" : "Verified";
    if (wages > 0) {
      rows.push({ i: i++, date: dateLabel, day, outlet, desc: "Daily Wages", qty: 1, amt: wages, ref: "Sealed" });
    }
    if (drinks > 0) {
      rows.push({ i: i++, date: dateLabel, day, outlet, desc: "Commission – Drinks", qty: 1, amt: drinks, ref });
    }
    if (tips > 0) {
      rows.push({ i: i++, date: dateLabel, day, outlet, desc: "Commission – Tips", qty: 1, amt: tips, ref });
    }
    if (tables > 0) {
      rows.push({ i: i++, date: dateLabel, day, outlet, desc: "Commission – Tables", qty: 1, amt: tables, ref });
    }
    if (others > 0) {
      rows.push({ i: i++, date: dateLabel, day, outlet, desc: "Others", qty: 1, amt: others, ref });
    }
  }
  return rows;
}

export function buildSentWeeklyPv(opts: {
  profile: PrProfile;
  prSuffix: string;
  summary: WeeklyPaymentSummary;
  fallbackOutlet?: string;
  existing?: PrPaymentVoucher | null;
}): PrPaymentVoucher {
  const outlet = opts.fallbackOutlet ?? opts.existing?.outlet ?? "Velvet 23";
  const synced = opts.existing
    ? syncWeeklyPvWithSummary(opts.existing, opts.summary)
    : null;
  const rows = synced?.rows ?? pvRowsFromWeeklySummary(opts.summary, outlet);
  const subtotal = opts.summary.totals.net;
  const issueDate = parseIsoDate(opts.summary.issueDayIso);
  const issuedLabel = format(issueDate, "d MMM yyyy");
  const dueLabel = format(addDays(issueDate, 7), "d MMM yyyy");
  const issuedStamp = formatPvSignTimestamp(issueDate);
  return {
    id: opts.existing?.id ?? makeWeeklyPvId(opts.summary.weekStartIso, opts.prSuffix),
    prName: opts.profile.name,
    prIc: opts.profile.ic,
    outlet:
      rows.length > 0
        ? [...new Set(rows.map((r) => r.outlet))].length > 1
          ? `Multi-outlet (${[...new Set(rows.map((r) => r.outlet))].length})`
          : rows[0].outlet
        : outlet,
    weekStartIso: opts.summary.weekStartIso,
    weekEndIso: opts.summary.weekEndIso,
    cycle: opts.summary.weekLabel.replace(/\s+\d{4}$/, ""),
    issued: issuedLabel,
    due: dueLabel,
    rows,
    subtotal,
    deduct: opts.existing?.deduct ?? 0,
    net: Math.max(0, subtotal - (opts.existing?.deduct ?? 0)),
    status: "SENT",
    ...seedFinanceHeadStamp(`${issuedStamp.split("·")[0]?.trim() ?? issuedLabel} · 09:00`),
    receiptIds: opts.existing?.receiptIds,
  };
}
