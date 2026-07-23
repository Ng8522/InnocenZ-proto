import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePrTopbar } from "@/components/pr/PrChrome";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  filterPvsForPrProfile,
  filterReceiptScansForPrProfile,
  fmtHistDate,
  getPrProfile,
  type HistRow,
  type PrPaymentVoucher,
  type PrReceiptScan,
  type PvLineRecord,
  getPrRosterId,
} from "@/lib/pr-demo";
import { shiftHistoryToHistRows } from "@/lib/portal-sync";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { downloadPvBreakdownCsv, downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { payeeFromPrPortal } from "@/lib/pv-template";
import { usePrPortalReady } from "@/lib/use-pr-sub-role";
import { Calendar, ChevronDown, Clock, Download, Filter, Search, Wallet, X } from "lucide-react";
import {
  PaymentHistStatusChips,
  PrPaymentHistoryPanel,
} from "@/components/pr/PrPaymentHistoryPanel";
import {
  shiftHistoryStatusLabel,
  isPaymentHistoryPv,
  isPayrollWeekHiddenInHistory,
  disputedPayrollWeekPvs,
} from "@/lib/pr-payment-history";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { HistPayrollWeekSection } from "@/components/pr/HistPayrollWeekSection";
import { LabelWithIcon, TitleWithIcon } from "@/components/iz/TitleWithIcon";
import {
  IzCard,
  IzCardTitle,
  IzPill,
  IzSectionLabel,
  IzTimeInput,
  formatRM,
} from "@/components/iz/ui";
import { calendarNavBounds, HistDateCalendar } from "@/components/iz/HistDateCalendar";
import { parseDateInputMs, parseScannedAtMs } from "@/lib/payroll-filters";
import { getPayrollWeekSundayIso } from "@/lib/demo-clock";
import { payrollWeekRangeLabel } from "@/lib/pr-weekly-payment";

type HistTab = "shifts" | "payment";

export const Route = createFileRoute("/host/history")({
  validateSearch: (search: Record<string, unknown>): { tab: HistTab; pvId?: string } => {
    const tab = search.tab;
    const pvId = typeof search.pvId === "string" ? search.pvId : undefined;
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
  status: HistRow["st"] | "";
  wages: string;
  sales: string;
  others: string;
  drinks: string;
};

const EMPTY_FILTERS: HistFilters = {
  query: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  venue: "",
  status: "",
  wages: "",
  sales: "",
  others: "",
  drinks: "",
};

const SHIFT_HIST_STATUS_OPTIONS: { value: HistRow["st"] | ""; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "PAID", label: "Paid" },
  { value: "SIGNED", label: "Signed" },
  { value: "SENT", label: "In PV" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "SEALED", label: "Sealed" },
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
  const t = raw
    .trim()
    .replace(/,/g, "")
    .replace(/^rm\s*/i, "");
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
    row.others,
    row.drinks,
    row.st,
    formatRM(row.wages),
    formatRM(row.sales),
    formatRM(row.others),
    formatRM(row.drinks),
    formatRM(row.tips),
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
  if (filters.status && row.st !== filters.status) return false;
  const wages = parseFilterNum(filters.wages);
  if (wages !== null && row.wages !== wages) return false;
  const sales = parseFilterNum(filters.sales);
  if (sales !== null && row.sales !== sales) return false;
  const others = parseFilterNum(filters.others);
  if (others !== null && row.others !== others) return false;
  const drinks = parseFilterNum(filters.drinks);
  if (drinks !== null && row.drinks !== drinks) return false;
  return true;
}

function clock12To24(clock: string): string | null {
  const m = clock
    .trim()
    .replace(/\s*\(\+1\)\s*$/i, "")
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
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
  if (filters.status) n++;
  if (parseFilterNum(filters.wages) !== null) n++;
  if (parseFilterNum(filters.sales) !== null) n++;
  if (parseFilterNum(filters.others) !== null) n++;
  if (parseFilterNum(filters.drinks) !== null) n++;
  return n;
}

function shiftEarningsContextLabel(
  filters: HistFilters,
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
  return "All shifts";
}

type HistPayrollWeekGroup = {
  weekStart: string;
  label: string;
  rows: HistRow[];
  earnings: number;
  wages: number;
};

function groupHistRowsByPayrollWeek(rows: HistRow[]): HistPayrollWeekGroup[] {
  const groups = new Map<string, HistRow[]>();
  for (const row of rows) {
    const weekStart = getPayrollWeekSundayIso(dateKey(row.d));
    const bucket = groups.get(weekStart);
    if (bucket) bucket.push(row);
    else groups.set(weekStart, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, weekRows]) => ({
      weekStart,
      label: payrollWeekRangeLabel(weekStart),
      rows: weekRows,
      earnings: weekRows.reduce((sum, row) => sum + row.sales, 0),
      wages: weekRows.reduce((sum, row) => sum + row.wages, 0),
    }));
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
    return mins > 0
      ? `${display}:${String(mins).padStart(2, "0")} ${period}`
      : `${display}:00 ${period}`;
  };
  const crossesMidnight = endH >= 24;
  const endDisplay = fmt12(endH);
  return {
    window: `${fmt12(startH)} – ${endDisplay}${crossesMidnight ? "" : ""}`,
    clockIn: fmt12(startH),
    clockOut: `${endDisplay}${crossesMidnight ? " (+1)" : ""}`,
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

type PaymentHistFilters = {
  query: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  outlet: string;
  status: "" | "PAID" | "SIGNED";
  net: string;
};

const PAYMENT_HIST_STATUS_OPTIONS: { value: PaymentHistFilters["status"]; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "PAID", label: "Paid" },
  { value: "SIGNED", label: "Signed" },
];

const EMPTY_PAYMENT_HIST_FILTERS: PaymentHistFilters = {
  query: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  outlet: "",
  status: "",
  net: "",
};

function outletSessionSlug(outlet: string): string {
  const o = outlet.toLowerCase();
  if (o.includes("velvet")) return "velvet";
  if (o.includes("bear")) return "bearlounge";
  if (o.includes("mermate")) return "mermate";
  return o.replace(/\s+/g, "");
}

function shiftSessionIdForRow(dateIso: string, outlet: string): string {
  return `shift-${dateIso}-${outletSessionSlug(outlet)}`;
}

function pvLinkedScans(
  pv: PrPaymentVoucher,
  scansById: Record<string, PrReceiptScan>,
): PrReceiptScan[] {
  const ids = new Set<string>([
    ...(pv.receiptIds ?? []),
    ...pv.rows.flatMap((r) => r.receiptIds ?? []),
  ]);
  return [...ids].map((id) => scansById[id]).filter((s): s is PrReceiptScan => Boolean(s));
}

function pvShiftSessionIds(pv: PrPaymentVoucher): string[] {
  const ids = new Set<string>();
  if (pv.shiftSessionId) ids.add(pv.shiftSessionId);
  for (const row of pv.rows) {
    if (!row.outlet || row.outlet === "—") continue;
    const key = pvLineDateKey({ date: row.date, cycle: pv.cycle } as PvLineRecord, pv.issued);
    if (key) ids.add(shiftSessionIdForRow(key, row.outlet));
  }
  return [...ids];
}

function pvDateKeys(pv: PrPaymentVoucher, scansById: Record<string, PrReceiptScan>): string[] {
  const keys = new Set<string>();
  for (const row of pv.rows) {
    const key = pvLineDateKey({ date: row.date, cycle: pv.cycle } as PvLineRecord, pv.issued);
    if (key) keys.add(key);
  }
  for (const scan of pvLinkedScans(pv, scansById)) {
    keys.add(dateKey(scan.date));
  }
  const issuedMs = parseScannedAtMs(pv.issued);
  if (issuedMs) {
    const d = new Date(issuedMs);
    keys.add(dateKey([d.getFullYear(), d.getMonth() + 1, d.getDate()]));
  }
  if (pv.paidAt) {
    const paidMs = parseScannedAtMs(pv.paidAt);
    if (paidMs) {
      const d = new Date(paidMs);
      keys.add(dateKey([d.getFullYear(), d.getMonth() + 1, d.getDate()]));
    }
  }
  return [...keys];
}

function pvEventMsOnDate(
  pv: PrPaymentVoucher,
  dateIso: string,
  scansById: Record<string, PrReceiptScan>,
): number[] {
  const times: number[] = [];
  for (const scan of pvLinkedScans(pv, scansById)) {
    if (dateKey(scan.date) !== dateIso) continue;
    const ms = parseScannedAtMs(scan.scannedAt);
    if (ms) times.push(ms);
  }
  for (const stamp of [pv.paidAt, pv.issued, pv.prSignedAt]) {
    if (!stamp) continue;
    const ms = parseScannedAtMs(stamp);
    if (!ms) continue;
    const d = new Date(ms);
    if (dateKey([d.getFullYear(), d.getMonth() + 1, d.getDate()]) === dateIso) times.push(ms);
  }
  return times;
}

function paymentHistSearchBlob(
  pv: PrPaymentVoucher,
  scansById: Record<string, PrReceiptScan>,
): string {
  const scans = pvLinkedScans(pv, scansById);
  return [
    pv.id,
    pv.cycle,
    pv.outlet,
    pv.status,
    pv.issued,
    pv.paidAt,
    pv.bankRef,
    pv.weekStartIso,
    pv.weekEndIso,
    ...pv.rows.flatMap((r) => [r.date, r.outlet, r.desc, r.ref, String(r.amt)]),
    ...scans.flatMap((s) => [s.receiptRef, s.id, s.outlet, s.shiftSessionId]),
  ]
    .join(" ")
    .toLowerCase();
}

function pvOutlets(pv: PrPaymentVoucher): string[] {
  const outlets = new Set<string>();
  if (pv.outlet && !pv.outlet.startsWith("Multi")) outlets.add(pv.outlet);
  for (const row of pv.rows) {
    if (row.outlet && row.outlet !== "—") outlets.add(row.outlet);
  }
  return [...outlets];
}

function matchesPaymentHistFilters(
  pv: PrPaymentVoucher,
  filters: PaymentHistFilters,
  scansById: Record<string, PrReceiptScan>,
): boolean {
  if (!isPaymentHistoryPv(pv)) return false;
  if (
    filters.query.trim() &&
    !paymentHistSearchBlob(pv, scansById).includes(filters.query.trim().toLowerCase())
  ) {
    return false;
  }
  if (filters.status && pv.status !== filters.status) return false;
  const netFilter = parseFilterNum(filters.net);
  if (netFilter !== null && pv.net !== netFilter) return false;
  if (filters.outlet) {
    const outlets = pvOutlets(pv);
    if (!outlets.includes(filters.outlet) && !pv.outlet.includes(filters.outlet)) return false;
  }
  if (filters.date) {
    if (!pvDateKeys(pv, scansById).includes(filters.date)) return false;
    if (filters.timeFrom || filters.timeTo) {
      const events = pvEventMsOnDate(pv, filters.date, scansById);
      if (!events.length) return false;
      const fromMs = parseDateInputMs(filters.date, filters.timeFrom || "00:00");
      const toMs = parseDateInputMs(filters.date, filters.timeTo || "23:59");
      const inWindow = events.some((eventMs) => {
        if (fromMs != null && eventMs < fromMs) return false;
        if (toMs != null && eventMs > toMs) return false;
        return true;
      });
      if (!inWindow) return false;
    }
  }
  return true;
}

function paymentHistFilterCount(filters: PaymentHistFilters) {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.date) n++;
  if (filters.date && filters.timeFrom) n++;
  if (filters.date && filters.timeTo) n++;
  if (filters.outlet) n++;
  if (filters.status) n++;
  if (parseFilterNum(filters.net) !== null) n++;
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
  if (filters.query.trim() && !pvSearchBlob(line).includes(filters.query.trim().toLowerCase()))
    return false;
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

function HistoryPage() {
  const { tab, pvId: searchPvId } = Route.useSearch();
  const navigate = useNavigate();
  const { ready, role: prSubRole } = usePrPortalReady();
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prIcName = useStore((s) => s.prIcName);
  const prMobile = useStore((s) => s.prMobile);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const toast = useStore((s) => s.toast);
  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);
  const agencyPr = agencyPRs.find((p) => p.id === prId);
  const portalPayee = useMemo(
    () =>
      payeeFromPrPortal(prSubRole, profile, {
        prDisplayName,
        prIcName,
        prMobile,
        agencyPr,
      }),
    [prSubRole, profile, prDisplayName, prIcName, prMobile, agencyPr],
  );

  const myVouchers = useMemo(
    () => filterPvsForPrProfile(prPaymentVouchers, profile, prSubRole),
    [prPaymentVouchers, profile, prSubRole],
  );
  const myReceiptScans = useMemo(
    () => filterReceiptScansForPrProfile(prReceiptScans, profile, prSubRole, myVouchers),
    [prReceiptScans, profile, prSubRole, myVouchers],
  );
  const histRows = useMemo(
    () => shiftHistoryToHistRows(shiftHistory, prId, myVouchers),
    [shiftHistory, prId, myVouchers],
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
  const [filters, setFilters] = useState<HistFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<HistFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [paymentFilters, setPaymentFilters] = useState<PaymentHistFilters>(
    EMPTY_PAYMENT_HIST_FILTERS,
  );
  const [paymentDraft, setPaymentDraft] = useState<PaymentHistFilters>(EMPTY_PAYMENT_HIST_FILTERS);
  const [paymentFilterOpen, setPaymentFilterOpen] = useState(false);

  const paymentHistVouchers = useMemo(() => myVouchers.filter(isPaymentHistoryPv), [myVouchers]);
  const scanById = useMemo(
    () => Object.fromEntries(myReceiptScans.map((s) => [s.id, s])),
    [myReceiptScans],
  );

  const paymentOutlets = useMemo(() => {
    const set = new Set<string>();
    for (const pv of paymentHistVouchers) {
      for (const o of pvOutlets(pv)) set.add(o);
    }
    return [...set].sort();
  }, [paymentHistVouchers]);

  const paymentDateOptions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const pv of paymentHistVouchers) {
      for (const key of pvDateKeys(pv, scanById)) {
        const [y, m, d] = key.split("-").map(Number);
        map.set(key, [y, m, d]);
      }
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, d]) => ({ key, label: fmtHistDate(d[0], d[1], d[2]) }));
  }, [paymentHistVouchers, scanById]);

  const histOutletFilterOptions = useMemo(
    () => [
      { value: "", label: "Any outlet" },
      ...histOutletOptions.map((o) => ({ value: o.name, label: o.name })),
    ],
    [histOutletOptions],
  );

  const filteredPaymentVouchers = useMemo(
    () =>
      paymentHistVouchers.filter((pv) => matchesPaymentHistFilters(pv, paymentFilters, scanById)),
    [paymentHistVouchers, paymentFilters, scanById],
  );

  const paymentDefaultMonth =
    dateFromKey(paymentDateOptions[paymentDateOptions.length - 1]?.key ?? "") ??
    new Date(2026, 5, 1);

  const setTab = (next: HistTab) => navigate({ to: "/host/history", search: { tab: next } });

  useEffect(() => {
    if (searchPvId && tab !== "payment") {
      navigate({ to: "/host/history", search: { tab: "payment", pvId: searchPvId } });
    }
  }, [searchPvId, tab, navigate]);

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
      const inferred =
        hist?.durationHours && !pv?.shiftTime ? inferNightShiftWindow(hist.durationHours) : null;
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
    return matched.slice().sort((a, b) => dateKey(b.d).localeCompare(dateKey(a.d)));
  }, [histRows, filters, shiftMetaForHistRow]);

  const shiftPeriodEarnings = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.sales, 0),
    [filteredRows],
  );

  const shiftPeriodWages = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.wages, 0),
    [filteredRows],
  );

  const shiftEarningsLabel = shiftEarningsContextLabel(filters, histDateOptions);

  const currentPayrollWeekStart = getPayrollWeekSundayIso();

  const shiftRowsByCycle = useMemo(
    () =>
      groupHistRowsByPayrollWeek(filteredRows).filter(
        (cycle) => !isPayrollWeekHiddenInHistory(cycle.weekStart, myVouchers),
      ),
    [filteredRows, myVouchers],
  );

  const disputedShiftWeeks = useMemo(() => disputedPayrollWeekPvs(myVouchers), [myVouchers]);

  const historyWeekEntries = useMemo(() => {
    type Entry =
      | { kind: "shifts"; weekStart: string; cycle: HistPayrollWeekGroup }
      | { kind: "disputed"; weekStart: string; pv: PrPaymentVoucher };
    const entries: Entry[] = [
      ...shiftRowsByCycle.map((cycle) => ({
        kind: "shifts" as const,
        weekStart: cycle.weekStart,
        cycle,
      })),
      ...disputedShiftWeeks.map((pv) => ({
        kind: "disputed" as const,
        weekStart: pv.weekStartIso ?? "",
        pv,
      })),
    ];
    return entries.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [shiftRowsByCycle, disputedShiftWeeks]);

  const filterCount = activeFilterCount(filters);
  const paymentFilterCountN = paymentHistFilterCount(paymentFilters);

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

  const anyFilterOpen = filterOpen || paymentFilterOpen;
  const closeFilters = () => {
    setFilterOpen(false);
    setPaymentFilterOpen(false);
  };

  usePrTopbar({
    onBack: () => {
      if (anyFilterOpen) {
        closeFilters();
        return;
      }
      return false;
    },
    backLabel: anyFilterOpen ? "History" : undefined,
  });

  return (
    <div className="iz-screen">
      <PrPageHeader label="Earnings" title="History" />

      <div className="iz-hist-tabs mt-4">
        <button
          type="button"
          className={tab === "shifts" ? "active" : ""}
          onClick={() => setTab("shifts")}
        >
          <TitleWithIcon>Shifts</TitleWithIcon>
        </button>
        <button
          type="button"
          className={tab === "payment" ? "active" : ""}
          onClick={() => setTab("payment")}
        >
          <TitleWithIcon>Payment history</TitleWithIcon>
        </button>
      </div>

      {tab === "shifts" && (
        <>
          <IzCard flat className="iz-hist-shift-panel mt-4 !p-0">
            <div className="iz-hist-shift-earn-strip">
              <div className="iz-hist-shift-earn-cell primary">
                <LabelWithIcon label="Earned in range" className="l" />
                <span className="v">{formatRM(shiftPeriodEarnings)}</span>
              </div>
              <div className="iz-hist-shift-earn-cell">
                <LabelWithIcon label="Wages" className="l" />
                <span className="v">{formatRM(shiftPeriodWages)}</span>
              </div>
            </div>

            <div className="iz-hist-shift-range">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold-l)]" />
              <span className="min-w-0 truncate">{shiftEarningsLabel}</span>
            </div>

            <div className="iz-hist-shift-filters-body">
              <div className="iz-between mb-2">
                <IzSectionLabel className="!m-0">Shift history</IzSectionLabel>
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

              <HistRecordsFilterBar
                searchPlaceholder="Search wages, sales, others, drinks…"
                searchAriaLabel="Search shift history"
                query={filters.query}
                onQueryChange={(query) => setFilters((prev) => ({ ...prev, query }))}
                outletValue={filters.venue}
                onOutletChange={(venue) => setFilters((prev) => ({ ...prev, venue }))}
                outletOptions={histOutletFilterOptions}
                statusValue={filters.status}
                onStatusChange={(status) =>
                  setFilters((prev) => ({ ...prev, status: status as HistRow["st"] | "" }))
                }
                statusOptions={SHIFT_HIST_STATUS_OPTIONS}
                date={filters.date}
                timeFrom={filters.timeFrom}
                timeTo={filters.timeTo}
                onDateChange={(date) =>
                  setFilters((prev) => ({
                    ...prev,
                    date,
                    ...(!date ? { timeFrom: "", timeTo: "" } : {}),
                  }))
                }
                onTimeFromChange={(timeFrom) => setFilters((prev) => ({ ...prev, timeFrom }))}
                onTimeToChange={(timeTo) => setFilters((prev) => ({ ...prev, timeTo }))}
                dateOptions={histDateOptions}
                defaultMonth={histDefaultMonth}
              />

              {filterCount > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--iz-line)] pt-2.5">
                  {(filters.date ||
                    filters.venue ||
                    filters.status ||
                    filters.timeFrom ||
                    filters.timeTo) && (
                    <HistInlineFilterChips
                      date={filters.date}
                      timeFrom={filters.timeFrom}
                      timeTo={filters.timeTo}
                      dateOptions={histDateOptions}
                      outlet={filters.venue}
                      statusLabel={
                        filters.status ? shiftHistoryStatusLabel(filters.status) : undefined
                      }
                      onClearDate={() =>
                        setFilters((prev) => ({ ...prev, date: "", timeFrom: "", timeTo: "" }))
                      }
                      onClearTimeFrom={() => setFilters((prev) => ({ ...prev, timeFrom: "" }))}
                      onClearTimeTo={() => setFilters((prev) => ({ ...prev, timeTo: "" }))}
                      onClearOutlet={() => setFilters((prev) => ({ ...prev, venue: "" }))}
                      onClearStatus={() => setFilters((prev) => ({ ...prev, status: "" }))}
                      onClearAll={clearFilters}
                      hideClearAll
                    />
                  )}
                  <FilterChips
                    filters={filters}
                    onRemove={(key) => setFilters((prev) => ({ ...prev, [key]: "" }))}
                  />
                  <button
                    type="button"
                    className="iz-tiny font-semibold text-[var(--iz-gold-l)]"
                    onClick={clearFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </IzCard>

          {filteredRows.length === 0 && disputedShiftWeeks.length === 0 ? (
            <IzCard flat className="mt-3 py-8 text-center">
              <p className="iz-sm iz-muted">No shifts match your filters.</p>
              <button
                type="button"
                className="iz-btn iz-btn-soft iz-btn-sm mx-auto mt-3 w-auto"
                onClick={clearFilters}
              >
                Reset filters
              </button>
            </IzCard>
          ) : (
            <div className="iz-hist-shift-list mt-3">
              {historyWeekEntries.map((entry) => {
                if (entry.kind === "disputed") {
                  const pv = entry.pv;
                  return (
                    <IzCard
                      key={`disputed-${pv.id}`}
                      flat
                      className="mb-2.5 border border-[rgba(255,107,107,.35)] bg-[var(--iz-red-bg)] !p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="iz-tiny iz-muted2 tracking-widest">
                            PAYROLL WEEK · DISPUTED
                          </p>
                          <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">
                            {pv.cycle}
                          </p>
                          <p className="iz-tiny mt-1 text-[var(--iz-red)]">
                            Shift lines held while dispute is open — amounts frozen on Payment until
                            agency resolves.
                          </p>
                        </div>
                        <IzPill variant="red">DISPUTED</IzPill>
                      </div>
                      <p className="iz-tiny iz-muted mt-2">
                        {pv.outlet} · {formatRM(pv.net)}
                        {pv.disputedAt ? ` · raised ${pv.disputedAt}` : ""}
                      </p>
                      <Link
                        to="/host/PaymentVoucher"
                        search={{ pvId: pv.id }}
                        className="iz-btn iz-btn-soft iz-btn-sm mt-2.5 inline-flex w-full justify-center"
                      >
                        View dispute on Payment
                      </Link>
                    </IzCard>
                  );
                }
                const cycle = entry.cycle;
                const isCurrentWeek = cycle.weekStart === currentPayrollWeekStart;
                return (
                  <HistPayrollWeekSection
                    key={cycle.weekStart}
                    title={
                      isCurrentWeek
                        ? `Current week · ${cycle.label}`
                        : `Payroll week · ${cycle.label}`
                    }
                    hint={`${formatRM(cycle.earnings)} earned · ${formatRM(cycle.wages)} wages`}
                    shiftCount={cycle.rows.length}
                    isCurrent={isCurrentWeek}
                    defaultOpen={isCurrentWeek}
                  >
                    <div className="space-y-2.5 pt-3">
                      {cycle.rows.map((row) => (
                        <HistShiftCard
                          key={`${row.d.join("-")}-${row.venue}`}
                          row={row}
                          shiftMeta={shiftMetaForHistRow(row)}
                        />
                      ))}
                    </div>
                  </HistPayrollWeekSection>
                );
              })}
            </div>
          )}

          <IzSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
            <IzCardTitle>Filter shift history</IzCardTitle>

            <div className="space-y-3">
              <PvDateTimeFilter
                date={draft.date}
                timeFrom={draft.timeFrom}
                timeTo={draft.timeTo}
                onDateChange={(date) =>
                  setDraft((prev) => ({
                    ...prev,
                    date,
                    ...(!date ? { timeFrom: "", timeTo: "" } : {}),
                  }))
                }
                onTimeFromChange={(timeFrom) => setDraft((prev) => ({ ...prev, timeFrom }))}
                onTimeToChange={(timeTo) => setDraft((prev) => ({ ...prev, timeTo }))}
                dateOptions={histDateOptions}
                defaultMonth={histDefaultMonth}
              />
              <GenericSelectField
                label="Outlet"
                value={draft.venue}
                onChange={(venue) => setDraft((prev) => ({ ...prev, venue }))}
                options={histOutletFilterOptions}
              />
              <GenericSelectField
                label="Status"
                value={draft.status}
                onChange={(status) =>
                  setDraft((prev) => ({ ...prev, status: status as HistRow["st"] | "" }))
                }
                options={SHIFT_HIST_STATUS_OPTIONS}
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
                  label="Others (RM)"
                  placeholder="e.g. 180"
                  value={draft.others}
                  onChange={(v) => setDraft((prev) => ({ ...prev, others: v }))}
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

      {tab === "payment" && (
        <PaymentHistorySection
          vouchers={filteredPaymentVouchers}
          hasAnyPayments={paymentHistVouchers.length > 0}
          filters={paymentFilters}
          setFilters={setPaymentFilters}
          filterCount={paymentFilterCountN}
          paymentDraft={paymentDraft}
          setPaymentDraft={setPaymentDraft}
          paymentFilterOpen={paymentFilterOpen}
          setPaymentFilterOpen={setPaymentFilterOpen}
          paymentOutlets={paymentOutlets}
          paymentDateOptions={paymentDateOptions}
          paymentDefaultMonth={paymentDefaultMonth}
          onClear={() => {
            setPaymentFilters(EMPTY_PAYMENT_HIST_FILTERS);
            setPaymentDraft(EMPTY_PAYMENT_HIST_FILTERS);
          }}
          onDownloadPdf={(pv) => {
            downloadPvBreakdownPdf(pv, portalPayee, myReceiptScans);
            toast("Payment voucher opened — use Print → Save as PDF", "success");
          }}
          onDownloadCsv={(pv) => {
            downloadPvBreakdownCsv(pv, portalPayee);
            toast("Payment voucher Excel downloaded", "success");
          }}
        />
      )}
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
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = dateOptions.find((o) => o.key === value)?.label;
  const selected = dateFromKey(value);
  const navBounds = useMemo(
    () => calendarNavBounds(dateOptions, defaultMonth),
    [dateOptions, defaultMonth],
  );
  const [viewMonth, setViewMonth] = useState(selected ?? defaultMonth);

  useEffect(() => {
    if (open) setViewMonth(selected ?? defaultMonth);
  }, [open, selected, defaultMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={
        compact ? "iz-hist-date-picker-wrap iz-field !mb-0" : "iz-hist-date-picker-wrap iz-field"
      }
    >
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
          {value ? (selectedLabel ?? value) : compact ? "Any date" : "Tap to choose a date"}
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
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`}
          />
        )}
      </button>
      {open && (
        <div className="iz-hist-cal iz-hist-cal--popover">
          <HistDateCalendar
            selected={selected}
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            navBounds={navBounds}
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
  onRemove,
}: {
  filters: HistFilters;
  onRemove: (key: keyof HistFilters) => void;
}) {
  const chips: { key: keyof HistFilters; label: string }[] = [];
  const wages = parseFilterNum(filters.wages);
  if (wages !== null) chips.push({ key: "wages", label: `Wages: ${formatRM(wages)}` });
  const sales = parseFilterNum(filters.sales);
  if (sales !== null) chips.push({ key: "sales", label: `Sales: ${formatRM(sales)}` });
  const others = parseFilterNum(filters.others);
  if (others !== null) chips.push({ key: "others", label: `Others: ${formatRM(others)}` });
  const drinks = parseFilterNum(filters.drinks);
  if (drinks !== null) chips.push({ key: "drinks", label: `Drinks: ${formatRM(drinks)}` });

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="iz-hist-chip"
          onClick={() => onRemove(chip.key)}
        >
          {chip.label}
          <X className="h-3 w-3 opacity-70" />
        </button>
      ))}
    </div>
  );
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
  const pillVariant =
    row.pill === "green"
      ? "green"
      : row.pill === "red"
        ? "red"
        : row.pill === "amber"
          ? "amber"
          : "ink";
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
          <IzPill variant={pillVariant}>{shiftHistoryStatusLabel(row.st)}</IzPill>
          <div className="font-sora iz-ledger mt-2 text-base font-extrabold text-[var(--iz-gold-l)]">
            {formatRM(row.sales)}
          </div>
          <div className="iz-tiny iz-muted2">total payout</div>
        </div>
      </div>

      <div className="iz-hist-shift-card-metrics mt-3">
        <div className="iz-hist-shift-metric">
          <LabelWithIcon label="Wages" className="l" />
          <span className="v text-[var(--iz-gold-l)]">{formatRM(row.wages)}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <LabelWithIcon label="Drinks" className="l" />
          <span className="v">{formatRM(row.drinks)}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <LabelWithIcon label="Tips" className="l" />
          <span className="v">{formatRM(row.tips)}</span>
        </div>
        <div className="iz-hist-shift-metric">
          <LabelWithIcon label="Others" className="l" />
          <span className="v">{formatRM(row.others)}</span>
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
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "Any";

  return (
    <div ref={rootRef} className={`iz-hist-custom-select${compact ? " compact" : ""}`}>
      <label className={compact ? "!text-[10px]" : undefined}>
        <LabelWithIcon label={label} as="span" />
      </label>
      <button
        type="button"
        className={`iz-hist-select-trigger${compact ? " sm" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={value ? "" : "iz-muted2"}>{current}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`}
        />
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

function PaymentHistorySection({
  vouchers,
  hasAnyPayments,
  filters,
  setFilters,
  filterCount,
  paymentDraft,
  setPaymentDraft,
  paymentFilterOpen,
  setPaymentFilterOpen,
  paymentOutlets,
  paymentDateOptions,
  paymentDefaultMonth,
  onClear,
  onDownloadPdf,
  onDownloadCsv,
}: {
  vouchers: PrPaymentVoucher[];
  hasAnyPayments: boolean;
  filters: PaymentHistFilters;
  setFilters: Dispatch<SetStateAction<PaymentHistFilters>>;
  filterCount: number;
  paymentDraft: PaymentHistFilters;
  setPaymentDraft: Dispatch<SetStateAction<PaymentHistFilters>>;
  paymentFilterOpen: boolean;
  setPaymentFilterOpen: (v: boolean) => void;
  paymentOutlets: string[];
  paymentDateOptions: { key: string; label: string }[];
  paymentDefaultMonth: Date;
  onClear: () => void;
  onDownloadPdf: (pv: PrPaymentVoucher) => void;
  onDownloadCsv: (pv: PrPaymentVoucher) => void;
}) {
  return (
    <>
      <div className="iz-between mb-2.5 mt-4">
        <IzSectionLabel className="!m-0">Payment history</IzSectionLabel>
        <button
          type="button"
          className="iz-btn iz-btn-soft iz-btn-sm relative -mt-2"
          onClick={() => {
            setPaymentDraft(filters);
            setPaymentFilterOpen(true);
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

      <div className="iz-hist-search mb-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        <input
          type="search"
          placeholder="Search PV ID, outlet, week, bank ref…"
          value={filters.query}
          onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
          aria-label="Search payment history"
        />
        {filters.query && (
          <button
            type="button"
            className="iz-hist-clear"
            aria-label="Clear search"
            onClick={() => setFilters((p) => ({ ...p, query: "" }))}
          >
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
          options={[
            { value: "", label: "Any outlet" },
            ...paymentOutlets.map((v) => ({ value: v, label: v })),
          ]}
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
          dateOptions={paymentDateOptions}
          defaultMonth={paymentDefaultMonth}
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
              Date: {paymentDateOptions.find((o) => o.key === filters.date)?.label ?? filters.date}
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
          {filters.outlet && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, outlet: "" }))}
            >
              Outlet: {filters.outlet}
              <X className="h-3 w-3" />
            </button>
          )}
          {filters.status && (
            <button
              type="button"
              className="iz-hist-chip"
              onClick={() => setFilters((p) => ({ ...p, status: "" }))}
            >
              Status:{" "}
              {PAYMENT_HIST_STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ??
                filters.status}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            className="iz-tiny font-semibold text-[var(--iz-gold-l)]"
            onClick={onClear}
          >
            Clear all filters
          </button>
        </div>
      )}

      {vouchers.length === 0 ? (
        <IzCard flat className="mt-4 px-4 py-8 text-center">
          <p className="text-sm font-semibold">
            {hasAnyPayments ? "No payments match your filters." : "No payments yet"}
          </p>
          {!hasAnyPayments && (
            <Link to="/host/PaymentVoucher" className="iz-btn iz-btn-soft mt-3">
              Open Payment
            </Link>
          )}
        </IzCard>
      ) : (
        <PrPaymentHistoryPanel
          vouchers={vouchers}
          hideHeader
          statusFilter={filters.status}
          onStatusFilterChange={(status) => setFilters((p) => ({ ...p, status }))}
          onDownloadPdf={onDownloadPdf}
          onDownloadCsv={onDownloadCsv}
        />
      )}

      <IzSheet open={paymentFilterOpen} onClose={() => setPaymentFilterOpen(false)}>
        <IzCardTitle>Filter payment history</IzCardTitle>
        <div className="space-y-3">
          <PvDateTimeFilter
            date={paymentDraft.date}
            timeFrom={paymentDraft.timeFrom}
            timeTo={paymentDraft.timeTo}
            onDateChange={(date) =>
              setPaymentDraft((p) => ({
                ...p,
                date,
                ...(!date ? { timeFrom: "", timeTo: "" } : {}),
              }))
            }
            onTimeFromChange={(timeFrom) => setPaymentDraft((p) => ({ ...p, timeFrom }))}
            onTimeToChange={(timeTo) => setPaymentDraft((p) => ({ ...p, timeTo }))}
            dateOptions={paymentDateOptions}
            defaultMonth={paymentDefaultMonth}
          />
          <GenericSelectField
            label="Outlet"
            value={paymentDraft.outlet}
            onChange={(outlet) => setPaymentDraft((p) => ({ ...p, outlet }))}
            options={[
              { value: "", label: "Any outlet" },
              ...paymentOutlets.map((v) => ({ value: v, label: v })),
            ]}
          />
          <PaymentHistStatusChips
            showLabel
            value={paymentDraft.status}
            onChange={(status) => setPaymentDraft((p) => ({ ...p, status }))}
          />
          <FilterNumberInput
            label="Net paid (RM)"
            placeholder="e.g. 898"
            value={paymentDraft.net}
            onChange={(v) => setPaymentDraft((p) => ({ ...p, net: v }))}
          />
        </div>
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-4"
          onClick={() => {
            setFilters(paymentDraft);
            setPaymentFilterOpen(false);
          }}
        >
          Apply filters
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2.5"
          onClick={() => {
            onClear();
            setPaymentFilterOpen(false);
          }}
        >
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
    </div>
  );
}

function HistRecordsFilterBar({
  searchPlaceholder,
  searchAriaLabel,
  query,
  onQueryChange,
  outletValue,
  onOutletChange,
  outletOptions,
  statusValue,
  onStatusChange,
  statusOptions,
  date,
  timeFrom,
  timeTo,
  onDateChange,
  onTimeFromChange,
  onTimeToChange,
  dateOptions,
  defaultMonth,
}: {
  searchPlaceholder: string;
  searchAriaLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  outletValue: string;
  onOutletChange: (value: string) => void;
  outletOptions: { value: string; label: string }[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  date: string;
  timeFrom: string;
  timeTo: string;
  onDateChange: (value: string) => void;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
  dateOptions: { key: string; label: string }[];
  defaultMonth: Date;
}) {
  return (
    <>
      <div className="iz-hist-search mb-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label={searchAriaLabel}
        />
        {query && (
          <button
            type="button"
            className="iz-hist-clear"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="iz-grid2 mb-2.5">
        <GenericSelectField
          label="Outlet"
          compact
          value={outletValue}
          onChange={onOutletChange}
          options={outletOptions}
        />
        <GenericSelectField
          label="Status"
          compact
          value={statusValue}
          onChange={onStatusChange}
          options={statusOptions}
        />
      </div>

      <div className="mb-2.5">
        <PvDateTimeFilter
          compact
          date={date}
          timeFrom={timeFrom}
          timeTo={timeTo}
          onDateChange={onDateChange}
          onTimeFromChange={onTimeFromChange}
          onTimeToChange={onTimeToChange}
          dateOptions={dateOptions}
          defaultMonth={defaultMonth}
        />
      </div>
    </>
  );
}

function HistInlineFilterChips({
  date,
  timeFrom,
  timeTo,
  dateOptions,
  outlet,
  statusLabel,
  onClearDate,
  onClearTimeFrom,
  onClearTimeTo,
  onClearOutlet,
  onClearStatus,
  onClearAll,
  hideClearAll,
}: {
  date: string;
  timeFrom: string;
  timeTo: string;
  dateOptions: { key: string; label: string }[];
  outlet?: string;
  statusLabel?: string;
  onClearDate: () => void;
  onClearTimeFrom: () => void;
  onClearTimeTo: () => void;
  onClearOutlet?: () => void;
  onClearStatus?: () => void;
  onClearAll: () => void;
  hideClearAll?: boolean;
}) {
  const hasChip = date || (date && timeFrom) || (date && timeTo) || outlet || statusLabel;
  if (!hasChip && hideClearAll) return null;

  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-2">
      {date && (
        <button type="button" className="iz-hist-chip" onClick={onClearDate}>
          Date: {dateOptions.find((o) => o.key === date)?.label ?? date}
          <X className="h-3 w-3" />
        </button>
      )}
      {date && timeFrom && (
        <button type="button" className="iz-hist-chip" onClick={onClearTimeFrom}>
          From {timeFrom}
          <X className="h-3 w-3" />
        </button>
      )}
      {date && timeTo && (
        <button type="button" className="iz-hist-chip" onClick={onClearTimeTo}>
          To {timeTo}
          <X className="h-3 w-3" />
        </button>
      )}
      {outlet && onClearOutlet && (
        <button type="button" className="iz-hist-chip" onClick={onClearOutlet}>
          Outlet: {outlet}
          <X className="h-3 w-3" />
        </button>
      )}
      {statusLabel && onClearStatus && (
        <button type="button" className="iz-hist-chip" onClick={onClearStatus}>
          Status: {statusLabel}
          <X className="h-3 w-3" />
        </button>
      )}
      {!hideClearAll && (
        <button
          type="button"
          className="iz-tiny font-semibold text-[var(--iz-gold-l)]"
          onClick={onClearAll}
        >
          Clear all filters
        </button>
      )}
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
  highlightPvId,
}: {
  lines: PvLineRecord[];
  scans: PrReceiptScan[];
  vouchers: PrPaymentVoucher[];
  onDownloadPdf: (pv: PrPaymentVoucher) => void;
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
        <IzSectionLabel className="!m-0">PV line breakdown</IzSectionLabel>
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
          <button
            type="button"
            className="iz-hist-clear"
            aria-label="Clear search"
            onClick={() => setFilters((p) => ({ ...p, query: "" }))}
          >
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
          options={[
            { value: "", label: "Any PV" },
            ...pvIds.map((id) => ({ value: id, label: id })),
          ]}
        />
        <GenericSelectField
          label="Outlet"
          compact
          value={filters.outlet}
          onChange={(outlet) => setFilters((p) => ({ ...p, outlet }))}
          options={[
            { value: "", label: "Any outlet" },
            ...pvOutlets.map((v) => ({ value: v, label: v })),
          ]}
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
          <button
            type="button"
            className="iz-tiny font-semibold text-[var(--iz-gold-l)]"
            onClick={onClear}
          >
            Clear all filters
          </button>
        </div>
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
                <tr
                  key={line.key}
                  className={highlightPvId === line.pvId ? "bg-[rgba(232,194,122,.08)]" : undefined}
                >
                  <td>
                    <div className="font-semibold">{line.pvId}</div>
                    <div className="iz-tiny iz-muted2">{line.cycle}</div>
                  </td>
                  <td>{line.date}</td>
                  <td>{line.outlet}</td>
                  <td>{line.desc}</td>
                  <td>
                    <IzPill
                      variant={
                        line.ref === "Disputed" ? "red" : line.ref === "Tap log" ? "amber" : "ink"
                      }
                    >
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
                        if (!scan)
                          return (
                            <div key={rid} className="iz-tiny">
                              {rid}
                            </div>
                          );
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
                        line.pvStatus === "PAID"
                          ? "green"
                          : line.pvStatus === "DISPUTED"
                            ? "red"
                            : line.pvStatus === "SENT"
                              ? "amber"
                              : "green"
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
        Sign or dispute PV
      </Link>

      <IzSheet open={pvFilterOpen} onClose={() => setPvFilterOpen(false)}>
        <IzCardTitle>Filter PV lines</IzCardTitle>
        <div className="space-y-3">
          <GenericSelectField
            label="PV"
            value={pvDraft.pvId}
            onChange={(pvId) => setPvDraft((p) => ({ ...p, pvId }))}
            options={[
              { value: "", label: "Any PV" },
              ...pvIds.map((id) => ({ value: id, label: id })),
            ]}
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
            options={[
              { value: "", label: "Any outlet" },
              ...pvOutlets.map((v) => ({ value: v, label: v })),
            ]}
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
            options={[
              { value: "", label: "Any ref" },
              ...pvRefs.map((r) => ({ value: r, label: r })),
            ]}
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
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2.5"
          onClick={() => {
            onClear();
            setPvFilterOpen(false);
          }}
        >
          Clear & close
        </button>
      </IzSheet>
    </>
  );
}
