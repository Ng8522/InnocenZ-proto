import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { Download, Receipt } from "lucide-react";

export const Route = createFileRoute("/outlet/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { shifts, toast } = useStore();
  const subtotal = shifts.reduce((a, s) => a + s.estimatedCost, 0);
  const platformFee = Math.round(subtotal * 0.05);
  const subscription = 499;
  const total = subtotal + platformFee + subscription;

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Outlet" title="Billing" />
      <div className="px-5 pt-5">
        <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
          <p className="text-xs text-muted-foreground">Outstanding · this cycle</p>
          <p className="mt-1 text-4xl font-display font-semibold text-gradient-gold">RM {total.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Due 28th · auto-debit enabled</p>
          <button onClick={() => toast("Payment of RM " + total + " queued", "success")} className="mt-4 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold shadow-glow">
            Settle now
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
          <Line label="Manpower (shifts)" value={`RM ${subtotal.toLocaleString()}`} />
          <Line label="Platform fee (5%)" value={`RM ${platformFee}`} />
          <Line label="Subscription (monthly)" value={`RM ${subscription}`} />
          <div className="my-2 border-t border-border" />
          <Line label="Total" value={`RM ${total.toLocaleString()}`} bold />
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Invoices</h3>
        <div className="space-y-2">
          {[
            { id: "INV-0042", date: "May 2026", amt: 3120, paid: true },
            { id: "INV-0041", date: "Apr 2026", amt: 2890, paid: true },
            { id: "INV-0040", date: "Mar 2026", amt: 2640, paid: true },
          ].map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-gradient-surface p-3 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{i.id}</div>
                <div className="text-[11px] text-muted-foreground">{i.date} · RM {i.amt}</div>
              </div>
              <button onClick={() => toast("Invoice downloaded", "success")} className="flex h-8 w-8 items-center justify-center rounded-full glass">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? "font-semibold" : ""}`}>
      <span className={`text-sm ${bold ? "" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm ${bold ? "text-gradient-gold" : ""}`}>{value}</span>
    </div>
  );
}
