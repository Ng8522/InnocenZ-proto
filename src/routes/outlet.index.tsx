import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { AppTopbar } from "@/components/Nav";
import { OutletBookings } from "@/components/outlet/OutletBookings";
import { OutletSaleUnitCosts } from "@/components/outlet/OutletLogSales";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/outlet/")({
  component: OutletHome,
});

function OutletHome() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts } = useStore();
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];
  const canLogSales = outletCan(outletSubRole, "logSales");

  const qty = tonight?.quantity ?? 6;
  const confirmed = tonight?.prs.length ?? 0;
  const estimatedCost = tonight?.estimatedCost ?? qty * 60 * 6;
  const onTimeRisk = confirmed >= qty ? "Low" : confirmed >= qty / 2 ? "Medium" : "High";
  const riskTone =
    onTimeRisk === "Low"
      ? "text-[var(--iz-green)]"
      : onTimeRisk === "Medium"
        ? "text-[var(--iz-amber)]"
        : "text-[var(--iz-red)]";

  const isFinance = outletSubRole === "outlet_finance";

  return (
    <div className="iz-screen">
      <AppTopbar />
      {isFinance && (
        <p className="iz-tiny iz-muted -mt-1 mb-1">
          Read-only venue overview — use History for payouts and Reports for billing.
        </p>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-sora text-xl font-extrabold text-[var(--iz-txt)]">
          Tonight · <span className="text-[var(--iz-gold-l)]">{tonight?.event ?? "Shift"}</span>
        </h2>
        <button type="button" className="iz-chip relative">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--iz-gold)]" />
        </button>
      </div>

      <section className="pt-2">
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Confirmed PRs" value={`${confirmed}/${qty}`} />
          <Stat label="On-time risk" value={onTimeRisk} valueClass={riskTone} />
          <Stat label="Estimated cost" value={`RM ${estimatedCost.toLocaleString()}`} valueClass="text-[var(--iz-gold)]" />
          <Stat
            label="Live sales"
            value={`RM ${(tonight?.liveSales ?? 0).toLocaleString()}`}
            valueClass="text-[var(--iz-green)]"
          />
        </div>
      </section>

      {canLogSales && <OutletSaleUnitCosts />}

      <OutletBookings />
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="iz-stat-tile">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">{label}</div>
      <div className={`font-sora mt-1.5 text-xl font-extrabold ${valueClass || "text-[var(--iz-txt)]"}`}>{value}</div>
    </div>
  );
}
