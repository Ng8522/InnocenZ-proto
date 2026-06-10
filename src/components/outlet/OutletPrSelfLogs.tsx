import { useMemo, useState } from "react";
import { QrCode, Check, X } from "lucide-react";
import { IzSheet } from "@/components/iz/Sheet";
import { OutletSection } from "@/components/outlet/OutletSection";
import { formatRM } from "@/components/iz/ui";
import { useStore } from "@/lib/store";

export function OutletPrSelfLogs({ outletName }: { outletName: string }) {
  const prSelfLogs = useStore((s) => s.prSelfLogs);
  const prs = useStore((s) => s.prs);
  const confirmOutletPrSelfLog = useStore((s) => s.confirmOutletPrSelfLog);
  const rejectOutletPrSelfLog = useStore((s) => s.rejectOutletPrSelfLog);
  const outletScanPrQr = useStore((s) => s.outletScanPrQr);
  const [qrOpen, setQrOpen] = useState(false);

  const pending = useMemo(
    () => prSelfLogs.filter((l) => l.outlet === outletName && l.status === "pending_outlet"),
    [prSelfLogs, outletName],
  );

  return (
    <>
      <OutletSection
        title="PR self-logs"
        hint={pending.length > 0 ? `${pending.length} awaiting confirmation` : "Model A — confirm or scan QR"}
        className="!mt-4"
      >
        {pending.length === 0 ? (
          <p className="iz-tiny iz-muted px-1 py-2">No pending self-logs. PRs log sales during shift — confirm here or scan their QR.</p>
        ) : (
        <div className="iz-pr-list">
          {pending.map((log) => (
            <div key={log.id} className="iz-pr-inbox-card">
              <div className="px-3 py-2.5">
                <p className="font-sora text-[13px] font-bold">{log.qty}× {log.category}</p>
                <p className="iz-tiny iz-muted mt-0.5">
                  {formatRM(log.amount)} · {log.loggedAt}
                </p>
              </div>
              <div className="flex gap-2 border-t border-[var(--iz-line)] px-3 py-2">
                <button
                  type="button"
                  className="iz-btn iz-btn-soft iz-btn-sm flex-1 !py-2"
                  onClick={() => rejectOutletPrSelfLog(log.id)}
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  type="button"
                  className="iz-btn iz-btn-primary iz-btn-sm flex-1 !py-2"
                  onClick={() => confirmOutletPrSelfLog(log.id)}
                >
                  <Check className="h-3.5 w-3.5" /> Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
        <button type="button" className="iz-outlet-quick-chip mt-3" onClick={() => setQrOpen(true)}>
          <QrCode className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> Scan PR QR
        </button>
      </OutletSection>

      <IzSheet open={qrOpen} onClose={() => setQrOpen(false)}>
        <div className="iz-cardttl">Scan PR QR</div>
        <p className="iz-tiny iz-muted mb-3">Model A — scan to attribute sales. Confirms oldest pending self-log if any.</p>
        <div className="space-y-2">
          {prs.map((p) => (
            <button
              key={p.id}
              type="button"
              className="iz-pr-offer-row w-full text-left"
              onClick={() => {
                outletScanPrQr(p.name);
                setQrOpen(false);
              }}
            >
              <span className="font-sora text-[13px] font-bold">{p.name}</span>
              <QrCode className="h-4 w-4 text-[var(--iz-muted2)]" />
            </button>
          ))}
        </div>
      </IzSheet>
    </>
  );
}
