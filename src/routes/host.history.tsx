import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  PAYROLL_CYCLE,
  filterPvsForPrProfile,
  filterReceiptScansForPrProfile,
  fmtHistDate,
  getPrProfile,
  pvNeedsPrReview,
  receiptPvCalcNote,
  receiptBelongsToPvLabel,
  receiptStatusLabel,
  type HistRow,
  type PrPaymentVoucher,
  type PrReceiptScan,
  type PvLineRecord,
  type ReceiptItemCategory,
  type ReceiptScanStatus,
  getPrRosterId,
} from "@/lib/pr-demo";
import { shiftHistoryToHistRows } from "@/lib/portal-sync";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { payeeFromProfile } from "@/lib/pv-template";
import { usePrPortalReady } from "@/lib/use-pr-sub-role";
import { Calendar, ChevronDown, Clock, Download, Filter, Receipt, Search, Wallet, X } from "lucide-react";
import { PrPaymentHistoryPanel } from "@/components/pr/PrPaymentHistoryPanel";
import { buildPaymentHistoryRecords } from "@/lib/pr-payment-history";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { IzCard, IzPill, IzTimeInput, formatRM } from "@/components/iz/ui";
import { calendarNavBounds, HistDateCalendar } from "@/components/iz/HistDateCalendar";
import { parseDateInputMs, parseScannedAtMs } from "@/lib/payroll-filters";

type HistTab = "shifts" | "receipts" | "payment";

export const Route = createFileRoute("/host/history")({
  validateSearch: (search: Record<string, unknown>): { tab: HistTab; pvId?: string } => {
    const tab = search.tab;
    const pvId = typeof search.pvId === "string" ? search.pvId : undefined;
    if (tab === "receipts") return { tab: "receipts", pvId };
    if (tab === "payment" || tab === "pv") return { tab: "payment", pvId };
    return { tab: "shifts", pvId };
  },
  component: HistoryPage,
});
type HistFilters = {
  query: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  venue: string;
  period: "all" | "7" | "14" | "30";
  wages: string;
  sales: string;
  tables: string;
  drinks: string;
};

const EMPTY_FILTERS: HistFilters = {
  query: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  venue: "",
  period: "all",
  wages: "",
  sales: "",
  tables: "",
  drinks: "",
};

const SHIFT_PERIOD_OPTIONS: { id: HistFilters["period"]; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
  { id: "all", label: "All" },
];

function dateKey(d: [number, number, number]) {
  const [y, m, day] = d;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateFromKey(key: string): Date | undefined {
  if (!key) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function keyFromDate(date: Date) {
  return dateKey([date.getFullYear(), date.getMonth() + 1, date.getDate()]);
}

function parseFilterNum(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "").replace(/^rm\s*/i, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowSearchBlob(row: HistRow) {
  const [y, m, d] = row.d;
  return [
    fmtHistDate(y, m, d),
    row.venue,
    row.wages,
    row.sales,
    row.table,
    row.drinks,
    row.st,
    formatRM(row.wages),
    formatRM(row.sales),
    formatRM(row.table),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilters(row: HistRow, filters: HistFilters) {
  if (filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    if (!rowSearchBlob(row).includes(q)) return false;
  }
  if (filters.date && dateKey(row.d) !== filters.date) return false;
  if (filters.venue && row.venue !== filters.venue) return false;
  const wages = parseFilterNum(filters.wages);
  if (wages !== null && row.wages !== wages) return false;
  const sales = parseFilterNum(filters.sales);
  if (sales !== null && row.sales !== sales) return false;
  const tables = parseFilterNum(filters.tables);
  if (tables !== null && row.table !== tables) return false;
  const drinks = parseFilterNum(filters.drinks);
  if (drinks !== null && row.drinks !== drinks) return false;
  return true;
}

function clock12To24(clock: string): string | null {
  const m = clock.trim().replace(/\s*\(\+1\)\s*$/i, "").match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3].toUpperCase();
  if (ap === "AM" && h === 12) h = 0;
  if (ap === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function shiftCheckInMs(
  row: HistRow,
  meta: { timeIn?: string | null; clockIn?: string | null },
): number | null {
  if (meta.timeIn) {
    const ms = parseScannedAtMs(meta.timeIn);
    if (ms) return ms;
  }
  if (meta.clockIn) {
    const t24 = clock12To24(meta.clockIn);
    if (t24) return parseDateInputMs(dateKey(row.d), t24);
  }
  return null;
}

function matchesShiftTimeWindow(
  dateIso: string,
  checkInMs: number | null,
  timeFrom: string,
  timeTo: string,
): boolean {
  if (!timeFrom && !timeTo) return true;
  if (checkInMs == null) return false;
  const fromMs = parseDateInputMs(dateIso, timeFrom || "00:00");
  const toMs = parseDateInputMs(dateIso, timeTo || "23:59");
  if (fromMs != null && checkInMs < fromMs) return false;
  if (toMs != null && checkInMs > toMs) return false;
  return true;
}

function activeFilterCount(filters: HistFilters) {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.date) n++;
  if (filters.date && filters.timeFrom) n++;
  if (filters.date && filters.timeTo) n++;
  if (filters.venue) n++;
  if (filters.period !== "all") n++;
  if (parseFilterNum(filters.wages) !== null) n++;
  if (parseFilterNum(filters.sales) !== null) n++;
  if (parseFilterNum(filters.tables) !== null) n++;
  if (parseFilterNum(filters.drinks) !== null) n++;
  return n;
}

function filterRowsByShiftPeriod(rows: HistRow[], period: HistFilters["period"], anchorKey: string) {
  if (period === "all") return rows;
  const days = parseInt(period, 10);
  const anchor = dateFromKey(anchorKey);
  if (!anchor || !days) return rows;
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return rows.filter((row) => {
    const rowDate = dateFromKey(dateKey(row.d));
    if (!rowDate) return false;
    return rowDate >= start && rowDate <= end;
  });
}

function shiftPeriodSummaryLabel(period: HistFilters["period"], anchorKey: string): string {
  if (period === "all") return "All shifts";
  const anchor = dateFromKey(anchorKey);
  if (!anchor) return `Last ${period} days`;
  const start = new Date(anchor);
  start.setDate(start.getDate() - (parseInt(period, 10) - 1));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(anchor)}`;
}

function shiftEarningsContextLabel(
  filters: HistFilters,
  anchorKey: string,
  dateOptions: { key: string; label: string }[],
): string {
  if (filters.date) {
    const base = dateOptions.find((o) => o.key === filters.date)?.label ?? filters.date;
    if (filters.timeFrom || filters.timeTo) {
      const from = filters.timeFrom || "00:00";
      const to = filters.timeTo || "23:59";
      return `${base} · ${from}–${to}`;
    }
    return base;
  }
  return shiftPeriodSummaryLabel(filters.period, anchorKey);
}

function formatShiftClock(stamp?: string | null): string | null {
  if (!stamp) return null;
  const m = stamp.match(/·\s*(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

/** Demo night-shift window when PV time is not linked */
function inferNightShiftWindow(durationHours: number) {
  const startH = 21;
  const endH = startH + durationHours;
  const fmt12 = (h: number) => {
    const hr = Math.floor(h % 24);
    const period = hr >= 12 ? "PM" : "AM";
    const display = hr % 12 || 12;
    const mins = Math.round((h % 1) * 60);
    return mins > 0 ? `${display}:${String(mins).padStart(2, "0")} ${period}` : `${display}:00 ${period}`;
  };
  const crossesMidnight = endH >= 24;
  const endDisplay = fmt12(endH);
  return {
    window: `${fmt12(startH)} – ${endDisplay}${crossesMidnight ? "" : ""}`,
    clockIn: fmt12(startH),
    clockOut: `${endDisplay}${crossesMidnight ? " (+1)" : ""}`,
  };
}

type ReceiptFilters = {
  query: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  shiftSessionId: string;
  outlet: string;
  category: ReceiptItemCategory | "";
  status: ReceiptScanStatus | "";
  commission: string;
};

const EMPTY_RECEIPT_FILTERS: ReceiptFilters = {
  query: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  shiftSessionId: "",
  outlet: "",
  category: "",
  status: "",
  commission: "",
};

function formatShiftSessionLabel(id: string): string {
  const m = id.match(/^shift-(\d{4})-(\d{2})-(\d{2})-(.+)$/i);
  if (!m) return id;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = monthNames[parseInt(m[2], 10) - 1] ?? m[2];
  const venue = m[4]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${parseInt(m[3], 10)} ${mon} · ${venue}`;
}

function scanTimeLabel(scannedAt: string): string {
  const m = scannedAt.match(/·\s*(\d{1,2}:\d{2})/);
  return m ? m[1] : scannedAt;
}

function receiptShiftInfo(
  scan: PrReceiptScan,
  pvById: Record<string, PrPaymentVoucher>,
  pvByShiftId: Record<string, PrPaymentVoucher>,
) {
  const pv =
    (scan.pvId ? pvById[scan.pvId] : undefined) ??
    (scan.shiftSessionId ? pvByShiftId[scan.shiftSessionId] : undefined);
  return {
    shiftWindow: pv?.shiftTime ?? null,
    timeIn: pv?.timeIn ?? null,
    timeOut: pv?.timeOut ?? null,
    sessionLabel: scan.shiftSessionId ? formatShiftSessionLabel(scan.shiftSessionId) : null,
  };
}

type PvFilters = {
  query: string;
  pvId: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  outlet: string;
  status: string;
  ref: string;
};

const EMPTY_PV_FILTERS: PvFilters = {
  query: "",
  pvId: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  outlet: "",
  status: "",
  ref: "",
};

const PV_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pvLineDateKey(line: PvLineRecord, issued = ""): string | null {
  const yearMatch = line.cycle.match(/\d{4}/) ?? issued.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
  const m = line.date.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const month = PV_MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return dateKey([year, month, parseInt(m[1], 10)]);
}

function pvLineEventMs(
  line: PvLineRecord,
  pv: PrPaymentVoucher | undefined,
  scansById: Record<string, PrReceiptScan>,
): number {
  const linked = line.receiptIds
    .map((id) => scansById[id])
    .filter((s): s is PrReceiptScan => Boolean(s));
  if (linked.length > 0) {
    return Math.min(...linked.map((s) => parseScannedAtMs(s.scannedAt)));
  }
  if (pv?.timeIn) {
    return parseScannedAtMs(pv.timeIn);
  }
  const key = pvLineDateKey(line, pv?.issued ?? "");
  if (key) return parseDateInputMs(key, "12:00") ?? 0;
  return 0;
}

function receiptSearchBlob(scan: PrReceiptScan) {
  const [y, m, d] = scan.date;
  return [
    scan.receiptRef,
    scan.id,
    scan.pvId,
    scan.shiftSessionId,
    fmtHistDate(y, m, d),
    scan.scannedAt,
    scan.outlet,
    scan.prCode,
    scan.pvId,
    scan.pvLineDesc,
    scan.status,
    scan.items.map((i) => i.label).join(" "),
    formatRM(scan.totalLogged),
    formatRM(scan.totalCommission),
    receiptPvCalcNote(scan),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesReceiptFilters(scan: PrReceiptScan, filters: ReceiptFilters) {
  if (filters.query.trim() && !receiptSearchBlob(scan).includes(filters.query.trim().toLowerCase())) return false;
  if (filters.date && dateKey(scan.date) !== filters.date) return false;
  if (filters.date && (filters.timeFrom || filters.timeTo)) {
    const eventMs = parseScannedAtMs(scan.scannedAt);
    if (!eventMs) return false;
    const fromMs = parseDateInputMs(filters.date, filters.timeFrom || "00:00");
    const toMs = parseDateInputMs(filters.date, filters.timeTo || "23:59");
    if (fromMs != null && eventMs < fromMs) return false;
    if (toMs != null && eventMs > toMs) return false;
  }
  if (filters.shiftSessionId && scan.shiftSessionId !== filters.shiftSessionId) return false;
  if (filters.outlet && scan.outlet !== filters.outlet) return false;
  if (filters.category && !scan.items.some((i) => i.category === filters.category)) return false;
  if (filters.status && scan.status !== filters.status) return false;
  const comm = parseFilterNum(filters.commission);
  if (comm !== null && scan.totalCommission !== comm) return false;
  return true;
}

function receiptFilterCount(filters: ReceiptFilters) {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.date) n++;
  if (filters.date && filters.timeFrom) n++;
  if (filters.date && filters.timeTo) n++;
  if (filters.shiftSessionId) n++;
  if (filters.outlet) n++;
  if (filters.category) n++;
  if (filters.status) n++;
  if (parseFilterNum(filters.commission) !== null) n++;
  return n;
}

function pvSearchBlob(line: PvLineRecord) {
  return [
    line.pvId,
    line.cycle,
    line.date,
    line.outlet,
    line.desc,
    line.ref,
    line.pvStatus,
    formatRM(line.amount),
    line.receiptIds.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesPvFilters(
  line: PvLineRecord,
  filters: PvFilters,
  ctx: { pvById: Record<string, PrPaymentVoucher>; scansById: Record<string, PrReceiptScan> },
) {
  if (filters.query.trim() && !pvSearchBlob(line).includes(filters.query.trim().toLowerCase())) return false;
  if (filters.pvId && line.pvId !== filters.pvId) return false;
  const pv = ctx.pvById[line.pvId];
  if (filters.date) {
    const key = pvLineDateKey(line, pv?.issued ?? "");
    if (key !== filters.date) return false;
    if (filters.timeFrom || filters.timeTo) {
      const eventMs = pvLineEventMs(line, pv, ctx.scansById);
      if (!eventMs) return false;
      const fromMs = parseDateInputMs(filters.date, filters.timeFrom || "00:00");
      const toMs = parseDateInputMs(filters.date, filters.timeTo || "23:59");
      if (fromMs != null && eventMs < fromMs) return false;
      if (toMs != null && eventMs > toMs) return false;
    }
  }
  if (filters.outlet && line.outlet !== filters.outlet) return false;
  if (filters.status && line.pvStatus !== filters.status) return false;
  if (filters.ref && line.ref !== filters.ref) return false;
  return true;
}

function pvFilterCount(filters: PvFilters) {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.pvId) n++;
  if (filters.date) n++;
  if (filters.date && filters.timeFrom) n++;
  if (filters.date && filters.timeTo) n++;
  if (filters.outlet) n++;
  if (filters.status) n++;
  if (filters.ref) n++;
  return n;
}

function receiptStatusPill(status: ReceiptScanStatus) {
  if (status === "paid") return "green" as const;
  if (status === "in_pv") return "amber" as const;
  if (status === "attached") return "amber" as const;
  return "ink" as const;
}

function HistoryPage() {
  const { tab, pvId: searchPvId } = Route.useSearch();
  const navigate = useNavigate();
  const { ready, role: prSubRole } = usePrPortalReady();
  const isFreelancer = prSubRole === "pr_free";
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const toast = useStore((s) => s.toast);
  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);

  const myVouchers = useMemo(
    () => filterPvsForPrProfile(prPaymentVouchers, profile, prSubRole),
    [prPaymentVouchers, profile, prSubRole],
  );
  const myReceiptScans = useMemo(
    () => filterReceiptScansForPrProfile(prReceiptScans, profile, prSubRole, myVouchers),
    [prReceiptScans, profile, prSubRole, myVouchers],
  );

  const histRows = useMemo(
    () => shiftHistoryToHistRows(shiftHistory, prId),
    [shiftHistory, prId],
  );
  const histDateOptions = useMemo(
    () =>
      [...new Map(histRows.map((r) => [dateKey(r.d), r.d])).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, d]) => ({ key, label: fmtHistDate(d[0], d[1], d[2]) })),
    [histRows],
  );
  const histOutletOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of histRows) {
      counts.set(r.venue, (counts.get(r.venue) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [histRows]);
  const histDefaultMonth =
    dateFromKey(histDateOptions[histDateOptions.length - 1]?.key ?? "") ?? new Date(2026, 5, 1);
  const histAnchorKey = histDateOptions[histDateOptions.length - 1]?.key ?? keyFromDate(new Date());
  const [filters, setFilters] = useState<HistFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<HistFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [receiptFilterOpen, setReceiptFilterOpen] = useState(false);

  const receiptOutlets = useMemo(
    () => [...new Set(myReceiptScans.map((s) => s.outlet))].sort(),
    [myReceiptScans],
  );
  const receiptDateOptions = useMemo(
    () =>
      [...new Map(myReceiptScans.map((s) => [dateKey(s.date), s.date])).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, d]) => ({ key, label: fmtHistDate(d[0], d[1], d[2]) })),
    [myReceiptScans],
  );
  const pvById = useMemo(() => Object.fromEntries(myVouchers.map((p) => [p.id, p])), [myVouchers]);
  const pvByShiftId = useMemo(() => {
    const map: Record<string, PrPaymentVoucher> = {};
    for (const pv of myVouchers) {
      if (pv.shiftSessionId) map[pv.shiftSessionId] = pv;
    }
    return map;
  }, [myVouchers]);
  const receiptShiftOptions = useMemo(
    () =>
      [...new Set(myReceiptScans.map((s) => s.shiftSessionId).filter(Boolean) as string[])]
        .sort()
        .map((id) => ({ value: id, label: formatShiftSessionLabel(id) })),
    [myReceiptScans],
  );

  const setTab = (next: HistTab) => navigate({ to: "/host/history", search: { tab: next } });

  useEffect(() => {
    if (searchPvId && tab !== "payment") {
      navigate({ to: "/host/history", search: { tab: "payment", pvId: searchPvId } });
    }
  }, [searchPvId, tab, navigate]);

  const paymentHistory = useMemo(() => buildPaymentHistoryRecords(myVouchers), [myVouchers]);
  const lifetimeEarnings = paymentHistory.reduce((sum, r) => sum + r.net, 0);
  const paidThisCycle = paymentHistory
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.net, 0);
  const pendingPv = myVouchers
    .filter((p) => pvNeedsPrReview(p.status))
    .reduce((sum, p) => sum + p.net, 0);

  const histShiftByKey = useMemo(() => {
    const m = new Map<string, ShiftHistoryRow>();
    for (const r of shiftHistory) {
      if (r.prId === prId) m.set(`${r.dateIso}|${r.outlet}`, r);
    }
    return m;
  }, [shiftHistory, prId]);

  const shiftMetaForHistRow = useCallback(
    (row: HistRow) => {
      const key = `${dateKey(row.d)}|${row.venue}`;
      const hist = histShiftByKey.get(key);
      const dateIso = dateKey(row.d);
      const pv = myVouchers.find(
        (p) =>
          (p.outlet === row.venue || p.outlet.includes(row.venue)) &&
          (p.shiftSessionId?.includes(dateIso) ||
            p.rows.some((r) => {
              const rowKey = pvLineDateKey(
                { date: r.date, cycle: p.cycle } as PvLineRecord,
                p.issued,
              );
              return r.outlet === row.venue && rowKey === dateIso;
            })),
      );
      const inferred = hist?.durationHours && !pv?.shiftTime ? inferNightShiftWindow(hist.durationHours) : null;
      return {
        durationHours: hist?.durationHours,
        shiftTime: pv?.shiftTime ?? inferred?.window ?? null,
        timeIn: pv?.timeIn ?? null,
        timeOut: pv?.timeOut ?? null,
        clockIn: formatShiftClock(pv?.timeIn) ?? inferred?.clockIn ?? null,
        clockOut: formatShiftClock(pv?.timeOut) ?? inferred?.clockOut ?? null,
      };
    },
    [histShiftByKey, myVouchers],
  );

  const filteredRows = useMemo(() => {
    const matched = histRows
      .filter((row) => matchesFilters(row, filters))
      .filter((row) => filterRowsByShiftPeriod([row], filters.period, histAnchorKey).length > 0)
      .filter((row) => {
        if (!filters.date || (!filters.timeFrom && !filters.timeTo)) return true;
        if (dateKey(row.d) !== filters.date) return true;
        const meta = shiftMetaForHistRow(row);
        return matchesShiftTimeWindow(
          filters.date,
          shiftCheckInMs(row, meta),
          filters.timeFrom,
          filters.timeTo,
        );
      });
    return matched.slice().reverse();
  }, [histRows, filters, histAnchorKey, shiftMetaForHistRow]);

  const shiftPeriodEarnings = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.sales, 0),
    [filteredRows],
  );

  const shiftPeriodWages = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.wages, 0),
    [filteredRows],
  );

  const shiftEarningsLabel = shiftEarningsContextLabel(filters, histAnchorKey, histDateOptions);

  const filteredReceipts = useMemo(
    () => myReceiptScans.filter((s) => matchesReceiptFilters(s, receiptFilters)),
    [myReceiptScans, receiptFilters],
  );

  const filterCount = activeFilterCount(filters);
  const receiptFilterCountN = receiptFilterCount(receiptFilters);

  const openFilters = () => {
    setDraft(filters);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draft);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
  };

  const anyFilterOpen = filterOpen || receiptFilterOpen;
  const closeFilters = () => {
    setFilterOpen(false);
    setReceiptFilterOpen(false);
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (anyFilterOpen) {
            closeFilters();
            return;
          }
          return false;
        }}
        backLabel={anyFilterOpen ? "History" : undefined}
      />

      <PrPageHeader
        label="Earnings"
        title="History"
        meta={isFreelancer ? "Shifts, receipts & payment history" : "Shifts, receipts & signed/paid weekly PVs"}
      />

      {isFreelancer && <div className="mt-3"><FreelancerPayrollNotice compact /></div>}

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Lifetime</div>
          <div className="n text-[var(--iz-gold-l)]">{formatRM(lifetimeEarnings)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Paid</div>
          <div className="n">{formatRM(paidThisCycle)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Pending</div>
          <div className="n text-[var(--iz-amber)]">{formatRM(pendingPv)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Shifts</div>
          <div className="n">{histRows.length}</div>
        </div>
      </div>

      <div className="iz-hist-tabs mt-4">
        <button type="button" className={tab === "shifts" ? "active" : ""} onClick={() => setTab("shifts")}>
          Shifts
        </button>
        <button type="button" className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}>
          <Receipt className="mr-1 inline h-3.5 w-3.5" />
          Receipt scans
        </button>
        <button type="button" className={tab === "payment" ? "active" : ""} onClick={() => setTab("payment")}>
          <Wallet className="mr-1 inline h-3.5 w-3.5" />
          Payment history
        </button>
      </div>

      {tab === "shifts" && (
        <>
      <IzCard flat className="iz-hist-shift-panel mt-4 !p-0">
        <div className="iz-hist-shift-earn-strip">
          <div className="iz-hist-shift-earn-cell primary">
            <span className="l">Earned in range</span>
            <span className="v">{formatRM(shiftPeriodEarnings)}</span>
          </div>
          <div className="iz-hist-shift-earn-cell">
            <span className="l">Wages</span>
            <span className="v">{formatRM(shiftPeriodWages)}</span>
          </div>
          <div className="iz-hist-shift-earn-cell">
            <span className="l">Shifts</span>
            <span className="v">{filteredRows.length}</span>
          </div>
        </div>

        <div className="iz-hist-shift-range">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold-l)]" />
          <span className="min-w-0 truncate">{shiftEarningsLabel}</span>
        </div>

        <div className="iz-hist-shift-filters-body">
        <div className="iz-between mb-2">
          <div className="iz-sect-label !m-0">Shift history</div>
          <button
            type="button"
            className="iz-btn iz-btn-soft iz-btn-sm relative"
            onClick={openFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            More
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--iz-gold)] px-1 text-[10px] font-bold text-[#1f1208]">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <div className="iz-hist-search mb-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
          <input
            type="search"
            placeholder="Search wages, sales, tables, drinks?"
            value={filters.query}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
            aria-label="Search shift history"
          />
          {filters.query && (
            <button
              type="button"
              className="iz-hist-clear"
              aria-label="Clear search"
              onClick={() => setFilters((prev) => ({ ...prev, query: "" }))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {histOutletOptions.length > 1 ? (
          <div className="iz-grid2 mb-2.5">
            <div className="min-w-0">
              <PvDateTimeFilter
                compact
                date={filters.date}
                timeFrom={filters.timeFrom}
                timeTo={filters.timeTo}
                onDateChange={(date) =>
                  setFilters((prev) => ({ ...prev, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
                }
                onTimeFromChange={(timeFrom) => setFilters((prev) => ({ ...prev, timeFrom }))}
                onTimeToChange={(timeTo) => setFilters((prev) => ({ ...prev, timeTo }))}
                dateOptions={histDateOptions}
                defaultMonth={histDefaultMonth}
                timeHint="Filter by shift check-in time on the selected date."
              />
            </div>
            <OutletPickerField
              value={filters.venue}
              onChange={(venue) => setFilters((prev) => ({ ...prev, venue }))}
              compact
              outlets={histOutletOptions}
            />
          </div>
        ) : (
          <div className="mb-2.5">
            <PvDateTimeFilter
              compact
              date={filters.date}
              timeFrom={filters.timeFrom}
              timeTo={filters.timeTo}
              onDateChange={(date) =>
                setFilters((prev) => ({ ...prev, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
              }
              onTimeFromChange={(timeFrom) => setFilters((prev) => ({ ...prev, timeFrom }))}
              onTimeToChange={(timeTo) => setFilters((prev) => ({ ...prev, timeTo }))}
              dateOptions={histDateOptions}
              defaultMonth={histDefaultMonth}
              timeHint="Filter by shift check-in time on the selected date."
            />
          </div>
        )}

        <div>
          <div className="iz-tiny iz-muted mb-1.5 font-semibold uppercase tracking-wide">Earn in period</div>
          <div className="iz-hist-period-row">
            {SHIFT_PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`iz-hist-period-chip${filters.period === p.id ? " active" : ""}`}
                onClick={() => setFilters((prev) => ({ ...prev, period: p.id }))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {filterCount > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--iz-line)] pt-2.5">
            <FilterChips
              filters={filters}
              dateOptions={histDateOptions}
              onRemove={(key) =>
                setFilters((prev) => ({
                  ...prev,
                  [key]: key === "period" ? "all" : "",
                  ...(key === "date" ? { timeFrom: "", timeTo: "" } : {}),
                }))
              }
            />
            <button type="button" className="iz-tiny font-semibold text-[var(--iz-gold-l)]" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
        </div>
      </IzCard>

      {filteredRows.length === 0 ? (
        <IzCard flat className="mt-3 py-8 text-center">
          <p className="iz-sm iz-muted">No shifts match your filters.</p>
          <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mx-auto mt-3 w-auto" onClick={clearFilters}>
            Reset filters
          </button>
        </IzCard>
      ) : (
        <div className="iz-hist-shift-list mt-3 space-y-2.5">
          {filteredRows.map((row) => (
            <HistShiftCard
              key={`${row.d.join("-")}-${row.venue}`}
              row={row}
              shiftMeta={shiftMetaForHistRow(row)}
            />
          ))}
        </div>
      )}

      <IzSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="iz-cardttl">Filter shift history</div>
        <p className="iz-tiny iz-muted mb-3">Narrow by date, venue, or numeric fields. All filters combine (AND).</p>

        <div className="space-y-3">
          <PvDateTimeFilter
            date={draft.date}
            timeFrom={draft.timeFrom}
            timeTo={draft.timeTo}
            onDateChange={(date) =>
              setDraft((prev) => ({ ...prev, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
            }
            onTimeFromChange={(timeFrom) => setDraft((prev) => ({ ...prev, timeFrom }))}
            onTimeToChange={(timeTo) => setDraft((prev) => ({ ...prev, timeTo }))}
            dateOptions={histDateOptions}
            defaultMonth={histDefaultMonth}
            timeHint="Filter by shift check-in time on the selected date."
          />
          <OutletPickerField
            value={draft.venue}
            onChange={(venue) => setDraft((prev) => ({ ...prev, venue }))}
            outlets={histOutletOptions}
          />
          <div className="iz-grid2">
            <FilterNumberInput
              label="Daily wages"
              placeholder="e.g. 400"
              value={draft.wages}
              onChange={(v) => setDraft((prev) => ({ ...prev, wages: v }))}
            />
            <FilterNumberInput
              label="Total sales"
              placeholder="e.g. 710"
              value={draft.sales}
              onChange={(v) => setDraft((prev) => ({ ...prev, sales: v }))}
            />
          </div>
          <div className="iz-grid2">
            <FilterNumberInput
              label="Tables (RM)"
              placeholder="e.g. 180"
              value={draft.tables}
              onChange={(v) => setDraft((prev) => ({ ...prev, tables: v }))}
            />
            <FilterNumberInput
              label="Drinks"
              placeholder="e.g. 32"
              value={draft.drinks}
              onChange={(v) => setDraft((prev) => ({ ...prev, drinks: v }))}
            />
          </div>
        </div>

        <button type="button" className="iz-btn iz-btn-primary mt-4" onClick={applyFilters}>
          Apply filters
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2.5"
          onClick={() => {
            setDraft(EMPTY_FILTERS);
            setFilters(EMPTY_FILTERS);
            setFilterOpen(false);
          }}
        >
          Clear & close
        </button>
      </IzSheet>
        </>
      )}

      {tab === "receipts" && (
        <ReceiptScansSection
          scans={filteredReceipts}
          filters={receiptFilters}
          setFilters={setReceiptFilters}
          filterCount={receiptFilterCountN}
          receiptDraft={receiptDraft}
          setReceiptDraft={setReceiptDraft}
          receiptFilterOpen={receiptFilterOpen}
          setReceiptFilterOpen={setReceiptFilterOpen}
          receiptOutlets={receiptOutlets}
          receiptDateOptions={receiptDateOptions}
          receiptShiftOptions={receiptShiftOptions}
          pvById={pvById}
          pvByShiftId={pvByShiftId}
          onClear={() => {
            setReceiptFilters(EMPTY_RECEIPT_FILTERS);
            setReceiptDraft(EMPTY_RECEIPT_FILTERS);
          }}
        />
      )}

      {tab === "payment" && (
        <PrPaymentHistoryPanel
          vouchers={myVouchers}
          onDownloadPdf={(pv) => {
            downloadPvBreakdownPdf(pv, payeeFromProfile(profile), myReceiptScans);
            toast("Payment voucher opened — use Print → Save as PDF", "success");
          }}
        />
      )}

      <p className="iz-tiny iz-muted2 mt-3 text-center">
        Cycle {PAYROLL_CYCLE.range} · next transfer {PAYROLL_CYCLE.nextTransfer}
      </p>
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
  compact,
  dateOptions = [],
  defaultMonth = new Date(),
}: {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
  dateOptions?: { key: string; label: string }[];
  defaultMonth?: Date;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = dateOptions.find((o) => o.key === value)?.label;
  const selected = dateFromKey(value);
  const allowedKeys = new Set(dateOptions.map((o) => o.key));
  const navBounds = useMemo(() => calendarNavBounds(dateOptions, defaultMonth), [dateOptions, defaultMonth]);
  const [viewMonth, setViewMonth] = useState(selected ?? defaultMonth);

  useEffect(() => {
    if (open) setViewMonth(selected ?? defaultMonth);
  }, [open, selected, defaultMonth]);

  return (
    <div className={compact ? "iz-field !mb-0" : "iz-field"}>
      <label className={compact ? "!text-[10px]" : undefined}>Date</label>
      <button
        type="button"
        className={`iz-hist-picker iz-hist-picker-btn${compact ? " iz-hist-picker-sm" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose date"
      >
        <Calendar className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        <span className={`iz-hist-picker-label${value ? "" : " iz-muted2"}`}>
          {value ? selectedLabel ?? value : compact ? "Any date" : "Tap to choose a date"}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            className="iz-hist-clear"
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className="iz-hist-cal">
          <HistDateCalendar
            selected={selected}
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            navBounds={navBounds}
            allowedKeys={allowedKeys}
            onSelectDay={(d) => {
              onChange(keyFromDate(d));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function OutletPickerField({
  value,
  onChange,
  compact,
  outlets,
}: {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
  outlets: { name: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const totalShifts = outlets.reduce((sum, o) => sum + o.count, 0);
  const current = value || "All outlets";

  return (
    <>
      <div className={`iz-hist-custom-select${compact ? " compact" : ""}`}>
        <label className={compact ? "!text-[10px]" : undefined}>Outlet</label>
        <button
          type="button"
          className={`iz-hist-select-trigger${compact ? " sm" : ""}${open ? " open" : ""}`}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          <span className={value ? "" : "iz-muted2"}>{current}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        </button>
      </div>

      <IzSheet open={open} onClose={() => setOpen(false)}>
        <div className="iz-cardttl">Choose outlet</div>
        <p className="iz-tiny iz-muted mb-3">
          {outlets.length} outlet{outlets.length === 1 ? "" : "s"} in your shift history · {totalShifts} shifts total
        </p>
        <div className="iz-hist-outlet-sheet-list">
          <button
            type="button"
            className={`iz-hist-outlet-opt${!value ? " sel" : ""}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <span>All outlets</span>
            <span className="c">{totalShifts} shifts</span>
          </button>
          {outlets.map((o) => (
            <button
              key={o.name}
              type="button"
              className={`iz-hist-outlet-opt${value === o.name ? " sel" : ""}`}
              onClick={() => {
                onChange(o.name);
                setOpen(false);
              }}
            >
              <span>{o.name}</span>
              <span className="c">
                {o.count} shift{o.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </IzSheet>
    </>
  );
}

function FilterNumberInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="iz-field !mb-0">
      <label>{label}</label>
      <input
        type="text"
        inputMode="decimal"
        className="iz-hist-num-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  );
}

function FilterChips({
  filters,
  dateOptions,
  onRemove,
}: {
  filters: HistFilters;
  dateOptions: { key: string; label: string }[];
  onRemove: (key: keyof HistFilters) => void;
}) {
  const chips: { key: keyof HistFilters; label: string }[] = [];
  if (filters.date) {
    const opt = dateOptions.find((o) => o.key === filters.date);
    chips.push({ key: "date", label: `Date: ${opt?.label ?? filters.date}` });
  }
  if (filters.date && filters.timeFrom) {
    chips.push({ key: "timeFrom", label: `From ${filters.timeFrom}` });
  }
  if (filters.date && filters.timeTo) {
    chips.push({ key: "timeTo", label: `To ${filters.timeTo}` });
  }
  if (filters.venue) chips.push({ key: "venue", label: `Outlet: ${filters.venue}` });
  if (filters.period !== "all") {
    chips.push({
      key: "period",
      label: `Period: ${SHIFT_PERIOD_OPTIONS.find((p) => p.id === filters.period)?.label ?? filters.period}`,
    });
  }
  const wages = parseFilterNum(filters.wages);
  if (wages !== null) chips.push({ key: "wages", label: `Wages: ${formatRM(wages)}` });
  const sales = parseFilterNum(filters.sales);
  if (sales !== null) chips.push({ key: "sales", label: `Sales: ${formatRM(sales)}` });
  const tables = parseFilterNum(filters.tables);
  if (tables !== null) chips.push({ key: "tables", label: `Tables: ${formatRM(tables)}` });
  const drinks = parseFilterNum(filters.drinks);
  if (drinks !== null) chips.push({ key: "drinks", label: `Drinks: ${drinks}` });

  return chips.map((chip) => (
    <button
      key={chip.key}
      type="button"
      className="iz-hist-chip"
      onClick={() => onRemove(chip.key)}
    >
      {chip.label}
      <X className="h-3 w-3 opacity-70" />
    </button>
  ));
}

function HistShiftCard({
  row,
  shiftMeta,
}: {
  row: HistRow;
  shiftMeta?: {
    durationHours?: number;
    shiftTime?: string | null;
    timeIn?: string | null;
    timeOut?: string | null;
    clockIn?: string | null;
    clockOut?: string | null;
  };
}) {
  const [y, m, d] = row.d;
  const pillVariant = row.pill === "green" ? "green" : row.pill === "red" ? "red" : row.pill === "amber" ? "amber" : "ink";
  const hasClock = shiftMeta?.clockIn || shiftMeta?.shiftTime;

  return (
    <IzCard className="iz-hist-shift-card mb-0">
      <div className="iz-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-sora text-[15px] font-bold leading-tight">{row.venue}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="iz-tiny iz-muted inline-flex items-center">
              <Calendar className="mr-1 h-2.5 w-2.5 shrink-0" />
              {fmtHistDate(y, m, d)}
            </span>
            {hasClock && (
              <span className="iz-tiny inline-flex items-center font-semibold text-[var(--iz-gold-l)]">
                <Clock className="mr-1 h-2.5 w-2.5 shrink-0" />
                {shiftMeta?.shiftTime ??
                  (shiftMeta?.clockIn && shiftMeta?.clockOut
                    ? `${shiftMeta.clockIn} – ${shiftMeta.clockOut}`
                    : shiftMeta?.clockIn)}
              </span>
            )}
            {shiftMeta?.durationHours != null && (
              <span className="iz-tiny iz-muted2">{shiftMeta.durationHours}h</span>
            )}
          </div>
          {shiftMeta?.timeIn && (
            <div className="iz-tiny iz-muted2 mt-1">
              Check-in {shiftMeta.timeIn}
              {shiftMeta.timeOut ? ` · Out ${shiftMeta.timeOut}` : ""}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <IzPill variant={pillVariant}>{row.st}</IzPill>
          <div className="font-sora iz-ledger mt-2 text-base font-extrabold text-[var(--iz-gold-l)]">
            {formatRM(row.sales)}
          </div>
          <div className="iz-tiny iz-muted2">total payout</div>
        </div>
      </div>

      <div className="iz-hist-shift-card-metrics mt-3">
        <div className="iz-hist-shift-metric">
          <span className="l">Wages</span>
          <span className="v text-[var(--iz-gold-l)]">{formatRM(row.wages)}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <span className="l">Tables</span>
          <span className="v">{formatRM(row.table)}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <span className="l">Drinks</span>
          <span className="v">{row.drinks}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <span className="l">Tips</span>
          <span className="v">{formatRM(row.tips)}</span>
        </div>
      </div>
    </IzCard>
  );
}

function GenericSelectField({
  label,
  value,
  onChange,
  options,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "Any";

  return (
    <div ref={rootRef} className={`iz-hist-custom-select${compact ? " compact" : ""}`}>
      <label className={compact ? "!text-[10px]" : undefined}>{label}</label>
      <button
        type="button"
        className={`iz-hist-select-trigger${compact ? " sm" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={value ? "" : "iz-muted2"}>{current}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="iz-hist-select-menu" role="listbox">
          {options.map((opt) => (
            <li key={opt.value || "__any"}>
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={value === opt.value ? "sel" : undefined}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReceiptScansSection({
  scans,
  filters,
  setFilters,
  filterCount,
  receiptDraft,
  setReceiptDraft,
  receiptFilterOpen,
  setReceiptFilterOpen,
  receiptOutlets,
  receiptDateOptions,
  receiptShiftOptions,
  pvById,
  pvByShiftId,
  onClear,
}: {
  scans: PrReceiptScan[];
  filters: ReceiptFilters;
  setFilters: Dispatch<SetStateAction<ReceiptFilters>>;
  filterCount: number;
  receiptDraft: ReceiptFilters;
  setReceiptDraft: Dispatch<SetStateAction<ReceiptFilters>>;
  receiptFilterOpen: boolean;
  setReceiptFilterOpen: (v: boolean) => void;
  receiptOutlets: string[];
  receiptDateOptions: { key: string; label: string }[];
  receiptShiftOptions: { value: string; label: string }[];
  pvById: Record<string, PrPaymentVoucher>;
  pvByShiftId: Record<string, PrPaymentVoucher>;
  onClear: () => void;
}) {
  const receiptDefaultMonth =
    dateFromKey(receiptDateOptions[receiptDateOptions.length - 1]?.key ?? "") ?? new Date(2026, 5, 1);

  return (
    <>
      <div className="iz-between mb-2.5 mt-4">
        <div className="iz-sect-label !m-0">Receipt scan records</div>
        <button
          type="button"
          className="iz-btn iz-btn-soft iz-btn-sm relative -mt-2"
          onClick={() => {
            setReceiptDraft(filters);
            setReceiptFilterOpen(true);
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {filterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--iz-gold)] px-1 text-[10px] font-bold text-[#1f1208]">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <p className="iz-tiny iz-muted mx-0.5 mb-2">
        Each receipt belongs to one shift PV (Time-In → scans → Time-Out). Many receipts can roll into a single PV.
      </p>

      <div className="iz-hist-search mb-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        <input
          type="search"
          placeholder="Search receipt ID, outlet, PV, items…"
          value={filters.query}
          onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
          aria-label="Search receipt scans"
        />
        {filters.query && (
          <button type="button" className="iz-hist-clear" aria-label="Clear search" onClick={() => setFilters((p) => ({ ...p, query: "" }))}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="iz-grid2 mb-2.5">
        <GenericSelectField
          label="Outlet"
          compact
          value={filters.outlet}
          onChange={(outlet) => setFilters((p) => ({ ...p, outlet }))}
          options={[{ value: "", label: "Any outlet" }, ...receiptOutlets.map((v) => ({ value: v, label: v }))]}
        />
        <GenericSelectField
          label="Shift"
          compact
          value={filters.shiftSessionId}
          onChange={(shiftSessionId) => setFilters((p) => ({ ...p, shiftSessionId }))}
          options={[{ value: "", label: "Any shift" }, ...receiptShiftOptions.map((o) => ({ value: o.value, label: o.label }))]}
        />
      </div>

      <div className="mb-2.5">
        <PvDateTimeFilter
          compact
          date={filters.date}
          timeFrom={filters.timeFrom}
          timeTo={filters.timeTo}
          onDateChange={(date) =>
            setFilters((p) => ({ ...p, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
          }
          onTimeFromChange={(timeFrom) => setFilters((p) => ({ ...p, timeFrom }))}
          onTimeToChange={(timeTo) => setFilters((p) => ({ ...p, timeTo }))}
          dateOptions={receiptDateOptions}
          defaultMonth={receiptDefaultMonth}
          timeHint="Filtered by receipt scan time on the selected date."
        />
      </div>

      {filterCount > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          {filters.date && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, date: "", timeFrom: "", timeTo: "" }))}
            >
              Date: {receiptDateOptions.find((o) => o.key === filters.date)?.label ?? filters.date}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.date && filters.timeFrom && (
            <button type="button" className="iz-hist-chip" onClick={() => setFilters((p) => ({ ...p, timeFrom: "" }))}>
              From {filters.timeFrom}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.date && filters.timeTo && (
            <button type="button" className="iz-hist-chip" onClick={() => setFilters((p) => ({ ...p, timeTo: "" }))}>
              To {filters.timeTo}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.shiftSessionId && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, shiftSessionId: "" }))}
            >
              Shift: {receiptShiftOptions.find((o) => o.value === filters.shiftSessionId)?.label ?? filters.shiftSessionId}
              <X className="h-3 w-3" />
            </button>
          )}
          <button type="button" className="iz-tiny font-semibold text-[var(--iz-gold-l)]" onClick={onClear}>
            Clear all filters
          </button>
        </div>
      )}

      {scans.length === 0 ? (
        <IzCard flat className="py-8 text-center">
          <p className="iz-sm iz-muted">No receipt scans match your filters.</p>
          <Link to="/host/scan" className="iz-btn iz-btn-primary iz-btn-sm mx-auto mt-3 w-auto">
            Scan a receipt
          </Link>
        </IzCard>
      ) : (
        <div className="iz-data-table-wrap">
          <table className="iz-data-table">
            <thead>
              <tr>
                <th>Date / ID</th>
                <th>Scan time</th>
                <th>Shift</th>
                <th>Belongs to PV</th>
                <th>Outlet</th>
                <th>Items</th>
                <th className="text-right">Logged</th>
                <th className="text-right">Comm.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => {
                const [y, m, d] = scan.date;
                const shift = receiptShiftInfo(scan, pvById, pvByShiftId);
                return (
                  <tr key={scan.id}>
                    <td>
                      <div className="font-semibold">{fmtHistDate(y, m, d)}</div>
                      <div className="iz-tiny iz-muted2">{scan.receiptRef}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 font-semibold text-[var(--iz-gold-l)]">
                        <Clock className="h-3 w-3 shrink-0 opacity-80" />
                        {scanTimeLabel(scan.scannedAt)}
                      </div>
                      <div className="iz-tiny iz-muted2 mt-0.5">{scan.scannedAt}</div>
                    </td>
                    <td className="max-w-[120px]">
                      {shift.shiftWindow ? (
                        <div className="font-semibold">{shift.shiftWindow}</div>
                      ) : (
                        <div className="iz-tiny iz-muted2">—</div>
                      )}
                      {shift.timeIn && (
                        <div className="iz-tiny iz-muted2 mt-0.5">
                          In {shift.timeIn.split("·").pop()?.trim()}
                          {shift.timeOut ? ` · Out ${shift.timeOut.split("·").pop()?.trim()}` : ""}
                        </div>
                      )}
                      {shift.sessionLabel && (
                        <div className="iz-tiny iz-muted2 mt-0.5">{shift.sessionLabel}</div>
                      )}
                    </td>
                    <td className="max-w-[120px]">
                      <div className="font-sora text-[12px] font-bold text-[var(--iz-gold-l)]">
                        {receiptBelongsToPvLabel(scan)}
                      </div>
                    </td>
                    <td>{scan.outlet}</td>
                    <td className="max-w-[100px]">
                      {scan.items.map((i) => (
                        <div key={i.label + i.qty} className="iz-tiny">
                          {i.qty}× {i.label}
                        </div>
                      ))}
                    </td>
                    <td className="text-right">{formatRM(scan.totalLogged)}</td>
                    <td className="text-right font-semibold text-[var(--iz-gold-l)]">
                      {formatRM(scan.totalCommission)}
                    </td>
                    <td>
                      <IzPill variant={receiptStatusPill(scan.status)}>{receiptStatusLabel(scan.status)}</IzPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/host/scan" className="iz-btn iz-btn-soft mt-3">
        Scan another receipt
      </Link>

      <IzSheet open={receiptFilterOpen} onClose={() => setReceiptFilterOpen(false)}>
        <div className="iz-cardttl">Filter receipt scans</div>
        <div className="space-y-3">
          <PvDateTimeFilter
            date={receiptDraft.date}
            timeFrom={receiptDraft.timeFrom}
            timeTo={receiptDraft.timeTo}
            onDateChange={(date) =>
              setReceiptDraft((p) => ({ ...p, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
            }
            onTimeFromChange={(timeFrom) => setReceiptDraft((p) => ({ ...p, timeFrom }))}
            onTimeToChange={(timeTo) => setReceiptDraft((p) => ({ ...p, timeTo }))}
            dateOptions={receiptDateOptions}
            defaultMonth={receiptDefaultMonth}
            timeHint="Filtered by receipt scan time on the selected date."
          />
          <GenericSelectField
            label="Shift"
            value={receiptDraft.shiftSessionId}
            onChange={(shiftSessionId) => setReceiptDraft((p) => ({ ...p, shiftSessionId }))}
            options={[{ value: "", label: "Any shift" }, ...receiptShiftOptions.map((o) => ({ value: o.value, label: o.label }))]}
          />
          <GenericSelectField
            label="Outlet"
            value={receiptDraft.outlet}
            onChange={(outlet) => setReceiptDraft((p) => ({ ...p, outlet }))}
            options={[{ value: "", label: "Any outlet" }, ...receiptOutlets.map((v) => ({ value: v, label: v }))]}
          />
          <GenericSelectField
            label="Item category"
            value={receiptDraft.category}
            onChange={(category) => setReceiptDraft((p) => ({ ...p, category: category as ReceiptItemCategory | "" }))}
            options={[
              { value: "", label: "Any category" },
              { value: "drinks", label: "Drinks" },
              { value: "tips", label: "Tips" },
              { value: "tables", label: "Tables" },
            ]}
          />
          <GenericSelectField
            label="PV status"
            value={receiptDraft.status}
            onChange={(status) => setReceiptDraft((p) => ({ ...p, status: status as ReceiptScanStatus | "" }))}
            options={[
              { value: "", label: "Any status" },
              { value: "pending", label: "Pending (not in PV)" },
              { value: "in_pv", label: "In PV" },
              { value: "paid", label: "Paid" },
            ]}
          />
          <FilterNumberInput
            label="Total commission (RM)"
            placeholder="e.g. 90"
            value={receiptDraft.commission}
            onChange={(v) => setReceiptDraft((p) => ({ ...p, commission: v }))}
          />
        </div>
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-4"
          onClick={() => {
            setFilters(receiptDraft);
            setReceiptFilterOpen(false);
          }}
        >
          Apply filters
        </button>
        <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={() => { onClear(); setReceiptFilterOpen(false); }}>
          Clear & close
        </button>
      </IzSheet>
    </>
  );
}

function PvDateTimeFilter({
  date,
  timeFrom,
  timeTo,
  onDateChange,
  onTimeFromChange,
  onTimeToChange,
  dateOptions,
  defaultMonth,
  compact,
  timeHint,
}: {
  date: string;
  timeFrom: string;
  timeTo: string;
  onDateChange: (v: string) => void;
  onTimeFromChange: (v: string) => void;
  onTimeToChange: (v: string) => void;
  dateOptions: { key: string; label: string }[];
  defaultMonth: Date;
  compact?: boolean;
  timeHint?: string;
}) {
  const clearDate = () => {
    onDateChange("");
    onTimeFromChange("");
    onTimeToChange("");
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <DatePickerField
        value={date}
        onChange={(next) => {
          if (!next) {
            clearDate();
            return;
          }
          onDateChange(next);
        }}
        compact={compact}
        dateOptions={dateOptions}
        defaultMonth={defaultMonth}
      />
      <div className="iz-grid2">
        <div className="iz-field !mb-0">
          <label className={compact ? "!text-[10px]" : undefined}>From time</label>
          <IzTimeInput
            value={timeFrom}
            onChange={onTimeFromChange}
            disabled={!date}
            aria-label="From time"
          />
        </div>
        <div className="iz-field !mb-0">
          <label className={compact ? "!text-[10px]" : undefined}>To time</label>
          <IzTimeInput
            value={timeTo}
            onChange={onTimeToChange}
            disabled={!date}
            aria-label="To time"
          />
        </div>
      </div>
      {!date && (timeFrom || timeTo) ? (
        <p className="iz-tiny iz-muted2">Pick a date first to narrow by time within that shift day.</p>
      ) : !date ? (
        <p className="iz-tiny iz-muted2">Select a date above — then tap From/To time to open the clock.</p>
      ) : date && (timeFrom || timeTo) ? (
        <p className="iz-tiny iz-muted2">
          {timeHint ??
            `Lines matched by receipt scan time or shift Time-In on ${dateOptions.find((o) => o.key === date)?.label ?? date}.`}
        </p>
      ) : date ? (
        <p className="iz-tiny iz-muted2">Tap <b>From time</b> or <b>To time</b> to open the clock picker.</p>
      ) : null}
    </div>
  );
}

function PvBreakdownSection({
  lines,
  scans,
  vouchers,
  onDownloadPdf,
  filters,
  setFilters,
  filterCount,
  pvDraft,
  setPvDraft,
  pvFilterOpen,
  setPvFilterOpen,
  pvIds,
  pvOutlets,
  pvRefs,
  pvDateOptions,
  pvDefaultMonth,
  onClear,
  isFreelancer,
  highlightPvId,
}: {
  lines: PvLineRecord[];
  scans: PrReceiptScan[];
  vouchers: PrPaymentVoucher[];
  onDownloadPdf: (pv: PrPaymentVoucher) => void;
  isFreelancer: boolean;
  highlightPvId?: string;
  filters: PvFilters;
  setFilters: Dispatch<SetStateAction<PvFilters>>;
  filterCount: number;
  pvDraft: PvFilters;
  setPvDraft: Dispatch<SetStateAction<PvFilters>>;
  pvFilterOpen: boolean;
  setPvFilterOpen: (v: boolean) => void;
  pvIds: string[];
  pvOutlets: string[];
  pvRefs: string[];
  pvDateOptions: { key: string; label: string }[];
  pvDefaultMonth: Date;
  onClear: () => void;
}) {
  const scanById = Object.fromEntries(scans.map((s) => [s.id, s]));
  const uniquePvInView = useMemo(() => [...new Set(lines.map((l) => l.pvId))], [lines]);
  const downloadTargetId = filters.pvId || (uniquePvInView.length === 1 ? uniquePvInView[0] : "");
  const downloadPv = downloadTargetId ? vouchers.find((p) => p.id === downloadTargetId) : undefined;

  return (
    <>
      <div className="iz-between mb-2.5 mt-4">
        <div className="iz-sect-label !m-0">PV line breakdown</div>
        <button
          type="button"
          className="iz-btn iz-btn-soft iz-btn-sm relative -mt-2"
          onClick={() => {
            setPvDraft(filters);
            setPvFilterOpen(true);
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {filterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--iz-gold)] px-1 text-[10px] font-bold text-[#1f1208]">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <p className="iz-tiny iz-muted mx-0.5 mb-2">
        Each PV is one shift: Time-In, Time-Out, wages, and every receipt scanned before checkout.
      </p>

      <div className="iz-hist-search mb-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        <input
          type="search"
          placeholder="Search PV ID, outlet, description, receipt…"
          value={filters.query}
          onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
          aria-label="Search PV lines"
        />
        {filters.query && (
          <button type="button" className="iz-hist-clear" aria-label="Clear search" onClick={() => setFilters((p) => ({ ...p, query: "" }))}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="iz-grid2 mb-2.5">
        <GenericSelectField
          label="PV"
          compact
          value={filters.pvId}
          onChange={(pvId) => setFilters((p) => ({ ...p, pvId }))}
          options={[{ value: "", label: "Any PV" }, ...pvIds.map((id) => ({ value: id, label: id }))]}
        />
        <GenericSelectField
          label="Outlet"
          compact
          value={filters.outlet}
          onChange={(outlet) => setFilters((p) => ({ ...p, outlet }))}
          options={[{ value: "", label: "Any outlet" }, ...pvOutlets.map((v) => ({ value: v, label: v }))]}
        />
      </div>

      <div className="mb-2.5">
        <PvDateTimeFilter
          compact
          date={filters.date}
          timeFrom={filters.timeFrom}
          timeTo={filters.timeTo}
          onDateChange={(date) => setFilters((p) => ({ ...p, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))}
          onTimeFromChange={(timeFrom) => setFilters((p) => ({ ...p, timeFrom }))}
          onTimeToChange={(timeTo) => setFilters((p) => ({ ...p, timeTo }))}
          dateOptions={pvDateOptions}
          defaultMonth={pvDefaultMonth}
        />
      </div>

      {filterCount > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          {filters.date && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, date: "", timeFrom: "", timeTo: "" }))}
            >
              Date: {pvDateOptions.find((o) => o.key === filters.date)?.label ?? filters.date}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.date && filters.timeFrom && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, timeFrom: "" }))}
            >
              From {filters.timeFrom}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.date && filters.timeTo && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, timeTo: "" }))}
            >
              To {filters.timeTo}
              <X className="h-3 w-3" />
            </button>
          )}
          <button type="button" className="iz-tiny font-semibold text-[var(--iz-gold-l)]" onClick={onClear}>
            Clear all filters
          </button>
        </div>
      )}

      {!downloadPv && lines.length > 0 && (
        <p className="iz-tiny iz-muted mx-0.5 mb-2">
          Pick a PV in the dropdown above, or tap <b className="text-[var(--iz-gold-l)]">PDF</b> on any row.
        </p>
      )}

      {downloadPv && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mb-2.5 w-full"
          onClick={() => onDownloadPdf(downloadPv)}
        >
          <Download className="h-4 w-4" />
          Download PDF — {downloadPv.id}
        </button>
      )}

      {lines.length === 0 ? (
        <IzCard flat className="py-8 text-center">
          <p className="iz-sm iz-muted">No PV lines match your filters.</p>
        </IzCard>
      ) : (
        <div className="iz-data-table-wrap">
          <table className="iz-data-table">
            <thead>
              <tr>
                <th>PV / cycle</th>
                <th>Date</th>
                <th>Outlet</th>
                <th>Description</th>
                <th>Ref</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
                <th>Receipt scans</th>
                <th>PV status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className={highlightPvId === line.pvId ? "bg-[rgba(232,194,122,.08)]" : undefined}>
                  <td>
                    <div className="font-semibold">{line.pvId}</div>
                    <div className="iz-tiny iz-muted2">{line.cycle}</div>
                  </td>
                  <td>{line.date}</td>
                  <td>{line.outlet}</td>
                  <td>{line.desc}</td>
                  <td>
                    <IzPill variant={line.ref === "Disputed" ? "red" : line.ref === "Tap log" ? "amber" : "ink"}>
                      {line.ref}
                    </IzPill>
                  </td>
                  <td className="text-right">{line.qty}</td>
                  <td className="text-right font-semibold">{formatRM(line.amount)}</td>
                  <td className="max-w-[160px]">
                    {line.receiptIds.length === 0 ? (
                      <span className="iz-tiny iz-muted2">—</span>
                    ) : (
                      line.receiptIds.map((rid) => {
                        const scan = scanById[rid];
                        if (!scan) return <div key={rid} className="iz-tiny">{rid}</div>;
                        return (
                          <div key={rid} className="iz-tiny mb-1">
                            <b>{rid}</b> · {formatRM(scan.totalCommission)} comm.
                          </div>
                        );
                      })
                    )}
                  </td>
                  <td>
                    <IzPill
                      variant={
                        line.pvStatus === "PAID" ? "green" : line.pvStatus === "DISPUTED" ? "red" : line.pvStatus === "SENT" ? "amber" : "green"
                      }
                    >
                      {line.pvStatus}
                    </IzPill>
                    <button
                      type="button"
                      className="iz-btn iz-btn-soft iz-btn-sm mt-1.5 w-full min-w-[4.5rem]"
                      onClick={() => {
                        const pv = vouchers.find((p) => p.id === line.pvId);
                        if (pv) onDownloadPdf(pv);
                      }}
                      aria-label={`Download PDF for ${line.pvId}`}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/host/PaymentVoucher" className="iz-btn iz-btn-soft mt-3">
        {isFreelancer ? "Open Payment Vouchers" : "Sign or dispute PV"}
      </Link>

      <IzSheet open={pvFilterOpen} onClose={() => setPvFilterOpen(false)}>
        <div className="iz-cardttl">Filter PV lines</div>
        <div className="space-y-3">
          <GenericSelectField
            label="PV"
            value={pvDraft.pvId}
            onChange={(pvId) => setPvDraft((p) => ({ ...p, pvId }))}
            options={[{ value: "", label: "Any PV" }, ...pvIds.map((id) => ({ value: id, label: id }))]}
          />
          <PvDateTimeFilter
            date={pvDraft.date}
            timeFrom={pvDraft.timeFrom}
            timeTo={pvDraft.timeTo}
            onDateChange={(date) =>
              setPvDraft((p) => ({ ...p, date, ...(!date ? { timeFrom: "", timeTo: "" } : {}) }))
            }
            onTimeFromChange={(timeFrom) => setPvDraft((p) => ({ ...p, timeFrom }))}
            onTimeToChange={(timeTo) => setPvDraft((p) => ({ ...p, timeTo }))}
            dateOptions={pvDateOptions}
            defaultMonth={pvDefaultMonth}
          />
          <GenericSelectField
            label="Outlet"
            value={pvDraft.outlet}
            onChange={(outlet) => setPvDraft((p) => ({ ...p, outlet }))}
            options={[{ value: "", label: "Any outlet" }, ...pvOutlets.map((v) => ({ value: v, label: v }))]}
          />
          <GenericSelectField
            label="PV status"
            value={pvDraft.status}
            onChange={(status) => setPvDraft((p) => ({ ...p, status }))}
            options={[
              { value: "", label: "Any status" },
              { value: "PENDING_REVIEW", label: "PENDING REVIEW" },
              { value: "SENT", label: "SENT" },
              { value: "SIGNED", label: "SIGNED" },
              { value: "PAID", label: "PAID" },
              { value: "DISPUTED", label: "DISPUTED" },
            ]}
          />
          <GenericSelectField
            label="Source ref"
            value={pvDraft.ref}
            onChange={(ref) => setPvDraft((p) => ({ ...p, ref }))}
            options={[{ value: "", label: "Any ref" }, ...pvRefs.map((r) => ({ value: r, label: r }))]}
          />
        </div>
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-4"
          onClick={() => {
            setFilters(pvDraft);
            setPvFilterOpen(false);
          }}
        >
          Apply filters
        </button>
        <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={() => { onClear(); setPvFilterOpen(false); }}>
          Clear & close
        </button>
      </IzSheet>
    </>
  );
}
