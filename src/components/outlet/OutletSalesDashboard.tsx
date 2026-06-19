import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { getOutletWeeklyReport } from "@/lib/outlet-demo";
import { tonightShiftOutletName } from "@/lib/portal-sync";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { TrendingUp } from "lucide-react";

function weekdayLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

/** Sunday = start of week (0 … Sat = 6). */
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

export function OutletSalesDashboard() {
  const { shifts } = useStore();
  const outletName = tonightShiftOutletName(shifts);
  const report = getOutletWeeklyReport(outletName);

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
    return sortDaysSundayFirst(rows);
  }, [report]);

  const chartData = dayRows;

  if (!report) {
    return (
      <div className="pt-2">
        <IzSectionLabel>Outlet earnings</IzSectionLabel>
        <p className="iz-sm iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          No PR-attributed earnings data for this outlet yet.
        </p>
      </div>
    );
  }

  const { totalSales, totalCost, margin, wowGrowthPct, weekLabel, topPrs, shifts: shiftCount, avgTicket } =
    report;
  const marginPct = totalSales > 0 ? Math.round((margin / totalSales) * 100) : 0;
  const avgEarnedPerNight = shiftCount > 0 ? Math.round(margin / shiftCount) : 0;
  const topSalesMax = Math.max(...topPrs.map((p) => p.sales), 1);
  const bestDay = [...dayRows].sort((a, b) => b.earned - a.earned)[0];

  return (
    <div className="pt-2 space-y-4">
      <div>
        <IzSectionLabel>Outlet earnings</IzSectionLabel>
        <p className="iz-tiny iz-muted2 -mt-1">PR-attributed floor · {weekLabel}</p>
      </div>

      <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Net margin this week</p>
            <p className="mt-1 text-3xl font-display font-semibold text-gradient-gold">
              {formatRM(margin)}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {formatRM(totalSales)} floor sales − {formatRM(totalCost)} PR wages & commission
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[11px] text-success">
              <TrendingUp className="h-3 w-3" /> +{wowGrowthPct}% vs last week
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
          <p className="iz-tiny iz-muted2 mb-2 uppercase tracking-wide">Weekly P&amp;L split</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--iz-bg2)]">
            <div
              className="bg-[var(--iz-gold)]"
              style={{ width: `${totalSales > 0 ? (margin / totalSales) * 100 : 0}%` }}
              title="Outlet keeps"
            />
            <div
              className="bg-amber-500/50"
              style={{ width: `${totalSales > 0 ? (totalCost / totalSales) * 100 : 0}%` }}
              title="PR spend"
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
          <BarChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
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
          Week starts Sunday · bar height = net earned · details in daily breakdown
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-surface p-4 shadow-card">
        <OutletSection
          title="Daily breakdown"
          hint="Sun → Sat · floor sales, PR spend, net"
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
          hint={`Share of ${formatRM(totalSales)} attributed floor sales`}
          collapsible
          defaultOpen={false}
          className="!mt-0"
          trailing={
            <IzPill variant="violet" className="!py-0.5 !text-[9px] shrink-0">
              {topPrs.length} ranked
            </IzPill>
          }
        >
          <div className="space-y-3">
            {topPrs.map((p, i) => {
              const share = totalSales > 0 ? Math.round((p.sales / totalSales) * 100) : 0;
              return (
                <div key={p.prId} className="rounded-xl border border-[var(--iz-line)] bg-black/15 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--iz-violet-ink)] font-sora text-[10px] font-bold text-[var(--iz-gold-l)]">
                      #{i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-[var(--iz-gold-l)]">
                      {formatRM(p.sales)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full bg-gradient-gold"
                        style={{ width: `${(p.sales / topSalesMax) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--iz-muted2)]">
                      {share}% of week
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </OutletSection>
      </div>
    </div>
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
