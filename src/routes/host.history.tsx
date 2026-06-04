import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { HIST_ROWS, dayName, fmtDtable } from "@/lib/pr-demo";
import { useStore } from "@/lib/store";
import { Calendar, FileText, Shield } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);

  const lifetime = prPaymentVouchers.reduce(
    (a, p) => (p.status === "SIGNED" || p.status === "PAID" ? a + p.net : a),
    0,
  );
  const paid = prPaymentVouchers.filter((p) => p.status === "PAID").reduce((a, p) => a + p.net, 0);
  const pending = prPaymentVouchers.filter((p) => p.status === "SENT").reduce((a, p) => a + p.net, 0);

  const rows = useMemo(() => [...HIST_ROWS].reverse(), []);

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">History</h2>
      <p className="iz-tiny iz-muted mt-0.5">
        Every shift you&apos;ve worked. No manual withdraw ù weekly auto-bank-transfer from Agency to your bank after
        dual-sign.
      </p>

      <div className="iz-feature-card mt-3">
        <div className="lbl">Lifetime earnings</div>
        <div className="big-num">{formatRM(lifetime)}</div>
        <div className="iz-grid2 mt-1">
          <div>
            <div className="iz-tiny iz-muted2 tracking-wide">PAID THIS CYCLE</div>
            <b className="font-sora mt-0.5 block text-base text-[var(--iz-gold-l)]">{formatRM(paid)}</b>
          </div>
          <div>
            <div className="iz-tiny iz-muted2 tracking-wide">PENDING PV</div>
            <b className="font-sora mt-0.5 block text-base text-[var(--iz-gold-l)]">{formatRM(pending)}</b>
          </div>
        </div>
      </div>

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <Shield className="mr-1 inline h-3 w-3" />
        Funds auto-route Agency ? your bank account on the weekly cron. PV status flips <b>Signed ? PAID</b> on transfer
        completion.
      </IzCard>

      <IzSectionLabel>Shift history</IzSectionLabel>

      {rows.map((r) => {
        const pill =
          r.pill === "green" ? "green" : r.pill === "amber" ? "amber" : r.pill === "red" ? "red" : "ink";
        return (
          <IzCard key={`${r.venue}-${r.d.join("-")}`} className="mb-2.5">
            <div className="iz-between mb-2">
              <div>
                <div className="font-sora text-sm font-bold">{r.venue}</div>
                <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">
                  <Calendar className="mr-1 inline h-2.5 w-2.5" />
                  {dayName(r.d[0], r.d[1], r.d[2])} ù {fmtDtable(r.d[0], r.d[1], r.d[2])} {r.d[0]}
                </div>
              </div>
              <IzPill variant={pill}>{r.st}</IzPill>
            </div>
            <div className="iz-grid2 gap-2">
              <div className="iz-stat-tile p-2">
                <div className="n text-[15px] text-[var(--iz-gold)]">{formatRM(r.wages)}</div>
                <div className="l">Daily wages</div>
              </div>
              <div className="iz-stat-tile p-2">
                <div className="n text-[15px] text-[var(--iz-gold)]">{formatRM(r.sales)}</div>
                <div className="l">Total sales</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <IzPill variant="ink" className="flex-1 justify-center py-1.5 text-center">
                <span className="iz-tiny iz-muted2 text-[9px]">TABLES</span>
                <br />
                <b className="text-[13px] text-[var(--iz-gold-l)]">RM {r.table}</b>
              </IzPill>
              <IzPill variant="ink" className="flex-1 justify-center py-1.5 text-center">
                <span className="iz-tiny iz-muted2 text-[9px]">DRINKS</span>
                <br />
                <b className="text-[13px] text-[var(--iz-gold-l)]">{r.drinks}</b>
              </IzPill>
              <IzPill variant="ink" className="flex-1 justify-center py-1.5 text-center">
                <span className="iz-tiny iz-muted2 text-[9px]">TIPS</span>
                <br />
                <b className="text-[13px] text-[var(--iz-gold-l)]">RM {r.tips}</b>
              </IzPill>
            </div>
          </IzCard>
        );
      })}

      <Link to="/host/wallet" className="iz-btn iz-btn-soft mt-2">
        <FileText className="h-4 w-4" /> View payment vouchers
      </Link>
    </div>
  );
}
