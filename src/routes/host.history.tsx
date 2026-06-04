import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AppTopbar } from "@/components/Nav";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  HIST_ROWS,
  PAYROLL_CYCLE,
  flattenPvLines,
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
} from "@/lib/pr-demo";
import { downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { Calendar, ChevronDown, Download, Filter, Receipt, Search, Table2, X } from "lucide-react";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

type HistTab = "shifts" | "receipts" | "pv";

export const Route = createFileRoute("/host/history")({
  validateSearch: (search: Record<string, unknown>): { tab: HistTab } => {
    const tab = search.tab;
    if (tab === "receipts" || tab === "pv") return { tab };
    return { tab: "shifts" };
  },
  component: HistoryPage,
});
type HistFilters = {
  query: string;
  date: string;
  venue: string;
  wages: string;
  sales: string;
  tables: string;
  drinks: string;
};

const EMPTY_FILTERS: HistFilters = {
  query: "",
  date: "",
  venue: "",
  wages: "",
  sales: "",
  tables: "",
  drinks: "",
};

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

const HIST_DATE_OPTIONS = [...new Map(HIST_ROWS.map((r) => [dateKey(r.d), r.d])).entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, d]) => ({ key, label: fmtHistDate(d[0], d[1], d[2]) }));

const HIST_VENUES = [...new Set(HIST_ROWS.map((r) => r.venue))].sort();
const HIST_DEFAULT_MONTH = dateFromKey(HIST_DATE_OPTIONS[HIST_DATE_OPTIONS.length - 1]?.key ?? "") ?? new Date(2026, 4, 1);

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

function activeFilterCount(filters: HistFilters) {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.date) n++;
  if (filters.venue) n++;
  if (parseFilterNum(filters.wages) !== null) n++;
  if (parseFilterNum(filters.sales) !== null) n++;
  if (parseFilterNum(filters.tables) !== null) n++;
  if (parseFilterNum(filters.drinks) !== null) n++;
  return n;
}

type ReceiptFilters = {
  query: string;
  date: string;
  outlet: string;
  category: ReceiptItemCategory | "";
  status: ReceiptScanStatus | "";
  commission: string;
};

const EMPTY_RECEIPT_FILTERS: ReceiptFilters = {
  query: "",
  date: "",
  outlet: "",
  category: "",
  status: "",
  commission: "",
};

type PvFilters = {
  query: string;
  pvId: string;
  date: string;
  outlet: string;
  status: string;
  ref: string;
};

const EMPTY_PV_FILTERS: PvFilters = {
  query: "",
  pvId: "",
  date: "",
  outlet: "",
  status: "",
  ref: "",
};

function receiptSearchBlob(scan: PrReceiptScan) {
  const [y, m, d] = scan.date;
  return [
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

function matchesPvFilters(line: PvLineRecord, filters: PvFilters) {
  if (filters.query.trim() && !pvSearchBlob(line).includes(filters.query.trim().toLowerCase())) return false;
  if (filters.pvId && line.pvId !== filters.pvId) return false;
  if (filters.date && !line.date.toLowerCase().includes(filters.date.toLowerCase())) return false;
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
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const prSubRole = useStore((s) => s.prSubRole);
  const isFreelancer = prSubRole === "pr_free";
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const toast = useStore((s) => s.toast);
  const profile = getPrProfile(prSubRole);
  const [filters, setFilters] = useState<HistFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<HistFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [receiptFilterOpen, setReceiptFilterOpen] = useState(false);

  const [pvFilters, setPvFilters] = useState<PvFilters>(EMPTY_PV_FILTERS);
  const [pvDraft, setPvDraft] = useState<PvFilters>(EMPTY_PV_FILTERS);
  const [pvFilterOpen, setPvFilterOpen] = useState(false);

  const receiptOutlets = useMemo(
    () => [...new Set(prReceiptScans.map((s) => s.outlet))].sort(),
    [prReceiptScans],
  );
  const receiptDateOptions = useMemo(
    () =>
      [...new Map(prReceiptScans.map((s) => [dateKey(s.date), s.date])).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, d]) => ({ key, label: fmtHistDate(d[0], d[1], d[2]) })),
    [prReceiptScans],
  );
  const pvLines = useMemo(
    () => flattenPvLines(prPaymentVouchers, prReceiptScans),
    [prPaymentVouchers, prReceiptScans],
  );
  const pvIds = useMemo(() => [...new Set(pvLines.map((l) => l.pvId))], [pvLines]);
  const pvOutlets = useMemo(() => [...new Set(pvLines.map((l) => l.outlet))].sort(), [pvLines]);
  const pvRefs = useMemo(() => [...new Set(pvLines.map((l) => l.ref))].sort(), [pvLines]);

  const setTab = (next: HistTab) => navigate({ to: "/host/history", search: { tab: next } });

  const lifetimeEarnings = prPaymentVouchers
    .filter((p) => p.status === "PAID" || p.status === "SIGNED")
    .reduce((sum, p) => sum + p.net, 0);
  const paidThisCycle = prPaymentVouchers
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.net, 0);
  const pendingPv = prPaymentVouchers
    .filter((p) => pvNeedsPrReview(p.status))
    .reduce((sum, p) => sum + p.net, 0);

  const filteredRows = useMemo(
    () => HIST_ROWS.filter((row) => matchesFilters(row, filters)).slice().reverse(),
    [filters],
  );

  const filteredReceipts = useMemo(
    () => prReceiptScans.filter((s) => matchesReceiptFilters(s, receiptFilters)),
    [prReceiptScans, receiptFilters],
  );

  const filteredPvLines = useMemo(
    () => pvLines.filter((l) => matchesPvFilters(l, pvFilters)),
    [pvLines, pvFilters],
  );

  const filterCount = activeFilterCount(filters);
  const receiptFilterCountN = receiptFilterCount(receiptFilters);
  const pvFilterCountN = pvFilterCount(pvFilters);

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

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">History</h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {isFreelancer
          ? "Track sealed shifts here. Tell any PR agency on InnocenZ to run payroll ? then sign PVs under Vouchers."
          : "Earnings from sealed shifts auto-route to your agency. Sign PVs under Vouchers to get paid."}
      </p>

      {isFreelancer && (
        <div className="mt-2.5">
          <FreelancerPayrollNotice compact />
        </div>
      )}

      <IzCard glow className="mt-3">
        <div className="iz-grid3">
          <div>
            <div className="iz-tiny iz-muted2 tracking-widest">LIFETIME EARNINGS</div>
            <div className="font-sora iz-ledger mt-1 text-lg font-extrabold text-[var(--iz-gold-l)]">
              {formatRM(lifetimeEarnings)}
            </div>
          </div>
          <div>
            <div className="iz-tiny iz-muted2 tracking-widest">PAID THIS CYCLE</div>
            <div className="font-sora iz-ledger mt-1 text-lg font-extrabold">{formatRM(paidThisCycle)}</div>
          </div>
          <div>
            <div className="iz-tiny iz-muted2 tracking-widest">PENDING PV</div>
            <div className="font-sora iz-ledger mt-1 text-lg font-extrabold text-[var(--iz-amber)]">
              {formatRM(pendingPv)}
            </div>
          </div>
        </div>
      </IzCard>

      <IzCard flat className="iz-tiny iz-muted mt-0">
        Funds move Outlet → Agency → your bank once PV is dual-signed. Status updates appear here and under Vouchers.
      </IzCard>

      <div className="iz-hist-tabs mt-4">
        <button type="button" className={tab === "shifts" ? "active" : ""} onClick={() => setTab("shifts")}>
          Shifts
        </button>
        <button type="button" className={tab === "receipts" ? "active" : ""} onClick={() => setTab("receipts")}>
          <Receipt className="mr-1 inline h-3.5 w-3.5" />
          Receipt scans
        </button>
        <button type="button" className={tab === "pv" ? "active" : ""} onClick={() => setTab("pv")}>
          <Table2 className="mr-1 inline h-3.5 w-3.5" />
          PV breakdown
        </button>
      </div>

      {tab === "shifts" && (
        <>
      <div className="iz-between mb-2.5 mt-4">
        <div className="iz-sect-label !m-0">Shift history</div>
        <button
          type="button"
          className="iz-btn iz-btn-soft iz-btn-sm relative -mt-2"
          onClick={openFilters}
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

      <div className="iz-grid2 mb-2.5">
        <DatePickerField value={filters.date} onChange={(date) => setFilters((prev) => ({ ...prev, date }))} compact />
        <VenueSelectField value={filters.venue} onChange={(venue) => setFilters((prev) => ({ ...prev, venue }))} compact />
      </div>

      {filterCount > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <FilterChips
            filters={filters}
            onRemove={(key) => setFilters((prev) => ({ ...prev, [key]: "" }))}
          />
          <button type="button" className="iz-tiny font-semibold text-[var(--iz-gold-l)]" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <IzCard flat className="py-8 text-center">
          <p className="iz-sm iz-muted">No shifts match your search.</p>
          <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mx-auto mt-3 w-auto" onClick={clearFilters}>
            Reset filters
          </button>
        </IzCard>
      ) : (
        <div className="space-y-2.5">
          {filteredRows.map((row) => (
            <HistShiftCard key={`${row.d.join("-")}-${row.venue}`} row={row} />
          ))}
        </div>
      )}

      <IzSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="iz-cardttl">Filter shift history</div>
        <p className="iz-tiny iz-muted mb-3">Narrow by date, venue, or numeric fields. All filters combine (AND).</p>

        <div className="space-y-3">
          <DatePickerField value={draft.date} onChange={(date) => setDraft((prev) => ({ ...prev, date }))} />
          <VenueSelectField value={draft.venue} onChange={(venue) => setDraft((prev) => ({ ...prev, venue }))} />
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
          onClear={() => {
            setReceiptFilters(EMPTY_RECEIPT_FILTERS);
            setReceiptDraft(EMPTY_RECEIPT_FILTERS);
          }}
        />
      )}

      {tab === "pv" && (
        <PvBreakdownSection
          lines={filteredPvLines}
          scans={prReceiptScans}
          vouchers={prPaymentVouchers}
          onDownloadPdf={(pv) => {
            downloadPvBreakdownPdf(pv, profile, prReceiptScans);
            toast("PV breakdown opened — use Print → Save as PDF", "success");
          }}
          filters={pvFilters}
          setFilters={setPvFilters}
          filterCount={pvFilterCountN}
          pvDraft={pvDraft}
          setPvDraft={setPvDraft}
          pvFilterOpen={pvFilterOpen}
          setPvFilterOpen={setPvFilterOpen}
          pvIds={pvIds}
          pvOutlets={pvOutlets}
          pvRefs={pvRefs}
          onClear={() => {
            setPvFilters(EMPTY_PV_FILTERS);
            setPvDraft(EMPTY_PV_FILTERS);
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
  dateOptions = HIST_DATE_OPTIONS,
  defaultMonth = HIST_DEFAULT_MONTH,
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
          <CalendarUi
            mode="single"
            selected={selected}
            defaultMonth={selected ?? defaultMonth}
            onSelect={(d) => {
              if (d) onChange(keyFromDate(d));
              setOpen(false);
            }}
            disabled={(date) => !allowedKeys.has(keyFromDate(date))}
            className="rounded-[14px] border-0 bg-transparent p-0 text-[var(--iz-txt)]"
          />
          <p className="iz-tiny iz-muted2 mt-1 px-1">Only dates with records are selectable.</p>
        </div>
      )}
    </div>
  );
}

function VenueSelectField({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
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

  const options = [{ value: "", label: compact ? "Any venue" : "Any venue" }, ...HIST_VENUES.map((v) => ({ value: v, label: v }))];
  const current = options.find((o) => o.value === value)?.label ?? "Any venue";

  return (
    <div ref={rootRef} className={`iz-hist-custom-select${compact ? " compact" : ""}`}>
      <label className={compact ? "!text-[10px]" : undefined}>Venue</label>
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
  if (filters.date) {
    const opt = HIST_DATE_OPTIONS.find((o) => o.key === filters.date);
    chips.push({ key: "date", label: `Date: ${opt?.label ?? filters.date}` });
  }
  if (filters.venue) chips.push({ key: "venue", label: `Venue: ${filters.venue}` });
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

function HistShiftCard({ row }: { row: HistRow }) {
  const [y, m, d] = row.d;
  const pillVariant = row.pill === "green" ? "green" : row.pill === "red" ? "red" : row.pill === "amber" ? "amber" : "ink";

  return (
    <IzCard className="mb-0">
      <div className="iz-between">
        <div>
          <div className="font-sora text-[15px] font-bold">{row.venue}</div>
          <div className="iz-tiny iz-muted mt-0.5">
            <Calendar className="mr-1 inline h-2.5 w-2.5" />
            {fmtHistDate(y, m, d)}
          </div>
        </div>
        <IzPill variant={pillVariant}>{row.st}</IzPill>
      </div>

      <div className="iz-grid2 mt-3">
        <div className="iz-stat-tile !mb-0 !py-3">
          <div className="iz-tiny iz-muted2 tracking-wide">Daily wages</div>
          <div className="font-sora iz-ledger mt-1 text-base font-extrabold text-[var(--iz-gold-l)]">
            {formatRM(row.wages)}
          </div>
        </div>
        <div className="iz-stat-tile !mb-0 !py-3">
          <div className="iz-tiny iz-muted2 tracking-wide">Total sales</div>
          <div className="font-sora iz-ledger mt-1 text-base font-extrabold">{formatRM(row.sales)}</div>
        </div>
      </div>

      <div className="iz-hist-metrics mt-2.5">
        <span>
          <b>Tables</b> {formatRM(row.table)}
        </span>
        <span>
          <b>Drinks</b> {row.drinks}
        </span>
        <span>
          <b>Tips</b> {formatRM(row.tips)}
        </span>
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
        <DatePickerField
          value={filters.date}
          onChange={(date) => setFilters((p) => ({ ...p, date }))}
          compact
          dateOptions={receiptDateOptions}
          defaultMonth={receiptDefaultMonth}
        />
        <GenericSelectField
          label="Outlet"
          compact
          value={filters.outlet}
          onChange={(outlet) => setFilters((p) => ({ ...p, outlet }))}
          options={[{ value: "", label: "Any outlet" }, ...receiptOutlets.map((v) => ({ value: v, label: v }))]}
        />
      </div>

      {filterCount > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
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
                return (
                  <tr key={scan.id}>
                    <td>
                      <div className="font-semibold">{fmtHistDate(y, m, d)}</div>
                      <div className="iz-tiny iz-muted2">{scan.id}</div>
                      <div className="iz-tiny iz-muted2">{scan.scannedAt}</div>
                    </td>
                    <td className="max-w-[130px]">
                      <div className="font-sora text-[12px] font-bold text-[var(--iz-gold-l)]">
                        {receiptBelongsToPvLabel(scan)}
                      </div>
                      {scan.shiftSessionId && (
                        <div className="iz-tiny iz-muted2 mt-0.5">{scan.shiftSessionId}</div>
                      )}
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
          <DatePickerField
            value={receiptDraft.date}
            onChange={(date) => setReceiptDraft((p) => ({ ...p, date }))}
            dateOptions={receiptDateOptions}
            defaultMonth={receiptDefaultMonth}
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
  onClear,
}: {
  lines: PvLineRecord[];
  scans: PrReceiptScan[];
  vouchers: PrPaymentVoucher[];
  onDownloadPdf: (pv: PrPaymentVoucher) => void;
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

      {filterCount > 0 && (
        <div className="mb-2.5">
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
                <tr key={line.key}>
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

      <Link to="/host/wallet" className="iz-btn iz-btn-soft mt-3">
        Open Payment Vouchers
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
          <FilterNumberInput
            label="Line date contains"
            placeholder="e.g. 27 Apr"
            value={pvDraft.date}
            onChange={(v) => setPvDraft((p) => ({ ...p, date: v }))}
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
