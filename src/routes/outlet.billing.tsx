import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/Nav";
import { OutletSalesDashboard } from "@/components/outlet/OutletSalesDashboard";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import {
  collectionToInvoiceId,
  collectionsForOutlet,
  DEFAULT_OUTLET_CANONICAL,
  tonightShiftOutletName,
} from "@/lib/portal-sync";
import { Download, Receipt } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/outlet/billing")({
  component: BillingPage,
});

const CALCULATED_THROUGH = "10 Jun 2026";

function BillingPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts, toast, agencyCollections, confirmOutletReconciliation, agencyReconciliation } =
    useStore();
  const showSales = outletCan(outletSubRole, "viewSalesDashboard");
  const showBilling = outletCan(outletSubRole, "viewBilling");
  const canConfirmDaily = outletCan(outletSubRole, "confirmDaily");
  const outletName = tonightShiftOutletName(shifts);

  const invoices = useMemo(
    () => collectionsForOutlet(agencyCollections, outletName),
    [agencyCollections, outletName],
  );

  const subtotal = shifts.reduce((a, s) => a + s.estimatedCost, 0);
  const platformFee = Math.round(subtotal * 0.05);
  const subscription = 499;
  const total = subtotal + platformFee + subscription;

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="Reports" />

      {showSales && <OutletSalesDashboard />}

      {showBilling && (
        <>
          <div className={showSales ? "mt-4" : ""}>
            <IzSectionLabel>Billing</IzSectionLabel>
          </div>
          <p className="iz-tiny iz-muted2 -mt-1 mb-2">Breakdown · synced with agency collections</p>
          <p className="iz-tiny iz-muted2 -mt-1 mb-2">
            All line items through{" "}
            <span className="font-sora font-bold text-[var(--iz-gold-l)]">{CALCULATED_THROUGH}</span>
          </p>
          <IzCard>
            {shifts.map((s) => (
              <Line key={s.id} label={`Manpower · ${s.outletName}`} value={formatRM(s.estimatedCost)} />
            ))}
            {shifts.length === 0 && (
              <p className="iz-tiny iz-muted py-2">No sealed shifts in this cycle yet.</p>
            )}
            <div className="iz-divider my-2" />
            <Line label="Platform fee (5%)" value={formatRM(platformFee)} />
            <Line label="Subscription (monthly)" value={formatRM(subscription)} />
            <div className="iz-divider my-2" />
            <Line label="Total" value={formatRM(total)} bold />
          </IzCard>

          {!agencyReconciliation.outletConfirmed && canConfirmDaily && (
            <IzCard flat className="mt-3 border-[rgba(232,194,122,.35)]">
              <p className="iz-sm font-bold">Daily reconciliation</p>
              <p className="iz-tiny iz-muted mt-1">
                Outlet sales {formatRM(agencyReconciliation.outletSalesTotal)} vs agency PV{" "}
                {formatRM(agencyReconciliation.pvTotal)}
                {agencyReconciliation.variance !== 0 && (
                  <span className="text-[var(--iz-amber)]"> · variance {formatRM(agencyReconciliation.variance)}</span>
                )}
              </p>
              <p className="iz-tiny iz-muted2 mt-1">
                Agency {agencyReconciliation.agencyConfirmed ? "confirmed ✓" : "pending"}
              </p>
            </IzCard>
          )}

          <IzSectionLabel>Invoices</IzSectionLabel>
          <p className="iz-tiny iz-muted2 -mt-1 mb-2">
            Same ledger as agency Collections · {DEFAULT_OUTLET_CANONICAL}
          </p>
          <div className="space-y-2.5">
            {invoices.map((i) => {
              const invId = collectionToInvoiceId(i.id);
              const paid = i.status === "SETTLED";
              const day = i.dueDate.split(" ")[0] ?? "";
              return (
                <IzCard key={i.id} className="iz-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="iz-iconbox shrink-0">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-sora text-[15px] font-bold text-[var(--iz-gold-l)]">
                        {i.dueDate}
                      </div>
                      <p className="iz-tiny iz-muted mt-0.5">
                        {invId} · {formatRM(i.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <IzPill variant={paid ? "green" : "amber"}>{paid ? "Paid" : "Due"}</IzPill>
                    <button
                      type="button"
                      onClick={() => toast(`${invId}.pdf downloaded`, "success")}
                      className="iz-chip"
                      aria-label="Download invoice"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </IzCard>
              );
            })}
          </div>

          {canConfirmDaily && (
            <button
              type="button"
              onClick={() => confirmOutletReconciliation()}
              disabled={agencyReconciliation.outletConfirmed}
              className="iz-btn iz-btn-primary mt-4"
            >
              {agencyReconciliation.outletConfirmed
                ? "Reconciliation confirmed ✓"
                : "Confirm daily reconciliation"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`iz-v-sum ${bold ? "tot" : ""}`}>
      <span className={bold ? "font-sora font-bold" : "iz-sm iz-muted"}>{label}</span>
      <span className={`iz-ledger shrink-0 ${bold ? "text-[var(--iz-gold)]" : ""}`}>{value}</span>
    </div>
  );
}
