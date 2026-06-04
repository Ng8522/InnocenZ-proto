import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { IzSectionLabel } from "@/components/iz/ui";
import { TrendingUp } from "lucide-react";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "#d9b97a",
  },
};

/** Example daily sales for the week (prototype). */
const WEEKLY_SALES = [
  { day: "M", sales: 1820 },
  { day: "T", sales: 1400 },
  { day: "W", sales: 2340 },
  { day: "T", sales: 1020 },
  { day: "F", sales: 2680 },
  { day: "S", sales: 2040 },
  { day: "S", sales: 2520 },
];

export function OutletSalesDashboard() {
  const { shifts } = useStore();
  const totalSales = shifts.reduce((a, s) => a + s.liveSales, 0) || WEEKLY_SALES.reduce((a, d) => a + d.sales, 0);
  const totalCost = shifts.reduce((a, s) => a + s.estimatedCost, 0);
  const margin = totalSales - totalCost;

  const chartData = useMemo(() => {
    const seedTotal = WEEKLY_SALES.reduce((a, d) => a + d.sales, 0);
    const scale = seedTotal > 0 ? totalSales / seedTotal : 1;
    return WEEKLY_SALES.map((d) => ({
      day: d.day,
      sales: Math.round(d.sales * scale),
    }));
  }, [totalSales]);

  return (
    <div className="pt-2">
      <IzSectionLabel>Sales</IzSectionLabel>
      <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-3xl font-display font-semibold text-gradient-gold">RM {totalSales.toLocaleString()}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[11px] text-success">
            <TrendingUp className="h-3 w-3" /> +18%
          </span>
        </div>

        <ChartContainer config={chartConfig} className="mt-4 h-[148px] w-full [&_.recharts-cartesian-grid_horizontal]:stroke-[var(--iz-line)]">
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
        <KV label="Net margin" value={`RM ${margin.toLocaleString()}`} tone="text-success" />
        <KV label="Shifts" value={String(shifts.length)} />
        <KV label="Avg ticket" value="RM 184" />
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Top performing PRs</h3>
        <div className="mt-3 space-y-2">
          {[
            { name: "Luna", sales: 4200 },
            { name: "Mia", sales: 3850 },
            { name: "Vivi", sales: 3120 },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="w-16 text-sm">{p.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-gradient-gold" style={{ width: `${(p.sales / 4500) * 100}%` }} />
              </div>
              <span className="text-xs text-gold">RM {p.sales}</span>
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
