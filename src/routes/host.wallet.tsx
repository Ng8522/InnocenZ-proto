import {
  FINANCE_HEAD_LABEL,
  PV_DISPUTE_PRESETS,
  downloadPvReceipt,
  getPrAgencyById,
  getPrProfile,
  pvNeedsPrReview,
  pvStatusLabel,
  pvStatusPillVariant,
  receiptPvCalcNote,
  type PrPaymentVoucher,
  type PrReceiptScan,
} from "@/lib/pr-demo";
import { downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { FileText, Check, Download, Shield, Star } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/wallet")({
  component: VouchersPage,
});

function VouchersPage() {
  const prSubRole = useStore((s) => s.prSubRole);
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const signPrPv = useStore((s) => s.signPrPv);
  const disputePrPv = useStore((s) => s.disputePrPv);
  const updatePrPvDisputeReason = useStore((s) => s.updatePrPvDisputeReason);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(null);

  const pv = prPaymentVouchers.find((p) => p.id === detailId);
  const profile = getPrProfile(prSubRole);
  const isFreelancer = prSubRole === "pr_free";
  const payrollAgency = isFreelancer ? getPrAgencyById(prPayrollAgencyId) : undefined;

  if (pv) {
    return (
      <div className="iz-screen">
        <AppTopbar />
        <PvDetail
          pv={pv}
          profile={profile}
          isFreelancer={isFreelancer}
          receiptScans={prReceiptScans}
          onBack={() => setDetailId(null)}
          onSign={() => signPrPv(pv.id)}
          onDispute={(reason) => disputePrPv(pv.id, reason)}
          onUpdateDispute={(reason) => updatePrPvDisputeReason(pv.id, reason)}
          onDownload={() => {
            downloadPvReceipt(pv, profile);
            toast("Payment receipt downloaded", "success");
          }}
          onDownloadBreakdown={() => {
            downloadPvBreakdownPdf(pv, profile, prReceiptScans);
            toast("PV breakdown opened — use Print → Save as PDF", "success");
          }}
        />
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">Payment Vouchers</h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {isFreelancer
          ? "PVs are issued by a PR agency you appoint. Review and sign — funds go straight to your bank."
          : "Agency Finance Head has pre-signed each PV. Review, then sign — funds go straight to your bank."}
      </p>

      {isFreelancer ? (
        <div className="mt-2.5">
          {payrollAgency ? (
            <IzCard flat className="border-[rgba(217,185,122,.25)]">
              <p className="iz-sm font-bold text-[var(--iz-gold-l)]">Payroll via {payrollAgency.name}</p>
              <p className="iz-tiny iz-muted mt-1">
                {payrollAgency.financeHead} (Finance) raises PVs for your sealed shifts. Change agency on{" "}
                <Link to="/host/profile" className="text-[var(--iz-blue)] underline-offset-2 hover:underline">
                  Profile
                </Link>
                .
              </p>
            </IzCard>
          ) : (
            <FreelancerPayrollNotice compact />
          )}
        </div>
      ) : (
        <IzCard flat className="iz-tiny iz-muted mt-2.5">
          <Shield className="mr-1 inline h-3 w-3" />
          Payment route: Outlet → Agency → your registered bank account.
        </IzCard>
      )}

      <div className="mt-3 space-y-2.5">
        {prPaymentVouchers.map((p) => {
          const pill = pvStatusPillVariant(p.status);
          return (
            <button
              key={p.id}
              type="button"
              className="iz-card iz-between w-full cursor-pointer text-left"
              onClick={() => setDetailId(p.id)}
            >
              <div className="min-w-0">
                <div className="font-sora text-[15px] font-bold">{p.id}</div>
                <p className="iz-tiny iz-muted mt-0.5">
                  {p.outlet} · {p.cycle}
                </p>
                <p className="iz-tiny mt-1 text-[var(--iz-green)]">
                  <Check className="mr-0.5 inline h-3 w-3" />
                  Agency signed · {p.financeHeadSignedAt}
                </p>
                {p.status === "PENDING_REVIEW" && (
                  <p className="iz-tiny mt-1 text-[var(--iz-amber)]">Review line items before you sign or dispute</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <IzPill variant={pill}>{pvStatusLabel(p.status)}</IzPill>
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
  isFreelancer,
  receiptScans,
  onBack,
  onSign,
  onDispute,
  onUpdateDispute,
  onDownload,
  onDownloadBreakdown,
}: {
  pv: PrPaymentVoucher;
  profile: ReturnType<typeof getPrProfile>;
  isFreelancer: boolean;
  receiptScans: PrReceiptScan[];
  onBack: () => void;
  onSign: () => void;
  onDispute: (reason: string) => void;
  onUpdateDispute: (reason: string) => void;
  onDownload: () => void;
  onDownloadBreakdown: () => void;
}) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [editDisputeReason, setEditDisputeReason] = useState(pv.prDisputeReason ?? "");

  useEffect(() => {
    setEditDisputeReason(pv.prDisputeReason ?? "");
  }, [pv.id, pv.prDisputeReason]);

  const prSigned = pv.status === "PAID" || pv.status === "SIGNED" || Boolean(pv.prSignedAt);
  const canDownload = pv.status === "PAID";
  const needsReview = pvNeedsPrReview(pv.status);
  const disputeDirty =
    pv.status === "DISPUTED" && editDisputeReason.trim() !== (pv.prDisputeReason ?? "").trim();
  const linkedReceipts = receiptScans.filter(
    (s) =>
      s.pvId === pv.id ||
      pv.receiptIds?.includes(s.id) ||
      pv.rows.some((r) => r.receiptIds?.includes(s.id)),
  );

  const submitDispute = () => {
    onDispute(disputeReason);
    setDisputeOpen(false);
    setDisputeReason("");
  };

  const saveDisputeEdits = () => {
    const trimmed = editDisputeReason.trim();
    if (!trimmed) return;
    onUpdateDispute(trimmed);
    setEditDisputeReason(trimmed);
  };

  return (
    <>
      <div className="iz-between mb-2.5">
        <h2 className="font-sora text-xl font-extrabold">Payment Voucher</h2>
        <div className="flex items-center gap-2">
          <IzPill variant={pvStatusPillVariant(pv.status)}>{pvStatusLabel(pv.status)}</IzPill>
          <button type="button" className="iz-chip" onClick={onBack}>
            Close
          </button>
        </div>
      </div>

      {pv.status === "PENDING_REVIEW" && (
        <IzCard flat className="mb-2.5 border-[rgba(232,194,122,.35)] bg-[linear-gradient(180deg,rgba(232,194,122,.1),transparent)]">
          <p className="iz-sm font-bold text-[var(--iz-gold-l)]">Pending your review</p>
          <p className="iz-tiny iz-muted mt-1">
            Finance Head has pre-signed this PV. Check every line item and linked receipt scans below. Sign if correct,
            or raise a dispute with a clear description for your agency.
          </p>
          <p className="iz-tiny iz-muted2 mt-1">Sign-by: {pv.due}</p>
        </IzCard>
      )}

      <IzCard>
        <div className="iz-v-sum">
          <span className="iz-muted">PV #</span>
          <b>{pv.id}</b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Cycle</span>
          <b>{pv.cycle}</b>
        </div>
        {pv.shiftTime && (
          <div className="iz-v-sum">
            <span className="iz-muted">Shift</span>
            <b>{pv.shiftTime}</b>
          </div>
        )}
        {pv.timeIn && (
          <div className="iz-v-sum">
            <span className="iz-muted">Time-In</span>
            <b>{pv.timeIn}</b>
          </div>
        )}
        {pv.timeOut && (
          <div className="iz-v-sum">
            <span className="iz-muted">Time-Out</span>
            <b>{pv.timeOut}</b>
          </div>
        )}
        {pv.receiptIds && pv.receiptIds.length > 0 && (
          <div className="iz-v-sum">
            <span className="iz-muted">Receipt scans</span>
            <b>{pv.receiptIds.length} on this shift</b>
          </div>
        )}
        <div className="iz-v-sum">
          <span className="iz-muted">Outlet</span>
          <b>{pv.outlet}</b>
        </div>
        {pv.deduct > 0 && (
          <div className="iz-v-sum">
            <span className="iz-muted">Deductions</span>
            <b className="text-[var(--iz-red)]">-{formatRM(pv.deduct)}</b>
          </div>
        )}
        <div className="iz-v-sum tot">
          <span>Net payable</span>
          <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(pv.net)}</span>
        </div>
      </IzCard>

      {pv.rows.length > 0 && (
        <IzCard className="mt-2.5">
          <div className="iz-tiny iz-muted2 mb-2 tracking-widest">PV LINE ITEMS</div>
          <div className="iz-data-table-wrap">
            <table className="iz-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Ref</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pv.rows.map((r) => (
                  <tr key={r.i}>
                    <td>{r.date}</td>
                    <td>{r.desc}</td>
                    <td>{r.ref}</td>
                    <td className="text-right">{formatRM(r.amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </IzCard>
      )}

      {linkedReceipts.length > 0 && (
        <IzCard className="mt-2.5">
          <div className="iz-tiny iz-muted2 mb-2 tracking-widest">LINKED RECEIPT SCANS</div>
          <div className="iz-data-table-wrap">
            <table className="iz-data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Belongs to PV</th>
                  <th>Logged</th>
                  <th className="text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {linkedReceipts.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="font-semibold">{s.id}</div>
                      <div className="iz-tiny iz-muted2">{s.scannedAt}</div>
                    </td>
                    <td className="font-semibold text-[var(--iz-gold-l)]">{s.pvId ?? pv.id}</td>
                    <td>{formatRM(s.totalLogged)}</td>
                    <td className="text-right text-[var(--iz-gold-l)]">{formatRM(s.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/host/history" search={{ tab: "receipts" }} className="iz-tiny mt-2 inline-block text-[var(--iz-blue)] underline-offset-2 hover:underline">
            View all receipt records
          </Link>
        </IzCard>
      )}

      <button type="button" className="iz-btn iz-btn-soft mt-2.5 w-full" onClick={onDownloadBreakdown}>
        <FileText className="h-4 w-4" /> Download PV breakdown (PDF)
      </button>
      <p className="iz-tiny iz-muted2 mt-1.5 text-center">
        Atmosphere-style voucher with line items, receipt scans, totals, and signatures.
      </p>

      <IzCard className="mt-2.5">
        <div className="iz-tiny iz-muted2 mb-2 tracking-widest">E-SIGNATURES</div>
        <SignatureBlock
          role={FINANCE_HEAD_LABEL}
          name={pv.financeHeadName}
          signedAt={pv.financeHeadSignedAt}
          signed
        />
        <SignatureBlock
          role="PR Personnel"
          name={profile.name}
          signedAt={pv.prSignedAt}
          signed={prSigned}
        />
      </IzCard>

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <div>Payee: {profile.name}</div>
        <div>Bank: {profile.bank} {profile.acc}</div>
        {isFreelancer && (
          <p className="mt-2 text-[var(--iz-blue)]">
            Payroll via your appointed PR agency — ask them to raise PVs for your sealed shifts.
          </p>
        )}
      </IzCard>

      {needsReview && (
        <>
          <IzCard flat className="iz-tiny iz-muted mt-2.5">
            <Shield className="mr-1 inline h-3 w-3" />
            {pv.financeHeadName} (Finance Head) has already e-signed. Your signature completes the PV — payment
            transfers immediately to {profile.bank} {profile.acc}. No wallet or withdraw step.
          </IzCard>
          <div className="iz-grid2 mt-2.5">
            <button type="button" className="iz-btn iz-btn-ghost" onClick={() => setDisputeOpen(true)}>
              Raise Dispute
            </button>
            <button type="button" className="iz-btn iz-btn-primary" onClick={onSign}>
              Sign &amp; send to bank
            </button>
          </div>
        </>
      )}

      <IzSheet open={disputeOpen} onClose={() => setDisputeOpen(false)}>
        <div className="iz-cardttl">Raise dispute</div>
        <p className="iz-tiny iz-muted mb-3">
          Payment is held until your agency verifies. Describe the issue clearly — include dates, amounts, or receipt
          scan IDs if relevant.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PV_DISPUTE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="iz-hist-chip max-w-full text-left"
              onClick={() => setDisputeReason(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="iz-tiny iz-muted2 mb-1 block tracking-wide">YOUR DESCRIPTION (REQUIRED)</label>
        <textarea
          className="iz-pv-dispute-input"
          rows={5}
          placeholder="e.g. Drink commission on 9 May shows RM120 but my scans total 8 cocktails — outlet log shows 18 units. Please check with Bear Lounge."
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
          aria-label="Dispute reason"
        />
        <p className="iz-tiny iz-muted2 mt-2">{disputeReason.trim().length} characters · min 10 recommended</p>
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-4"
          disabled={!disputeReason.trim()}
          onClick={submitDispute}
        >
          Submit dispute to agency
        </button>
        <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={() => setDisputeOpen(false)}>
          Cancel
        </button>
      </IzSheet>

      {pv.status === "SIGNED" && (
        <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-green)]">Dual-signed — transfer processing</p>
          <p className="iz-tiny iz-muted mt-1">Sending to {profile.bank} {profile.acc}…</p>
        </IzCard>
      )}

      {pv.status === "DISPUTED" && (
        <IzCard className="mt-2.5 border-[rgba(255,107,107,.3)] bg-[var(--iz-red-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-red)]">Dispute open — payment held</p>
          {pv.disputedAt && (
            <p className="iz-tiny iz-muted mt-1">
              Submitted {pv.disputedAt}
              {pv.disputeUpdatedAt && (
                <span className="text-[var(--iz-amber)]"> · Updated {pv.disputeUpdatedAt}</span>
              )}
            </p>
          )}
          <div className="mt-2">
            <label className="iz-tiny iz-muted2 tracking-wide">YOUR DISPUTE REASON (EDITABLE)</label>
            <textarea
              className="iz-pv-dispute-input mt-1.5"
              rows={5}
              placeholder="Describe the issue for your agency to verify…"
              value={editDisputeReason}
              onChange={(e) => setEditDisputeReason(e.target.value)}
              aria-label="Edit dispute reason"
            />
            <p className="iz-tiny iz-muted2 mt-1.5">
              Tap a preset below or edit the text — save so agency sees your latest notes.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PV_DISPUTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="iz-hist-chip max-w-full text-left"
                  onClick={() => setEditDisputeReason(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="iz-grid2 mt-3">
            <button
              type="button"
              className="iz-btn iz-btn-soft"
              disabled={!disputeDirty}
              onClick={() => setEditDisputeReason(pv.prDisputeReason ?? "")}
            >
              Reset
            </button>
            <button
              type="button"
              className="iz-btn iz-btn-primary"
              disabled={!editDisputeReason.trim() || !disputeDirty}
              onClick={saveDisputeEdits}
            >
              Save changes
            </button>
          </div>
          <p className="iz-tiny iz-muted2 mt-2">Agency will re-issue a corrected PV after verification with the outlet.</p>
        </IzCard>
      )}

      {pv.status === "PAID" && (
        <>
          <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
            <p className="iz-sm font-bold text-[var(--iz-green)]">PAID · {formatRM(pv.net)} in your bank</p>
            <p className="iz-tiny iz-muted mt-1">
              Transferred {pv.paidAt ?? "—"} → {profile.bank} {profile.acc}
            </p>
            {pv.bankRef && (
              <p className="iz-tiny iz-muted2 mt-1 font-mono">Ref: {pv.bankRef}</p>
            )}
          </IzCard>
          <button type="button" className="iz-btn iz-btn-primary mt-2.5" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download payment receipt
          </button>
        </>
      )}

      {canDownload && (
        <p className="iz-tiny iz-muted2 mt-2 text-center">
          Receipt includes PV breakdown, both signatures, and bank transfer reference.
        </p>
      )}

      <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={onBack}>
        Back
      </button>
    </>
  );
}

function SignatureBlock({
  role,
  name,
  signedAt,
  signed,
}: {
  role: string;
  name: string;
  signedAt?: string;
  signed: boolean;
}) {
  return (
    <div className={`iz-pv-sig${signed ? " signed" : " pending"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className={`iz-pv-sig-ico${signed ? " ok" : ""}`}>
          {signed ? <Check className="h-3.5 w-3.5" /> : <Star className="h-3 w-3 opacity-40" />}
        </span>
        <div className="min-w-0">
          <div className="iz-tiny iz-muted2 tracking-wide">{role}</div>
          <div className="iz-sm font-semibold">{name}</div>
          <div className="iz-tiny iz-muted mt-0.5">{signed ? signedAt ?? "Signed" : "Awaiting signature"}</div>
        </div>
      </div>
      <IzPill variant={signed ? "green" : "ink"}>{signed ? "Signed" : "Pending"}</IzPill>
    </div>
  );
}
