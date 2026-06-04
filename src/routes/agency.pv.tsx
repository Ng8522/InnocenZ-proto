import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { PAYROLL_CYCLE, type PrPaymentVoucher, type PrPvStatus } from "@/lib/pr-demo";
import { Calendar, FileText, Plus } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/pv")({
  component: AgencyPV,
});

function statusPill(status: PrPvStatus): "green" | "amber" | "red" | "ink" {
  if (status === "PAID" || status === "SIGNED") return "green";
  if (status === "DISPUTED") return "red";
  return "amber";
}

function AgencyPV() {
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(null);

  const awaiting = prPaymentVouchers.filter((p) => p.status === "SENT").length;
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const queued = prPaymentVouchers.filter((p) => p.status === "SIGNED");
  const queuedTotal = queued.reduce((s, p) => s + p.net, 0);
  const paid = prPaymentVouchers.filter((p) => p.status === "PAID").length;

  const detail = prPaymentVouchers.find((p) => p.id === detailId);

  if (detail) {
    return (
      <div className="iz-screen">
        <AppTopbar />
        <PvDetail pv={detail} onClose={() => setDetailId(null)} onToast={toast} />
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">
        Payroll &amp; PV
      </h2>
      <p className="iz-tiny iz-muted mt-0.5">
        Cycle <span className="text-[var(--iz-gold-l)]">{PAYROLL_CYCLE.range}</span> · auto-generated from
        sealed shifts
      </p>

      <div className="iz-grid2 mt-3">
        <div className="iz-stat-tile">
          <div className="n">{awaiting}</div>
          <div className="l">Awaiting PR signature</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-red)]">{disputed}</div>
          <div className="l">Disputed (held)</div>
        </div>
      </div>

      <IzCard
        flat
        className="mt-2.5 border-[rgba(232,194,122,.3)] bg-[linear-gradient(180deg,rgba(232,194,122,.05),transparent)]"
      >
        <div className="iz-between">
          <div>
            <p className="iz-sm font-bold">Next weekly auto-bank-transfer</p>
            <p className="iz-tiny iz-muted mt-1">
              <Calendar className="mr-1 inline h-3 w-3" />
              {PAYROLL_CYCLE.nextTransfer}
            </p>
            <p className="iz-tiny iz-muted2 mt-0.5">
              {queued.length} PV signed + queued · {paid} PV paid out
            </p>
          </div>
          <b className="font-sora text-base text-[var(--iz-gold)]">{formatRM(queuedTotal)}</b>
        </div>
        <p className="iz-tiny iz-muted2 mt-2">
          No manual withdraw — funds move Agency → PR bank automatically once dual-signed.
        </p>
      </IzCard>

      <IzSectionLabel>Vouchers · {PAYROLL_CYCLE.range}</IzSectionLabel>
      <div className="space-y-2.5">
        {prPaymentVouchers.map((pv) => (
          <button
            key={pv.id}
            type="button"
            className="iz-card iz-between w-full cursor-pointer text-left"
            onClick={() => setDetailId(pv.id)}
          >
            <div className="min-w-0">
              <div className="font-sora text-[15px] font-bold">{pv.id}</div>
              <p className="iz-tiny iz-muted mt-0.5">
                {pv.prName} · {pv.outlet}
              </p>
              <p className="iz-tiny iz-muted2 mt-0.5">
                Cycle: {pv.cycle}
              </p>
              <p className="iz-tiny iz-muted2">
                Issued {pv.issued} · Due {pv.due}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <IzPill variant={statusPill(pv.status)}>{pv.status}</IzPill>
              <div className="iz-ledger font-sora mt-1.5 text-base font-bold">{formatRM(pv.net)}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="iz-btn iz-btn-primary mt-2"
        onClick={() => toast("New PV raised from sealed shift logs · Finance Head pre-signed", "success")}
      >
        <Plus className="h-4 w-4" /> Raise new PV
      </button>
    </div>
  );
}

function PvDetail({
  pv,
  onClose,
  onToast,
}: {
  pv: PrPaymentVoucher;
  onClose: () => void;
  onToast: (msg: string, tone?: "success" | "info" | "warn") => void;
}) {
  return (
    <>
      <div className="iz-between mb-2">
        <h2 className="font-sora text-xl font-extrabold">Payment Voucher</h2>
        <button type="button" className="iz-chip" onClick={onClose}>
          Close
        </button>
      </div>

      <IzCard>
        <div className="iz-v-sum">
          <span className="iz-muted">PV #</span>
          <b>{pv.id}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">PR</span>
          <b>{pv.prName}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Cycle</span>
          <b className="text-[var(--iz-gold-l)]">{pv.cycle}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Issued</span>
          <b>{pv.issued}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Due (PR sign-by)</span>
          <b>{pv.due}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Outlet</span>
          <b>{pv.outlet}</b>
        </div>
        <div className="iz-v-sum tot">
          <span>Net payable</span>
          <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(pv.net)}</span>
        </div>
      </IzCard>

      {pv.rows.length > 0 && (
        <>
          <IzSectionLabel>Line items · by date</IzSectionLabel>
          <IzCard>
            {pv.rows.map((r) => (
              <div key={r.i} className="iz-v-sum border-b border-[var(--iz-line)] py-2 last:border-0">
                <div className="min-w-0 pr-2">
                  <span className="iz-sm">{r.desc}</span>
                  <p className="iz-tiny iz-muted2 mt-0.5">
                    {r.date} ({r.day}) · {r.outlet} · {r.ref}
                  </p>
                </div>
                <b className="iz-ledger shrink-0">{formatRM(r.amt)}</b>
              </div>
            ))}
          </IzCard>
        </>
      )}

      {pv.status === "SENT" && (
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2.5"
          onClick={() => onToast("PV re-sent to PR for e-signature", "info")}
        >
          <FileText className="h-4 w-4" /> Re-send to PR
        </button>
      )}

      <button type="button" className="iz-btn iz-btn-soft mt-2" onClick={onClose}>
        Back to payroll
      </button>
    </>
  );
}
