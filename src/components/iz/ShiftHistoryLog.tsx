import { useEffect, useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import {
  aggregateShiftHistoryByPr,
  aggregateShiftHistoryByVenue,
  sortShiftHistoryDesc,
  sumShiftHistoryVenueRollups,
  type ShiftHistoryPrRollup,
  type ShiftHistoryRow,
} from "@/lib/shift-history-utils";
import { calendarNavBounds, HistDateCalendar } from "@/components/iz/HistDateCalendar";
import { IzCard, formatRM } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import type { ReactNode } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Download, X } from "lucide-react";

type Portal = "agency" | "outlet";

export function ShiftHistoryLog({
  portal,
  rows = [],
  onExport,
  subtitle: subtitleOverride,
}: {
  portal: Portal;
  rows?: ShiftHistoryRow[];
  onExport?: () => void;
  subtitle?: string;
}) {
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [thirdFilter, setThirdFilter] = useState("");
  const [detailPrId, setDetailPrId] = useState<string | null>(null);

  const prNames = useMemo(() => [...new Set(rows.map((r) => r.prName))].sort(), [rows]);
  const dates = useMemo(() => [...new Set(rows.map((r) => r.dateIso))].sort().reverse(), [rows]);
  const dateOptions = useMemo(
    () =>
      dates.map((d) => {
        const row = rows.find((r) => r.dateIso === d);
        return { key: d, label: row?.dateDisplay ?? d };
      }),
    [dates, rows],
  );
  const thirdOptions = useMemo(() => {
    if (portal === "agency") {
      return [...new Set(rows.map((r) => r.outlet))].sort();
    }
    return [...new Set(rows.map((r) => r.agencyName))].sort();
  }, [rows, portal]);

  const filtered = useMemo(() => {
    const matched = rows.filter((r) => {
      if (nameFilter && r.prId !== nameFilter) return false;
      if (dateFilter && r.dateIso !== dateFilter) return false;
      if (thirdFilter) {
        if (portal === "agency" && r.outlet !== thirdFilter) return false;
        if (portal === "outlet" && r.agencyName !== thirdFilter) return false;
      }
      return true;
    });
    return sortShiftHistoryDesc(matched);
  }, [rows, nameFilter, dateFilter, thirdFilter, portal]);

  const subtitle =
    subtitleOverride ??
    (portal === "agency"
      ? "Transaction log — one row per PR with totals across the filtered shifts. Tap for outlet breakdown."
      : "Transaction log — one row per PR with totals across the filtered shifts.");

  const thirdLabel = portal === "agency" ? "OUTLET" : "PR AGENCY";
  const venueLabel = portal === "agency" ? "outlet" : "agency";
  const showPrDetail = portal === "agency";

  const prRollups = useMemo(
    () => aggregateShiftHistoryByPr(filtered, portal),
    [filtered, portal],
  );

  const detailPrRows = useMemo(
    () => (detailPrId ? filtered.filter((r) => r.prId === detailPrId) : []),
    [detailPrId, filtered],
  );
  const detailPr = useMemo(
    () => prRollups.find((p) => p.prId === detailPrId) ?? null,
    [prRollups, detailPrId],
  );
  const detailVenueRollups = useMemo(
    () => aggregateShiftHistoryByVenue(detailPrRows, portal),
    [detailPrRows, portal],
  );
  const detailTotals = useMemo(
    () => sumShiftHistoryVenueRollups(detailVenueRollups),
    [detailVenueRollups],
  );

  return (
    <div className="iz-screen">
      {portal === "agency" && (
        <AppTopbar backTo="/agency" backLabel="Agency home" />
      )}
      <p className="iz-tiny iz-muted2 uppercase tracking-widest">InnocenZ · {portal === "agency" ? "Agency" : "Outlet"}</p>
      <h2 className="font-sora mx-0.5 mt-0.5 text-[22px] font-extrabold text-[var(--iz-txt)]">History</h2>
      <p className="iz-tiny iz-muted mt-0.5">{subtitle}</p>

      <p className="iz-txn-filter-heading mt-4">Filter by</p>
      <div className="iz-txn-filters">
        <HistSelectField
          label="NAME"
          value={nameFilter}
          onChange={setNameFilter}
          options={[
            { value: "", label: "All names" },
            ...prNames.map((n) => {
              const row = rows.find((r) => r.prName === n);
              return { value: row?.prId ?? n, label: n };
            }),
          ]}
        />
        <HistDatePickerField
          label="DATE"
          value={dateFilter}
          onChange={setDateFilter}
          dateOptions={dateOptions}
        />
        <HistSelectField
          label={thirdLabel}
          value={thirdFilter}
          onChange={setThirdFilter}
          options={[
            { value: "", label: portal === "agency" ? "All outlets" : "All agencies" },
            ...thirdOptions.map((o) => ({ value: o, label: o })),
          ]}
        />
      </div>

      <div className="iz-between mt-4">
        <div className="iz-sect-label !mb-0">Transaction log</div>
        <span className="iz-tiny iz-muted2">
          {prRollups.length} PR{prRollups.length !== 1 ? "s" : ""} · {filtered.length} shift
          {filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {portal === "agency" && onExport && (
        <button type="button" className="iz-btn iz-btn-soft mt-2 w-full !py-2 !text-xs" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Download Excel of filtered set
        </button>
      )}

      <div className="mt-2.5 space-y-2.5">
        {prRollups.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No records match these filters</p>
          </IzCard>
        ) : (
          prRollups.map((rollup) => (
            <PrHistoryCard
              key={rollup.prId}
              rollup={rollup}
              venueLabel={venueLabel}
              onTap={showPrDetail ? () => setDetailPrId(rollup.prId) : undefined}
            />
          ))
        )}
      </div>

      {showPrDetail && detailPr && (
        <IzSheet open wide onClose={() => setDetailPrId(null)}>
          <div className="iz-sheet-head">
            <div>
              <button
                type="button"
                className="iz-chip mb-2 !px-2 !py-1 !text-[10px]"
                onClick={() => setDetailPrId(null)}
              >
                ← Back to log
              </button>
              <p className="iz-tiny iz-muted2 uppercase">Earned breakdown by {venueLabel}</p>
              <h3>{detailPr.prName}</h3>
            </div>
            <button type="button" className="iz-sheet-close" onClick={() => setDetailPrId(null)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <IzCard flat className="!mb-3">
            <p className="iz-tiny iz-muted">
              {detailTotals.shiftCount} shift{detailTotals.shiftCount !== 1 ? "s" : ""} in filtered log
              {detailVenueRollups.length !== 1
                ? ` · ${detailVenueRollups.length} ${venueLabel}s`
                : detailVenueRollups[0]
                  ? ` · ${detailVenueRollups[0].venue}`
                  : ""}
            </p>
            <div className="iz-txn-card-metrics iz-txn-card-metrics--sheet mt-2">
              <div className="iz-txn-metric earned">
                <div className="label">Total earned</div>
                <div className="value iz-ledger">{formatRM(detailTotals.totalPayout)}</div>
              </div>
              <div className="iz-txn-metric">
                <div className="label">Total drinks</div>
                <div className="value">{detailTotals.totalDrinks}</div>
              </div>
              <div className="iz-txn-metric">
                <div className="label">Total tips</div>
                <div className="value iz-ledger">{formatRM(detailTotals.totalTips)}</div>
              </div>
              <div className="iz-txn-metric">
                <div className="label">Total tables</div>
                <div className="value">{detailTotals.totalTables}</div>
              </div>
            </div>
          </IzCard>

          <div className="space-y-2.5">
            {detailVenueRollups.map((rollup) => (
              <IzCard key={rollup.venue} flat>
                <div className="iz-between items-start gap-2">
                  <p className="font-sora text-sm font-bold">{rollup.venue}</p>
                  <span className="iz-tiny iz-muted2">
                    {rollup.shiftCount} shift{rollup.shiftCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="iz-txn-card-metrics iz-txn-card-metrics--sheet">
                  <div className="iz-txn-metric earned">
                    <div className="label">Earned</div>
                    <div className="value iz-ledger">{formatRM(rollup.totalPayout)}</div>
                  </div>
                  <div className="iz-txn-metric">
                    <div className="label">Drinks</div>
                    <div className="value">{rollup.totalDrinks}</div>
                  </div>
                  <div className="iz-txn-metric">
                    <div className="label">Tips</div>
                    <div className="value iz-ledger">{formatRM(rollup.totalTips)}</div>
                  </div>
                  <div className="iz-txn-metric">
                    <div className="label">Tables</div>
                    <div className="value">{rollup.totalTables}</div>
                  </div>
                </div>
              </IzCard>
            ))}
          </div>

          <p className="iz-tiny iz-muted2 mt-3 text-center">Read-only · mirrored to outlet portal</p>
        </IzSheet>
      )}
    </div>
  );
}

function PrHistoryCard({
  rollup,
  venueLabel,
  onTap,
}: {
  rollup: ShiftHistoryPrRollup;
  venueLabel: string;
  onTap?: () => void;
}) {
  const venueSummary =
    rollup.venues.length <= 2
      ? rollup.venues.join(" · ")
      : `${rollup.venues.length} ${venueLabel}s`;

  const body = (
    <>
      <div className="iz-between items-start gap-2">
        <div className="font-sora text-[16px] font-bold">{rollup.prName}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="text-right">
            <div className="font-sora text-sm font-bold text-[var(--iz-gold-l)]">
              {rollup.shiftCount} shift{rollup.shiftCount !== 1 ? "s" : ""}
            </div>
            <p className="iz-tiny iz-muted2">Latest {rollup.latestDateDisplay}</p>
          </div>
          {onTap && <ChevronRight className="h-4 w-4 text-[var(--iz-muted)]" aria-hidden />}
        </div>
      </div>
      <p className="iz-tiny iz-muted mt-0.5">{venueSummary}</p>
      <div className="iz-txn-card-metrics">
        <div className="iz-txn-metric earned">
          <div className="label">Total earned</div>
          <div className="value iz-ledger">{formatRM(rollup.totalPayout)}</div>
        </div>
        <div className="iz-txn-metric">
          <div className="label">Total drinks</div>
          <div className="value">{rollup.totalDrinks}</div>
        </div>
        <div className="iz-txn-metric">
          <div className="label">Total tips</div>
          <div className="value iz-ledger">{formatRM(rollup.totalTips)}</div>
        </div>
        <div className="iz-txn-metric">
          <div className="label">Total tables</div>
          <div className="value">{rollup.totalTables}</div>
        </div>
      </div>
    </>
  );

  if (onTap) {
    return (
      <button type="button" className="iz-txn-card-btn" onClick={onTap}>
        <IzCard flat className="!mb-0 w-full text-left transition-colors hover:border-[var(--iz-gold-d)]">
          {body}
        </IzCard>
      </button>
    );
  }

  return <IzCard>{body}</IzCard>;
}

function dateFromKey(key: string): Date | undefined {
  if (!key) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function keyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function HistDatePickerField({
  label,
  value,
  onChange,
  dateOptions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dateOptions: { key: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = dateOptions.find((o) => o.key === value)?.label;
  const selected = dateFromKey(value);
  const allowedKeys = new Set(dateOptions.map((o) => o.key));
  const defaultMonth = dateFromKey(dateOptions[dateOptions.length - 1]?.key ?? "") ?? new Date();
  const navBounds = useMemo(() => calendarNavBounds(dateOptions, defaultMonth), [dateOptions, defaultMonth]);
  const [viewMonth, setViewMonth] = useState(selected ?? defaultMonth);

  useEffect(() => {
    if (open) setViewMonth(selected ?? defaultMonth);
  }, [open, selected, defaultMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="iz-hist-custom-select compact">
      <label>{label}</label>
      <button
        type="button"
        className={`iz-hist-select-trigger sm${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose date"
      >
        <span className={`flex min-w-0 items-center gap-1.5 truncate${value ? "" : " iz-muted2"}`}>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold-l)]" />
          <span className="truncate">{value ? selectedLabel ?? value : "All dates"}</span>
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

function HistSelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: ReactNode;
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
    <div ref={rootRef} className="iz-hist-custom-select compact">
      <label>{label}</label>
      <button
        type="button"
        className={`iz-hist-select-trigger sm${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`flex min-w-0 items-center gap-1.5 truncate${value ? "" : " iz-muted2"}`}>
          {icon}
          <span className="truncate">{current}</span>
        </span>
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
