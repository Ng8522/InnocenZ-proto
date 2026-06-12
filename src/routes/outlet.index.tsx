import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { AppTopbar } from "@/components/Nav";
import { OutletBookings } from "@/components/outlet/OutletBookings";
import { OutletHomeTiles } from "@/components/outlet/OutletHomeTiles";
import { OutletReconciliationBanner } from "@/components/outlet/OutletReconciliationBanner";
import { LiveWorkforceList } from "@/components/portal/LiveWorkforceTable";
import { OutletSection } from "@/components/outlet/OutletSection";
import { outletCan } from "@/lib/outlet-rbac";

export const Route = createFileRoute("/outlet/")({
  component: OutletHome,
});

function OutletHome() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts } = useStore();
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];
  const isFinance = outletSubRole === "outlet_finance";
  const outletName = tonight?.outletName ?? "Velvet 23";
  const showFloor = outletCan(outletSubRole, "viewLiveDashboard");

  const qty = tonight?.quantity ?? 6;
  const confirmed = tonight?.prs.length ?? 0;
  const estimatedCost = tonight?.estimatedCost ?? qty * 60 * 6;
  const onTimeRisk = confirmed >= qty ? "Low" : confirmed >= qty / 2 ? "Med" : "High";
  const riskTone =
    onTimeRisk === "Low"
      ? "text-[var(--iz-green)]"
      : onTimeRisk === "Med"
        ? "text-[var(--iz-amber)]"
        : "text-[var(--iz-red)]";

  return (
    <div className="iz-screen iz-portal-page">
      <AppTopbar />

      <div className="iz-portal-home-grid">
        <div className="iz-portal-home-main">
      <header className="pt-1">
        <p className="iz-tiny iz-muted2 uppercase tracking-widest">Tonight</p>
        <h2 className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">
          {tonight?.event ?? "No shift"}
        </h2>
        {tonight && (
          <p className="iz-tiny iz-muted mt-0.5">
            {tonight.date} · {tonight.shift}
          </p>
        )}
        {isFinance && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Read-only overview
          </p>
        )}
      </header>

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">PRs</div>
          <div className="n">
            {confirmed}/{qty}
          </div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Risk</div>
          <div className={`n ${riskTone}`}>{onTimeRisk}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Cost</div>
          <div className="n text-[var(--iz-gold)]">{(estimatedCost / 1000).toFixed(1)}k</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Sales</div>
          <div className="n text-[var(--iz-green)]">
            {((tonight?.liveSales ?? 0) / 1000).toFixed(1)}k
          </div>
        </div>
      </div>

      <OutletSection title="Bookings" hint="Tap a shift to expand" className="!mt-4">
        <OutletBookings />
      </OutletSection>

      <OutletHomeTiles />
      <OutletReconciliationBanner />
        </div>

        {showFloor && (
          <aside className="iz-portal-home-aside">
            <LiveWorkforceList outletName={outletName} />
          </aside>
        )}
      </div>
    </div>
  );
}
