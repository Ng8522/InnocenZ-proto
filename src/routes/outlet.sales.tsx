import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/outlet/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { shifts, outletPnl } = useStore();
  const totalSales = outletPnl.reduce((a, r) => a + r.grossRevenue, 0);
  const totalCost = outletPnl.reduce((a, r) => a + r.prPayout, 0);
  const margin = outletPnl.reduce((a, r) => a + r.outletNet, 0);
  const floorTonight = shifts.find((s) => s.date === "Tonight")?.liveSales ?? 0;
  const bars = [62, 48, 80, 35, 92, 70, 88];

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="Sales" />
      <div className="pt-2">
        <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">This week · synced to agency</p>
              <p className="text-3xl font-display font-semibold text-gradient-gold">RM {totalSales.toLocaleString()}</p>
              {floorTonight > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">Tonight floor RM {floorTonight.toLocaleString()}</p>
              )}
            </div>
            <span className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-[11px] text-success">
              <TrendingUp className="h-3 w-3" /> +18%
            </span>
          </div>
          <div className="mt-5 flex h-32 items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-gradient-primary" style={{ height: `${b}%` }} />
                <span className="text-[10px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <KV label="PR payout (agency)" value={`RM ${totalCost.toLocaleString()}`} />
          <KV label="Outlet net" value={`RM ${margin.toLocaleString()}`} tone="text-success" />
          <KV label="Shifts" value={String(shifts.length)} />
          <KV label="Avg ticket" value="RM 184" />
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Top performing PRs</h3>
          <div className="mt-3 space-y-2">
            {[
              { name: "Luna", sales: 4200 }, { name: "Mia", sales: 3850 }, { name: "Vivi", sales: 3120 },
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
