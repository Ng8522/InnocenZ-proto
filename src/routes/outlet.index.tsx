import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { OutletBookings } from "@/components/outlet/OutletBookings";
import { OutletReconciliationBanner } from "@/components/outlet/OutletReconciliationBanner";
import { nowAgencyDateTime } from "@/lib/agency-demo";

export const Route = createFileRoute("/outlet/")({
  component: OutletHome,
});

function OutletHome() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const isFinance = outletSubRole === "outlet_finance";
  const { date, time } = nowAgencyDateTime();

  return (
    <div className="iz-screen iz-portal-page">
      {isFinance && (
        <p className="iz-tiny iz-muted mb-3 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
          Read-only overview
        </p>
      )}

      <header className="pt-1">
        <p className="iz-tiny iz-muted2 uppercase tracking-widest">Today</p>
        <p className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">
          {date} · {time}
        </p>
        <p className="iz-tiny iz-muted2 mt-0.5">Live shift · tap to expand</p>
      </header>

      <div className="mt-2.5">
        <OutletBookings />
      </div>

      <OutletReconciliationBanner />
    </div>
  );
}
