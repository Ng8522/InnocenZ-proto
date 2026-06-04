import { createFileRoute } from "@tanstack/react-router";
import { format, isValid, parse } from "date-fns";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { IzCard, IzSectionLabel, formatRM } from "@/components/iz/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ChevronDown, X } from "lucide-react";

const HISTORY_DATE_FMT = "d MMM yyyy";

function parseHistoryDate(value: string): Date | undefined {
  const d = parse(value, HISTORY_DATE_FMT, new Date());
  return isValid(d) ? d : undefined;
}

function formatHistoryDate(d: Date): string {
  return format(d, HISTORY_DATE_FMT);
}

export const Route = createFileRoute("/outlet/history")({
  component: OutletHistoryPage,
});

export type OutletTransactionRow = {
  id: string;
  date: string;
  outlet: string;
  prName: string;
  agency: string;
  totalPayout: number;
  totalDrinks: number;
  totalTips: number;
};

const TRANSACTION_HISTORY: OutletTransactionRow[] = [
  { id: "t1", date: "10 Jun 2026", outlet: "Velvet Room KL", prName: "Luna", agency: "Atlas Agency", totalPayout: 420, totalDrinks: 86, totalTips: 42 },
  { id: "t2", date: "10 Jun 2026", outlet: "Velvet Room KL", prName: "Mia", agency: "Atlas Agency", totalPayout: 385, totalDrinks: 72, totalTips: 38 },
  { id: "t3", date: "9 Jun 2026", outlet: "Velvet Room KL", prName: "Vivi", agency: "Starline Talent", totalPayout: 312, totalDrinks: 58, totalTips: 29 },
  { id: "t4", date: "9 Jun 2026", outlet: "Velvet Room KL", prName: "Yuki", agency: "Noir Collective", totalPayout: 298, totalDrinks: 51, totalTips: 24 },
  { id: "t5", date: "8 Jun 2026", outlet: "Velvet Room KL", prName: "Luna", agency: "Atlas Agency", totalPayout: 445, totalDrinks: 94, totalTips: 48 },
  { id: "t6", date: "7 Jun 2026", outlet: "Velvet Room KL", prName: "Cici", agency: "Starline Talent", totalPayout: 276, totalDrinks: 44, totalTips: 18 },
];

function OutletHistoryPage() {
  const [nameFilter, setNameFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [agencyFilter, setAgencyFilter] = useState("all");

  const prNames = useMemo(
    () => [...new Set(TRANSACTION_HISTORY.map((r) => r.prName))].sort(),
    [],
  );

  const agencies = useMemo(
    () => [...new Set(TRANSACTION_HISTORY.map((r) => r.agency))].sort(),
    [],
  );

  const dates = useMemo(() => {
    const unique = [...new Set(TRANSACTION_HISTORY.map((r) => r.date))];
    return unique.sort((a, b) => {
      const ta = parseHistoryDate(a)?.getTime() ?? 0;
      const tb = parseHistoryDate(b)?.getTime() ?? 0;
      return tb - ta;
    });
  }, []);

  const filtered = useMemo(() => {
    return TRANSACTION_HISTORY.filter((row) => {
      if (nameFilter !== "all" && row.prName !== nameFilter) return false;
      if (dateFilter !== "all" && row.date !== dateFilter) return false;
      if (agencyFilter !== "all" && row.agency !== agencyFilter) return false;
      return true;
    });
  }, [nameFilter, dateFilter, agencyFilter]);

  const hasFilters = nameFilter !== "all" || dateFilter !== "all" || agencyFilter !== "all";

  const clearFilters = () => {
    setNameFilter("all");
    setDateFilter("all");
    setAgencyFilter("all");
  };

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="History" />
      <p className="iz-tiny iz-muted -mt-1 mb-3 px-0.5">
        Transaction log for completed shifts — payout, drinks, and tips per PR.
      </p>

      <IzCard className="!mb-3 !py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
            Filter by
          </span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="iz-chip flex items-center gap-1 px-2 py-0.5 text-[10px]">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-3">
          <HistoryFilterSelect
            label="Name"
            value={nameFilter}
            onValueChange={setNameFilter}
            placeholder="All names"
            options={[
              { value: "all", label: "All names" },
              ...prNames.map((name) => ({ value: name, label: name })),
            ]}
          />
          <HistoryDatePicker value={dateFilter} onValueChange={setDateFilter} availableDates={dates} />
          <div className="col-span-2">
            <HistoryFilterSelect
              label="PR agency"
              value={agencyFilter}
              onValueChange={setAgencyFilter}
              placeholder="All agencies"
              options={[
                { value: "all", label: "All agencies" },
                ...agencies.map((agency) => ({ value: agency, label: agency })),
              ]}
            />
          </div>
        </div>
      </IzCard>

      <div className="mb-2 flex items-center justify-between px-0.5">
        <IzSectionLabel>Transaction log</IzSectionLabel>
        <span className="text-[10px] text-[var(--iz-muted)]">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center text-xs text-[var(--iz-muted)]">
          No transactions match these filters. Try another name, date, or agency.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((row) => (
            <IzCard key={row.id} className="!mb-0">
              <div className="iz-between mb-2.5 gap-2">
                <div className="min-w-0">
                  <div className="font-sora text-sm font-bold text-[var(--iz-txt)]">{row.prName}</div>
                  <div className="iz-tiny iz-muted mt-0.5">
                    {row.agency} · {row.outlet}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[var(--iz-gold-l)]">{row.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <HistoryStat label="Total payout" value={formatRM(row.totalPayout)} highlight />
                <HistoryStat label="Total drinks" value={String(row.totalDrinks)} />
                <HistoryStat label="Total tips" value={formatRM(row.totalTips)} />
              </div>
            </IzCard>
          ))}
        </div>
      )}
    </div>
  );
}

const historySelectTriggerClass =
  "h-auto min-h-[44px] rounded-[13px] border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[var(--iz-txt)] shadow-none focus:ring-[var(--iz-gold-d)] focus:ring-offset-0";

const historySelectContentClass =
  "border-[var(--iz-line)] bg-[var(--iz-panel)] text-[var(--iz-txt)]";

const historySelectItemClass =
  "text-sm focus:bg-[rgba(255,255,255,0.06)] focus:text-[var(--iz-txt)]";

function HistoryDatePicker({
  value,
  onValueChange,
  availableDates,
}: {
  value: string;
  onValueChange: (value: string) => void;
  availableDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selected = value === "all" ? undefined : parseHistoryDate(value);
  const calendarMonth =
    selected ?? parseHistoryDate(availableDates[0] ?? "") ?? new Date();

  return (
    <div className="iz-field min-w-0">
      <label>Date</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`${historySelectTriggerClass} flex w-full items-center justify-between gap-2`}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold)]" />
              <span className="truncate">{value === "all" ? "All dates" : value}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--iz-muted)]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto border-[var(--iz-line)] bg-[var(--iz-panel)] p-0 text-[var(--iz-txt)]"
        >
          <div className="border-b border-[var(--iz-line)] p-2">
            <button
              type="button"
              onClick={() => {
                onValueChange("all");
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                value === "all"
                  ? "bg-[rgba(255,255,255,0.06)] font-semibold text-[var(--iz-gold-l)]"
                  : "text-[var(--iz-txt)] hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              All dates
            </button>
          </div>
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={calendarMonth}
            onSelect={(d) => {
              if (!d) return;
              const key = formatHistoryDate(d);
              if (!availableSet.has(key)) return;
              onValueChange(key);
              setOpen(false);
            }}
            disabled={(date) => !availableSet.has(formatHistoryDate(date))}
            className="rounded-md [--cell-size:2.35rem]"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function HistoryFilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="iz-field min-w-0">
      <label>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={historySelectTriggerClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={historySelectContentClass}>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className={historySelectItemClass}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HistoryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="iz-stat-tile p-2">
      <div className={`font-sora text-[13px] font-bold ${highlight ? "text-[var(--iz-gold)]" : "text-[var(--iz-txt)]"}`}>
        {value}
      </div>
      <div className="l mt-0.5 text-[9px] uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
    </div>
  );
}
