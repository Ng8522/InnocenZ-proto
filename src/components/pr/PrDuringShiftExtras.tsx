import { useState } from "react";
import { Flag, Plus, QrCode, ScanLine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { IzSheet } from "@/components/iz/Sheet";
import { IzHScroll } from "@/components/iz/HScroll";
import { PrOfferRow, PrStatusPill } from "@/components/pr/PrOfferRow";
import { PrSection } from "@/components/pr/PrSection";
import { formatRM } from "@/components/iz/ui";
import { useStore } from "@/lib/store";
import { getPrProfile } from "@/lib/pr-demo";

export function PrDuringShiftExtras() {
  const prSubRole = useStore((s) => s.prSubRole);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const prSelfLogs = useStore((s) => s.prSelfLogs);
  const addPrSelfLog = useStore((s) => s.addPrSelfLog);
  const flagPrSelfLog = useStore((s) => s.flagPrSelfLog);
  const toast = useStore((s) => s.toast);
  const profile = getPrProfile(prSubRole);
  const [qrOpen, setQrOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [category, setCategory] = useState<"drinks" | "tips" | "tables">("drinks");
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(120);

  const shiftLogs = prSelfLogs.filter((l) => l.shiftSessionId === prActiveShift?.id);
  const prCode = `PR-${profile.first.toUpperCase().slice(0, 3)}-${profile.ic.slice(-4)}`;

  const submitLog = () => {
    if (qty < 1) {
      toast("Enter quantity", "warn");
      return;
    }
    addPrSelfLog({ category, qty, amount: category === "tips" ? amount : qty * (category === "drinks" ? 15 : 60) });
    setLogOpen(false);
  };

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">Sales</span>
        <IzHScroll className="flex flex-1 gap-2 pb-0.5">
          <button type="button" className="iz-outlet-quick-chip shrink-0" onClick={() => setQrOpen(true)}>
            <QrCode className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> My QR
          </button>
          <button type="button" className="iz-outlet-quick-chip shrink-0" onClick={() => setLogOpen(true)}>
            <Plus className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> Self-log
          </button>
          <Link to="/host/scan" className="iz-outlet-quick-chip shrink-0">
            <ScanLine className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> Scan receipt
          </Link>
        </IzHScroll>
      </div>

      {shiftLogs.length > 0 && (
        <PrSection title="Self-logged" hint="Pending outlet" collapsible defaultOpen={false} className="!mt-3">
          <div className="iz-pr-list">
            {shiftLogs.map((log) => (
              <div key={log.id} className="iz-pr-inbox-card">
                <PrOfferRow
                  title={`${log.qty}× ${log.category}`}
                  amount={formatRM(log.amount)}
                  badge={
                    <PrStatusPill variant={log.status === "flagged" ? "ink" : log.status === "confirmed" ? "green" : "amber"}>
                      {log.status === "pending_outlet" ? "Pending" : log.status}
                    </PrStatusPill>
                  }
                  trailing={
                    log.status === "pending_outlet" ? (
                      <button type="button" className="text-[var(--iz-amber)]" aria-label="Flag for review" onClick={() => flagPrSelfLog(log.id)}>
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ))}
          </div>
        </PrSection>
      )}

      <IzSheet open={qrOpen} onClose={() => setQrOpen(false)}>
        <div className="iz-cardttl">PR QR</div>
        <p className="iz-tiny iz-muted mb-3">Outlet scans to attribute sales to you.</p>
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-white p-3">
          <QrCode className="h-full w-full text-[#1a1a1a]" strokeWidth={1} />
        </div>
        <p className="font-sora iz-sm mt-3 text-center font-bold">{profile.name}</p>
        <p className="iz-tiny iz-muted text-center">{prCode}</p>
      </IzSheet>

      <IzSheet open={logOpen} onClose={() => setLogOpen(false)}>
        <div className="iz-cardttl">Self-log sale</div>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["drinks", "tips", "tables"] as const).map((c) => (
            <button key={c} type="button" className={`iz-hist-chip capitalize${category === c ? " on" : ""}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <label className="iz-tiny iz-muted2">Quantity</label>
        <input type="number" min={1} className="iz-field-input mt-1 mb-3 w-full" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        {category === "tips" && (
          <>
            <label className="iz-tiny iz-muted2">Tip amount (RM)</label>
            <input type="number" min={1} className="iz-field-input mt-1 mb-3 w-full" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </>
        )}
        <button type="button" className="iz-btn iz-btn-primary" onClick={submitLog}>
          Log for confirmation
        </button>
      </IzSheet>
    </>
  );
}
