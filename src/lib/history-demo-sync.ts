/**
 * Demo sync — shift history → receipt scans + weekly PVs (History tabs).
 * Prior weeks get PAID/SIGNED PVs; open disputes stay out of receipt history.
 */

import { addDays, format, parseISO } from "date-fns";
import { addDaysToIso, getLiveTodayIso, getPayrollWeekSundayIso, isWeekPvIssuedOnCalendar } from "@/lib/demo-clock";
import { buildDemoESignatureDataUrl, seedFinanceHeadStamp } from "@/lib/finance-head-stamp";
import {
  calcReceiptCommissions,
  fmtDtable,
  TIED_DEMO_ROSTER_PR_ID,
  type PrPaymentVoucher,
  type PrProfile,
  type PrReceiptScan,
  type PrPvRow,
} from "@/lib/pr-demo";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import {
  buildWeeklyPaymentSummary,
  getWeekBounds,
  makeWeeklyPvId,
  pvRowsFromWeeklySummary,
  syncWeeklyPvWithSummary,
} from "@/lib/pr-weekly-payment";
import { receiptDateIso } from "@/lib/receipt-scan-utils";

function ymdFromIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function outletSessionSlug(outlet: string): string {
  const o = outlet.toLowerCase();
  if (o.includes("velvet")) return "velvet";
  if (o.includes("bear")) return "bearlounge";
  if (o.includes("mermate")) return "mermate";
  return o.replace(/\s+/g, "");
}

function shiftSessionId(outlet: string, dateIso: string): string {
  return `shift-${dateIso}-${outletSessionSlug(outlet)}`;
}

function receiptRefFor(outlet: string, dateIso: string, slot: number): string {
  const code = outletSessionSlug(outlet).slice(0, 4).toUpperCase();
  return `${code}-${dateIso.replace(/-/g, "")}-${String(slot).padStart(2, "0")}`;
}

/** Receipt scans for each sealed shift night in history (skips rc-hist slots already generated). */
export function buildReceiptScansFromShiftHistory(
  rows: ShiftHistoryRow[],
  prId: string,
  profile: PrProfile,
  existing: PrReceiptScan[] = [],
): PrReceiptScan[] {
  const todayIso = getLiveTodayIso();
  const existingIds = new Set(existing.map((s) => s.id));
  const out: PrReceiptScan[] = [];

  for (const row of rows) {
    if (row.prId !== prId || row.dateIso > todayIso) continue;
    const histPrefix = `rc-hist-${prId}-${row.dateIso.replace(/-/g, "")}`;
    if (existing.some((s) => s.id.startsWith(histPrefix))) continue;

    const ymd = ymdFromIso(row.dateIso);
    const [y, m, d] = ymd;
    const dateLabel = fmtDtable(y, m, d);
    const tables = row.totalTables ?? 0;
    const sessionId = shiftSessionId(row.outlet, row.dateIso);

    const parts: Array<{ slot: number; category: "drinks" | "tips" | "tables"; qty: number }> = [];
    if (row.totalDrinks > 0) parts.push({ slot: 1, category: "drinks", qty: row.totalDrinks });
    if (row.totalTips > 0) parts.push({ slot: 2, category: "tips", qty: 1 });
    if (tables > 0) parts.push({ slot: 3, category: "tables", qty: tables });
    if (parts.length === 0) {
      parts.push({ slot: 1, category: "drinks", qty: Math.max(2, Math.round(row.totalPayout / 80)) });
    }

    for (const part of parts) {
      const id = `${histPrefix}-${part.slot}`;
      if (existingIds.has(id)) continue;
      existingIds.add(id);

      const items =
        part.category === "drinks"
          ? [
              {
                label: "Drinks commission",
                qty: part.qty,
                unitPrice: 45,
                amount: part.qty * 45,
                category: "drinks" as const,
              },
            ]
          : part.category === "tips"
            ? [
                {
                  label: "Tips",
                  qty: 1,
                  unitPrice: row.totalTips,
                  amount: row.totalTips,
                  category: "tips" as const,
                },
              ]
            : [
                {
                  label: "VIP table",
                  qty: part.qty,
                  unitPrice: 400,
                  amount: part.qty * 400,
                  category: "tables" as const,
                },
              ];

      const comm = calcReceiptCommissions(items);
      const scannedAt = `${dateLabel} ${y} · ${22 + part.slot}:${String(10 + part.slot * 11).padStart(2, "0")}`;

      out.push({
        id,
        receiptRef: receiptRefFor(row.outlet, row.dateIso, part.slot),
        scannedAt,
        date: ymd,
        outlet: row.outlet,
        prCode: "PR-0001",
        prName: profile.name,
        prId,
        shiftSessionId: sessionId,
        items,
        totalLogged: items.reduce((s, i) => s + i.amount, 0),
        drinkCommission: comm.drinkCommission,
        tipCommission: comm.tipCommission,
        tableCommission: comm.tableCommission,
        totalCommission: comm.totalCommission,
        status: "pending",
      });
    }
  }

  return out;
}

function attachReceiptIdsToPvRows(rows: PrPvRow[], scans: PrReceiptScan[], year: number): PrPvRow[] {
  const scansByDate = new Map<string, PrReceiptScan[]>();
  for (const s of scans) {
    const iso = receiptDateIso(s);
    const list = scansByDate.get(iso) ?? [];
    list.push(s);
    scansByDate.set(iso, list);
  }

  return rows.map((row) => {
    const m = row.date.trim().match(/^(\d{1,2})\s+([A-Za-z]+)/);
    if (!m || row.receiptIds?.length) return row;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mi = months.findIndex((x) => x === m[2].slice(0, 3).toLowerCase());
    if (mi < 0) return row;
    const day = parseInt(m[1], 10);
    const iso = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayScans = (scansByDate.get(iso) ?? []).filter((s) => s.outlet === row.outlet || row.outlet.includes(s.outlet));
    if (!dayScans.length) return row;
    const desc = row.desc.toLowerCase();
    const ids = dayScans
      .filter((s) => {
        if (desc.includes("drink")) return s.drinkCommission > 0;
        if (desc.includes("tip")) return s.tipCommission > 0;
        if (desc.includes("table")) return s.tableCommission > 0;
        return false;
      })
      .map((s) => s.id);
    return ids.length ? { ...row, receiptIds: ids } : row;
  });
}

/** Weekly PVs for completed payroll weeks — PAID (older) or SIGNED (last week). */
export function buildWeeklyPvsFromShiftHistory(
  rows: ShiftHistoryRow[],
  scans: PrReceiptScan[],
  prId: string,
  profile: PrProfile,
  existing: PrPaymentVoucher[] = [],
): PrPaymentVoucher[] {
  const todayIso = getLiveTodayIso();
  const currentWeekSun = getPayrollWeekSundayIso(todayIso);
  const prevWeekSun = addDaysToIso(currentWeekSun, -7);
  const closedWeekStarts = new Set(
    existing
      .filter(
        (p) =>
          p.weekStartIso &&
          p.prName === profile.name &&
          (p.status === "PAID" || p.status === "SIGNED"),
      )
      .map((p) => p.weekStartIso!),
  );
  const inboxWeekStarts = new Set(
    existing
      .filter(
        (p) =>
          p.weekStartIso &&
          p.prName === profile.name &&
          (p.status === "SENT" || p.status === "DISPUTED" || p.status === "PENDING_REVIEW"),
      )
      .map((p) => p.weekStartIso!),
  );
  const weekStarts = new Set<string>();

  for (const row of rows) {
    if (row.prId !== prId || row.dateIso > todayIso) continue;
    const bounds = getWeekBounds(ymdFromIso(row.dateIso));
    if (bounds.startIso === currentWeekSun) continue;
    if (!isWeekPvIssuedOnCalendar(bounds.endIso, todayIso)) continue;
    weekStarts.add(bounds.startIso);
  }

  const pvs: PrPaymentVoucher[] = [];

  for (const weekStartIso of [...weekStarts].sort()) {
    if (closedWeekStarts.has(weekStartIso) || inboxWeekStarts.has(weekStartIso)) continue;
    const bounds = getWeekBounds(ymdFromIso(weekStartIso));
    const summary = buildWeeklyPaymentSummary({
      weekStartIso,
      shiftHistory: rows,
      scans,
      prId,
    });
    if (summary.totals.net <= 0) continue;

    const status = weekStartIso === prevWeekSun ? ("SIGNED" as const) : ("PAID" as const);
    const issueDate = parseISO(bounds.issueDayIso);
    const issuedLabel = format(issueDate, "d MMM yyyy");
    const dueLabel = format(addDays(issueDate, 7), "d MMM yyyy");
    const signedStamp = format(addDays(issueDate, 1), "d MMM yyyy · 16:20");
    const paidStamp = format(addDays(issueDate, 2), "d MMM yyyy · 11:42");

    const year = parseInt(weekStartIso.slice(0, 4), 10);
    let pvRows = pvRowsFromWeeklySummary(summary, rows.find((r) => r.prId === prId)?.outlet ?? "Velvet 23");
    pvRows = attachReceiptIdsToPvRows(pvRows, scans, year);
    const receiptIds = [...new Set(pvRows.flatMap((r) => r.receiptIds ?? []))];

    const subtotal = summary.totals.net;
    const pv: PrPaymentVoucher = {
      id: makeWeeklyPvId(weekStartIso, "L"),
      prName: profile.name,
      prIc: profile.ic,
      outlet:
        [...new Set(pvRows.map((r) => r.outlet).filter((o) => o && o !== "—"))].length > 1
          ? `Multi-outlet (${[...new Set(pvRows.map((r) => r.outlet))].length})`
          : (pvRows[0]?.outlet ?? "Velvet 23"),
      weekStartIso,
      weekEndIso: bounds.endIso,
      cycle: summary.weekLabel.replace(/\s+\d{4}$/, ""),
      issued: issuedLabel,
      due: dueLabel,
      rows: pvRows,
      subtotal,
      deduct: 0,
      net: subtotal,
      status,
      ...seedFinanceHeadStamp(`${issuedLabel.split(" ").slice(0, 3).join(" ")} · 09:00`),
      receiptIds,
    };

    if (status === "SIGNED" || status === "PAID") {
      pv.prSignedAt = signedStamp;
      pv.prSignatureDataUrl = buildDemoESignatureDataUrl(profile.name);
    }
    if (status === "PAID") {
      pv.paidAt = paidStamp;
      pv.bankRef = `INZ-TRF-${weekStartIso.replace(/-/g, "")}`;
    }

    pvs.push(syncWeeklyPvWithSummary(pv, summary));
  }

  return pvs;
}

export function syncReceiptScansWithPvs(
  scans: PrReceiptScan[],
  pvs: PrPaymentVoucher[],
  prId: string,
): PrReceiptScan[] {
  return scans.map((scan) => {
    if (scan.prId && scan.prId !== prId) return scan;
    const dateIso = receiptDateIso(scan);
    const weekSun = getPayrollWeekSundayIso(dateIso);
    const pv =
      (scan.pvId ? pvs.find((p) => p.id === scan.pvId) : undefined) ??
      pvs.find((p) => p.weekStartIso === weekSun && p.prName === scan.prName);

    if (!pv) return scan;

    let status = scan.status;
    if (pv.status === "PAID") status = "paid";
    else if (pv.status === "SIGNED" || pv.status === "SENT") status = "in_pv";

    return {
      ...scan,
      pvId: pv.id,
      pvStatus: pv.status,
      status,
    };
  });
}

/** Hide receipts tied to an open PV dispute (PR + agency still reviewing). */
export function isReceiptHiddenInHistory(scan: PrReceiptScan, pvs: PrPaymentVoucher[]): boolean {
  if (scan.pvStatus === "DISPUTED") return true;
  if (!scan.pvId) return false;
  const pv = pvs.find((p) => p.id === scan.pvId);
  if (!pv || pv.status !== "DISPUTED") return false;
  const disputedIds = new Set(
    pv.rows
      .filter((r) => r.ref?.toLowerCase().includes("disput"))
      .flatMap((r) => r.receiptIds ?? []),
  );
  return disputedIds.has(scan.id);
}

export function mergeHistoryDemoLedger(opts: {
  shiftHistory: ShiftHistoryRow[];
  scans: PrReceiptScan[];
  pvs: PrPaymentVoucher[];
  prId?: string;
  profile?: PrProfile;
}): { scans: PrReceiptScan[]; pvs: PrPaymentVoucher[] } {
  const prId = opts.prId ?? TIED_DEMO_ROSTER_PR_ID;
  const profile = opts.profile ?? { name: "Luna", ic: "950312-14-8821" } as PrProfile;

  const extraScans = buildReceiptScansFromShiftHistory(opts.shiftHistory, prId, profile, opts.scans);
  let scans = [...opts.scans, ...extraScans];

  const existingIds = new Set(opts.pvs.map((p) => p.id));
  const extraPvs = buildWeeklyPvsFromShiftHistory(opts.shiftHistory, scans, prId, profile, opts.pvs).filter(
    (p) => !existingIds.has(p.id),
  );
  const pvs = [...opts.pvs, ...extraPvs];

  scans = syncReceiptScansWithPvs(scans, pvs, prId);
  return { scans, pvs };
}
