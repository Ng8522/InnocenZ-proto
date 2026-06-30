import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import {
  getOutletReportForDates,
  getOutletReportForWeek,
  getVelvetReportWeekOptions,
  mappedVelvetReportNights,
  payrollWeekRangeLabel,
  VELVET_AGENCY,
  type OutletWeeklyReport,
} from "@/lib/velvet-week-demo";
import { averageDrinkPrice } from "@/lib/outlet-demo";
import { RECEIPT_COMMISSION_RULES } from "@/lib/pr-demo";
import {
  defaultCustomReportDateIsos,
  effectiveCustomReportDateIsos,
  reportableDateIsosForOutlet,
} from "@/lib/outlet-report-dates";
import {
  loadOutletReportPrefs,
  normalizeCustomReportRange,
  saveOutletReportPrefs,
  type OutletReportPrefs,
  type OutletReportTab,
} from "@/lib/outlet-report-prefs";
import { getLiveTodayIso, getPayrollWeekSundayIso, getPreviousWeekSundayIso } from "@/lib/demo-clock";
import { shiftHistoryForOutlet, tonightShiftOutletName } from "@/lib/portal-sync";
import { aggregateShiftHistoryByPr, type ShiftHistoryRow } from "@/lib/shift-history-utils";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { OutletMultiDatePopover } from "@/components/outlet/outlet-date-popover";
import {
  formatJobDates,
  jobDateIsosForSpan,
  sortJobDateIsos,
  type JobDateSpan,
} from "@/components/outlet/post-job-fields";
import { isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";

type ExpandedMetric = "floor" | "pr" | null;

type FloorSalesDayRow = {
  dateIso: string;
  dateDisplay: string;
  dayLabel: string;
  drinkSales: number;
  tipsSales: number;
  total: number;
};

type PrSpendRow = {
  prId: string;
  name: string;
  spend: number;
  agency: string;
};

function drinkSalesRmFromUnits(units: number, perDrinkRm: number): number {
  return units * perDrinkRm;
}

function tipsSalesRmFromUnits(tips: number): number {
  return tips * RECEIPT_COMMISSION_RULES.tipRate;
}

function floorBreakdownFromHistory(
  rows: ShiftHistoryRow[],
  perDrinkRm: number,
): { days: FloorSalesDayRow[]; drinkSales: number; tipsSales: number } {
  const byDay = new Map<string, Omit<FloorSalesDayRow, "total">>();

  for (const row of rows) {
    const drinkSales = drinkSalesRmFromUnits(row.totalDrinks, perDrinkRm);
    const tipsSales = tipsSalesRmFromUnits(row.totalTips);
    const cur =
      byDay.get(row.dateIso) ??
      ({
        dateIso: row.dateIso,
        dateDisplay: row.dateDisplay,
        dayLabel: weekdayLabel(row.dateIso),
        drinkSales: 0,
        tipsSales: 0,
      } satisfies Omit<FloorSalesDayRow, "total">);
    cur.drinkSales += drinkSales;
    cur.tipsSales += tipsSales;
    byDay.set(row.dateIso, cur);
  }

  const days = [...byDay.values()]
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map((d) => ({ ...d, total: d.drinkSales + d.tipsSales }));

  return {
    days,
    drinkSales: days.reduce((sum, d) => sum + d.drinkSales, 0),
    tipsSales: days.reduce((sum, d) => sum + d.tipsSales, 0),
  };
}

function floorBreakdownFromVelvetNights(
  startIso: string,
  endIso: string,
  todayIso: string,
  perDrinkRm: number,
  allowedDateIsos?: Set<string>,
): { days: FloorSalesDayRow[]; drinkSales: number; tipsSales: number } {
  const byDay = new Map<string, Omit<FloorSalesDayRow, "total">>();

  for (const night of mappedVelvetReportNights()) {
    if (allowedDateIsos && !allowedDateIsos.has(night.dateIso)) continue;
    if (night.dateIso < startIso || night.dateIso > endIso || night.dateIso > todayIso) continue;
    let drinkSales = 0;
    let tipsSales = 0;
    for (const pr of night.prs) {
      drinkSales += drinkSalesRmFromUnits(pr.drinks, perDrinkRm);
      tipsSales += tipsSalesRmFromUnits(pr.tips);
    }
    if (drinkSales === 0 && tipsSales === 0) continue;
    byDay.set(night.dateIso, {
      dateIso: night.dateIso,
      dateDisplay: night.dateDisplay,
      dayLabel: weekdayLabel(night.dateIso),
      drinkSales,
      tipsSales,
    });
  }

  const days = [...byDay.values()]
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map((d) => ({ ...d, total: d.drinkSales + d.tipsSales }));

  return {
    days,
    drinkSales: days.reduce((sum, d) => sum + d.drinkSales, 0),
    tipsSales: days.reduce((sum, d) => sum + d.tipsSales, 0),
  };
}

function weekdayLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

const chartConfig = {
  earned: { label: "Outlet earned", color: "#b79ce8" },
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

function effectiveWeekSundayIso(prefs: OutletReportPrefs): string {
  if (prefs.tab === "this_week") return getPayrollWeekSundayIso();
  if (prefs.tab === "last_week") return getPreviousWeekSundayIso();
  return prefs.weekSundayIso;
}

function resolveReportRange(
  prefs: OutletReportPrefs,
  customDateIsos: string[],
): { startIso: string; endIso: string; kind: "week" | "custom"; dateIsos?: string[] } {
  if (prefs.tab === "custom") {
    if (customDateIsos.length > 0) {
      const sorted = sortJobDateIsos(customDateIsos);
      return {
        startIso: sorted[0]!,
        endIso: sorted[sorted.length - 1]!,
        kind: "custom",
        dateIsos: sorted,
      };
    }
    const { startIso, endIso } = normalizeCustomReportRange(prefs.customStartIso, prefs.customEndIso);
    return { startIso, endIso, kind: "custom", dateIsos: [] };
  }
  const weekSun = effectiveWeekSundayIso(prefs);
  const week =
    getVelvetReportWeekOptions().find((w) => w.weekSundayIso === weekSun) ??
    getVelvetReportWeekOptions()[0]!;
  return {
    startIso: week.weekSundayIso,
    endIso: week.weekEndIso,
    kind: "week",
  };
}

function loadReport(
  outletName: string,
  prefs: OutletReportPrefs,
  customDateIsos: string[],
): OutletWeeklyReport | null {
  if (prefs.tab === "custom") {
    if (customDateIsos.length === 0) return null;
    return getOutletReportForDates(outletName, customDateIsos);
  }
  return getOutletReportForWeek(outletName, effectiveWeekSundayIso(prefs));
}

const REPORT_TABS: { id: OutletReportTab; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "custom", label: "Custom range" },
];

export function OutletSalesDashboard() {
  const { shifts, shiftHistory, outletOwner, outletWorkspace } = useStore();
  const outletName = tonightShiftOutletName(shifts);
  const orgName = outletOwner.orgName;
  const perDrinkRm = outletWorkspace.perDrinkRm ?? averageDrinkPrice(outletWorkspace.drinkMenu ?? []);

  const [prefs, setPrefs] = useState<OutletReportPrefs>(() => loadOutletReportPrefs(orgName));
  const [expandedMetric, setExpandedMetric] = useState<ExpandedMetric>(null);
  const [topPrsOpen, setTopPrsOpen] = useState(false);
  const topPrsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrefs(loadOutletReportPrefs(orgName));
  }, [orgName]);

  useEffect(() => {
    setExpandedMetric(null);
  }, [prefs.tab, prefs.weekSundayIso, prefs.customStartIso, prefs.customEndIso, prefs.customDateIsos]);

  const updatePrefs = (patch: Partial<OutletReportPrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      saveOutletReportPrefs(orgName, next);
      return next;
    });
  };

  const todayIso = getLiveTodayIso();

  const reportableDateIsos = useMemo(
    () => reportableDateIsosForOutlet(outletName, shiftHistory, todayIso),
    [outletName, shiftHistory, todayIso],
  );

  const customDateIsos = useMemo(
    () => effectiveCustomReportDateIsos(prefs, reportableDateIsos),
    [prefs, reportableDateIsos],
  );

  useEffect(() => {
    if (prefs.tab !== "custom") return;
    if (customDateIsos.length > 0) return;
    const defaults = defaultCustomReportDateIsos(reportableDateIsos);
    if (defaults.length === 0) return;
    const normalized = normalizeCustomReportRange(defaults[0]!, defaults[defaults.length - 1]!);
    updatePrefs({
      customDateIsos: defaults,
      customStartIso: normalized.startIso,
      customEndIso: normalized.endIso,
    });
  }, [prefs.tab, customDateIsos.length, reportableDateIsos]);

  const report = useMemo(
    () => loadReport(outletName, prefs, customDateIsos),
    [outletName, prefs, customDateIsos],
  );
  const range = useMemo(() => resolveReportRange(prefs, customDateIsos), [prefs, customDateIsos]);
  const isCurrentWeek = prefs.tab === "this_week";
  const sealedEndIso = isCurrentWeek ? todayIso : range.endIso;
  const customDateIsoSet = useMemo(
    () => (range.dateIsos?.length ? new Set(range.dateIsos) : undefined),
    [range.dateIsos],
  );

  const outletHistoryRows = useMemo(
    () => shiftHistoryForOutlet(shiftHistory, outletName),
    [shiftHistory, outletName],
  );

  const historyInRange = useMemo(() => {
    if (prefs.tab === "custom" && customDateIsoSet?.size) {
      return outletHistoryRows.filter((r) => customDateIsoSet.has(r.dateIso));
    }
    return outletHistoryRows.filter(
      (r) => r.dateIso >= range.startIso && r.dateIso <= sealedEndIso,
    );
  }, [outletHistoryRows, prefs.tab, customDateIsoSet, range.startIso, sealedEndIso]);

  const topPrs = useMemo(() => {
    if (historyInRange.length > 0) {
      return aggregateShiftHistoryByPr(historyInRange, "outlet")
        .sort((a, b) => b.totalPayout - a.totalPayout || a.prName.localeCompare(b.prName))
        .slice(0, 5)
        .map((r) => ({
          prId: r.prId,
          name: r.prName,
          earned: r.totalPayout,
          agency: r.venues[0] ?? VELVET_AGENCY,
        }));
    }
    return (report?.topPrs ?? []).map((p) => ({ ...p, agency: VELVET_AGENCY }));
  }, [historyInRange, report?.topPrs]);

  const prSpendRows = useMemo((): PrSpendRow[] => {
    if (historyInRange.length > 0) {
      return aggregateShiftHistoryByPr(historyInRange, "outlet")
        .map((r) => ({
          prId: r.prId,
          name: r.prName,
          spend: r.totalPayout,
          agency: r.venues[0] ?? VELVET_AGENCY,
        }))
        .sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));
    }
    return (report?.topPrs ?? []).map((p) => ({
      prId: p.prId,
      name: p.name,
      spend: p.earned,
      agency: VELVET_AGENCY,
    }));
  }, [historyInRange, report?.topPrs]);

  const floorBreakdown = useMemo(() => {
    if (historyInRange.length > 0) {
      return floorBreakdownFromHistory(historyInRange, perDrinkRm);
    }
    if (report) {
      return floorBreakdownFromVelvetNights(
        range.startIso,
        sealedEndIso,
        todayIso,
        perDrinkRm,
        customDateIsoSet,
      );
    }
    return { days: [] as FloorSalesDayRow[], drinkSales: 0, tipsSales: 0 };
  }, [historyInRange, report, range.startIso, sealedEndIso, todayIso, perDrinkRm, customDateIsoSet]);

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
    return range.kind === "week"
      ? rows
      : [...rows].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }, [report, range.kind]);

  if (!report) {
    return (
      <div className="pt-2">
        <ReportTabs prefs={prefs} onChange={updatePrefs} />
        {prefs.tab === "custom" && (
          <CustomRangePanel
            prefs={prefs}
            onChange={updatePrefs}
            reportableDateIsos={reportableDateIsos}
          />
        )}
        {prefs.tab !== "custom" && <ReportPeriodBadge prefs={prefs} className="mt-3" />}
        <IzSectionLabel>Outlet earnings</IzSectionLabel>
        <p className="iz-sm iz-muted mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          No PR-attributed earnings for this period — try another week or date range.
        </p>
      </div>
    );
  }

  const { totalSales, totalCost, margin, wowGrowthPct, weekLabel, shifts: shiftCount } = report;
  const marginPct = totalSales > 0 ? Math.round((margin / totalSales) * 100) : 0;
  const avgEarnedPerNight = shiftCount > 0 ? Math.round(margin / shiftCount) : 0;
  const topEarnedMax = Math.max(...topPrs.map((p) => p.earned), 1);
  const sealedDayCount = dayRows.filter((d) => d.dateIso <= todayIso && (d.earned > 0 || d.sales > 0)).length;
  const growthUp = wowGrowthPct >= 0;
  const floorTableDays = isCurrentWeek
    ? floorBreakdown.days.filter((d) => d.dateIso <= todayIso)
    : floorBreakdown.days;

  const scrollToTopPrs = () => {
    setTopPrsOpen(true);
    requestAnimationFrame(() => {
      topPrsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleMetric = (metric: ExpandedMetric) => {
    setExpandedMetric((cur) => (cur === metric ? null : metric));
  };

  return (
    <div className="space-y-4 pt-2">
      <ReportTabs prefs={prefs} onChange={updatePrefs} />

      {prefs.tab === "custom" ? (
        <CustomRangePanel
          prefs={prefs}
          onChange={updatePrefs}
          reportableDateIsos={reportableDateIsos}
        />
      ) : (
        <ReportPeriodBadge prefs={prefs} />
      )}

      <IzSectionLabel>Outlet earnings</IzSectionLabel>

      <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {isCurrentWeek ? "Net Sales so far" : "Net Sales this period"}
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

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MetricCard
            label="Floor sales"
            value={formatRM(totalSales)}
            selected={expandedMetric === "floor"}
            onClick={() => toggleMetric("floor")}
            hint={expandedMetric === "floor" ? "Tap to hide breakdown" : "Tap for drink & tips split"}
          />
          <MetricCard
            label="PR spend"
            value={formatRM(totalCost)}
            tone="text-amber-400/90"
            selected={expandedMetric === "pr"}
            onClick={() => toggleMetric("pr")}
            hint={expandedMetric === "pr" ? "Tap to hide PR list" : "Tap for PR & agency breakdown"}
          />
          <MetricCard label="Avg / night" value={formatRM(avgEarnedPerNight)} highlight />
        </div>

        {expandedMetric === "floor" && (
          <div className="mt-3 rounded-xl border border-[var(--iz-line)] bg-black/25 px-3 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--iz-line)] bg-black/20 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">Drink sales</p>
                <p className="mt-1 font-sora text-sm font-bold text-[var(--iz-txt)]">
                  {formatRM(floorBreakdown.drinkSales)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--iz-line)] bg-black/20 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">Tips sales</p>
                <p className="mt-1 font-sora text-sm font-bold text-[var(--iz-txt)]">
                  {formatRM(floorBreakdown.tipsSales)}
                </p>
              </div>
            </div>
            <p className="iz-tiny iz-muted2 mt-2">
              Drink sales = logged units × RM {perDrinkRm} · Tips = floor tips logged per shift
            </p>
            {floorTableDays.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[28rem]">
                  <div className="grid grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-2 px-1 pb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">
                    <span>Day</span>
                    <span>Date</span>
                    <span className="text-right">Drinks</span>
                    <span className="text-right">Tips</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="space-y-1">
                    {floorTableDays.map((row) => (
                      <div
                        key={row.dateIso}
                        className="grid grid-cols-[3rem_1fr_6rem_6rem_6rem] items-center gap-2 rounded-lg border border-[var(--iz-line)] bg-black/15 px-2 py-1.5"
                      >
                        <span className="font-sora text-xs font-bold text-[var(--iz-txt)]">{row.dayLabel}</span>
                        <span className="truncate text-[10px] text-[var(--iz-muted2)]">{row.dateDisplay}</span>
                        <span className="text-right font-mono text-[10px] tabular-nums text-[var(--iz-muted)]">
                          {formatRM(row.drinkSales)}
                        </span>
                        <span className="text-right font-mono text-[10px] tabular-nums text-[var(--iz-muted)]">
                          {formatRM(row.tipsSales)}
                        </span>
                        <span className="text-right font-mono text-[10px] font-semibold tabular-nums text-[var(--iz-gold-l)]">
                          {formatRM(row.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="iz-tiny iz-muted mt-3 text-center">No drink or tips sales logged for this period.</p>
            )}
          </div>
        )}

        {expandedMetric === "pr" && (
          <div className="mt-3 rounded-xl border border-[var(--iz-line)] bg-black/25 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">
                PR spend by person
              </p>
              <button type="button" className="iz-btn iz-btn-sm iz-btn-ghost !py-1 !text-[10px]" onClick={scrollToTopPrs}>
                View in Top performing PRs
              </button>
            </div>
            {prSpendRows.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {prSpendRows.map((row) => (
                  <div
                    key={row.prId}
                    className="flex items-center gap-2 rounded-lg border border-[var(--iz-line)] bg-black/15 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--iz-txt)]">{row.name}</p>
                      <p className="iz-tiny iz-muted2 truncate">{row.agency}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-amber-400/90">
                      {formatRM(row.spend)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="iz-tiny iz-muted mt-3 text-center">No PR spend recorded for this period.</p>
            )}
          </div>
        )}

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
          {isCurrentWeek
            ? `${sealedDayCount} night${sealedDayCount === 1 ? "" : "s"} sealed so far · future days show when shifts end`
            : `${dayRows.length} day${dayRows.length === 1 ? "" : "s"} · bar height = net earned · synced with breakdown below`}
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
            {(isCurrentWeek ? dayRows.filter((row) => row.dateIso <= todayIso) : dayRows).map((row) => (
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

      <div ref={topPrsRef} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
        <OutletSection
          id="top-performing-prs"
          title="Top performing PRs"
          hint={
            totalPrEarned > 0
              ? `${weekLabel} · ${formatRM(totalPrEarned)} total payouts`
              : "PR earnings for selected period"
          }
          collapsible
          open={topPrsOpen}
          onOpenChange={setTopPrsOpen}
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
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.name}</span>
                        <span className="iz-tiny iz-muted2 block truncate">{p.agency}</span>
                      </div>
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
              patch.weekSundayIso = getPayrollWeekSundayIso();
            } else if (tab.id === "last_week") {
              patch.weekSundayIso = getPreviousWeekSundayIso();
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

function ReportPeriodBadge({
  prefs,
  className,
}: {
  prefs: OutletReportPrefs;
  className?: string;
}) {
  const label =
    prefs.tab === "this_week"
      ? payrollWeekRangeLabel(getPayrollWeekSundayIso())
      : prefs.tab === "last_week"
        ? payrollWeekRangeLabel(getPreviousWeekSundayIso())
        : getVelvetReportWeekOptions().find((w) => w.weekSundayIso === prefs.weekSundayIso)?.label;

  if (!label) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CalendarDays className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
      <span className="iz-tiny iz-muted">{label}</span>
    </div>
  );
}

function CustomRangePanel({
  prefs,
  onChange,
  reportableDateIsos,
}: {
  prefs: OutletReportPrefs;
  onChange: (patch: Partial<OutletReportPrefs>) => void;
  reportableDateIsos: string[];
}) {
  const reportableSet = useMemo(() => new Set(reportableDateIsos), [reportableDateIsos]);
  const selectedDateIsos = useMemo(
    () => effectiveCustomReportDateIsos(prefs, reportableDateIsos),
    [prefs, reportableDateIsos],
  );

  const applySelectedDates = (isos: string[]) => {
    const sorted = sortJobDateIsos(isos.filter((iso) => reportableSet.has(iso)));
    if (sorted.length === 0) return;
    const normalized = normalizeCustomReportRange(sorted[0]!, sorted[sorted.length - 1]!);
    onChange({
      customDateIsos: sorted,
      customStartIso: normalized.startIso,
      customEndIso: normalized.endIso,
    });
  };

  const isDateDisabled = (date: Date) => !reportableSet.has(isoKeyFromDate(date));

  const reportSpanIsos = (anchor: Date, span: JobDateSpan) =>
    jobDateIsosForSpan(anchor, span).filter((iso) => reportableSet.has(iso));

  return (
    <IzCard flat className="space-y-2 !p-3">
      <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-[var(--iz-line)] bg-[rgba(0,0,0,0.15)] p-2">
        <OutletMultiDatePopover
          selectedIsos={selectedDateIsos}
          onChange={applySelectedDates}
          disabled={isDateDisabled}
          formatLabel={() => formatJobDates(selectedDateIsos)}
          compact
          quickSpans={{
            spans: [
              { id: "3d", label: "3 days" },
              { id: "week", label: "1 week" },
            ],
            isActive: (anchor, spanId) => {
              const expected = reportSpanIsos(anchor, spanId as JobDateSpan);
              if (expected.length === 0) return false;
              const sorted = sortJobDateIsos(selectedDateIsos);
              return (
                expected.length === sorted.length &&
                expected.every((iso, index) => iso === sorted[index])
              );
            },
            onApply: (anchor, spanId) =>
              applySelectedDates(reportSpanIsos(anchor, spanId as JobDateSpan)),
          }}
        />
        {selectedDateIsos.length > 1 && (
          <span className="iz-tiny iz-muted2 whitespace-nowrap px-0.5">
            {selectedDateIsos.length} days
          </span>
        )}
      </div>
      <p className="iz-tiny iz-muted2">
        Only nights with floor sales &amp; PR shifts · tap to add or remove · double-tap one day to
        select only that date
      </p>
      <p className="iz-tiny iz-muted">
        {selectedDateIsos.length > 0 ? (
          <>
            Showing {formatJobDates(selectedDateIsos)} · synced chart, breakdown &amp; top PRs
          </>
        ) : (
          <>No sealed nights with sales yet — pick dates once shifts are logged.</>
        )}
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
  selected,
  onClick,
  hint,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  highlight?: boolean;
  selected?: boolean;
  onClick?: () => void;
  hint?: string;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-[var(--iz-line)] bg-black/20 px-3 py-2.5",
        onClick && "cursor-pointer text-left transition-colors hover:border-[var(--iz-gold)]/35",
        selected && "border-[var(--iz-gold)]/50 bg-[var(--iz-gold)]/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--iz-muted2)]">{label}</p>
        {onClick && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-[var(--iz-muted2)] transition-transform",
              selected && "rotate-180 text-[var(--iz-gold-l)]",
            )}
          />
        )}
      </div>
      <p
        className={`mt-1 font-sora text-sm font-bold ${tone ?? ""} ${highlight ? "text-[var(--iz-gold-l)]" : "text-[var(--iz-txt)]"}`}
      >
        {value}
      </p>
      {sub && <p className="iz-tiny iz-muted mt-0.5">{sub}</p>}
      {hint && <p className="iz-tiny iz-muted2 mt-1">{hint}</p>}
    </Tag>
  );
}
