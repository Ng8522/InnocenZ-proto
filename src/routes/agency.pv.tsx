import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  filterPvsByIssuedRecency,
  getLatestPvIssuedMs,
  getPvNetTotal,
  getPvSalesTotal,
  parsePvIssuedMs,
  PAYROLL_CYCLE,
  downloadPvReceipt,
  pvNeedsPrReview,
  pvStatusPillVariant,
  receiptStatusLabel,
  receiptEntryMethod,
  receiptEntryMethodLabel,
  receiptEntryLoggedLabel,
  receiptShiftDetails,
  sortPvsBySales,
  FINANCE_HEAD_LABEL,
  reconcilePvTotals,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrPvStatus,
  type PrReceiptScan,
  type ReceiptEntryMethod,
  type PvDateRecencyFilter,
  type PvSalesSort,
} from "@/lib/pr-demo";
import {
  getAgencyManagedReceiptScans,
  receiptBelongsToAgencyPr,
  receiptsForPv,
  collectionOwedLines,
  groupCollectionLines,
  resolvePvPrName,
  agencyPvStatusLabel,
  AGENCY_PV_STATUS_LABELS,
  buildAgencyToPayRows,
} from "@/lib/agency-payroll";
import {
  matchesPayrollIssueDate,
  matchesPayrollRange,
  matchesReceiptShiftWorkRange,
  payrollRangeActive,
  type PayrollRangeFilter,
} from "@/lib/payroll-filters";
import {
  EMPTY_PAYROLL_RANGE,
  PayrollRangeFilterCard,
} from "@/components/agency/PayrollRangeFilter";
import { PvSummaryView } from "@/components/iz/PvSummaryView";
import { downloadPvBreakdownCsv, downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { buildAgencyPayee } from "@/lib/pv-template";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import type { AgencyCollectionInvoice, AgencyManagedPR } from "@/lib/agency-demo";
import { agencyCan, AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";
import {
  shouldShowWeeklyReconciliation,
  buildPrReconciliationIncomes,
  allPrsConfirmedForWeek,
  prConfirmationSummary,
  prReconciliationNeedsDetail,
  prReconciliationVariance,
  prReconciliationAttentionCount,
  DEMO_RECONCILIATION_WEEK,
  type PrReconciliationIncome,
} from "@/lib/reconciliation-weekly";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Pencil,
  Receipt,
  Send,
  Sheet,
  Shield,
} from "lucide-react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { ReceiptScanSlip } from "@/components/pr/ReceiptScanSlip";
import { IzCard, IzPill, IzSelect, formatRM } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import {
  PV_WORKFLOW_STEPS,
  disputeDaysRemaining,
  pvWorkflowStepIndex,
  summarizePv,
  type PvEarningsBreakdown,
} from "@/lib/pv-breakdown";
export const Route = createFileRoute("/agency/pv")({
  component: AgencyPV,
  validateSearch: (search: Record<string, unknown>): { status?: PvStatusFilter; pv?: string } => {
    const status = search.status;
    const valid: PvStatusFilter[] = ["PENDING_REVIEW", "SENT", "SIGNED", "DISPUTED", "TO_PAY"];
    let statusFilter: PvStatusFilter | undefined;
    if (typeof status === "string" && valid.includes(status as PvStatusFilter)) {
      statusFilter = status as PvStatusFilter;
    }
    const pv = typeof search.pv === "string" && search.pv.trim() ? search.pv.trim() : undefined;
    return { status: statusFilter, pv };
  },
});

function statusPill(status: PrPvStatus) {
  return pvStatusPillVariant(status);
}

type PvStatusFilter = "all" | "TO_PAY" | PrPvStatus;

function isAgencyCollectionInvoice(inv: AgencyCollectionInvoice) {
  return inv.kind === "agency";
}
type PayrollTab = "pv" | "collections" | "reconciliation";
type PvSubTab = "vouchers" | "receipts";

const PAYROLL_TAB_ORDER: PayrollTab[] = ["pv", "collections", "reconciliation"];

function payrollTabLabel(tab: PayrollTab, pendingCollections: number): string {
  switch (tab) {
    case "pv":
      return "PV";
    case "collections":
      return pendingCollections > 0 ? `Collections (${pendingCollections})` : "Collections";
    case "reconciliation":
      return "Reconcile";
  }
}

const AGING_LABELS: Record<AgencyCollectionInvoice["aging"], string> = {
  current: "Current",
  "7d": "7d",
  "14d": "14d",
  "30d": "30d",
  "60d+": "60d+",
};

const PV_STATUS_FILTERS: { value: PvStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING_REVIEW", label: AGENCY_PV_STATUS_LABELS.PENDING_REVIEW },
  { value: "SENT", label: AGENCY_PV_STATUS_LABELS.SENT },
  { value: "DISPUTED", label: AGENCY_PV_STATUS_LABELS.DISPUTED },
  { value: "SIGNED", label: AGENCY_PV_STATUS_LABELS.SIGNED },
  { value: "TO_PAY", label: "To pay" },
];

const PV_DATE_FILTERS: { value: PvDateRecencyFilter; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "latest", label: "Latest issue date" },
  { value: "previous", label: "Previous dates" },
];

function AgencyPV() {
  const navigate = useNavigate();
  const { status: statusFromSearch, pv: pvFromSearch } = Route.useSearch();
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyCollections = useStore((s) => s.agencyCollections);
  const markCollectionSettled = useStore((s) => s.markCollectionSettled);
  const sendCollectionReminder = useStore((s) => s.sendCollectionReminder);
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const outletPnl = useStore((s) => s.outletPnl);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payrollTab, setPayrollTab] = useState<PayrollTab>("pv");
  const [pvSubTab, setPvSubTab] = useState<PvSubTab>("vouchers");
  const [statusFilter, setStatusFilter] = useState<PvStatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<PvDateRecencyFilter>("all");
  const [salesSort, setSalesSort] = useState<PvSalesSort>("default");
  const [collectionDetail, setCollectionDetail] = useState<string | null>(null);
  const [payrollRange, setPayrollRange] = useState<PayrollRangeFilter>(EMPTY_PAYROLL_RANGE);
  const verifyAgencyReceiptSelfLog = useStore((s) => s.verifyAgencyReceiptSelfLog);
  const { date, time } = nowAgencyDateTime();

  useEffect(() => {
    if (statusFromSearch === ("PAID" as PvStatusFilter)) {
      void navigate({ to: "/agency/history", search: { tab: "paid" }, replace: true });
      return;
    }
    if (statusFromSearch) setStatusFilter(statusFromSearch);
    if (pvFromSearch) setDetailId(pvFromSearch);
  }, [statusFromSearch, pvFromSearch, navigate]);

  const payrollActivePvs = useMemo(
    () => prPaymentVouchers.filter((p) => p.status !== "PAID"),
    [prPaymentVouchers],
  );

  const latestIssuedMs = useMemo(() => getLatestPvIssuedMs(payrollActivePvs), [payrollActivePvs]);

  const awaiting = prPaymentVouchers.filter((p) => pvNeedsPrReview(p.status)).length;
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const queued = prPaymentVouchers.filter((p) => p.status === "SIGNED");
  const queuedTotal = queued.reduce((s, p) => s + getPvNetTotal(p), 0);
  const paid = prPaymentVouchers.filter((p) => p.status === "PAID").length;

  const agencyReceiptScans = useMemo(
    () => getAgencyManagedReceiptScans(prReceiptScans, agencyPRs, prPaymentVouchers),
    [prReceiptScans, agencyPRs, prPaymentVouchers],
  );

  const rangeFilteredPvs = useMemo(
    () =>
      payrollActivePvs.filter((p) => matchesPayrollRange(parsePvIssuedMs(p.issued), payrollRange)),
    [payrollActivePvs, payrollRange],
  );

  const filteredVouchers = useMemo(() => {
    let list =
      statusFilter === "all"
        ? rangeFilteredPvs
        : statusFilter === "TO_PAY"
          ? rangeFilteredPvs.filter((p) => p.status === "SIGNED")
          : rangeFilteredPvs.filter((p) => p.status === statusFilter);
    list = filterPvsByIssuedRecency(list, dateFilter, latestIssuedMs);
    return sortPvsBySales(list, salesSort);
  }, [rangeFilteredPvs, statusFilter, dateFilter, salesSort, latestIssuedMs]);

  const toPayRows = useMemo(
    () => buildAgencyToPayRows(filteredVouchers, agencyPRs),
    [filteredVouchers, agencyPRs],
  );
  const toPayTotal = useMemo(
    () => toPayRows.reduce((sum, row) => sum + row.totalNet, 0),
    [toPayRows],
  );

  const prReconciliationIncomes = useMemo((): PrReconciliationIncome[] => {
    const weekStartIso = reconciliation.weekStartIso ?? DEMO_RECONCILIATION_WEEK.weekStartIso;
    const weekEndIso = reconciliation.weekEndIso ?? DEMO_RECONCILIATION_WEEK.weekEndIso;
    const weekLabel = reconciliation.dateLabel || DEMO_RECONCILIATION_WEEK.dateLabel;
    return buildPrReconciliationIncomes({
      shiftHistory,
      pvs: prPaymentVouchers,
      weekStartIso,
      weekEndIso,
      weekLabel,
      prConfirmedIds: reconciliation.prConfirmedIds,
    });
  }, [shiftHistory, prPaymentVouchers, reconciliation]);

  const prConfirmProgress = useMemo(
    () => prConfirmationSummary(prReconciliationIncomes, reconciliation.prConfirmedIds),
    [prReconciliationIncomes, reconciliation.prConfirmedIds],
  );

  const prSideComplete = allPrsConfirmedForWeek(
    prReconciliationIncomes,
    reconciliation.prConfirmedIds,
  );

  const payrollFinance = useMemo(() => {
    const income = Math.round(outletPnl.reduce((sum, row) => sum + row.agencyNet, 0) * 100) / 100;
    const spent = Math.round(outletPnl.reduce((sum, row) => sum + row.prPayout, 0) * 100) / 100;
    const profit = Math.round((income - spent) * 100) / 100;
    return { income, spent, profit };
  }, [outletPnl]);

  const dateCounts = useMemo(() => {
    const latest = filterPvsByIssuedRecency(rangeFilteredPvs, "latest", latestIssuedMs).length;
    const previous = filterPvsByIssuedRecency(rangeFilteredPvs, "previous", latestIssuedMs).length;
    return { all: rangeFilteredPvs.length, latest, previous };
  }, [rangeFilteredPvs, latestIssuedMs]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    salesSort !== "default" ||
    payrollRangeActive(payrollRange);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setSalesSort("default");
    setPayrollRange(EMPTY_PAYROLL_RANGE);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<PvStatusFilter, number> = {
      all: rangeFilteredPvs.length,
      PENDING_REVIEW: 0,
      SENT: 0,
      SIGNED: 0,
      TO_PAY: 0,
      DISPUTED: 0,
      PAID: 0,
    };
    for (const p of rangeFilteredPvs) {
      counts[p.status] += 1;
      if (p.status === "SIGNED") counts.TO_PAY += 1;
    }
    return counts;
  }, [rangeFilteredPvs]);

  const detail = prPaymentVouchers.find((p) => p.id === detailId);

  if (detail) {
    return (
      <div className="iz-screen">
        <AppTopbar onBack={() => setDetailId(null)} backLabel="PV list" />
        <PvDetail
          pv={detail}
          receiptScans={receiptsForPv(agencyReceiptScans, detail)}
          onClose={() => setDetailId(null)}
        />
      </div>
    );
  }

  const collectionRow = agencyCollections.find(
    (c) => c.id === collectionDetail && isAgencyCollectionInvoice(c),
  );
  const pendingCollections = agencyCollections.filter(
    (c) => c.status === "PENDING" && isAgencyCollectionInvoice(c),
  );

  if (collectionRow) {
    return (
      <div className="iz-screen">
        <CollectionDetailView
          invoice={collectionRow}
          pvs={prPaymentVouchers}
          receiptScans={agencyReceiptScans}
          onBack={() => setCollectionDetail(null)}
          onOpenPv={(pvId) => {
            setCollectionDetail(null);
            setDetailId(pvId);
          }}
          onSettle={(id) => {
            markCollectionSettled(id);
            setCollectionDetail(null);
          }}
          onRemind={sendCollectionReminder}
        />
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Payroll &amp; PV</h2>
        <p className="iz-tiny iz-muted mt-0.5">
          {date} · {time} · Cycle{" "}
          <span className="text-[var(--iz-gold-l)]">{PAYROLL_CYCLE.range}</span>
          <IzPill variant="violet" className="ml-1.5 !py-0 !text-[9px]">
            Per-item calc
          </IzPill>
        </p>
        <p className="iz-tiny iz-muted2 mt-1">
          {AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"]} · PR portal signs · PR confirms
          weekly earnings
        </p>
      </header>

      {shouldShowWeeklyReconciliation(reconciliation) &&
        (!reconciliation.agencyConfirmed || !prSideComplete) && (
          <PayrollReconciliationBanner
            reconciliation={reconciliation}
            prIncomes={prReconciliationIncomes}
            prConfirmProgress={prConfirmProgress}
            canConfirm={agencyCan(agencySubRole, "confirmReconciliation")}
            onConfirm={confirmAgencyReconciliation}
            onOpenReconciliation={() => setPayrollTab("reconciliation")}
          />
        )}

      <div className="iz-grid3 mt-3">
        <div className="iz-stat-tile">
          <div className="n text-[var(--iz-gold-l)]">{formatRM(payrollFinance.income)}</div>
          <div className="l">Income</div>
        </div>
        <div className="iz-stat-tile">
          <div className="n">{formatRM(payrollFinance.spent)}</div>
          <div className="l">Income spent</div>
        </div>
        <div className="iz-stat-tile">
          <div
            className={`n ${payrollFinance.profit >= 0 ? "text-[var(--iz-green)]" : "text-[var(--iz-red)]"}`}
          >
            {formatRM(payrollFinance.profit)}
          </div>
          <div className="l">Profit</div>
        </div>
      </div>

      <div className="iz-payroll-tabs mt-2.5">
        {PAYROLL_TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={`iz-payroll-tab${payrollTab === t ? " on" : ""}`}
            onClick={() => setPayrollTab(t)}
          >
            {payrollTabLabel(t, pendingCollections.length)}
          </button>
        ))}
      </div>

      {payrollTab === "collections" && (
        <CollectionsSection
          invoices={agencyCollections}
          payrollRange={payrollRange}
          onRangeChange={setPayrollRange}
          onClearRange={() => setPayrollRange(EMPTY_PAYROLL_RANGE)}
          onOpen={setCollectionDetail}
          onSettle={markCollectionSettled}
          onRemind={sendCollectionReminder}
        />
      )}

      {payrollTab === "reconciliation" && (
        <ReconciliationSection
          reconciliation={reconciliation}
          prIncomes={prReconciliationIncomes}
          prConfirmProgress={prConfirmProgress}
          onConfirm={confirmAgencyReconciliation}
          onOpenPv={(pvId) => {
            setPayrollTab("pv");
            setPvSubTab("vouchers");
            setDetailId(pvId);
          }}
          canConfirm={agencyCan(agencySubRole, "confirmReconciliation")}
        />
      )}

      {payrollTab === "pv" && (
        <>
          <div className="iz-grid2 mt-3">
            <div className="iz-stat-tile">
              <div className="n">{awaiting}</div>
              <div className="l">Awaiting PR review / sign</div>
            </div>
            <div className="iz-stat-tile">
              <div className="n text-[var(--iz-red)]">{disputed}</div>
              <div className="l">Disputed (open)</div>
            </div>
          </div>

          <IzCard
            flat
            className="mt-2.5 border-[rgba(232,194,122,.3)] bg-[linear-gradient(180deg,rgba(232,194,122,.05),transparent)]"
          >
            <div className="iz-between">
              <div>
                <p className="iz-sm font-bold">Signed PVs · manual payment</p>
                <p className="iz-tiny iz-muted mt-1">
                  Agency pays each PR individually after e-sign — no scheduled auto-transfer.
                </p>
                <p className="iz-tiny iz-muted2 mt-0.5">
                  {queued.length} signed · use <b>To pay</b> to record each bank transfer ·{" "}
                  <Link
                    to="/agency/history"
                    search={{ tab: "paid" }}
                    className="text-[var(--iz-gold-l)]"
                  >
                    {paid} paid in History
                  </Link>
                </p>
              </div>
              <b className="font-sora text-base text-[var(--iz-gold)]">{formatRM(queuedTotal)}</b>
            </div>
            <p className="iz-tiny iz-muted2 mt-2">Duplicate payment blocked</p>
          </IzCard>

          <div className="iz-payroll-tabs mt-2.5">
            <button
              type="button"
              className={`iz-payroll-tab${pvSubTab === "vouchers" ? " on" : ""}`}
              onClick={() => setPvSubTab("vouchers")}
            >
              Payment Vouchers ({payrollActivePvs.length})
            </button>
            <button
              type="button"
              className={`iz-payroll-tab${pvSubTab === "receipts" ? " on" : ""}`}
              onClick={() => setPvSubTab("receipts")}
            >
              Receipts ({agencyReceiptScans.length})
            </button>
          </div>

          {pvSubTab === "vouchers" && (
            <OutletSection title="Payment Vouchers" hint={PAYROLL_CYCLE.range}>
              <IzCard flat className="!mb-2.5">
                <div className="flex items-center gap-2 iz-tiny iz-muted">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  Filter &amp; sort
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="ml-auto text-[var(--iz-gold-l)]"
                      onClick={clearFilters}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <p className="iz-filter-group-label">Status</p>
                <div className="iz-filter-chips">
                  {PV_STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.value;
                    const count = statusCounts[f.value];
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={`iz-filter-chip${active ? " on" : ""}`}
                        onClick={() => setStatusFilter(f.value)}
                      >
                        {f.label}
                        <span className="iz-filter-chip__count">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <p className="iz-filter-group-label">Issue date</p>
                <div className="iz-filter-chips">
                  {PV_DATE_FILTERS.map((f) => {
                    const active = dateFilter === f.value;
                    const count = dateCounts[f.value];
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={`iz-filter-chip${active ? " on" : ""}`}
                        onClick={() => setDateFilter(f.value)}
                      >
                        {f.label}
                        <span className="iz-filter-chip__count">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <PayrollRangeFilterCard
                  range={payrollRange}
                  onChange={setPayrollRange}
                  onClear={() => setPayrollRange(EMPTY_PAYROLL_RANGE)}
                />

                <div className="mt-3 flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="iz-tiny iz-muted2 mb-1">Sales (subtotal)</p>
                    <IzSelect
                      block
                      className="!text-xs"
                      value={salesSort}
                      onChange={(e) => setSalesSort(e.target.value as PvSalesSort)}
                    >
                      <option value="default">Newest issue date first</option>
                      <option value="desc">Sales · high → low</option>
                      <option value="asc">Sales · low → high</option>
                    </IzSelect>
                  </div>
                </div>
              </IzCard>

              <div className="space-y-2.5">
                {statusFilter === "TO_PAY" ? (
                  toPayRows.length === 0 ? (
                    <IzCard className="text-center">
                      <p className="iz-sm iz-muted">No PRs queued for payment</p>
                      <p className="iz-tiny iz-muted2 mt-1">
                        PRs appear here after they e-sign — pay each voucher manually from your
                        bank.
                      </p>
                      <button type="button" className="iz-chip mt-2" onClick={clearFilters}>
                        Show all
                      </button>
                    </IzCard>
                  ) : (
                    <>
                      <IzCard
                        flat
                        className="border-[rgba(232,194,122,.3)] bg-[linear-gradient(180deg,rgba(232,194,122,.05),transparent)]"
                      >
                        <div className="iz-between">
                          <div>
                            <p className="iz-sm font-bold">Payment queue</p>
                            <p className="iz-tiny iz-muted mt-0.5">
                              {toPayRows.length} PR{toPayRows.length === 1 ? "" : "s"} ·{" "}
                              {filteredVouchers.length} signed voucher
                              {filteredVouchers.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          <b className="font-sora text-base text-[var(--iz-gold)]">
                            {formatRM(toPayTotal)}
                          </b>
                        </div>
                      </IzCard>
                      {toPayRows.map((row) => (
                        <div key={row.prName} className="iz-card iz-between w-full text-left">
                          <div className="min-w-0">
                            <div className="font-sora text-[15px] font-bold">{row.prName}</div>
                            <p className="iz-tiny iz-muted mt-0.5">{row.outlet}</p>
                            {row.prIc && <p className="iz-tiny iz-muted2">IC {row.prIc}</p>}
                            {row.pvCount > 1 && (
                              <p className="iz-tiny iz-muted2 mt-0.5">
                                {row.pvCount} signed vouchers · combined net payable
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <IzPill variant="amber">To pay</IzPill>
                            <div className="iz-ledger font-sora mt-1.5 text-base font-bold">
                              {formatRM(row.totalNet)}
                            </div>
                            <p className="iz-tiny iz-muted2 mt-0.5">Net payable</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                ) : filteredVouchers.length === 0 ? (
                  <IzCard className="text-center">
                    <p className="iz-sm iz-muted">No vouchers with this status</p>
                    <button type="button" className="iz-chip mt-2" onClick={clearFilters}>
                      Show all
                    </button>
                  </IzCard>
                ) : (
                  filteredVouchers.map((pv) => (
                    <button
                      key={pv.id}
                      type="button"
                      className="iz-card iz-between w-full cursor-pointer text-left"
                      onClick={() => setDetailId(pv.id)}
                    >
                      <div className="min-w-0">
                        <div className="font-sora text-[15px] font-bold">{pv.id}</div>
                        <p className="iz-tiny iz-muted mt-0.5">
                          {resolvePvPrName(pv, agencyPRs)} · {pv.outlet}
                        </p>
                        {pv.prIc && <p className="iz-tiny iz-muted2">IC {pv.prIc}</p>}
                        <p className="iz-tiny iz-muted2 mt-0.5">Cycle: {pv.cycle}</p>
                        <p className="iz-tiny iz-muted2">
                          Issued {pv.issued} · Due {pv.due}
                          {parsePvIssuedMs(pv.issued) >= latestIssuedMs && latestIssuedMs > 0 && (
                            <span className="ml-1 text-[var(--iz-violet)]">· Latest</span>
                          )}
                        </p>
                        <p className="iz-tiny text-[var(--iz-gold-l)] mt-0.5">
                          Sales {formatRM(getPvSalesTotal(pv))}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <IzPill variant={statusPill(pv.status)}>
                          {agencyPvStatusLabel(pv.status)}
                        </IzPill>
                        <div className="iz-ledger font-sora mt-1.5 text-base font-bold">
                          {formatRM(getPvNetTotal(pv))}
                        </div>
                        <p className="iz-tiny iz-muted2 mt-0.5">Net payable</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </OutletSection>
          )}

          {pvSubTab === "receipts" && (
            <ReceiptsSection
              scans={agencyReceiptScans}
              agencyPRs={agencyPRs}
              pvs={prPaymentVouchers}
              payrollRange={payrollRange}
              onRangeChange={setPayrollRange}
              onClearRange={() => setPayrollRange(EMPTY_PAYROLL_RANGE)}
              onVerifySelfLog={verifyAgencyReceiptSelfLog}
              onOpenPv={(pvId) => setDetailId(pvId)}
            />
          )}
        </>
      )}
    </div>
  );
}

function CollectionDetailView({
  invoice,
  pvs,
  receiptScans,
  onBack,
  onOpenPv,
  onSettle,
  onRemind,
}: {
  invoice: AgencyCollectionInvoice;
  pvs: PrPaymentVoucher[];
  receiptScans: PrReceiptScan[];
  onBack: () => void;
  onOpenPv: (pvId: string) => void;
  onSettle: (id: string) => void;
  onRemind: (id: string) => void;
}) {
  const owedLines = collectionOwedLines(invoice, pvs);
  const grouped = groupCollectionLines(owedLines);
  const linesTotal = owedLines.reduce((s, l) => s + l.amount, 0);
  const linkedScans = receiptScans.filter((s) => s.pvId && invoice.linkedPvIds.includes(s.pvId));
  const counterparty = invoice.counterparty ?? invoice.outlet;

  return (
    <>
      <AppTopbar onBack={onBack} backLabel="Collections" />
      <header className="mb-2">
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">{counterparty}</h2>
        <p className="iz-tiny iz-muted mt-0.5">{invoice.id} · Agency ledger</p>
      </header>

      <IzCard className="border-[rgba(232,194,122,.35)]">
        <div className="iz-between items-start gap-3">
          <div>
            <p className="iz-tiny iz-muted2">Amount due</p>
            <p className="font-sora text-2xl font-extrabold text-[var(--iz-gold)]">
              {formatRM(invoice.amount)}
            </p>
          </div>
          <IzPill variant={invoice.status === "SETTLED" ? "green" : "amber"}>
            {invoice.status}
          </IzPill>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--iz-line)] pt-3">
          <div>
            <p className="iz-tiny iz-muted2">Issued</p>
            <p className="iz-tiny font-semibold">
              {invoice.issueDate}
              {invoice.issueTime ? ` · ${invoice.issueTime}` : ""}
            </p>
          </div>
          <div>
            <p className="iz-tiny iz-muted2">Due</p>
            <p className="iz-tiny font-semibold">{invoice.dueDate}</p>
          </div>
          <div>
            <p className="iz-tiny iz-muted2">Aging</p>
            <p className="iz-tiny font-semibold">{AGING_LABELS[invoice.aging]}</p>
          </div>
          <div>
            <p className="iz-tiny iz-muted2">Type</p>
            <p className="iz-tiny font-semibold">Agency invoice</p>
          </div>
        </div>
        {invoice.reminderSent && invoice.status === "PENDING" && (
          <p className="iz-tiny text-[var(--iz-amber)] mt-2">Reminder sent</p>
        )}
      </IzCard>

      <OutletSection title="Line items" hint={`${owedLines.length} charges`}>
        <IzCard flat>
          <p className="iz-tiny iz-muted mb-3">
            InnocenZ platform subscription on the agency ledger.
          </p>
          <div className="space-y-4">
            {grouped.map((section) => (
              <div key={section.group}>
                <div className="iz-between mb-1.5">
                  <p className="iz-tiny font-bold tracking-widest text-[var(--iz-gold-l)]">
                    {section.label}
                  </p>
                  <p className="iz-tiny font-semibold text-[var(--iz-muted)]">
                    {formatRM(section.subtotal)}
                  </p>
                </div>
                <div className="rounded-[12px] border border-[var(--iz-line)] bg-[rgba(0,0,0,.12)] px-3">
                  {section.lines.map((line, idx) => (
                    <div
                      key={`${section.group}-${line.label}-${idx}`}
                      className="flex items-start justify-between gap-3 border-b border-[var(--iz-line)] py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="iz-sm font-semibold text-[var(--iz-txt)]">{line.label}</p>
                        {line.detail && <p className="iz-tiny iz-muted2 mt-0.5">{line.detail}</p>}
                      </div>
                      <p className="iz-ledger shrink-0 text-sm font-bold">
                        {formatRM(line.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--iz-line)] pt-2.5">
            <span className="iz-tiny font-bold text-[var(--iz-muted)]">Total due</span>
            <span className="font-sora text-base font-bold text-[var(--iz-gold-l)]">
              {formatRM(linesTotal)}
            </span>
          </div>
        </IzCard>
      </OutletSection>

      {invoice.linkedPvIds.length > 0 && (
        <OutletSection title="Linked PVs" hint="Tap to inspect voucher">
          {invoice.linkedPvIds.map((id) => {
            const pv = pvs.find((p) => p.id === id);
            return (
              <button
                key={id}
                type="button"
                className="iz-card iz-between mb-2 w-full cursor-pointer text-left last:mb-0"
                onClick={() => pv && onOpenPv(pv.id)}
                disabled={!pv}
              >
                <div className="min-w-0">
                  <p className="font-sora text-sm font-bold">{id}</p>
                  {pv ? (
                    <p className="iz-tiny iz-muted mt-0.5">
                      {pv.prName} · {pv.outlet} · issued {pv.issued}
                    </p>
                  ) : (
                    <p className="iz-tiny iz-muted2 mt-0.5">PV queued · awaiting agency raise</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right">
                  {pv && (
                    <>
                      <IzPill variant={pvStatusPillVariant(pv.status)}>
                        {agencyPvStatusLabel(pv.status)}
                      </IzPill>
                      <span className="iz-ledger text-sm font-bold">
                        {formatRM(getPvNetTotal(pv))}
                      </span>
                    </>
                  )}
                  {pv && <ChevronRight className="h-4 w-4 text-[var(--iz-muted)]" />}
                </div>
              </button>
            );
          })}
        </OutletSection>
      )}

      {linkedScans.length > 0 && (
        <OutletSection title="Receipt scans" hint={`${linkedScans.length} linked to PVs`}>
          {linkedScans.map((scan) => (
            <ReceiptScanRow key={scan.id} scan={scan} />
          ))}
        </OutletSection>
      )}

      {invoice.status === "PENDING" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="iz-btn iz-btn-soft flex-1"
            onClick={() => onRemind(invoice.id)}
          >
            <Bell className="h-4 w-4" /> Send reminder
          </button>
          <button
            type="button"
            className="iz-btn iz-btn-primary flex-1"
            onClick={() => onSettle(invoice.id)}
          >
            <Receipt className="h-4 w-4" /> Mark paid
          </button>
        </div>
      )}
    </>
  );
}

function CollectionsSection({
  invoices,
  payrollRange,
  onRangeChange,
  onClearRange,
  onOpen,
  onSettle,
  onRemind,
}: {
  invoices: AgencyCollectionInvoice[];
  payrollRange: PayrollRangeFilter;
  onRangeChange: (r: PayrollRangeFilter) => void;
  onClearRange: () => void;
  onOpen: (id: string) => void;
  onSettle: (id: string) => void;
  onRemind: (id: string) => void;
}) {
  const buckets = ["current", "7d", "14d", "30d", "60d+"] as const;
  const [agingFilter, setAgingFilter] = useState<AgencyCollectionInvoice["aging"] | "all">("all");
  const agencyInvoices = useMemo(() => invoices.filter(isAgencyCollectionInvoice), [invoices]);
  const baseFiltered = useMemo(
    () =>
      agencyInvoices.filter((i) => matchesPayrollIssueDate(i.issueDate, i.issueTime, payrollRange)),
    [agencyInvoices, payrollRange],
  );
  const filtered = useMemo(
    () =>
      agingFilter === "all" ? baseFiltered : baseFiltered.filter((i) => i.aging === agingFilter),
    [baseFiltered, agingFilter],
  );

  return (
    <div className="mt-3">
      <IzCard flat className="border-[rgba(124,107,255,.25)]">
        <p className="iz-tiny iz-muted">
          Agency ledger · SETTLED vs PENDING · platform subscription only
        </p>
      </IzCard>
      <PayrollRangeFilterCard
        range={payrollRange}
        onChange={onRangeChange}
        onClear={onClearRange}
      />
      <p className="iz-tiny iz-muted2 mt-2 mb-1">Aging bucket</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${agingFilter === "all" ? "border-[var(--iz-gold)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setAgingFilter("all")}
        >
          All · {baseFiltered.length}
        </button>
        {buckets.map((b) => {
          const count = baseFiltered.filter((i) => i.aging === b).length;
          if (!count) return null;
          return (
            <button
              key={b}
              type="button"
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${agingFilter === b ? "border-[var(--iz-gold)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
              onClick={() => setAgingFilter(b)}
            >
              {AGING_LABELS[b]} · {count}
            </button>
          );
        })}
      </div>
      <div className="mt-3 space-y-2.5">
        {filtered.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No agency invoices match these filters</p>
          </IzCard>
        ) : (
          filtered.map((inv) => (
            <IzCard
              key={inv.id}
              className="cursor-pointer transition-colors hover:border-[rgba(232,194,122,.45)]"
            >
              <button type="button" className="w-full text-left" onClick={() => onOpen(inv.id)}>
                <div className="iz-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-sora text-sm font-bold">
                      {inv.counterparty ?? inv.outlet}
                    </div>
                    <p className="iz-tiny iz-muted mt-0.5">
                      {inv.id} · issued {inv.issueDate}
                      {inv.issueTime ? ` · ${inv.issueTime}` : ""} · due {inv.dueDate}
                    </p>
                    {inv.reminderSent && inv.status === "PENDING" && (
                      <p className="iz-tiny text-[var(--iz-amber)] mt-0.5">Reminder sent</p>
                    )}
                    <p className="iz-tiny text-[var(--iz-gold-l)] mt-1">View breakdown →</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <div className="text-right">
                      <IzPill variant={inv.status === "SETTLED" ? "green" : "amber"}>
                        {inv.status}
                      </IzPill>
                      <p className="iz-ledger mt-1 text-sm font-bold">{formatRM(inv.amount)}</p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-[var(--iz-muted)]" />
                  </div>
                </div>
              </button>
              {inv.status === "PENDING" && (
                <div className="mt-2 flex gap-2 border-t border-[var(--iz-line)] pt-2">
                  <button
                    type="button"
                    className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs"
                    onClick={() => onRemind(inv.id)}
                  >
                    <Bell className="h-3 w-3" /> Remind
                  </button>
                  <button
                    type="button"
                    className="iz-btn iz-btn-primary flex-1 !py-1.5 !text-xs"
                    onClick={() => onSettle(inv.id)}
                  >
                    <Receipt className="h-3 w-3" /> Mark paid
                  </button>
                </div>
              )}
            </IzCard>
          ))
        )}
      </div>
    </div>
  );
}

function receiptScanStatusPill(scan: PrReceiptScan): {
  variant: "green" | "amber" | "red" | "ink" | "violet" | "gold";
  label: string;
} {
  if (scan.logSource === "manual") {
    if (scan.agencyVerification === "pending") return { variant: "amber", label: "VERIFY" };
    if (scan.agencyVerification === "approved") return { variant: "green", label: "VERIFIED" };
    if (scan.agencyVerification === "rejected") return { variant: "ink", label: "REJECTED" };
  }
  const variant = scan.status === "paid" ? "green" : scan.status === "in_pv" ? "amber" : "ink";
  return { variant, label: receiptStatusLabel(scan.status) };
}

function ReceiptScanRow({
  scan,
  onClick,
  compact = false,
  onVerify,
}: {
  scan: PrReceiptScan;
  onClick?: () => void;
  /** Hide line items — used on the agency receipts list (details in sheet). */
  compact?: boolean;
  onVerify?: (scanId: string, decision: "approved" | "rejected") => void;
}) {
  const [y, m, d] = scan.date;
  const entry = receiptEntryMethod(scan);
  const pendingSelfLog = scan.logSource === "manual" && scan.agencyVerification === "pending";
  const statusPill = receiptScanStatusPill(scan);

  const body = (
    <IzCard
      flat
      className={`!mb-2${pendingSelfLog ? " iz-receipt-selflog-pending" : ""}${onClick && !pendingSelfLog ? " !mb-0 transition-colors hover:border-[var(--iz-gold-d)]" : ""}`}
    >
      <div className="iz-between items-start gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sora text-sm font-bold">{scan.receiptRef}</p>
            {scan.logSource === "manual" && <IzPill variant="amber">Self-log</IzPill>}
          </div>
          <p className="iz-tiny iz-muted2 mt-0.5 font-mono">{scan.id}</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {scan.prName} · {scan.outlet}
          </p>
          {scan.manualReason && (
            <p className="iz-tiny text-[var(--iz-amber)] mt-1">{scan.manualReason}</p>
          )}
          {scan.prId && <p className="iz-tiny iz-muted2">PR ID {scan.prId}</p>}
          <p className="iz-tiny iz-muted2 mt-0.5">{receiptEntryLoggedLabel(scan)}</p>
          <p className="iz-tiny iz-muted2">
            Shift date {d}/{m}/{y}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2 text-right">
          <div>
            {scan.logSource === "manual" ? (
              <IzPill variant={statusPill.variant}>{statusPill.label}</IzPill>
            ) : (
              <IzPill variant={entry === "manual" ? "violet" : "ink"}>
                {receiptEntryMethodLabel(entry)}
              </IzPill>
            )}
            <p className="iz-ledger mt-1 text-sm font-bold">{formatRM(scan.totalLogged)}</p>
            <p className="iz-tiny iz-muted2">Comm {formatRM(scan.totalCommission)}</p>
          </div>
          {onClick && !pendingSelfLog && (
            <ChevronRight className="mt-1 h-4 w-4 text-[var(--iz-muted)]" aria-hidden />
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 border-t border-[var(--iz-line)] pt-2">
          {scan.items.map((item) => (
            <p key={`${scan.id}-${item.label}`} className="iz-tiny iz-muted py-0.5">
              {item.qty}× {item.label} · {formatRM(item.amount)}
            </p>
          ))}
        </div>
      )}
      {pendingSelfLog && onVerify && (
        <div className="mt-2 flex gap-2 border-t border-[var(--iz-line)] pt-2">
          <button
            type="button"
            className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs"
            onClick={() => onVerify(scan.id, "rejected")}
          >
            Reject
          </button>
          <button
            type="button"
            className="iz-btn iz-btn-primary flex-1 !py-1.5 !text-xs"
            onClick={() => onVerify(scan.id, "approved")}
          >
            <CheckCircle2 className="h-3 w-3" /> Verify self-log
          </button>
        </div>
      )}
    </IzCard>
  );

  if (onClick && !pendingSelfLog) {
    return (
      <button type="button" className="mb-2 block w-full text-left" onClick={onClick}>
        {body}
      </button>
    );
  }

  return body;
}

function ReceiptScanDetailSheet({
  scan,
  pv,
  open,
  onClose,
  onOpenPv,
}: {
  scan: PrReceiptScan | null;
  pv?: PrPaymentVoucher;
  open: boolean;
  onClose: () => void;
  onOpenPv?: (pvId: string) => void;
}) {
  if (!scan) return null;

  const [y, m, d] = scan.date;
  const entry = receiptEntryMethod(scan);
  const shift = receiptShiftDetails(scan, pv);

  return (
    <IzSheet open={open} onClose={onClose}>
      <div className="iz-sheet-body">
        <div className="iz-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">
              {scan.receiptRef}
            </h3>
            <p className="iz-tiny iz-muted2 mt-0.5 font-mono">{scan.id}</p>
          </div>
          <IzPill variant={entry === "manual" ? "violet" : "ink"}>
            {receiptEntryMethodLabel(entry)}
          </IzPill>
        </div>

        <p className="iz-tiny iz-muted mt-2">
          {scan.prName} · {scan.outlet}
          {scan.prId ? ` · PR ID ${scan.prId}` : ""}
        </p>
        <p className="iz-tiny iz-muted2">{receiptEntryLoggedLabel(scan)}</p>
        <p className="iz-tiny iz-muted2">
          Shift date {d}/{m}/{y}
          {shift.window ? ` · ${shift.shiftTime} ${shift.window}` : ""}
        </p>

        <IzCard flat className="mt-3 border-[rgba(232,194,122,.25)]">
          <p className="iz-tiny iz-muted2 tracking-wide">PAYMENT VOUCHER</p>
          {scan.pvId ? (
            <>
              <p className="font-sora mt-1 text-sm font-bold text-[var(--iz-gold-l)]">
                {scan.pvId}
              </p>
              {pv ? (
                <p className="iz-tiny iz-muted mt-1">
                  {pv.prName} · {pv.outlet} · issued {pv.issued}
                </p>
              ) : (
                <p className="iz-tiny iz-muted2 mt-1">PV not in agency payroll list</p>
              )}
              {pv && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <IzPill variant={pvStatusPillVariant(pv.status)}>
                    {agencyPvStatusLabel(pv.status)}
                  </IzPill>
                  <span className="iz-ledger text-sm font-bold">{formatRM(pv.net)}</span>
                </div>
              )}
              {onOpenPv && (
                <button
                  type="button"
                  className="iz-btn iz-btn-soft iz-btn-sm mt-3 w-full"
                  onClick={() => {
                    onOpenPv(scan.pvId!);
                    onClose();
                  }}
                >
                  <FileText className="h-3.5 w-3.5" /> View full PV
                </button>
              )}
            </>
          ) : (
            <p className="iz-sm iz-muted mt-1">
              Not on a PV yet — receipt is attached to the PR&apos;s active shift until Time-Out.
            </p>
          )}
        </IzCard>

        <div className="mt-3">
          <ReceiptScanSlip scan={scan} />
        </div>
      </div>
    </IzSheet>
  );
}

function ReceiptsSection({
  scans,
  agencyPRs,
  pvs,
  payrollRange,
  onRangeChange,
  onClearRange,
  onOpenPv,
  onVerifySelfLog,
}: {
  scans: PrReceiptScan[];
  agencyPRs: AgencyManagedPR[];
  pvs: PrPaymentVoucher[];
  payrollRange: PayrollRangeFilter;
  onRangeChange: (r: PayrollRangeFilter) => void;
  onClearRange: () => void;
  onOpenPv?: (pvId: string) => void;
  onVerifySelfLog?: (scanId: string, decision: "approved" | "rejected") => void;
}) {
  const [outlet, setOutlet] = useState("");
  const [prId, setPrId] = useState("");
  const [entryMethod, setEntryMethod] = useState<"" | ReceiptEntryMethod>("");
  const [detailScan, setDetailScan] = useState<PrReceiptScan | null>(null);
  const detailPv = useMemo(
    () => (detailScan?.pvId ? pvs.find((p) => p.id === detailScan.pvId) : undefined),
    [detailScan, pvs],
  );
  const outlets = useMemo(() => [...new Set(scans.map((s) => s.outlet))].sort(), [scans]);
  const prOptions = useMemo(
    () =>
      agencyPRs
        .filter((pr) => scans.some((s) => receiptBelongsToAgencyPr(s, pr)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [agencyPRs, scans],
  );
  const filtered = useMemo(
    () =>
      scans.filter((s) => {
        if (outlet && s.outlet !== outlet) return false;
        if (prId) {
          const pr = agencyPRs.find((p) => p.id === prId);
          if (!pr || !receiptBelongsToAgencyPr(s, pr)) return false;
        }
        if (entryMethod && receiptEntryMethod(s) !== entryMethod) return false;
        return matchesReceiptShiftWorkRange(s, payrollRange);
      }),
    [scans, outlet, prId, entryMethod, agencyPRs, payrollRange],
  );
  const receiptFiltersActive = Boolean(outlet || prId || entryMethod);

  const clearReceiptFilters = () => {
    onClearRange();
    setOutlet("");
    setPrId("");
    setEntryMethod("");
  };

  const pendingSelfLogs = useMemo(
    () => scans.filter((s) => s.logSource === "manual" && s.agencyVerification === "pending"),
    [scans],
  );

  return (
    <OutletSection title="Receipt scans" hint={`${scans.length} from managed PRs`}>
      {pendingSelfLogs.length > 0 && (
        <IzCard flat className="mb-2 border-[rgba(244,183,64,.4)] bg-[rgba(244,183,64,.08)]">
          <p className="iz-sm font-bold text-[var(--iz-amber)]">
            {pendingSelfLogs.length} manual self-log{pendingSelfLogs.length !== 1 ? "s" : ""}{" "}
            awaiting verify
          </p>
          <p className="iz-tiny iz-muted2 mt-0.5">
            PR keyed in amounts when OCR could not read blurry or water-damaged receipts.
          </p>
        </IzCard>
      )}
      <IzCard flat>
        <p className="iz-tiny iz-muted">
          Agency copy of PR receipt logs — grouped by shift working day. Tap a receipt for line
          items and the PV it belongs to.
        </p>
      </IzCard>
      <PayrollRangeFilterCard
        range={payrollRange}
        onChange={onRangeChange}
        onClear={clearReceiptFilters}
        clearLabel="Clear filters"
        clearActive={receiptFiltersActive}
        hint="Shift work date for range · scan time when a time range is set · filter by PR, outlet, or entry method."
      >
        <IzSelect block className="!text-xs" value={prId} onChange={(e) => setPrId(e.target.value)}>
          <option value="">All PRs</option>
          {prOptions.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name}
            </option>
          ))}
        </IzSelect>
        <IzSelect
          block
          className="!text-xs"
          value={outlet}
          onChange={(e) => setOutlet(e.target.value)}
        >
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </IzSelect>
        <IzSelect
          block
          className="!text-xs"
          value={entryMethod}
          onChange={(e) => setEntryMethod(e.target.value as "" | ReceiptEntryMethod)}
        >
          <option value="">All entry methods</option>
          <option value="scan">Scanned</option>
          <option value="manual">Manual</option>
        </IzSelect>
      </PayrollRangeFilterCard>
      <p className="iz-tiny iz-muted2 mt-2 mb-2">
        {filtered.length} scan{filtered.length !== 1 ? "s" : ""} for managed PRs
      </p>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No receipt scans in this range</p>
          </IzCard>
        ) : (
          filtered.map((scan) => {
            const pendingSelfLog =
              scan.logSource === "manual" && scan.agencyVerification === "pending";
            return (
              <ReceiptScanRow
                key={scan.id}
                scan={scan}
                compact
                onVerify={onVerifySelfLog}
                onClick={pendingSelfLog ? undefined : () => setDetailScan(scan)}
              />
            );
          })
        )}
      </div>
      <ReceiptScanDetailSheet
        scan={detailScan}
        pv={detailPv}
        open={detailScan !== null}
        onClose={() => setDetailScan(null)}
        onOpenPv={onOpenPv}
      />
    </OutletSection>
  );
}

function ReconciliationSection({
  reconciliation,
  prIncomes,
  prConfirmProgress,
  onConfirm,
  onOpenPv,
  canConfirm,
}: {
  reconciliation: import("@/lib/agency-demo").AgencyReconciliationDay;
  prIncomes: PrReconciliationIncome[];
  prConfirmProgress: { confirmed: number; total: number };
  onConfirm: () => void;
  onOpenPv: (pvId: string) => void;
  canConfirm: boolean;
}) {
  const setReconciliationVarianceReason = useStore((s) => s.setReconciliationVarianceReason);
  const [varianceReason, setVarianceReason] = useState(reconciliation.varianceReason ?? "");
  const prIncomeTotal = reconciliation.prIncomeTotal ?? 0;
  const prVariance = reconciliation.prVariance ?? 0;
  const attentionCount = prReconciliationAttentionCount(prIncomes);
  const sortedIncomes = useMemo(
    () =>
      [...prIncomes].sort((a, b) => {
        const aNeeds = prReconciliationNeedsDetail(a);
        const bNeeds = prReconciliationNeedsDetail(b);
        if (aNeeds !== bNeeds) return aNeeds ? -1 : 1;
        return b.totalRm - a.totalRm;
      }),
    [prIncomes],
  );
  const cutoffLabel =
    prIncomes[0]?.cutoffLabel ??
    (reconciliation.weekEndIso
      ? new Date(reconciliation.weekEndIso).toLocaleDateString("en-MY", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—");

  return (
    <div className="mt-3">
      <IzCard flat className="border-[rgba(232,194,122,.35)]">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
          <div>
            <p className="iz-sm font-bold">Weekly reconciliation · {reconciliation.dateLabel}</p>
            <p className="iz-tiny iz-muted mt-1">
              Shift earnings by PR · income cutoff {cutoffLabel} · payment voucher detail only when
              variance or dispute
            </p>
          </div>
        </div>
      </IzCard>

      <IzCard className="mt-2">
        <div className="iz-v-sum">
          <span className="iz-muted">PR shift earnings</span>
          <b>{formatRM(prIncomeTotal)}</b>
        </div>
        {(prVariance !== 0 || attentionCount > 0) && (
          <>
            <div className="iz-v-sum">
              <span className="iz-muted">Payment voucher total</span>
              <b>{formatRM(reconciliation.pvTotal)}</b>
            </div>
            <div className="iz-v-sum tot">
              <span className={prVariance !== 0 ? "text-[var(--iz-amber)]" : ""}>Variance</span>
              <b className={prVariance !== 0 ? "text-[var(--iz-amber)]" : ""}>
                {formatRM(prVariance)}
              </b>
            </div>
          </>
        )}
        <div className="iz-v-sum">
          <span className="iz-muted">PR confirmed</span>
          <b>
            {prConfirmProgress.confirmed}/{prConfirmProgress.total}
            {prConfirmProgress.total > 0 && prConfirmProgress.confirmed === prConfirmProgress.total
              ? " ✓"
              : ""}
          </b>
        </div>
        <div className="iz-v-sum">
          <span className="iz-muted">Agency confirmed</span>
          <b>{reconciliation.agencyConfirmed ? "Yes ✓ · locked" : "Awaiting"}</b>
        </div>
        {attentionCount > 0 && (
          <div className="iz-v-sum">
            <span className="iz-muted">Needs review</span>
            <b className="text-[var(--iz-amber)]">
              {attentionCount} PR{attentionCount === 1 ? "" : "s"}
            </b>
          </div>
        )}
      </IzCard>

      <OutletSection
        title="PR shift totals"
        hint={
          attentionCount > 0
            ? `${attentionCount} with variance or dispute · full PV detail below`
            : `All matched · ${prIncomes.length} PR${prIncomes.length === 1 ? "" : "s"} · cutoff ${cutoffLabel}`
        }
        className="mt-2.5"
      >
        {sortedIncomes.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No sealed shifts in this week</p>
          </IzCard>
        ) : (
          <div className="space-y-2">
            {sortedIncomes.map((row) => (
              <PrReconciliationRow key={row.prId} row={row} onOpenPv={onOpenPv} />
            ))}
          </div>
        )}
      </OutletSection>

      {prVariance !== 0 && canConfirm && !reconciliation.agencyConfirmed && (
        <IzCard flat className="mt-2">
          <p className="iz-tiny iz-muted mb-2">
            Note variance between PR earnings and payment vouchers
          </p>
          <textarea
            className="iz-field-input min-h-[60px] !text-xs"
            placeholder="Reason (optional)"
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            onBlur={() => setReconciliationVarianceReason(varianceReason)}
          />
        </IzCard>
      )}

      {canConfirm && !reconciliation.agencyConfirmed && (
        <button type="button" className="iz-btn iz-btn-primary mt-3 w-full" onClick={onConfirm}>
          Confirm reconciliation · agency side
        </button>
      )}

      {reconciliation.agencyConfirmed && (
        <IzCard flat className="mt-2 border-[var(--iz-green)]">
          <p className="iz-tiny flex items-center gap-1 text-[var(--iz-green)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Agency side locked · entry immutable
          </p>
        </IzCard>
      )}

      {reconciliation.agencyConfirmed &&
        allPrsConfirmedForWeek(prIncomes, reconciliation.prConfirmedIds) && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            Agency + all PRs confirmed · PV payout eligible
          </p>
        )}
      {reconciliation.agencyConfirmed &&
        !allPrsConfirmedForWeek(prIncomes, reconciliation.prConfirmedIds) && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            Awaiting PR confirmation in PR portal ({prConfirmProgress.confirmed}/
            {prConfirmProgress.total})
          </p>
        )}
    </div>
  );
}

function PrReconciliationRow({
  row,
  onOpenPv,
}: {
  row: PrReconciliationIncome;
  onOpenPv: (pvId: string) => void;
}) {
  const needsDetail = prReconciliationNeedsDetail(row);
  const variance = prReconciliationVariance(row);
  const matched = !needsDetail;

  return (
    <IzCard flat className={`!p-3 ${needsDetail ? "border-[rgba(232,194,122,.35)]" : ""}`}>
      <div className="iz-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-sora text-sm font-bold">{row.prName}</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {row.outlets.length > 1
              ? `Multi-outlet (${row.outlets.length}) · ${row.outlets.join(", ")}`
              : row.outlets[0]}
          </p>
          <p className="iz-tiny iz-muted2 mt-0.5">
            {row.shiftCount} shift{row.shiftCount === 1 ? "" : "s"} · cutoff {row.cutoffLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {matched ? (
            <IzPill variant="green">Matched</IzPill>
          ) : row.pvStatus === "DISPUTED" ? (
            <IzPill variant="red">Disputed</IzPill>
          ) : (
            <IzPill variant="amber">Variance</IzPill>
          )}
          <div className="iz-ledger font-sora mt-1.5 text-base font-bold">
            {formatRM(row.totalRm)}
          </div>
          <p className="iz-tiny iz-muted2 mt-0.5">Shift total</p>
        </div>
      </div>

      {needsDetail && (
        <div className="mt-2 border-t border-[var(--iz-line)] pt-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <p className="iz-tiny iz-muted">Wages</p>
            <p className="iz-tiny text-right font-semibold">{formatRM(row.wagesRm)}</p>
            <p className="iz-tiny iz-muted">Drinks</p>
            <p className="iz-tiny text-right font-semibold">{formatRM(row.drinksRm)}</p>
            <p className="iz-tiny iz-muted">Tips</p>
            <p className="iz-tiny text-right font-semibold">{formatRM(row.tipsRm)}</p>
            {row.tablesRm > 0 && (
              <>
                <p className="iz-tiny iz-muted">Tables</p>
                <p className="iz-tiny text-right font-semibold">{formatRM(row.tablesRm)}</p>
              </>
            )}
          </div>
          <div className="iz-v-sum mt-2 !py-1">
            <span className="iz-tiny iz-muted">Payment voucher</span>
            <b className="text-sm">{row.pvId ? formatRM(row.pvNetRm ?? 0) : "Not raised yet"}</b>
          </div>
          <div className="iz-v-sum !py-1">
            <span className="iz-tiny text-[var(--iz-amber)]">Variance</span>
            <b className="text-sm text-[var(--iz-amber)]">{formatRM(variance)}</b>
          </div>
          {row.pvId ? (
            <button
              type="button"
              className="iz-tiny mt-2 text-[var(--iz-gold-l)]"
              onClick={() => onOpenPv(row.pvId!)}
            >
              Open {row.pvId} · {row.pvStatus ? agencyPvStatusLabel(row.pvStatus) : "PV"} →
            </button>
          ) : (
            <p className="iz-tiny iz-muted2 mt-2">
              PV auto-raised at week close · awaiting generation
            </p>
          )}
        </div>
      )}

      {!needsDetail && (
        <p className="iz-tiny iz-muted2 mt-1.5">
          {row.prConfirmed ? "PR confirmed · " : "PR pending · "}
          aligns with payment voucher
        </p>
      )}
    </IzCard>
  );
}

function PayrollReconciliationBanner({
  reconciliation,
  prIncomes,
  prConfirmProgress,
  canConfirm,
  onConfirm,
  onOpenReconciliation,
}: {
  reconciliation: import("@/lib/agency-demo").AgencyReconciliationDay;
  prIncomes: PrReconciliationIncome[];
  prConfirmProgress: { confirmed: number; total: number };
  canConfirm: boolean;
  onConfirm: () => void;
  onOpenReconciliation: () => void;
}) {
  if (
    reconciliation.agencyConfirmed &&
    allPrsConfirmedForWeek(prIncomes, reconciliation.prConfirmedIds)
  ) {
    return null;
  }
  const prIncomeTotal = reconciliation.prIncomeTotal ?? 0;
  const prVariance = reconciliation.prVariance ?? 0;
  return (
    <IzCard flat className="mt-3 border-[rgba(232,194,122,.4)] bg-[rgba(232,194,122,.06)]">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
        <div className="min-w-0 flex-1">
          <p className="iz-sm font-bold">Confirm weekly reconciliation</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {reconciliation.dateLabel} · PR earnings {formatRM(prIncomeTotal)} vs PV{" "}
            {formatRM(reconciliation.pvTotal)}
            {prVariance !== 0 && (
              <span className="text-[var(--iz-amber)]"> · variance {formatRM(prVariance)}</span>
            )}
          </p>
          <p className="iz-tiny iz-muted2 mt-1">
            PR {prConfirmProgress.confirmed}/{prConfirmProgress.total} confirmed · Agency{" "}
            {reconciliation.agencyConfirmed ? "confirmed ✓" : "awaiting"}
          </p>
          <button
            type="button"
            className="iz-tiny mt-1 text-[var(--iz-gold-l)]"
            onClick={onOpenReconciliation}
          >
            Open reconciliation tab →
          </button>
          {canConfirm && !reconciliation.agencyConfirmed && (
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-2 w-full !py-2 !text-xs"
              onClick={onConfirm}
            >
              Confirm reconciliation
            </button>
          )}
        </div>
      </div>
    </IzCard>
  );
}

function PvWorkflowRail({ status }: { status: PrPvStatus }) {
  const active = pvWorkflowStepIndex(status);
  return (
    <div className="mb-2.5 flex gap-1 overflow-x-auto pb-1">
      {PV_WORKFLOW_STEPS.map((step, idx) => {
        const done = idx <= active;
        const current = idx === active;
        return (
          <div
            key={step.key}
            className={`shrink-0 rounded-lg border px-2 py-1.5 text-center ${
              current
                ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)]"
                : done
                  ? "border-[var(--iz-green)]/40 text-[var(--iz-green)]"
                  : "border-[var(--iz-line)] text-[var(--iz-muted)]"
            }`}
          >
            <p className="iz-tiny font-semibold">{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function PvBreakdownCard({ breakdown }: { breakdown: PvEarningsBreakdown }) {
  const rows = [
    { label: "Daily wages", value: breakdown.wages },
    { label: "Drink commissions", value: breakdown.drinks },
    { label: "Tip commissions", value: breakdown.tips },
    { label: "Overtime (check-out)", value: breakdown.overtime },
  ].filter((r) => r.value > 0);
  if (breakdown.other > 0) rows.push({ label: "Other", value: breakdown.other });
  return (
    <IzCard flat className="mb-2.5">
      <p className="iz-tiny iz-muted2 mb-2 tracking-wide">4-PART EARNINGS BREAKDOWN</p>
      {rows.map((r) => (
        <div key={r.label} className="iz-v-sum">
          <span className="iz-muted">{r.label}</span>
          <b>{formatRM(r.value)}</b>
        </div>
      ))}
      <div className="iz-v-sum tot">
        <span>Subtotal</span>
        <b className="text-[var(--iz-gold)]">{formatRM(breakdown.total)}</b>
      </div>
    </IzCard>
  );
}

function PvDetail({
  pv,
  receiptScans,
  onClose,
}: {
  pv: PrPaymentVoucher;
  receiptScans: PrReceiptScan[];
  onClose: () => void;
}) {
  const editAgencyPv = useStore((s) => s.editAgencyPv);
  const sendAgencyPvToPr = useStore((s) => s.sendAgencyPvToPr);
  const resendAgencyPv = useStore((s) => s.resendAgencyPv);
  const resolveAgencyPvDispute = useStore((s) => s.resolveAgencyPvDispute);
  const overrideSignedAgencyPv = useStore((s) => s.overrideSignedAgencyPv);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const toast = useStore((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const canOverride = agencyCan(agencySubRole, "overrideSignedPv");
  const [rows, setRows] = useState<PrPvRow[]>(pv.rows);
  const [deduct, setDeduct] = useState(pv.deduct);

  const payee = buildAgencyPayee(pv, agencyPRs);
  const breakdown = summarizePv(editing ? { ...pv, rows, deduct } : pv);
  const prHasSigned = Boolean(pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED");
  const prSigPreview = pv.prSignatureDataUrl;
  const disputeDays = disputeDaysRemaining(pv.disputedAt);
  const displayPv: PrPaymentVoucher = editing ? reconcilePvTotals({ ...pv, rows, deduct }) : pv;

  const saveEdit = () => {
    editAgencyPv(pv.id, { rows, deduct });
    setEditing(false);
  };

  return (
    <>
      <div className="iz-pv-detail-bar mb-2.5">
        <div className="iz-pv-detail-bar-main">
          <IzPill variant={statusPill(pv.status)}>{agencyPvStatusLabel(pv.status)}</IzPill>
          <span className="iz-pv-detail-id">{pv.id}</span>
        </div>
        <button type="button" className="iz-chip" onClick={onClose}>
          Close
        </button>
      </div>

      <PvWorkflowRail status={pv.status} />

      <IzCard flat className="mb-2">
        <p className="iz-tiny iz-muted2">Dual-sign PV</p>
        <p className="iz-tiny mt-1">
          1st · {FINANCE_HEAD_LABEL}: <b className="text-[var(--iz-txt)]">{pv.financeHeadName}</b>
          {pv.financeHeadSignedAt ? ` · ${pv.financeHeadSignedAt}` : " · pending"}
        </p>
        {pv.financeHeadSignatureDataUrl && (
          <div className="iz-pv-sig-preview mt-1.5">
            <img src={pv.financeHeadSignatureDataUrl} alt={`${pv.financeHeadName} signature`} />
          </div>
        )}
        <p className="iz-tiny iz-muted mt-2">
          2nd · PR ({pv.prName}):
          {prHasSigned ? (
            <>
              {" "}
              <b className="text-[var(--iz-txt)]">{pv.prName}</b>
              {pv.prSignedAt ? ` · ${pv.prSignedAt}` : ""}
              {" · "}
              <span className="text-[var(--iz-green)]">e-sign on file ✓</span>
            </>
          ) : pv.status === "SENT" || pv.status === "PENDING_REVIEW" ? (
            " awaiting manual sign"
          ) : (
            " —"
          )}
        </p>
        {prHasSigned && prSigPreview && (
          <div className="iz-pv-sig-preview mt-1.5">
            <img src={prSigPreview} alt={`${pv.prName} signature`} />
          </div>
        )}
      </IzCard>

      <PvBreakdownCard breakdown={breakdown} />

      {pv.status === "DISPUTED" && (
        <IzCard flat className="mb-2 border-[var(--iz-red)]">
          <p className="iz-tiny font-bold text-[var(--iz-red)]">
            PR dispute — resolve within 7 days
          </p>
          {pv.disputedAt && <p className="iz-tiny iz-muted2 mt-0.5">Raised {pv.disputedAt}</p>}
          {disputeDays !== null && (
            <p className="iz-tiny flex items-center gap-1 text-[var(--iz-amber)] mt-1">
              <Clock className="h-3 w-3" />
              {disputeDays > 0
                ? `${disputeDays} day(s) left to adjust + re-send`
                : "Past 7 days — follow up with PR directly"}
            </p>
          )}
          {pv.disputeUpdatedAt && (
            <p className="iz-tiny text-[var(--iz-amber)]">PR updated {pv.disputeUpdatedAt}</p>
          )}
          {pv.prDisputeReason && (
            <div className="mt-2 rounded-[12px] border border-[rgba(255,107,107,.2)] bg-[rgba(0,0,0,.15)] p-3">
              <p className="iz-tiny iz-muted2 tracking-wide">PR REASON</p>
              <p className="iz-sm mt-1 leading-relaxed">{pv.prDisputeReason}</p>
            </div>
          )}
          {pv.disputeNote && (
            <p className="iz-tiny iz-muted mt-2">
              <b className="text-[var(--iz-muted)]">Agency note:</b> {pv.disputeNote}
            </p>
          )}
        </IzCard>
      )}

      <PvSummaryView pv={displayPv} payee={payee} className="mb-2.5" />

      {receiptScans.length > 0 && (
        <OutletSection title="Receipt scans" hint={`${receiptScans.length} logged on this PV`}>
          {receiptScans.map((scan) => (
            <ReceiptScanRow key={scan.id} scan={scan} />
          ))}
        </OutletSection>
      )}

      {pv.status === "DISPUTED" && rows.length > 0 && (
        <OutletSection
          title="Edit line items"
          hint="Dispute resolution"
          trailing={
            <button type="button" className="iz-chip" onClick={() => setEditing(!editing)}>
              <Pencil className="mr-1 inline h-3 w-3" /> {editing ? "Cancel" : "Edit"}
            </button>
          }
        >
          <IzCard>
            {rows.map((r, idx) => (
              <div
                key={r.i}
                className="iz-v-sum border-b border-[var(--iz-line)] py-2 last:border-0"
              >
                <div className="min-w-0 pr-2">
                  {editing ? (
                    <input
                      className="w-full rounded bg-[var(--iz-bg2)] px-2 py-1 text-sm"
                      value={r.desc}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx] = { ...r, desc: e.target.value };
                        setRows(next);
                      }}
                    />
                  ) : (
                    <span className="iz-sm">{r.desc}</span>
                  )}
                  <p className="iz-tiny iz-muted2 mt-0.5">
                    {r.date} ({r.day}) · {r.outlet} · {r.ref}
                  </p>
                </div>
                {editing ? (
                  <input
                    type="number"
                    className="w-20 rounded bg-[var(--iz-bg2)] px-2 py-1 text-right text-sm"
                    value={r.amt}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...r, amt: Number(e.target.value) };
                      setRows(next);
                    }}
                  />
                ) : (
                  <b className="iz-ledger shrink-0">{formatRM(r.amt)}</b>
                )}
              </div>
            ))}
            {editing && (
              <div className="mt-2">
                <label className="iz-tiny iz-muted">Deductions</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-sm"
                  value={deduct}
                  onChange={(e) => setDeduct(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="iz-btn iz-btn-primary mt-2 w-full"
                  onClick={saveEdit}
                >
                  Save dispute edit
                </button>
              </div>
            )}
          </IzCard>
        </OutletSection>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className="iz-btn iz-btn-soft min-w-0 flex-1 !py-2.5 !text-xs"
          onClick={() => {
            downloadPvBreakdownPdf(displayPv, payee);
            toast("Official PV opened — use Print → Save as PDF", "success");
          }}
        >
          <FileText className="h-4 w-4 shrink-0" /> PDF
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft min-w-0 flex-1 !py-2.5 !text-xs"
          onClick={() => {
            downloadPvBreakdownCsv(displayPv, payee);
            toast("Payment voucher Excel downloaded", "success");
          }}
        >
          <Sheet className="h-4 w-4 shrink-0" /> Excel
        </button>
      </div>
      <p className="iz-tiny iz-muted2 mt-1.5 text-center">
        PDF and Excel match the official voucher layout · duplicate payment blocked on send.
      </p>

      {pv.status === "PAID" && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-2 w-full"
          onClick={() => {
            downloadPvReceipt(displayPv, {
              name: payee.name,
              bank: payee.bank ?? "Maybank",
              acc: payee.accountNo ?? "",
              ic: payee.ic ?? pv.prIc ?? "",
            });
            toast("Payment receipt downloaded", "success");
          }}
        >
          <Receipt className="h-4 w-4" /> Download payment receipt
        </button>
      )}

      {pv.status === "PENDING_REVIEW" && agencyCan(agencySubRole, "raisePv") && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-2 w-full"
          onClick={() => sendAgencyPvToPr(pv.id)}
        >
          <Send className="h-4 w-4" /> Send to PR for e-sign
        </button>
      )}

      {(pv.status === "DISPUTED" || pv.status === "SENT") && (
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => resendAgencyPv(pv.id)}
        >
          Re-send to PR
        </button>
      )}

      {pv.status === "DISPUTED" && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-2"
          onClick={() => resolveAgencyPvDispute(pv.id)}
        >
          Resolve dispute &amp; reassign
        </button>
      )}

      {pv.overrideAudit && (
        <IzCard flat className="mt-2 border-[var(--iz-amber)]">
          <p className="iz-tiny flex items-center gap-1 text-[var(--iz-amber)]">
            <Shield className="h-3 w-3" /> Overridden by {pv.overrideAudit.by} ·{" "}
            {pv.overrideAudit.at}
          </p>
          <p className="iz-tiny iz-muted mt-1">{pv.overrideAudit.reason}</p>
        </IzCard>
      )}

      {canOverride && (pv.status === "SIGNED" || pv.status === "PAID") && (
        <button
          type="button"
          className="iz-btn iz-btn-ghost mt-2 w-full"
          onClick={() => setOverrideOpen(true)}
        >
          Override signed PV (audit logged)
        </button>
      )}

      <IzSheet open={overrideOpen} onClose={() => setOverrideOpen(false)}>
        <div className="iz-cardttl">Override signed PV</div>
        <p className="iz-tiny iz-muted mb-3">
          Finance may override with a mandatory audit reason — PV re-opens for PR review
        </p>
        <textarea
          className="iz-field-input min-h-[80px]"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="Reason for override…"
        />
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-3 w-full"
          disabled={!overrideReason.trim()}
          onClick={() => {
            overrideSignedAgencyPv(pv.id, overrideReason);
            setOverrideOpen(false);
            setOverrideReason("");
          }}
        >
          Confirm override
        </button>
      </IzSheet>

      <button type="button" className="iz-btn iz-btn-soft mt-2" onClick={onClose}>
        Back to payroll
      </button>
    </>
  );
}
