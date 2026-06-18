import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { OutletSalesDashboard } from "@/components/outlet/OutletSalesDashboard";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";

export const Route = createFileRoute("/outlet/billing")({
  component: BillingPage,
});

function BillingPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const showSales = outletCan(outletSubRole, "viewSalesDashboard");

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="Reports" />
      {showSales ? (
        <OutletSalesDashboard />
      ) : (
        <p className="iz-sm iz-muted rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
          You do not have access to outlet reports.
        </p>
      )}
    </div>
  );
}
