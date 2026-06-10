import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { getOutletWeeklyReport } from "@/lib/outlet-demo";
import { tonightShiftOutletName } from "@/lib/portal-sync";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { IzSectionLabel } from "@/components/iz/ui";
import { TrendingUp } from "lucide-react";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "#d9b97a",
  },
};

export function OutletSalesDashboard() {
  const { shifts } = useStore();
  const outletName = tonightShiftOutletName(shifts);
  const report = getOutletWeeklyReport(outletName);

  const chartData = useMemo(
    () => report?.days.map((d) => ({ day: d.day, sales: d.sales })) ?? [],
    [report],
  );

  if (!report) {
    return (
      <div className="pt-2">
        <IzSectionLabel>Sales</IzSectionLabel>
        <p className="iz-sm iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          No weekly sales data for this outlet yet.
        </p>
      </div>
    );
  }

  const { totalSales, totalCost, margin, shifts: shiftCount, avgTicket, wowGrowthPct, topPrs, weekLabel } =
    report;
  const marginTone = margin >= 0 ? "text-success" : "text-destructive";
  const topSalesMax = Math.max(...topPrs.map((p) => p.sales), 1);

  return (
    <div className="pt-2">
      <IzSectionLabel>Sales</IzSectionLabel>
      <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">This week · {weekLabel}</p>
            <p className="text-3xl font-display font-semibold text-gradient-gold">
              RM {totalSales.toLocaleString()}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[11px] text-success">
            <TrendingUp className="h-3 w-3" /> +{wowGrowthPct}%
          </span>
        </div>

        <ChartContainer
          config={chartConfig}
          className="mt-4 h-[148px] w-full [&_.recharts-cartesian-grid_horizontal]:stroke-[var(--iz-line)]"
        >
          <BarChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--iz-muted)", fontSize: 10 }}
              interval={0}
            />
            <YAxis hide domain={[0, "auto"]} />
            <ChartTooltip
              cursor={{ fill: "rgba(217, 185, 122, 0.08)" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`RM ${Number(value).toLocaleString()}`, "Sales"]}
                  hideLabel
                />
              }
            />
            <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <KV label="Manpower cost" value={`RM ${totalCost.toLocaleString()}`} />
        <KV label="Net margin" value={`RM ${margin.toLocaleString()}`} tone={marginTone} />
        <KV label="Shifts" value={String(shiftCount)} />
        <KV label="Avg ticket" value={`RM ${avgTicket}`} />
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Top performing PRs
        </h3>
        <div className="mt-3 space-y-2">
          {topPrs.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="w-16 text-sm">{p.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-gradient-gold"
                  style={{ width: `${(p.sales / topSalesMax) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gold">RM {p.sales.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-surface p-3 shadow-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
