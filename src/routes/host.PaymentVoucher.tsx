import {
  FINANCE_HEAD_LABEL,
  PV_DISPUTE_PRESETS,
  SHIFT_TODAY,
  filterPvsForPrProfile,
  filterReceiptScansForPrProfile,
  getPrAgencyById,
  getPrProfile,
  getPrRosterId,
  pvNeedsPrReview,
  pvStatusLabel,
  pvStatusPillVariant,
  parsePvIssuedMs,
  PAYROLL_CYCLE,
  type PrPaymentVoucher,
  type PrReceiptScan,
  type PrSubRole,
} from "@/lib/pr-demo";
import { PvSummaryView } from "@/components/iz/PvSummaryView";
import { PrWeeklyPaymentGrid } from "@/components/pr/PrWeeklyPaymentGrid";
import { downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { payeeFromProfile } from "@/lib/pv-template";
import { buildWeeklyPaymentSummary, buildWeeklyDisputeMessage, getWeekBounds, syncWeeklyPvWithSummary, type WeeklyDisputeTarget } from "@/lib/pr-weekly-payment";
import { usePrPortalReady } from "@/lib/use-pr-sub-role";
import { FileText, Check, Shield, Star, Clock, Filter, X } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { FreelancerPayrollNotice } from "@/components/iz/FreelancerPayrollNotice";
import { IzSheet } from "@/components/iz/Sheet";
import { PrSignaturePad } from "@/components/pr/PrSignaturePad";
import { PrPageHeader } from "@/components/pr/PrPageHeader";
import { PrOfferRow, PrStatusPill } from "@/components/pr/PrOfferRow";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { PvDateTimeFilter } from "@/components/iz/PvDateTimeFilter";
import {
  buildPvDateOptions,
  dateFromIsoKey,
  EMPTY_PV_DAY_TIME_FILTER,
  matchesPvDayTimeFilter,
  pvDayTimeFilterActive,
  pvDayTimeFilterCount,
  type PvDayTimeFilter,
} from "@/lib/pv-list-filters";

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

function PaymentLoaded({
  prSubRole,
  searchPvId,
}: {
  prSubRole: PrSubRole;
  searchPvId?: string;
}) {
  const navigate = useNavigate();
  const prPayrollAgencyId = useStore((s) => s.prPayrollAgencyId);
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const signPrPv = useStore((s) => s.signPrPv);
  const disputePrPv = useStore((s) => s.disputePrPv);
  const updatePrPvDisputeReason = useStore((s) => s.updatePrPvDisputeReason);
  const escalatePrPvDispute = useStore((s) => s.escalatePrPvDispute);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(searchPvId ?? null);
  const [pvFilter, setPvFilter] = useState<PvDayTimeFilter>(EMPTY_PV_DAY_TIME_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);

  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);
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
  const weekBounds = useMemo(() => getWeekBounds(SHIFT_TODAY), []);
  const currentWeekPv = useMemo(
    () => myVouchers.find((p) => p.weekStartIso === weekBounds.startIso),
    [myVouchers, weekBounds.startIso],
  );
  const currentWeekSummary = useMemo(
    () =>
      buildWeeklyPaymentSummary({
        reference: SHIFT_TODAY,
        pv: currentWeekPv,
        shiftHistory,
        scans: myReceiptScans,
        prId,
      }),
    [currentWeekPv, shiftHistory, myReceiptScans, prId],
  );

  const pvDateOptions = useMemo(
    () => buildPvDateOptions(myVouchers, myReceiptScans),
    [myVouchers, myReceiptScans],
  );

  const pvDefaultMonth = useMemo(() => {
    const latest = Math.max(0, ...myVouchers.map((p) => parsePvIssuedMs(p.issued)));
    if (latest) return new Date(latest);
    const firstKey = pvDateOptions[0]?.key;
    return firstKey ? dateFromIsoKey(firstKey) ?? new Date() : new Date();
  }, [myVouchers, pvDateOptions]);

  const filteredVouchers = useMemo(() => {
    const matched = myVouchers.filter((p) => matchesPvDayTimeFilter(p, pvFilter, myReceiptScans));
    if (!currentWeekSummary.pvReady && currentWeekPv) {
      return matched.filter((p) => p.id !== currentWeekPv.id);
    }
    return matched;
  }, [myVouchers, pvFilter, myReceiptScans, currentWeekSummary.pvReady, currentWeekPv]);

  const filterCount = pvDayTimeFilterCount(pvFilter);

  useEffect(() => {
    if (searchPvId) setDetailId(searchPvId);
  }, [searchPvId]);

  const openDetail = (id: string) => {
    setDetailId(id);
    void navigate({ to: "/host/PaymentVoucher", search: { pvId: id }, replace: true });
  };

  const closeDetail = () => {
    setDetailId(null);
    void navigate({ to: "/host/PaymentVoucher", search: {}, replace: true });
  };

  const pv = myVouchers.find((p) => p.id === detailId);

  if (pv) {
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
          onDispute={(reason, photo) => disputePrPv(pv.id, reason, photo)}
          onUpdateDispute={(reason) => updatePrPvDisputeReason(pv.id, reason)}
          onEscalateDispute={() => escalatePrPvDispute(pv.id)}
          onDownloadPdf={() => {
            downloadPvBreakdownPdf(pv, payeeFromProfile(profile), myReceiptScans);
            toast("Official PV opened — use Print → Save as PDF", "success");
          }}
        />
      </div>
    );
  }

  const pendingCount = filteredVouchers.filter((p) => pvNeedsPrReview(p.status)).length;
  const signedCount = filteredVouchers.filter((p) => p.status === "SIGNED" || p.status === "PAID").length;
  const totalNet = filteredVouchers.reduce((sum, p) => sum + p.net, 0);

  return (
    <div className="iz-screen">
      <AppTopbar />

      <PrPageHeader
        label="Payroll"
        title="Payment"
        meta={isFreelancer ? "Weekly PV · review & sign from your agency" : "Weekly PV · agency pre-signed · you confirm"}
      />

      {isFreelancer ? (
        payrollAgency ? (
          <p className="iz-tiny iz-muted mt-3 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Payroll via <b className="text-[var(--iz-gold-l)]">{payrollAgency.name}</b> · change on{" "}
            <Link to="/host/profile" className="text-[var(--iz-blue)]">Profile</Link>
          </p>
        ) : (
          <div className="mt-3"><FreelancerPayrollNotice compact /></div>
        )
      ) : (
        <p className="iz-tiny iz-muted mt-3 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
          <Shield className="mr-1 inline h-3 w-3" />
          Outlet → Agency → your bank · one PV per week (issued Saturday)
        </p>
      )}

      <IzCard className="mt-3 iz-pr-week-pay-card">
        <div className="iz-pr-week-pay-card__head">
          <div>
            <p className="iz-pr-week-pay-card__title">This week</p>
            <p className="font-sora text-sm font-bold text-[var(--iz-txt)]">{currentWeekSummary.weekLabel}</p>
          </div>
          <div className="text-right">
            <p className="iz-tiny iz-muted2">Verified days</p>
            <p className="font-sora text-base font-extrabold text-[var(--iz-violet-l)]">
              {currentWeekSummary.verifiedDayCount}/7
            </p>
          </div>
        </div>
        <PrWeeklyPaymentGrid summary={currentWeekSummary} large />
        {!currentWeekSummary.pvReady ? (
          <p className="iz-tiny iz-muted2 mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-2">
            Summary from <b>verified days only</b>. Weekly PV auto-issues on{" "}
            <b className="text-[var(--iz-gold-l)]">{currentWeekSummary.saturdayLabel} (Sat)</b> — dispute any wrong
            line before then. Current week total so far:{" "}
            <b className="text-[var(--iz-gold)]">{formatRM(currentWeekSummary.totals.net)}</b>
          </p>
        ) : currentWeekPv ? (
          <button
            type="button"
            className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-full"
            onClick={() => openDetail(currentWeekPv.id)}
          >
            Open this week&apos;s PV · {formatRM(currentWeekPv.net)}
          </button>
        ) : null}
      </IzCard>

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">PVs</div>
          <div className="n">{filteredVouchers.length}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Review</div>
          <div className="n text-[var(--iz-amber)]">{pendingCount}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Signed</div>
          <div className="n text-[var(--iz-green)]">{signedCount}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Total</div>
          <div className="n text-[var(--iz-gold)]">{(totalNet / 1000).toFixed(1)}k</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)]/50">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
        >
          <Filter className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />
          <span className="text-sm font-semibold">Filter by date &amp; time</span>
          {filterCount > 0 && (
            <span className="rounded-full bg-[var(--iz-gold)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--iz-gold-l)]">
              {filterCount}
            </span>
          )}
          {pvDayTimeFilterActive(pvFilter) && (
            <button
              type="button"
              className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[var(--iz-gold-l)]"
              onClick={(e) => {
                e.stopPropagation();
                setPvFilter(EMPTY_PV_DAY_TIME_FILTER);
              }}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </button>
        {filterOpen && (
          <div className="border-t border-[var(--iz-line)] px-3 pb-3 pt-2">
            <PvDateTimeFilter
              compact
              date={pvFilter.date}
              timeFrom={pvFilter.timeFrom}
              timeTo={pvFilter.timeTo}
              onDateChange={(date) => setPvFilter((f) => ({ ...f, date }))}
              onTimeFromChange={(timeFrom) => setPvFilter((f) => ({ ...f, timeFrom }))}
              onTimeToChange={(timeTo) => setPvFilter((f) => ({ ...f, timeTo }))}
              dateOptions={pvDateOptions}
              defaultMonth={pvDefaultMonth}
              timeHint="Weekly PVs matched by shift day or receipt scan on the selected date."
            />
          </div>
        )}
      </div>

      <p className="iz-tiny iz-muted2 mt-4 mb-1 tracking-wide">WEEKLY PAYMENT VOUCHERS · {PAYROLL_CYCLE.range}</p>
      <div className="iz-pr-list">
        {filteredVouchers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-[var(--iz-muted2)]" />
            <p className="text-sm font-semibold">No weekly PVs match this filter</p>
            <p className="iz-tiny iz-muted2 mt-1">
              {currentWeekSummary.pvReady
                ? "Try another date or clear the time range."
                : "This week's PV issues Saturday — past weeks appear here after you filter."}
            </p>
            {pvDayTimeFilterActive(pvFilter) && (
              <button
                type="button"
                className="iz-tiny mt-3 font-semibold text-[var(--iz-gold-l)]"
                onClick={() => setPvFilter(EMPTY_PV_DAY_TIME_FILTER)}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredVouchers.map((p) => (
          <PrOfferRow
            key={p.id}
            title={p.id}
            subtitle={`${p.outlet} · ${p.cycle}`}
            amount={formatRM(p.net)}
            badge={<PrStatusPill variant={pvStatusPillVariant(p.status)}>{pvStatusLabel(p.status)}</PrStatusPill>}
            onClick={() => openDetail(p.id)}
          />
          ))
        )}
      </div>
    </div>
  );
}

function PvDetail({
  pv,
  profile,
  isFreelancer,
  receiptScans,
  shiftHistory,
  prId,
  onBack,
  onSign,
  onDispute,
  onUpdateDispute,
  onEscalateDispute,
  onDownloadPdf,
}: {
  pv: PrPaymentVoucher;
  profile: ReturnType<typeof getPrProfile>;
  isFreelancer: boolean;
  receiptScans: PrReceiptScan[];
  shiftHistory: ReturnType<typeof useStore.getState>["shiftHistory"];
  prId: string;
  onBack: () => void;
  onSign: (signatureDataUrl: string) => void;
  onDispute: (reason: string, photoDataUrl?: string) => void;
  onUpdateDispute: (reason: string) => void;
  onEscalateDispute: () => void;
  onDownloadPdf: () => void;
}) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputePhoto, setDisputePhoto] = useState<string | null>(null);
  const [editDisputeReason, setEditDisputeReason] = useState(pv.prDisputeReason ?? "");
  const disputePhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditDisputeReason(pv.prDisputeReason ?? "");
  }, [pv.id, pv.prDisputeReason]);

  const prSigned = pv.status === "PAID" || pv.status === "SIGNED" || Boolean(pv.prSignedAt);
  const needsReview = pvNeedsPrReview(pv.status);
  const disputeDirty =
    pv.status === "DISPUTED" && editDisputeReason.trim() !== (pv.prDisputeReason ?? "").trim();
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
        reference: pv.weekStartIso
          ? (pv.weekStartIso.split("-").map(Number) as [number, number, number])
          : SHIFT_TODAY,
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

  const openDisputeForDay = (targets: WeeklyDisputeTarget[]) => {
    if (!targets.length) return;
    const lines = targets.map((t) => buildWeeklyDisputeMessage(t));
    setDisputeReason(lines.join("\n\n"));
    setDisputeOpen(true);
  };

  const submitDispute = () => {
    onDispute(disputeReason, disputePhoto ?? undefined);
    setDisputeOpen(false);
    setDisputeReason("");
    setDisputePhoto(null);
  };

  const saveDisputeEdits = () => {
    const trimmed = editDisputeReason.trim();
    if (!trimmed) return;
    onUpdateDispute(trimmed);
    setEditDisputeReason(trimmed);
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

      {needsReview && (
        <IzCard flat className="mb-2.5 border-[rgba(232,194,122,.35)] bg-[linear-gradient(180deg,rgba(232,194,122,.1),transparent)]">
          <p className="iz-sm font-bold text-[var(--iz-gold-l)]">Pending your review</p>
          <p className="iz-tiny iz-muted mt-1">
            Finance Head has pre-signed this weekly PV. Check the week summary and line items below — sign if correct,
            or raise a dispute with a clear description for your agency.
          </p>
          <p className="iz-tiny iz-muted2 mt-1">Sign-by: {pv.due}</p>
        </IzCard>
      )}

      {pv.weekStartIso && (
        <IzCard className="mb-3 iz-pr-week-pay-card">
          <div className="iz-pr-week-pay-card__head">
            <div>
              <p className="iz-pr-week-pay-card__title">Week summary</p>
              <p className="iz-tiny iz-muted2">{weekSummary.weekLabel} · verified days only</p>
            </div>
            <div className="text-right">
              <p className="iz-tiny iz-muted2">PV net</p>
              <p className="font-sora text-base font-extrabold text-[var(--iz-gold)]">
                {formatRM(syncedPv.net)}
              </p>
            </div>
          </div>
          <PrWeeklyPaymentGrid
            summary={weekSummary}
            large
            interactive={needsReview || pv.status === "DISPUTED"}
            onDisputeDay={openDisputeForDay}
          />
        </IzCard>
      )}

      <PvSummaryView
        pv={syncedPv}
        payee={payeeFromProfile(profile)}
        weekSummary={pv.weekStartIso ? weekSummary : null}
        className="mb-2.5"
      />

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

      <button type="button" className="iz-btn iz-btn-soft mt-2.5 w-full" onClick={onDownloadPdf}>
        <FileText className="h-4 w-4" /> Download PDF
      </button>
      <p className="iz-tiny iz-muted2 mt-1.5 text-center">
        Opens the official Atmosphere payment voucher — use Print → Save as PDF.
      </p>

      <IzCard className="mt-2.5">
        <div className="iz-tiny iz-muted2 mb-2 tracking-widest">E-SIGNATURES</div>
        <SignatureBlock
          role={FINANCE_HEAD_LABEL}
          name={pv.financeHeadName}
          signedAt={pv.financeHeadSignedAt}
          signed
          signatureDataUrl={pv.financeHeadSignatureDataUrl}
        />
        <SignatureBlock
          role="PR Personnel"
          name={profile.name}
          signedAt={pv.prSignedAt}
          signed={prSigned}
          signatureDataUrl={pv.prSignatureDataUrl}
        />
      </IzCard>

      {isFreelancer && (
        <IzCard flat className="iz-tiny iz-muted mt-2.5">
          <p className="text-[var(--iz-blue)]">
            Payroll via your appointed PR agency — ask them to raise PVs for your sealed shifts.
          </p>
        </IzCard>
      )}

      {needsReview && (
        <>
          <IzCard flat className="iz-tiny iz-muted mt-2.5">
            <Shield className="mr-1 inline h-3 w-3" />
            {pv.financeHeadName} (Finance Head) has already e-signed. Draw your signature to complete the PV — payment
            transfers immediately to {profile.bank} {profile.acc}. No wallet or withdraw step.
          </IzCard>
          <div className="iz-grid2 mt-2.5">
            <button type="button" className="iz-btn iz-btn-ghost" onClick={() => setDisputeOpen(true)}>
              Raise Dispute
            </button>
            <button type="button" className="iz-btn iz-btn-primary" onClick={() => setSignOpen(true)}>
              Sign &amp; send to bank
            </button>
          </div>
        </>
      )}

      <IzSheet open={signOpen} onClose={() => setSignOpen(false)}>
        <div className="iz-cardttl">Sign payment voucher</div>
        <p className="iz-tiny iz-muted mb-3">
          Draw your signature below to confirm {formatRM(pv.net)} for {pv.id}. Your sign time is stamped on the PV and
          sent to your agency.
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

      <IzSheet open={disputeOpen} onClose={() => setDisputeOpen(false)}>
        <div className="iz-cardttl">Raise dispute</div>
        <p className="iz-tiny iz-muted mb-3">
          Payment is held until your agency verifies. Describe which day or amount is wrong — include dates, outlets,
          or receipt scan IDs.
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
        <input
          ref={disputePhotoRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setDisputePhoto(r.result as string);
            r.readAsDataURL(f);
          }}
        />
        <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-auto" onClick={() => disputePhotoRef.current?.click()}>
          Attach photo evidence
        </button>
        {disputePhoto && <img src={disputePhoto} alt="" className="mt-2 max-h-24 rounded-lg object-cover" />}
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
          <p className="iz-tiny iz-muted mt-1">Agency has 7 days to resolve or escalates to InnocenZ Admin.</p>
          {pv.prDisputePhotoDataUrl && (
            <img src={pv.prDisputePhotoDataUrl} alt="" className="mt-2 max-h-28 rounded-lg object-cover" />
          )}
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
          {pv.disputeEscalatedAt ? (
            <p className="iz-tiny mt-3 text-[var(--iz-amber)]">
              Escalated to InnocenZ Admin · {pv.disputeEscalatedAt}
            </p>
          ) : (
            <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mt-3 w-auto" onClick={onEscalateDispute}>
              Simulate 7-day escalation
            </button>
          )}
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
          <button type="button" className="iz-btn iz-btn-primary mt-2.5 w-full" onClick={onDownloadPdf}>
            <FileText className="h-4 w-4" /> Download PDF
          </button>
        </>
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
