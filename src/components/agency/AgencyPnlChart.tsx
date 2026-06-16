import { useMemo } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Legend, XAxis, YAxis } from "recharts";
import type { OutletPnlRow } from "@/lib/agency-demo";
import type { ShiftHistoryRow } from "@/lib/shift-history-utils";
import { deriveAgencyPnlMetrics, roundRm } from "@/lib/outlet-financial-sync";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { IzCard, formatRM } from "@/components/iz/ui";

const chartConfig = {
  earned: { label: "Earned", color: "#39d98a" },
  spent: { label: "Spent", color: "#ff7575" },
  profit: { label: "Profit / loss", color: "#e8c27a" },
};

function dayLabel(dateIso: string): string {
  return format(parseISO(dateIso), "d MMM");
}

function dayTooltipLabel(dateIso: string): string {
  return format(parseISO(dateIso), "EEE, d MMM yyyy");
}

export function rangePeriodLabel(dateFrom: string, dateTo: string): string {
  const start = parseISO(dateFrom);
  const end = parseISO(dateTo);
  if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
    return format(start, "d MMM yyyy");
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")}–${format(end, "d MMM yyyy")}`;
}

function shortOutletName(name: string): string {
  return name.length > 10 ? `${name.slice(0, 9)}…` : name;
}

/** Daily earned / spent / profit for each day in the selected date range. */
export function buildDailyPnlChartData(
  shiftHistory: ShiftHistoryRow[],
  pnlRows: OutletPnlRow[],
  dateFrom: string,
  dateTo: string,
  outletFilter: string,
  forecast: number,
) {
  if (dateFrom > dateTo) return [];

  const pnlByOutlet = new Map(pnlRows.map((r) => [r.outlet, r]));
  const byDay = new Map<string, { earned: number; spent: number }>();

  for (const day of eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) })) {
    byDay.set(format(day, "yyyy-MM-dd"), { earned: 0, spent: 0 });
  }

  for (const h of shiftHistory) {
    if (h.dateIso < dateFrom || h.dateIso > dateTo) continue;
    if (outletFilter && h.outlet !== outletFilter) continue;
    if (!byDay.has(h.dateIso)) continue;

    const pnl = pnlByOutlet.get(h.outlet);
    if (!pnl || pnl.prPayout <= 0) continue;

    const metrics = deriveAgencyPnlMetrics(pnl);
    const share = h.totalPayout / pnl.prPayout;
    const spent = metrics.spent * share;
    const earned = metrics.earned * share;

    const cur = byDay.get(h.dateIso)!;
    cur.earned += earned;
    cur.spent += spent;
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateIso, v]) => {
      const earned = roundRm(v.earned * forecast);
      const spent = roundRm(v.spent * forecast);
      return {
        label: dayLabel(dateIso),
        dateIso,
        earned,
        spent,
        profit: roundRm(earned - spent),
      };
    });
}

export function buildOutletPnlChartData(pnlRows: OutletPnlRow[], forecast: number) {
  return pnlRows.map((r) => {
    const m = deriveAgencyPnlMetrics(r);
    const earned = roundRm(m.earned * forecast);
    const spent = roundRm(m.spent * forecast);
    return {
      label: shortOutletName(r.outlet),
      earned,
      spent,
      profit: roundRm(earned - spent),
    };
  });
}

type AgencyPnlChartProps = {
  shiftHistory: ShiftHistoryRow[];
  pnlRows: OutletPnlRow[];
  dateFrom: string;
  dateTo: string;
  outletFilter: string;
  forecast: number;
};

export function AgencyPnlChart({
  shiftHistory,
  pnlRows,
  dateFrom,
  dateTo,
  outletFilter,
  forecast,
}: AgencyPnlChartProps) {
  const dailyData = useMemo(
    () => buildDailyPnlChartData(shiftHistory, pnlRows, dateFrom, dateTo, outletFilter, forecast),
    [shiftHistory, pnlRows, dateFrom, dateTo, outletFilter, forecast],
  );

  const outletData = useMemo(() => buildOutletPnlChartData(pnlRows, forecast), [pnlRows, forecast]);

  const hasDailyRange = dailyData.length > 0;
  const hasDailyActivity = dailyData.some((d) => d.earned > 0 || d.spent > 0);
  const chartData = hasDailyRange ? dailyData : outletData;
  const chartMode = hasDailyRange ? "daily" : "outlet";
  const periodLabel = rangePeriodLabel(dateFrom, dateTo);

  if (chartData.length === 0) {
    return (
      <IzCard flat className="mt-3">
        <p className="font-sora text-sm font-bold">PNL chart</p>
        <p className="iz-tiny iz-muted mt-2 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          No chart data for this filter · widen the date range or clear the outlet filter.
        </p>
      </IzCard>
    );
  }

  return (
    <IzCard className="mt-3">
      <div className="iz-between gap-2">
        <div>
          <p className="font-sora text-sm font-bold">PNL chart</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {chartMode === "daily"
              ? `${periodLabel} · earned · spent · profit by day`
              : "Earned · spent · profit by outlet"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 iz-tiny">
          <span className="flex items-center gap-1 text-[var(--iz-green)]">
            <span className="h-2 w-2 rounded-full bg-[var(--iz-green)]" /> Earned
          </span>
          <span className="flex items-center gap-1 text-[var(--iz-red)]">
            <span className="h-2 w-2 rounded-full bg-[var(--iz-red)]" /> Spent
          </span>
          <span className="flex items-center gap-1 text-[var(--iz-gold-l)]">
            <span className="h-2 w-2 rounded-full bg-[var(--iz-gold-l)]" /> P/L
          </span>
        </div>
      </div>

      {chartMode === "daily" && !hasDailyActivity && (
        <p className="iz-tiny iz-muted2 mt-2">No shift history in this period — bars show RM 0 until shifts are logged.</p>
      )}

      <ChartContainer
        config={chartConfig}
        className="mt-3 h-[196px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[var(--iz-muted)] [&_.recharts-cartesian-grid_horizontal]:stroke-[var(--iz-line)]"
      >
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: -8, bottom: 0 }}
          barGap={2}
          barCategoryGap={chartData.length > 5 ? "18%" : "22%"}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--iz-muted)", fontSize: 10 }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--iz-muted)", fontSize: 10 }}
            tickFormatter={(v) => (Math.abs(Number(v)) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))}
            width={36}
          />
          <ChartTooltip
            cursor={{ fill: "rgba(232, 194, 122, 0.06)" }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { label?: string; dateIso?: string } | undefined;
                  if (row?.dateIso) return dayTooltipLabel(row.dateIso);
                  return row?.label ?? "";
                }}
                formatter={(value, name) => [
                  formatRM(Number(value)),
                  chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                ]}
              />
            }
          />
          <Legend wrapperStyle={{ display: "none" }} />
          <Bar dataKey="earned" fill="var(--color-earned)" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="spent" fill="var(--color-spent)" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={16}>
            {chartData.map((entry) => (
              <Cell
                key={`${entry.label}-profit`}
                fill={entry.profit >= 0 ? "var(--color-profit)" : "var(--color-spent)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </IzCard>
  );
}
