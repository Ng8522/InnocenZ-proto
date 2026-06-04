import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { getPrProfile, type PrPaymentVoucher } from "@/lib/pr-demo";
import { Shield } from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/wallet")({
  component: VouchersPage,
});

function VouchersPage() {
  const prSubRole = useStore((s) => s.prSubRole);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const signPrPv = useStore((s) => s.signPrPv);
  const disputePrPv = useStore((s) => s.disputePrPv);
  const [detailId, setDetailId] = useState<string | null>(null);

  const pv = prPaymentVouchers.find((p) => p.id === detailId);
  const profile = getPrProfile(prSubRole);

  if (pv) {
    return (
      <div className="iz-screen">
        <AppTopbar />
        <PvDetail
          pv={pv}
          profile={profile}
          onBack={() => setDetailId(null)}
          onSign={() => {
            signPrPv(pv.id);
          }}
          onDispute={() => disputePrPv(pv.id)}
        />
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">Payment Vouchers</h2>
      <p className="iz-tiny iz-muted mt-0.5">Review each line item, then sign or dispute. 4-part breakdown per outlet.</p>

      <div className="mt-3 space-y-2.5">
        {prPaymentVouchers.map((p) => {
          const pill =
            p.status === "PAID" || p.status === "SIGNED"
              ? "green"
              : p.status === "DISPUTED"
                ? "red"
                : "amber";
          return (
            <button
              key={p.id}
              type="button"
              className="iz-card iz-between w-full cursor-pointer text-left"
              onClick={() => setDetailId(p.id)}
            >
              <div>
                <div className="font-sora text-[15px] font-bold">{p.id}</div>
                <p className="iz-tiny iz-muted mt-0.5">
                  {p.outlet} · {p.cycle}
                </p>
              </div>
              <div className="text-right">
                <IzPill variant={pill}>{p.status}</IzPill>
                <div className="iz-ledger font-sora mt-1.5 text-base font-bold">{formatRM(p.net)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PvDetail({
  pv,
  profile,
  onBack,
  onSign,
  onDispute,
}: {
  pv: PrPaymentVoucher;
  profile: ReturnType<typeof getPrProfile>;
  onBack: () => void;
  onSign: () => void;
  onDispute: () => void;
}) {
  return (
    <>
      <div className="iz-between mb-2.5">
        <h2 className="font-sora text-xl font-extrabold">Payment Voucher</h2>
        <button type="button" className="iz-chip" onClick={onBack}>
          Close
        </button>
      </div>

      <IzCard>
        <div className="iz-v-sum">
          <span className="iz-muted">PV #</span>
          <b>{pv.id}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Cycle</span>
          <b>{pv.cycle}</b>
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
        <IzCard className="mt-2.5">
          {pv.rows.map((r) => (
            <div key={r.i} className="iz-v-sum border-b border-[var(--iz-line)] py-2 last:border-0">
              <span className="iz-tiny iz-muted">
                {r.date} · {r.desc}
              </span>
              <b>{formatRM(r.amt)}</b>
            </div>
          ))}
        </IzCard>
      )}

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <div>Payee: {profile.name}</div>
        <div>Bank: {profile.bank} {profile.acc}</div>
      </IzCard>

      {pv.status === "SENT" && (
        <>
          <IzCard flat className="iz-tiny iz-muted mt-2.5">
            <Shield className="mr-1 inline h-3 w-3" />
            Finance Head has already e-signed. Your signature is the 2nd of 2 required. After dual-sign, funds
            auto-transfer on the next weekly run — no manual withdraw.
          </IzCard>
          <div className="iz-grid2 mt-2.5">
            <button type="button" className="iz-btn iz-btn-ghost" onClick={onDispute}>
              Raise Dispute
            </button>
            <button type="button" className="iz-btn iz-btn-primary" onClick={onSign}>
              Sign & Confirm
            </button>
          </div>
        </>
      )}
      {pv.status === "SIGNED" && (
        <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-green)]">Dual-signed</p>
          <p className="iz-tiny iz-muted mt-1">
            Queued for weekly auto-bank-transfer (Agency → {profile.bank} {profile.acc}).
          </p>
        </IzCard>
      )}
      {pv.status === "DISPUTED" && (
        <IzCard className="mt-2.5 border-[rgba(255,107,107,.3)] bg-[var(--iz-red-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-red)]">Dispute open</p>
          <p className="iz-tiny iz-muted mt-1">Payment held. Agency will re-issue a v2 after resolution.</p>
        </IzCard>
      )}
      {pv.status === "PAID" && (
        <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-green)]">PAID · {formatRM(pv.net)} transferred</p>
          <p className="iz-tiny iz-muted mt-1">
            Funds received in {profile.bank} {profile.acc}.
          </p>
        </IzCard>
      )}
      <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={onBack}>
        Back
      </button>
    </>
  );
}
