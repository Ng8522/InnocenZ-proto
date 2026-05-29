import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { Banknote, FileSignature, AlertCircle, Wallet as WalletIcon } from "lucide-react";

export const Route = createFileRoute("/host/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { pvs, signPv, disputePv, walletBalance, withdraw } = useStore();
  const [openPv, setOpenPv] = useState<string | null>(null);
  const [openWithdraw, setOpenWithdraw] = useState(false);
  const [amount, setAmount] = useState(500);
  const [disputeReason, setDisputeReason] = useState("Wrong drink count");

  const pv = pvs.find((p) => p.id === openPv);
  const total = pv ? pv.wages + pv.drinkCommission + pv.tipCommission + pv.tableCommission : 0;

  const hasUnsigned = pvs.some((p) => p.status === "sent");

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Host" title="Wallet" />
      <div className="px-5 pt-5">
        <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <WalletIcon className="h-3 w-3" /> Available balance
          </div>
          <div className="mt-1 text-4xl font-display font-semibold text-gradient-gold">RM {walletBalance.toLocaleString()}</div>
          <button
            onClick={() => setOpenWithdraw(true)}
            disabled={hasUnsigned}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-semibold shadow-glow disabled:opacity-40"
          >
            <Banknote className="h-4 w-4" /> Withdraw to bank
          </button>
          {hasUnsigned && <p className="mt-2 text-center text-[11px] text-warning">Sign all pending PVs to unlock withdrawal</p>}
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payment vouchers</h3>
        <div className="space-y-2">
          {pvs.map((p) => {
            const t = p.wages + p.drinkCommission + p.tipCommission + p.tableCommission;
            const tone = p.status === "signed" ? "bg-success/20 text-success"
              : p.status === "disputed" ? "bg-destructive/20 text-destructive"
              : "bg-warning/20 text-warning";
            return (
              <button key={p.id} onClick={() => setOpenPv(p.id)} className="block w-full rounded-2xl bg-gradient-surface p-4 text-left shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{p.outlet}</div>
                    <div className="text-[11px] text-muted-foreground">{p.date} · v{p.version}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gradient-gold">RM {t}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase ${tone}`}>{p.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {pv && (
        <Sheet onClose={() => setOpenPv(null)}>
          <h3 className="text-lg font-display font-semibold flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary" /> Payment Voucher</h3>
          <p className="text-[11px] text-muted-foreground">{pv.outlet} · {pv.date} · v{pv.version}</p>
          <div className="mt-4 space-y-1 rounded-2xl bg-background/60 p-4">
            <PvLine label="Daily wages" value={pv.wages} />
            <PvLine label="Drink commission" value={pv.drinkCommission} />
            <PvLine label="Tip commission" value={pv.tipCommission} />
            <PvLine label="Table commission" value={pv.tableCommission} />
            <div className="my-2 border-t border-border" />
            <PvLine label="Grand total" value={total} bold />
          </div>
          {pv.status === "sent" && (
            <>
              <button onClick={() => { signPv(pv.id); setOpenPv(null); }} className="mt-4 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold shadow-glow">
                Sign & Confirm
              </button>
              <details className="mt-3">
                <summary className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground"><AlertCircle className="h-3 w-3" /> Something's wrong? Raise dispute</summary>
                <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background p-2 text-sm">
                  <option>Wrong drink count</option>
                  <option>Missing table commission</option>
                  <option>Wrong outlet / date</option>
                  <option>Other</option>
                </select>
                <button onClick={() => { disputePv(pv.id, disputeReason); setOpenPv(null); }} className="mt-2 w-full rounded-full border border-destructive/40 py-2 text-xs text-destructive">
                  Raise dispute
                </button>
              </details>
            </>
          )}
          {pv.status === "signed" && <p className="mt-4 rounded-xl bg-success/15 p-3 text-center text-xs text-success">Signed · funds credited</p>}
          {pv.status === "disputed" && <p className="mt-4 rounded-xl bg-destructive/15 p-3 text-center text-xs text-destructive">Dispute open · awaiting agency review (SLA 7d)</p>}
        </Sheet>
      )}

      {openWithdraw && (
        <Sheet onClose={() => setOpenWithdraw(false)}>
          <h3 className="text-lg font-display font-semibold">Withdraw to bank</h3>
          <p className="text-[11px] text-muted-foreground">DuitNow / FPX · arrives T+1</p>
          <div className="mt-4 rounded-2xl bg-background/60 p-4">
            <div className="text-[10px] uppercase text-muted-foreground">Amount (RM)</div>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-transparent text-3xl font-display font-semibold outline-none text-gradient-gold" />
            <div className="mt-2 flex gap-2">
              {[200, 500, 1000, walletBalance].map((v, i) => (
                <button key={i} onClick={() => setAmount(v)} className="flex-1 rounded-full border border-border py-1.5 text-[11px]">
                  {i === 3 ? "All" : `RM${v}`}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { withdraw(amount); setOpenWithdraw(false); }} className="mt-4 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold shadow-glow">
            Confirm withdrawal
          </button>
        </Sheet>
      )}
    </div>
  );
}

function PvLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-gradient-gold text-base" : ""}>RM {value}</span>
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-[440px] rounded-t-3xl bg-gradient-surface p-6">
        {children}
      </div>
    </div>
  );
}
