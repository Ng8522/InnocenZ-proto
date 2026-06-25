import {
  getShiftToday,
  filterPvsForPrProfile,
  filterReceiptScansForPrProfile,
  getPrAgencyById,
  getPrProfile,
  getPrRosterId,
  getPvNetTotal,
  pvNeedsPrReview,
  pvStatusLabel,
  pvStatusPillVariant,
  calcReceiptCommissions,
  DEMO_PV_ISSUED_WEEKS_AGO,
  demoPayrollWeekBoundsForWeeksAgo,
  type PrPaymentVoucher,
  type PrReceiptScan,
  type PrSubRole,
} from "@/lib/pr-demo";
import { PvSummaryView } from "@/components/iz/PvSummaryView";
import { PrWeeklyPaymentWeekCard } from "@/components/pr/PrWeeklyPaymentWeekCard";
import { PrWeeklyPaymentGrid } from "@/components/pr/PrWeeklyPaymentGrid";
import { PrPvDisputeSheet } from "@/components/pr/PrPvDisputeSheet";
import {
  buildWeeklyDisputeMessage,
  pvHasOpenDisputes,
  type WeeklyDisputeTarget,
} from "@/lib/pr-weekly-payment";
import { viewPvBreakdownPdf } from "@/lib/pv-pdf";
import { payeeFromPrPortal } from "@/lib/pv-template";
import { isPrPaymentActionPv } from "@/lib/pr-payment-history";
import {
  buildWeeklyPaymentSummary,
  getWeekBounds,
  getPreviousWeekBounds,
  isWeekPvIssued,
  syncWeeklyPvWithSummary,
} from "@/lib/pr-weekly-payment";
import { usePrPortalReady } from "@/lib/use-pr-sub-role";
import {
  FileText,
  Check,
  Shield,
  Star,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { IzSheet } from "@/components/iz/Sheet";
import { PrSignaturePad } from "@/components/pr/PrSignaturePad";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/host/PaymentVoucher")({
  validateSearch: (search: Record<string, unknown>): { pvId?: string } => ({
    pvId: typeof search.pvId === "string" ? search.pvId : undefined,
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { pvId: searchPvId } = Route.useSearch();
  const { ready, role: prSubRole } = usePrPortalReady();

  if (!ready || !prSubRole) {
    return (
      <div className="iz-screen">
        <AppTopbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--iz-line)] border-t-[var(--iz-gold)]" />
          <p className="iz-tiny iz-muted">Loading payment…</p>
        </div>
      </div>
    );
  }

  return <PaymentLoaded prSubRole={prSubRole} searchPvId={searchPvId} />;
}

function PaymentLoaded({ prSubRole, searchPvId }: { prSubRole: PrSubRole; searchPvId?: string }) {
  const navigate = useNavigate();
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prIcName = useStore((s) => s.prIcName);
  const prMobile = useStore((s) => s.prMobile);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const signPrPv = useStore((s) => s.signPrPv);
  const disputePrPv = useStore((s) => s.disputePrPv);
  const updatePrPvDisputeReason = useStore((s) => s.updatePrPvDisputeReason);
  const withdrawPrPvDispute = useStore((s) => s.withdrawPrPvDispute);
  const ensurePreviousWeekPv = useStore((s) => s.ensurePreviousWeekPv);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(searchPvId ?? null);
  const [weekTab, setWeekTab] = useState<"last" | "current">("last");

  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);
  const agencyPr = agencyPRs.find((p) => p.id === prId);
  const portalPayee = useMemo(
    () =>
      payeeFromPrPortal(prSubRole, profile, {
        prDisplayName,
        prIcName,
        prMobile,
        agencyPr,
      }),
    [prSubRole, profile, prDisplayName, prIcName, prMobile, agencyPr],
  );
  const isFreelancer = prSubRole === "pr_free";
  const payrollAgency = isFreelancer ? getPrAgencyById(prPayrollAgencyId) : undefined;
  const myVouchers = useMemo(
    () => filterPvsForPrProfile(prPaymentVouchers, profile, prSubRole),
    [prPaymentVouchers, profile, prSubRole],
  );
  const myReceiptScans = useMemo(
    () => filterReceiptScansForPrProfile(prReceiptScans, profile, prSubRole, myVouchers),
    [prReceiptScans, profile, prSubRole, myVouchers],
  );
  const prevWeekBounds = useMemo(() => {
    if (prSubRole === "pr_tied") {
      const demo = demoPayrollWeekBoundsForWeeksAgo(0);
      const cal = getPreviousWeekBounds();
      return {
        ...cal,
        startIso: demo.weekStartIso,
        endIso: demo.weekEndIso,
        label: demo.cycle,
      };
    }
    return getPreviousWeekBounds();
  }, [prSubRole]);
  const previousWeekPv = useMemo(
    () =>
      myVouchers.find((p) => DEMO_PV_ISSUED_WEEKS_AGO[p.id] === 0) ??
      myVouchers.find((p) => p.weekStartIso === prevWeekBounds.startIso),
    [myVouchers, prevWeekBounds.startIso],
  );

  useEffect(() => {
    ensurePreviousWeekPv();
  }, [ensurePreviousWeekPv]);
  const weekBounds = useMemo(() => getWeekBounds(getShiftToday()), []);
  const currentWeekPv = useMemo(
    () => myVouchers.find((p) => p.weekStartIso === weekBounds.startIso),
    [myVouchers, weekBounds.startIso],
  );
  const previousWeekSummary = useMemo(
    () =>
      buildWeeklyPaymentSummary({
        weekStartIso: prevWeekBounds.startIso,
        reference: getShiftToday(),
        pv: previousWeekPv,
        shiftHistory,
        scans: myReceiptScans,
        prId,
      }),
    [prevWeekBounds.startIso, previousWeekPv, shiftHistory, myReceiptScans, prId],
  );
  const prevWeekIssued = isWeekPvIssued(prevWeekBounds.endIso);
  const currentWeekSummary = useMemo(
    () =>
      buildWeeklyPaymentSummary({
        reference: getShiftToday(),
        pv: isWeekPvIssued(weekBounds.endIso) ? currentWeekPv : null,
        shiftHistory,
        scans: myReceiptScans,
        prId,
      }),
    [currentWeekPv, weekBounds.endIso, shiftHistory, myReceiptScans, prId],
  );

  useEffect(() => {
    if (searchPvId) setDetailId(searchPvId);
  }, [searchPvId]);

  const handlePvDispute = (
    pvId: string,
    status: PrPaymentVoucher["status"],
    reason: string,
    photos?: string[],
    targets?: WeeklyDisputeTarget[],
  ) => {
    if (status === "DISPUTED") {
      updatePrPvDisputeReason(pvId, reason, photos, targets);
    } else {
      disputePrPv(pvId, reason, photos, targets);
    }
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    void navigate({ to: "/host/PaymentVoucher", search: { pvId: id }, replace: true });
  };

  const closeDetail = () => {
    setDetailId(null);
    void navigate({ to: "/host/PaymentVoucher", search: {}, replace: true });
  };

  const pv = myVouchers.find((p) => p.id === detailId);

  useEffect(() => {
    if (!detailId || !pv) return;
    if (!isPrPaymentActionPv(pv)) {
      void navigate({
        to: "/host/history",
        search: { tab: "payment", pvId: pv.id },
        replace: true,
      });
    }
  }, [detailId, pv, navigate]);

  if (pv && isPrPaymentActionPv(pv)) {
    return (
      <div className="iz-screen">
        <AppTopbar onBack={closeDetail} backLabel="Payment" />
        <PvDetail
          pv={pv}
          profile={profile}
          isFreelancer={isFreelancer}
          receiptScans={myReceiptScans}
          shiftHistory={shiftHistory}
          prId={prId}
          onBack={closeDetail}
          onSign={(signatureDataUrl) => signPrPv(pv.id, signatureDataUrl)}
          onDispute={(reason, photos, targets) =>
            handlePvDispute(pv.id, pv.status, reason, photos, targets)
          }
          onWithdrawDispute={(targets) => withdrawPrPvDispute(pv.id, targets)}
          onViewPdf={() => {
            viewPvBreakdownPdf(pv, portalPayee, myReceiptScans);
            toast("Official PV opened — use Print → Save as PDF to download", "success");
          }}
          payee={portalPayee}
        />
      </div>
    );
  }

  const lastWeekActionPv =
    previousWeekPv && isPrPaymentActionPv(previousWeekPv) ? previousWeekPv : null;
  const currentWeekActionPv =
    currentWeekPv && currentWeekSummary.pvReady && isPrPaymentActionPv(currentWeekPv)
      ? currentWeekPv
      : null;
  const lastWeekNeedsReview = Boolean(
    lastWeekActionPv &&
      (pvNeedsPrReview(lastWeekActionPv.status) || lastWeekActionPv.status === "DISPUTED"),
  );

  return (
    <div className="iz-screen">
      <AppTopbar />

      <PrPageHeader
        label="Payroll"
        title="Payment"
        meta={
          isFreelancer
            ? "Inbox · SENT only — sign last week's PV, then view signed/paid in History"
            : "Review & sign · unsigned PVs only — signed/paid moved to History"
        }
      />

      {isFreelancer ? (
        payrollAgency ? (
          <p className="iz-tiny iz-muted mt-3 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Payroll via <b className="text-[var(--iz-gold-l)]">{payrollAgency.name}</b> · change on{" "}
            <Link to="/host/profile" className="text-[var(--iz-blue)]">
              Profile
            </Link>
          </p>
        ) : (
          <div className="mt-3">
            <FreelancerPayrollNotice compact />
          </div>
        )
      ) : (
        <p className="iz-tiny iz-muted mt-3 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
          <Shield className="mr-1 inline h-3 w-3" />
          Outlet → Agency → your bank · one PV per week (issued Sunday)
        </p>
      )}

      <div className="iz-hist-tabs mt-3" role="tablist" aria-label="Payroll week">
        <button
          type="button"
          role="tab"
          aria-selected={weekTab === "last"}
          className={weekTab === "last" ? "active" : ""}
          onClick={() => setWeekTab("last")}
        >
          <span className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1.5">
              Last week
              {lastWeekNeedsReview && weekTab !== "last" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--iz-amber)]" aria-hidden />
              ) : null}
            </span>
            <span className="iz-tiny iz-muted2 font-normal">{previousWeekSummary.weekLabel}</span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={weekTab === "current"}
          className={weekTab === "current" ? "active" : ""}
          onClick={() => setWeekTab("current")}
        >
          <span className="flex flex-col items-center gap-0.5">
            <span>This week</span>
            <span className="iz-tiny iz-muted2 font-normal">{currentWeekSummary.weekLabel}</span>
          </span>
        </button>
      </div>

      {weekTab === "last" ? (
        <PrWeeklyPaymentWeekCard
          title="Last week"
          summary={previousWeekSummary}
          weekPhase={prevWeekIssued ? "issued" : "open"}
          defaultOpen
          pv={lastWeekActionPv}
          onOpenPv={openDetail}
          onDispute={
            lastWeekActionPv
              ? (reason, photos, targets) =>
                  handlePvDispute(lastWeekActionPv.id, lastWeekActionPv.status, reason, photos, targets)
              : undefined
          }
          onWithdrawDispute={
            lastWeekActionPv
              ? (targets) => withdrawPrPvDispute(lastWeekActionPv.id, targets)
              : undefined
          }
        />
      ) : (
        <PrWeeklyPaymentWeekCard
          title="This week"
          summary={currentWeekSummary}
          weekPhase="open"
          defaultOpen
          pv={currentWeekActionPv}
          onOpenPv={openDetail}
        />
      )}
    </div>
  );
}

function PvDetail({
  pv,
  profile,
  payee,
  isFreelancer,
  receiptScans,
  shiftHistory,
  prId,
  onBack,
  onSign,
  onDispute,
  onWithdrawDispute,
  onViewPdf,
}: {
  pv: PrPaymentVoucher;
  profile: ReturnType<typeof getPrProfile>;
  payee: ReturnType<typeof payeeFromPrPortal>;
  isFreelancer: boolean;
  receiptScans: PrReceiptScan[];
  shiftHistory: ReturnType<typeof useStore.getState>["shiftHistory"];
  prId: string;
  onBack: () => void;
  onSign: (signatureDataUrl: string) => void;
  onDispute?: (reason: string, photoDataUrls?: string[], targets?: WeeklyDisputeTarget[]) => void;
  onWithdrawDispute?: (targets: WeeklyDisputeTarget[]) => void;
  onViewPdf: () => void;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const [disputeSheetOpen, setDisputeSheetOpen] = useState(false);
  const [disputeMode, setDisputeMode] = useState<"dispute" | "withdraw">("dispute");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<string[]>([]);
  const [disputeTargets, setDisputeTargets] = useState<WeeklyDisputeTarget[]>([]);
  const [activeDisputeKey, setActiveDisputeKey] = useState<string | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<PrReceiptScan | null>(null);

  const prSigned = pv.status === "PAID" || pv.status === "SIGNED" || Boolean(pv.prSignedAt);
  const needsReview = pvNeedsPrReview(pv.status) || pv.status === "DISPUTED";
  const linkedReceipts = receiptScans.filter(
    (s) =>
      s.pvId === pv.id ||
      pv.receiptIds?.includes(s.id) ||
      pv.rows.some((r) => r.receiptIds?.includes(s.id)),
  );

  const weekSummary = useMemo(
    () =>
      buildWeeklyPaymentSummary({
        weekStartIso: pv.weekStartIso,
        reference: getShiftToday(),
        pv,
        shiftHistory,
        scans: receiptScans,
        prId,
      }),
    [pv, shiftHistory, receiptScans, prId],
  );

  const syncedPv = useMemo(
    () => (pv.weekStartIso ? syncWeeklyPvWithSummary(pv, weekSummary) : pv),
    [pv, weekSummary],
  );

  const hasOpenDisputes = pvHasOpenDisputes(pv, weekSummary);
  const canDispute = needsReview && Boolean(onDispute);
  const canSign = needsReview && !hasOpenDisputes;

  const openDisputeForDay = (targets: WeeklyDisputeTarget[]) => {
    if (!canDispute || targets.length === 0) return;
    const text = targets.map((t) => buildWeeklyDisputeMessage(t)).join("\n\n");
    setDisputeMode("dispute");
    setDisputeTargets(targets);
    setDisputeReason(text);
    if (targets.length === 1) {
      const t = targets[0];
      setActiveDisputeKey(`${t.dateIso}-${t.incomeKey}`);
    } else {
      setActiveDisputeKey(null);
    }
    setDisputeSheetOpen(true);
  };

  const openWithdrawForDay = (targets: WeeklyDisputeTarget[]) => {
    if (!onWithdrawDispute || targets.length === 0) return;
    setDisputeMode("withdraw");
    setDisputeTargets(targets);
    setDisputeReason("");
    if (targets.length === 1) {
      const t = targets[0];
      setActiveDisputeKey(`${t.dateIso}-${t.incomeKey}`);
    } else {
      setActiveDisputeKey(null);
    }
    setDisputeSheetOpen(true);
  };

  const closeDisputeSheet = () => {
    setDisputeSheetOpen(false);
    setDisputeTargets([]);
    setActiveDisputeKey(null);
  };

  const submitDispute = () => {
    if (!onDispute || !disputeReason.trim()) return;
    onDispute(
      disputeReason,
      disputePhotos.length ? disputePhotos : undefined,
      disputeTargets.length ? disputeTargets : undefined,
    );
    closeDisputeSheet();
    setDisputeReason("");
    setDisputePhotos([]);
  };

  const submitWithdraw = () => {
    if (!onWithdrawDispute || disputeTargets.length === 0) return;
    onWithdrawDispute(disputeTargets);
    closeDisputeSheet();
  };

  return (
    <>
      <div className="iz-pv-detail-bar mb-2.5">
        <div className="iz-pv-detail-bar-main">
          <IzPill variant={pvStatusPillVariant(pv.status)}>{pvStatusLabel(pv.status)}</IzPill>
          <span className="iz-pv-detail-id">{pv.id}</span>
        </div>
        <button type="button" className="iz-chip" onClick={onBack}>
          Close
        </button>
      </div>

      {needsReview && !hasOpenDisputes && (
        <IzCard
          flat
          className="mb-2.5 border-[rgba(232,194,122,.35)] bg-[linear-gradient(180deg,rgba(232,194,122,.1),transparent)]"
        >
          <p className="iz-sm font-bold text-[var(--iz-gold-l)]">Pending your review</p>
          <p className="iz-tiny iz-muted mt-1">
            Review the week summary and sign if everything is correct.
          </p>
          <p className="iz-tiny iz-muted2 mt-1">Sign-by: {pv.due}</p>
        </IzCard>
      )}

      {hasOpenDisputes && (
        <IzCard
          flat
          className="mb-2.5 border-[rgba(255,107,107,.35)] bg-[linear-gradient(180deg,rgba(255,107,107,.1),transparent)]"
        >
          <p className="iz-sm font-bold text-[var(--iz-red)]">Dispute open</p>
          <p className="iz-tiny iz-muted mt-1">
            E-signature and PDF are hidden until your agency resolves the disputed amount(s). Tap a red
            amount to withdraw a mistaken dispute.
          </p>
        </IzCard>
      )}

      {pv.weekStartIso && (
        <IzCard className="mb-3 iz-pr-week-pay-card">
          <div className="iz-pr-week-pay-card__head">
            <div>
              <p className="iz-pr-week-pay-card__title">Week summary</p>
              <p className="iz-tiny iz-muted2">{weekSummary.weekLabel} · all sealed shifts</p>
            </div>
          </div>
          <PrWeeklyPaymentGrid
            summary={weekSummary}
            large
            weekPhase="issued"
            interactive={canDispute || Boolean(onWithdrawDispute)}
            onDisputeDay={openDisputeForDay}
            onWithdrawDay={openWithdrawForDay}
            activeDisputeKey={activeDisputeKey}
          />
        </IzCard>
      )}

      <PvSummaryView
        pv={syncedPv}
        payee={payee}
        weekSummary={pv.weekStartIso ? weekSummary : null}
        collapseNetDetails
        hideSignatureDetails={hasOpenDisputes}
        className="mb-2.5"
      />

      {linkedReceipts.length > 0 && (
        <details className="iz-pv-dispute-details mt-2.5">
          <summary className="iz-pv-dispute-details-toggle">
            <span>
              <span className="iz-tiny iz-muted2 tracking-widest">LINKED RECEIPT SCANS</span>
              <span className="iz-sm mt-0.5 block font-semibold">
                {linkedReceipts.length} scan{linkedReceipts.length !== 1 ? "s" : ""} ·{" "}
                {formatRM(linkedReceipts.reduce((sum, s) => sum + s.totalCommission, 0))} commission
              </span>
            </span>
            <ChevronDown className="iz-pv-dispute-details-chevron h-4 w-4 shrink-0" />
          </summary>
          <div className="iz-pv-dispute-details-body">
            <div className="iz-data-table-wrap">
              <table className="iz-data-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Outlet</th>
                    <th className="text-right">Commission</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linkedReceipts.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="font-semibold">{s.receiptRef}</div>
                        <div className="iz-tiny iz-muted2">{s.scannedAt}</div>
                      </td>
                      <td>{s.outlet}</td>
                      <td className="text-right font-semibold text-[var(--iz-gold-l)]">
                        {formatRM(s.totalCommission)}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="iz-btn iz-btn-ghost iz-btn-sm"
                          onClick={() => setReceiptDetail(s)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}

      <LinkedReceiptScanSheet scan={receiptDetail} onClose={() => setReceiptDetail(null)} />

      {!hasOpenDisputes && (
        <IzCard className="mt-2.5">
          <div className="iz-tiny iz-muted2 mb-2 tracking-widest">YOUR SIGNATURE</div>
          <SignatureBlock
            role="PR Personnel"
            name={profile.name}
            signedAt={pv.prSignedAt}
            signed={prSigned}
            signatureDataUrl={pv.prSignatureDataUrl}
          />
        </IzCard>
      )}

      {isFreelancer && (
        <IzCard flat className="iz-tiny iz-muted mt-2.5">
          <p className="text-[var(--iz-blue)]">
            Payroll via your appointed PR agency — ask them to raise PVs for your sealed shifts.
          </p>
        </IzCard>
      )}

      {canSign && (
        <div className="mt-2.5">
          <button
            type="button"
            className="iz-btn iz-btn-primary w-full"
            onClick={() => setSignOpen(true)}
          >
            Sign &amp; send to bank
          </button>
        </div>
      )}

      <PrPvDisputeSheet
        open={disputeSheetOpen}
        onClose={closeDisputeSheet}
        mode={disputeMode}
        targets={disputeTargets}
        reason={disputeReason}
        onReasonChange={setDisputeReason}
        photos={disputePhotos}
        onPhotosChange={setDisputePhotos}
        onSubmit={submitDispute}
        onWithdraw={submitWithdraw}
      />

      <IzSheet open={signOpen} onClose={() => setSignOpen(false)}>
        <div className="iz-cardttl">Sign payment voucher</div>
        <p className="iz-tiny iz-muted mb-3">
          Draw your signature below to confirm {formatRM(weekSummary.totals.net)} for {pv.id}. Your sign time is
          stamped on the PV and sent to your agency.
        </p>
        <PrSignaturePad
          signerName={profile.name}
          onConfirm={(dataUrl) => {
            onSign(dataUrl);
            setSignOpen(false);
          }}
          onCancel={() => setSignOpen(false)}
        />
      </IzSheet>

      {pv.status === "SIGNED" && (
        <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
          <p className="iz-sm font-bold text-[var(--iz-green)]">
            Dual-signed — transfer processing
          </p>
          <p className="iz-tiny iz-muted mt-1">
            Sending to {profile.bank} {profile.acc}…
          </p>
        </IzCard>
      )}

      {pv.status === "PAID" && !hasOpenDisputes && (
        <>
          <IzCard className="mt-2.5 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
            <p className="iz-sm font-bold text-[var(--iz-green)]">
              PAID · {formatRM(getPvNetTotal(pv))} in your bank
            </p>
            <p className="iz-tiny iz-muted mt-1">
              Transferred {pv.paidAt ?? "—"} → {profile.bank} {profile.acc}
            </p>
            {pv.bankRef && <p className="iz-tiny iz-muted2 mt-1 font-mono">Ref: {pv.bankRef}</p>}
          </IzCard>
          <button type="button" className="iz-btn iz-btn-primary mt-2.5 w-full" onClick={onViewPdf}>
            <FileText className="h-4 w-4" /> View PDF
          </button>
        </>
      )}

      <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={onBack}>
        Back
      </button>
    </>
  );
}

function receiptItemCommissionShare(scan: PrReceiptScan, item: PrReceiptScan["items"][number]) {
  const pool =
    item.category === "drinks"
      ? scan.drinkCommission
      : item.category === "tips"
        ? scan.tipCommission
        : item.category === "tables"
          ? scan.tableCommission
          : 0;
  const categoryItems = scan.items.filter((row) => row.category === item.category);
  if (pool > 0 && categoryItems.length > 0) {
    const categoryWeight = categoryItems.reduce(
      (sum, row) => sum + (item.category === "tips" ? row.amount : row.qty),
      0,
    );
    const itemWeight = item.category === "tips" ? item.amount : item.qty;
    if (categoryWeight > 0) return (pool * itemWeight) / categoryWeight;
  }
  return calcReceiptCommissions([item]).totalCommission;
}

function LinkedReceiptScanSheet({
  scan,
  onClose,
}: {
  scan: PrReceiptScan | null;
  onClose: () => void;
}) {
  if (!scan) return null;

  return (
    <IzSheet open onClose={onClose}>
      <div className="iz-cardttl">Receipt details</div>
      <dl className="iz-pv-receipt-detail-grid">
        <div>
          <dt>Date & time</dt>
          <dd>{scan.scannedAt}</dd>
        </div>
        <div>
          <dt>Outlet</dt>
          <dd>{scan.outlet}</dd>
        </div>
        <div>
          <dt>Commission</dt>
          <dd className="text-[var(--iz-gold-l)]">{formatRM(scan.totalCommission)}</dd>
        </div>
      </dl>
      <ul className="iz-pv-receipt-item-list">
        {scan.items.map((item) => (
          <li key={`${item.label}-${item.qty}`} className="iz-pv-receipt-item-list__row">
            <span>
              {item.qty}× {item.label}
            </span>
            <span className="text-[var(--iz-gold-l)]">
              {formatRM(receiptItemCommissionShare(scan, item))}
            </span>
          </li>
        ))}
      </ul>
    </IzSheet>
  );
}

function SignatureBlock({
  role,
  name,
  signedAt,
  signed,
  signatureDataUrl,
}: {
  role: string;
  name: string;
  signedAt?: string;
  signed: boolean;
  signatureDataUrl?: string;
}) {
  return (
    <div className={`iz-pv-sig${signed ? " signed" : " pending"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className={`iz-pv-sig-ico${signed ? " ok" : ""}`}>
          {signed ? <Check className="h-3.5 w-3.5" /> : <Star className="h-3 w-3 opacity-40" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="iz-tiny iz-muted2 tracking-wide">{role}</div>
          <div className="iz-sm font-semibold">{name}</div>
          {signatureDataUrl && signed && (
            <div className="iz-pv-sig-preview mt-2">
              <img src={signatureDataUrl} alt={`${name} signature`} />
            </div>
          )}
          <div className="iz-tiny iz-muted mt-1">
            {signed ? (
              <>
                <Clock className="mr-1 inline h-3 w-3 opacity-70" />
                {signedAt ?? "Signed"}
              </>
            ) : (
              "Awaiting signature"
            )}
          </div>
        </div>
      </div>
      <IzPill variant={signed ? "green" : "ink"}>{signed ? "Signed" : "Pending"}</IzPill>
    </div>
  );
}
