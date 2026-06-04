import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { OutletSalesDashboard } from "@/components/outlet/OutletSalesDashboard";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { Download, Receipt } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/outlet/billing")({
  component: BillingPage,
});

const CALCULATED_THROUGH = "10 Jun 2026";

/** One invoice per sealed shift day (newest first). */
const INVOICES = [
  { id: "INV-2026-0610", date: "10 Jun 2026", day: "Wed", amt: 428, paid: true },
  { id: "INV-2026-0609", date: "9 Jun 2026", day: "Tue", amt: 392, paid: true },
  { id: "INV-2026-0608", date: "8 Jun 2026", day: "Mon", amt: 365, paid: true },
  { id: "INV-2026-0607", date: "7 Jun 2026", day: "Sun", amt: 410, paid: true },
  { id: "INV-2026-0606", date: "6 Jun 2026", day: "Sat", amt: 445, paid: true },
  { id: "INV-2026-0605", date: "5 Jun 2026", day: "Fri", amt: 388, paid: false },
  { id: "INV-2026-0604", date: "4 Jun 2026", day: "Thu", amt: 360, paid: true },
];

function BillingPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { shifts, toast } = useStore();
  const showSales = outletCan(outletSubRole, "viewSalesDashboard");
  const showBilling = outletCan(outletSubRole, "viewBilling");
  const canConfirmDaily = outletCan(outletSubRole, "confirmDaily");
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
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">Breakdown</p>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">
        All line items through{" "}
        <span className="font-sora font-bold text-[var(--iz-gold-l)]">{CALCULATED_THROUGH}</span>
      </p>
      <IzCard>
        {shifts.map((s) => (
          <Line key={s.id} label={`Manpower \u00b7 ${s.outletName}`} value={formatRM(s.estimatedCost)} />
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

      <IzSectionLabel>Invoices</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">Daily sealed-shift statements</p>
      <div className="space-y-2.5">
        {INVOICES.map((i) => (
          <IzCard key={i.id} className="iz-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="iz-iconbox shrink-0">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="font-sora text-[15px] font-bold text-[var(--iz-gold-l)]">
                  {i.day} · {i.date}
                </div>
                <p className="iz-tiny iz-muted mt-0.5">
                  {i.id} · {formatRM(i.amt)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <IzPill variant={i.paid ? "green" : "amber"}>{i.paid ? "Paid" : "Due"}</IzPill>
              <button
                type="button"
                onClick={() => toast(`${i.id}.pdf downloaded`, "success")}
                className="iz-chip"
                aria-label="Download invoice"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </IzCard>
        ))}
      </div>

      {canConfirmDaily && (
        <button
          type="button"
          onClick={() => toast("Daily totals confirmed · locked for finance", "success")}
          className="iz-btn iz-btn-primary mt-4"
        >
          Confirm daily
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
