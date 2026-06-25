import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import {
  getOutletReportForDateRange,
  getOutletReportForWeek,
  VELVET_REPORT_WEEK_OPTIONS,
  velvetReportDateBounds,
  type OutletWeeklyReport,
} from "@/lib/velvet-week-demo";
import {
  customRangeMatchesPeriod,
  endIsoForReportPeriod,
  loadOutletReportPrefs,
  normalizeCustomReportRange,
  periodLabel,
  saveOutletReportPrefs,
  type OutletReportPeriod,
  type OutletReportPrefs,
  type OutletReportTab,
} from "@/lib/outlet-report-prefs";
import { getPayrollWeekSundayIso, getPreviousWeekSundayIso } from "@/lib/demo-clock";
import { shiftHistoryForOutlet, tonightShiftOutletName } from "@/lib/portal-sync";
import { aggregateShiftHistoryByPr } from "@/lib/shift-history-utils";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  formatOutletDateLabel,
  OutletDateRangePopover,
} from "@/components/outlet/outlet-date-popover";
import { dateFromIsoKey, isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { cn } from "@/lib/utils";
import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";

function weekdayLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function sundayFirstSortKey(dateIso: string): number {
  return new Date(`${dateIso}T12:00:00`).getDay();
}

function sortDaysSundayFirst<T extends { dateIso: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => sundayFirstSortKey(a.dateIso) - sundayFirstSortKey(b.dateIso) || a.dateIso.localeCompare(b.dateIso),
  );
}

const chartConfig = {
  earned: { label: "Outlet earned", color: "#d9b97a" },
  sales: { label: "Floor sales", color: "#7c6bff" },
  prCost: { label: "PR spend", color: "#f59e0b" },
};

type DayRow = {
  dateIso: string;
  chartTick: string;
  dayFull: string;
  dateDisplay: string;
  sales: number;
  prCost: number;
  earned: number;
  marginPct: number;
};

function EarningsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DayRow }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--iz-line2)] bg-[var(--iz-panel)] px-3 py-2 text-xs shadow-xl">
      <p className="font-sora text-[11px] font-bold text-[var(--iz-txt)]">
        {row.dayFull} · {row.dateDisplay}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--iz-gold-l)]">
        {formatRM(row.earned)}
      </p>
      <p className="mt-1 text-[10px] text-[var(--iz-muted2)]">Full breakdown below</p>
    </div>
  );
}

function resolveReportRange(
  prefs: OutletReportPrefs,
): { startIso: string; endIso: string; kind: "week" | "custom" } {
  if (prefs.tab === "custom") {
    const { startIso, endIso } = normalizeCustomReportRange(prefs.customStartIso, prefs.customEndIso);
    return { startIso, endIso, kind: "custom" };
  }
  const week =
    VELVET_REPORT_WEEK_OPTIONS.find((w) => w.weekSundayIso === prefs.weekSundayIso) ??
    VELVET_REPORT_WEEK_OPTIONS[0]!;
  return {
    startIso: week.nights[0]!.dateIso,
    endIso: week.nights[week.nights.length - 1]!.dateIso,
    kind: "week",
  };
}

function loadReport(outletName: string, prefs: OutletReportPrefs): OutletWeeklyReport | null {
  if (prefs.tab === "custom") {
    const { startIso, endIso } = normalizeCustomReportRange(prefs.customStartIso, prefs.customEndIso);
    return getOutletReportForDateRange(outletName, startIso, endIso);
  }
  return getOutletReportForWeek(outletName, prefs.weekSundayIso);
}

const REPORT_TABS: { id: OutletReportTab; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "custom", label: "Custom range" },
];

const PERIOD_OPTIONS: OutletReportPeriod[] = ["3d", "week", "month"];

export function OutletSalesDashboard() {
  const { shifts, shiftHistory, outletOwner } = useStore();
  const outletName = tonightShiftOutletName(shifts);
  const orgName = outletOwner.orgName;

  const [prefs, setPrefs] = useState<OutletReportPrefs>(() => loadOutletReportPrefs(orgName));

  useEffect(() => {
    setPrefs(loadOutletReportPrefs(orgName));
  }, [orgName]);

  const updatePrefs = (patch: Partial<OutletReportPrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      saveOutletReportPrefs(orgName, next);
      return next;
    });
  };

  const report = useMemo(() => loadReport(outletName, prefs), [outletName, prefs]);
  const range = useMemo(() => resolveReportRange(prefs), [prefs]);

  const outletHistoryRows = useMemo(
    () => shiftHistoryForOutlet(shiftHistory, outletName),
    [shiftHistory, outletName],
  );

  const historyInRange = useMemo(
    () =>
      outletHistoryRows.filter(
        (r) => r.dateIso >= range.startIso && r.dateIso <= range.endIso,
      ),
    [outletHistoryRows, range.startIso, range.endIso],
  );

  const topPrs = useMemo(() => {
    if (historyInRange.length > 0) {
      return aggregateShiftHistoryByPr(historyInRange, "outlet")
        .sort((a, b) => b.totalPayout - a.totalPayout || a.prName.localeCompare(b.prName))
        .slice(0, 5)
        .map((r) => ({ prId: r.prId, name: r.prName, earned: r.totalPayout }));
    }
    return report?.topPrs ?? [];
  }, [historyInRange, report?.topPrs]);

  const totalPrEarned = useMemo(
    () =>
      historyInRange.length > 0
        ? historyInRange.reduce((a, r) => a + r.totalPayout, 0)
        : topPrs.reduce((a, p) => a + p.earned, 0),
    [historyInRange, topPrs],
  );

  const dayRows = useMemo((): DayRow[] => {
    if (!report) return [];
    const rows = report.days.map((d) => {
      const earned = Math.max(0, d.sales - d.manpowerCost);
      const marginPct = d.sales > 0 ? Math.round((earned / d.sales) * 100) : 0;
      return {
        dateIso: d.dateIso,
        chartTick: weekdayLabel(d.dateIso),
        dayFull: weekdayLabel(d.dateIso),
        dateDisplay: d.dateDisplay,
        sales: d.sales,
        prCost: d.manpowerCost,
        earned,
        marginPct,
      };
    });
    return range.kind === "week" ? sortDaysSundayFirst(rows) : rows;
  }, [report, range.kind]);

  const { minIso: minDateIso, maxIso: maxDateIso } = velvetReportDateBounds();

  if (!report) {
    return (
      <div className="pt-2">
        <ReportTabs prefs={prefs} onChange={updatePrefs} />
        {prefs.tab === "custom" && (
          <CustomRangePanel prefs={prefs} onChange={updatePrefs} minDateIso={minDateIso} maxDateIso={maxDateIso} />
        )}
        {prefs.tab !== "custom" && (
          <WeekPicker prefs={prefs} onChange={updatePrefs} className="mt-3" />
        )}
        <IzSectionLabel>Outlet earnings</IzSectionLabel>
        <p className="iz-sm iz-muted mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          No PR-attributed earnings for this period — try another week or date range.
        </p>
      </div>
    );
  }

  const { totalSales, totalCost, margin, wowGrowthPct, weekLabel, shifts: shiftCount, avgTicket } = report;
  const marginPct = totalSales > 0 ? Math.round((margin / totalSales) * 100) : 0;
  const avgEarnedPerNight = shiftCount > 0 ? Math.round(margin / shiftCount) : 0;
  const topEarnedMax = Math.max(...topPrs.map((p) => p.earned), 1);
  const bestDay = [...dayRows].sort((a, b) => b.earned - a.earned)[0];
  const growthUp = wowGrowthPct >= 0;

  return (
    <div className="space-y-4 pt-2">
      <ReportTabs prefs={prefs} onChange={updatePrefs} />

      {prefs.tab === "custom" ? (
        <CustomRangePanel prefs={prefs} onChange={updatePrefs} minDateIso={minDateIso} maxDateIso={maxDateIso} />
      ) : (
        <WeekPicker prefs={prefs} onChange={updatePrefs} />
      )}

      <div>
        <IzSectionLabel>Outlet earnings</IzSectionLabel>
        <p className="iz-tiny iz-muted2 -mt-1">PR-attributed floor · {weekLabel}</p>
      </div>

      <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {prefs.tab === "custom" ? "Net margin · selected period" : "Net margin this period"}
            </p>
            <p className="mt-1 text-3xl font-display font-semibold text-gradient-gold">{formatRM(margin)}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {formatRM(totalSales)} floor sales − {formatRM(totalCost)} PR wages & commission
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]",
                growthUp ? "bg-success/20 text-success" : "bg-red-500/15 text-red-400",
              )}
            >
              {growthUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {growthUp ? "+" : ""}
              {wowGrowthPct}% vs prior period
            </span>
            <IzPill variant="gold" className="!py-0.5 !text-[9px]">
              {marginPct}% margin
            </IzPill>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricCard label="Floor sales" value={formatRM(totalSales)} />
          <MetricCard label="PR spend" value={formatRM(totalCost)} tone="text-amber-400/90" />
          <MetricCard label="Avg / night" value={formatRM(avgEarnedPerNight)} highlight />
          <MetricCard label="Shifts" value={String(shiftCount)} />
          <MetricCard label="Avg ticket" value={formatRM(avgTicket)} />
          <MetricCard
            label="Best night"
            value={bestDay ? bestDay.dayFull : "—"}
            sub={bestDay ? formatRM(bestDay.earned) : undefined}
          />
        </div>

        <div className="mt-4 rounded-xl border border-[var(--iz-line)] bg-black/20 px-3 py-2.5">
          <p className="iz-tiny iz-muted2 mb-2 uppercase tracking-wide">P&amp;L split</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--iz-bg2)]">
            <div
              className="bg-[var(--iz-gold)]"
              style={{ width: `${totalSales > 0 ? (margin / totalSales) * 100 : 0}%` }}
            />
            <div
              className="bg-amber-500/50"
              style={{ width: `${totalSales > 0 ? (totalCost / totalSales) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--iz-muted2)]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--iz-gold)]" />
              You keep {marginPct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500/70" />
              PR spend {totalSales > 0 ? Math.round((totalCost / totalSales) * 100) : 0}%
            </span>
          </div>
        </div>

        <ChartContainer
          config={chartConfig}
          className="mt-4 h-[168px] w-full [&_.recharts-cartesian-grid_horizontal]:stroke-[var(--iz-line)]"
        >
          <BarChart data={dayRows} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="chartTick"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--iz-muted)", fontSize: 10 }}
              interval={0}
            />
            <YAxis hide domain={[0, "auto"]} />
            <ChartTooltip cursor={{ fill: "rgba(217, 185, 122, 0.08)" }} content={<EarningsTooltip />} />
            <Bar dataKey="earned" fill="var(--color-earned)" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
        <p className="mt-2 text-center text-[10px] text-[var(--iz-muted2)]">
          {dayRows.length} day{dayRows.length === 1 ? "" : "s"} · bar height = net earned · synced with breakdown
          below
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
        <OutletSection
          title="Daily breakdown"
          hint={`${dayRows.length} day${dayRows.length === 1 ? "" : "s"} · ${weekLabel}`}
          collapsible
          defaultOpen={false}
          className="!mt-0"
        >
          <div className="hidden gap-2 px-3 text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)] sm:grid sm:grid-cols-[3rem_1fr_6.5rem_6.5rem_6.5rem]">
            <span>Day</span>
            <span />
            <span className="text-right">Sales</span>
            <span className="text-right">PR spend</span>
            <span className="text-right">Net</span>
          </div>
          <div className="space-y-1.5">
            {dayRows.map((row) => (
              <div
                key={row.dateIso}
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-xl border border-[var(--iz-line)] bg-black/15 px-3 py-2 sm:grid-cols-[3rem_1fr_6.5rem_6.5rem_6.5rem]"
              >
                <div className="min-w-0">
                  <span className="block font-sora text-xs font-bold text-[var(--iz-txt)]">{row.dayFull}</span>
                  <span className="iz-tiny iz-muted2">{row.dateDisplay}</span>
                </div>
                <div className="min-w-0">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--iz-bg2)]">
                    <div
                      className="h-full bg-gradient-gold"
                      style={{ width: `${(row.earned / Math.max(...dayRows.map((d) => d.earned), 1)) * 100}%` }}
                    />
                  </div>
                  <p className="iz-tiny iz-muted2 mt-1 truncate sm:hidden">
                    {formatRM(row.sales)} − {formatRM(row.prCost)}
                  </p>
                </div>
                <span className="hidden whitespace-nowrap text-right font-mono text-[10px] tabular-nums text-[var(--iz-muted)] sm:block">
                  {formatRM(row.sales)}
                </span>
                <span className="hidden whitespace-nowrap text-right font-mono text-[10px] tabular-nums text-amber-400/80 sm:block">
                  −{formatRM(row.prCost)}
                </span>
                <span className="whitespace-nowrap text-right font-mono text-xs font-semibold tabular-nums text-[var(--iz-gold-l)]">
                  {formatRM(row.earned)}
                </span>
                <span className="col-span-full text-[10px] text-[var(--iz-muted2)] sm:hidden">
                  {formatRM(row.sales)} sales · −{formatRM(row.prCost)} PR · {row.marginPct}% margin
                </span>
              </div>
            ))}
          </div>
        </OutletSection>
      </div>

      <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
        <OutletSection
          title="Top performing PRs"
          hint={
            totalPrEarned > 0
              ? `${weekLabel} · ${formatRM(totalPrEarned)} total payouts`
              : "PR earnings for selected period"
          }
          collapsible
          defaultOpen={false}
          className="!mt-0"
          trailing={
            <IzPill variant="violet" className="!mt-0 shrink-0 !py-0.5 !text-[9px]">
              {topPrs.length} ranked
            </IzPill>
          }
        >
          <div className="space-y-3">
            {topPrs.length === 0 ? (
              <p className="iz-tiny iz-muted py-4 text-center">No PR shifts in this period.</p>
            ) : (
              topPrs.map((p, i) => {
                const share = totalPrEarned > 0 ? Math.round((p.earned / totalPrEarned) * 100) : 0;
                return (
                  <div key={p.prId} className="rounded-xl border border-[var(--iz-line)] bg-black/15 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--iz-violet-ink)] font-sora text-[10px] font-bold text-[var(--iz-gold-l)]">
                        #{i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                      <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-[var(--iz-gold-l)]">
                        {formatRM(p.earned)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full bg-gradient-gold"
                          style={{ width: `${(p.earned / topEarnedMax) * 100}%` }}
                        />
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--iz-muted2)]">
                        {share}% of payouts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </OutletSection>
      </div>
    </div>
  );
}

function ReportTabs({
  prefs,
  onChange,
}: {
  prefs: OutletReportPrefs;
  onChange: (patch: Partial<OutletReportPrefs>) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-[var(--iz-line)] bg-white/[0.02] p-1">
      {REPORT_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => {
            const patch: Partial<OutletReportPrefs> = { tab: tab.id };
            if (tab.id === "this_week") {
              patch.weekSundayIso = VELVET_REPORT_WEEK_OPTIONS[0]?.weekSundayIso ?? getPayrollWeekSundayIso();
            } else if (tab.id === "last_week") {
              patch.weekSundayIso = VELVET_REPORT_WEEK_OPTIONS[1]?.weekSundayIso ?? getPreviousWeekSundayIso();
            }
            onChange(patch);
          }}
          className={cn(
            "iz-btn iz-btn-sm min-w-0 flex-1 !py-2 !text-[11px]",
            prefs.tab === tab.id ? "iz-btn-primary" : "iz-btn-ghost",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function WeekPicker({
  prefs,
  onChange,
  className,
}: {
  prefs: OutletReportPrefs;
  onChange: (patch: Partial<OutletReportPrefs>) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CalendarDays className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
      <span className="iz-tiny iz-muted shrink-0">Previous weeks</span>
      <IzSelect
        block
        className="!text-xs"
        value={prefs.weekSundayIso}
        onChange={(e) => {
          const weekSundayIso = e.target.value;
          let tab: OutletReportTab = prefs.tab;
          if (weekSundayIso === VELVET_REPORT_WEEK_OPTIONS[0]?.weekSundayIso) tab = "this_week";
          else if (weekSundayIso === VELVET_REPORT_WEEK_OPTIONS[1]?.weekSundayIso) tab = "last_week";
          onChange({ weekSundayIso, tab });
        }}
      >
        {VELVET_REPORT_WEEK_OPTIONS.map((w) => (
          <option key={w.weekSundayIso} value={w.weekSundayIso}>
            {w.label}
          </option>
        ))}
      </IzSelect>
    </div>
  );
}

function formatReportDateLabel(iso: string): string {
  return formatOutletDateLabel(iso);
}

function ReportRangeFields({
  startIso,
  endIso,
  minDateIso,
  maxDateIso,
  onRangeChange,
}: {
  startIso: string;
  endIso: string;
  minDateIso: string;
  maxDateIso: string;
  onRangeChange: (start: string, end: string) => void;
}) {
  const from = dateFromIsoKey(startIso);
  const to = dateFromIsoKey(endIso);
  const minDate = dateFromIsoKey(minDateIso);
  const maxDate = dateFromIsoKey(maxDateIso);
  if (!from || !to) return null;

  const isSelectable = (date: Date) => {
    const iso = isoKeyFromDate(date);
    return iso >= minDateIso && iso <= maxDateIso;
  };

  return (
    <div className="iz-outlet-report-cal">
      <OutletDateRangePopover
        from={from}
        to={to}
        startMonth={minDate}
        endMonth={maxDate}
        disabled={(date) => !isSelectable(date)}
        formatRangeLabel={(f, t) =>
          `${formatOutletDateLabel(f)} → ${formatOutletDateLabel(t)}`
        }
        onRangeChange={(f, t) =>
          onRangeChange(isoKeyFromDate(f), isoKeyFromDate(t))
        }
        className="w-full"
      />
      <p className="iz-tiny iz-muted2 mt-2">Tap the date range to open the calendar</p>
    </div>
  );
}

function CustomRangePanel({
  prefs,
  onChange,
  minDateIso,
  maxDateIso,
}: {
  prefs: OutletReportPrefs;
  onChange: (patch: Partial<OutletReportPrefs>) => void;
  minDateIso: string;
  maxDateIso: string;
}) {
  const { startIso, endIso } = normalizeCustomReportRange(prefs.customStartIso, prefs.customEndIso);

  const applyRange = (start: string, end: string, period?: OutletReportPeriod) => {
    const normalized = normalizeCustomReportRange(start, end);
    onChange({
      customStartIso: normalized.startIso,
      customEndIso: normalized.endIso,
      ...(period ? { customPeriod: period } : {}),
    });
  };

  return (
    <IzCard flat className="space-y-2 !p-3">
      <p className="iz-tiny iz-muted2">
        Tap From or To to pick dates, or use a quick span from your start date
      </p>
      <div className="flex flex-wrap gap-1">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() =>
              applyRange(startIso, endIsoForReportPeriod(startIso, p), p)
            }
            className={cn(
              "iz-pill !text-[10px]",
              customRangeMatchesPeriod(startIso, endIso, p) ? "iz-pill-gold" : "iz-pill-ink",
            )}
          >
            {periodLabel(p)}
          </button>
        ))}
      </div>
      <ReportRangeFields
        startIso={startIso}
        endIso={endIso}
        minDateIso={minDateIso}
        maxDateIso={maxDateIso}
        onRangeChange={(customStartIso, customEndIso) => applyRange(customStartIso, customEndIso)}
      />
      <p className="iz-tiny iz-muted">
        Showing {formatReportDateLabel(startIso)} → {formatReportDateLabel(endIso)} · synced chart,
        breakdown &amp; top PRs
      </p>
    </IzCard>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--iz-line)] bg-black/20 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">{label}</p>
      <p
        className={`mt-1 font-sora text-sm font-bold ${tone ?? ""} ${highlight ? "text-[var(--iz-gold-l)]" : "text-[var(--iz-txt)]"}`}
      >
        {value}
      </p>
      {sub && <p className="iz-tiny iz-muted mt-0.5">{sub}</p>}
    </div>
  );
}
