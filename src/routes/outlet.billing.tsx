import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { OutletSalesDashboard } from "@/components/outlet/OutletSalesDashboard";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import {
  collectionToInvoiceId,
  collectionsForOutlet,
  DEFAULT_OUTLET_CANONICAL,
  shiftHistoryForOutlet,
  tonightShiftOutletName,
} from "@/lib/portal-sync";
import { CreditCard, Download, FileSpreadsheet, Receipt } from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/outlet/billing")({
  component: BillingPage,
});

const CALCULATED_THROUGH = "10 Jun 2026";

function BillingPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const {
    shifts,
    toast,
    agencyCollections,
    confirmOutletReconciliation,
    agencyReconciliation,
    setReconciliationVarianceReason,
    shiftHistory,
    payOutletInvoice,
    paymentCardLast4,
    updateOutletPaymentCard,
  } = useStore();
  const showSales = outletCan(outletSubRole, "viewSalesDashboard");
  const showBilling = outletCan(outletSubRole, "viewBilling");
  const canConfirmDaily = outletCan(outletSubRole, "confirmDaily");
  const outletName = tonightShiftOutletName(shifts);

  const [agencyFilter, setAgencyFilter] = useState("");
  const [prFilter, setPrFilter] = useState("");
  const [varianceReason, setVarianceReason] = useState(agencyReconciliation.varianceReason ?? "");

  const historyRows = useMemo(
    () => shiftHistoryForOutlet(shiftHistory, outletName),
    [shiftHistory, outletName],
  );

  const agencies = useMemo(
    () => [...new Set(historyRows.map((r) => r.agencyName))].sort(),
    [historyRows],
  );
  const prNames = useMemo(
    () => [...new Set(historyRows.map((r) => r.prName))].sort(),
    [historyRows],
  );

  const filteredSpend = useMemo(() => {
    return historyRows.filter((r) => {
      if (agencyFilter && r.agencyName !== agencyFilter) return false;
      if (prFilter && r.prName !== prFilter) return false;
      return true;
    });
  }, [historyRows, agencyFilter, prFilter]);

  const filteredSpendTotal = filteredSpend.reduce((a, r) => a + r.totalPayout, 0);

  const invoices = useMemo(
    () => collectionsForOutlet(agencyCollections, outletName),
    [agencyCollections, outletName],
  );

  const subtotal = shifts.reduce((a, s) => a + s.estimatedCost, 0);
  const platformFee = Math.round(subtotal * 0.05);
  const subscription = 499;
  const total = subtotal + platformFee + subscription;
  const dueCount = invoices.filter((i) => i.status !== "SETTLED").length;

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="Reports" />

      {showSales && <OutletSalesDashboard />}

      {showBilling && (
        <>
          <OutletSection
            title="Spend"
            hint={formatRM(filteredSpendTotal)}
            collapsible
            defaultOpen={false}
            className={showSales ? "!mt-4" : ""}
          >
            <div className="flex gap-2">
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="iz-txn-select min-w-0 flex-1"
              >
                <option value="">All agencies</option>
                {agencies.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={prFilter}
                onChange={(e) => setPrFilter(e.target.value)}
                className="iz-txn-select min-w-0 flex-1"
              >
                <option value="">All PRs</option>
                {prNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <IzCard className="mt-2 !py-3">
              <div className="iz-v-sum tot">
                <span className="font-sora text-sm font-bold">Total</span>
                <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(filteredSpendTotal)}</span>
              </div>
              <p className="iz-tiny iz-muted mt-1">{filteredSpend.length} rows</p>
              <button
                type="button"
                onClick={() => toast("spend-report.xlsx exported", "success")}
                className="iz-chip mt-2 w-full justify-center text-[11px]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export
              </button>
            </IzCard>
          </OutletSection>

          <OutletSection title="Billing" hint={`${formatRM(total)} · through ${CALCULATED_THROUGH}`}>
            <IzCard className="!py-3">
              {shifts.map((s) => (
                <Line key={s.id} label={`Manpower · ${s.outletName}`} value={formatRM(s.estimatedCost)} />
              ))}
              {shifts.length === 0 && (
                <p className="iz-tiny iz-muted py-1">No shifts in cycle yet.</p>
              )}
              <div className="iz-divider my-2" />
              <Line label="Platform (5%)" value={formatRM(platformFee)} />
              <Line label="Subscription" value={formatRM(subscription)} />
              <div className="iz-divider my-2" />
              <Line label="Total" value={formatRM(total)} bold />
            </IzCard>
          </OutletSection>

          <OutletSection title="Payment" hint={`···· ${paymentCardLast4}`} collapsible defaultOpen={false}>
            <IzCard className="iz-between gap-3 !py-3">
              <div className="flex items-center gap-2">
                <span className="iz-iconbox">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Visa ···· {paymentCardLast4}</div>
                  <p className="iz-tiny iz-muted">Auto-pay enabled</p>
                </div>
              </div>
              <button
                type="button"
                className="iz-chip text-[11px]"
                onClick={() => updateOutletPaymentCard(String(Math.floor(1000 + Math.random() * 9000)))}
              >
                Update
              </button>
            </IzCard>
          </OutletSection>

          <OutletSection title="Invoices" hint={dueCount > 0 ? `${dueCount} due` : "All paid"}>
            <div className="space-y-2">
              {invoices.map((i) => {
                const invId = collectionToInvoiceId(i.id);
                const paid = i.status === "SETTLED";
                return (
                  <div
                    key={i.id}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--iz-line)] px-3 py-2.5"
                  >
                    <Receipt className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--iz-gold-l)]">{i.dueDate}</p>
                      <p className="iz-tiny iz-muted truncate">
                        {invId} · {formatRM(i.amount)}
                      </p>
                    </div>
                    <IzPill variant={paid ? "green" : "amber"}>{paid ? "Paid" : "Due"}</IzPill>
                    {!paid && (
                      <button
                        type="button"
                        onClick={() => payOutletInvoice(i.id)}
                        className="iz-chip text-[10px]"
                      >
                        Pay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toast(`${invId}.pdf downloaded`, "success")}
                      className="iz-topbar-action shrink-0"
                      aria-label={`Download ${invId}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="iz-tiny iz-muted2 mt-2">{DEFAULT_OUTLET_CANONICAL} ledger</p>
          </OutletSection>

          {canConfirmDaily && !agencyReconciliation.outletConfirmed && (
            <OutletSection
              title="Reconciliation"
              hint={
                agencyReconciliation.variance !== 0
                  ? `Variance ${formatRM(agencyReconciliation.variance)}`
                  : "Pending confirm"
              }
              collapsible
              defaultOpen={false}
            >
              <IzCard flat className="!py-3">
                <p className="iz-tiny iz-muted">
                  Sales {formatRM(agencyReconciliation.outletSalesTotal)} vs PV{" "}
                  {formatRM(agencyReconciliation.pvTotal)}
                </p>
                {agencyReconciliation.variance !== 0 && (
                  <input
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    onBlur={() => setReconciliationVarianceReason(varianceReason)}
                    placeholder="Variance reason"
                    className="mt-2 w-full rounded-xl border border-[var(--iz-line2)] bg-white/[0.03] px-3 py-2 text-xs outline-none"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (agencyReconciliation.variance !== 0 && varianceReason.trim()) {
                      setReconciliationVarianceReason(varianceReason);
                    }
                    confirmOutletReconciliation();
                  }}
                  className="iz-btn iz-btn-primary iz-btn-sm mt-3 w-full"
                >
                  Confirm reconciliation
                </button>
              </IzCard>
            </OutletSection>
          )}
        </>
      )}
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`iz-v-sum ${bold ? "tot" : ""}`}>
      <span className={bold ? "font-sora text-sm font-bold" : "iz-sm iz-muted"}>{label}</span>
      <span className={`iz-ledger shrink-0 ${bold ? "text-[var(--iz-gold)]" : ""}`}>{value}</span>
    </div>
  );
}
