import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  filterPvsByIssuedRecency,
  getLatestPvIssuedMs,
  getPvSalesTotal,
  parsePvIssuedMs,
  PAYROLL_CYCLE,
  downloadPvReceipt,
  pvNeedsPrReview,
  pvStatusLabel,
  pvStatusPillVariant,
  receiptStatusLabel,
  sortPvsBySales,
  FINANCE_HEAD_LABEL,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrPvStatus,
  type PrReceiptScan,
  type PvDateRecencyFilter,
  type PvSalesSort,
} from "@/lib/pr-demo";
import { getAgencyManagedReceiptScans, receiptsForPv } from "@/lib/agency-payroll";
import {
  matchesPayrollIssueDate,
  matchesPayrollRange,
  parseScannedAtMs,
  payrollRangeActive,
  type PayrollRangeFilter,
} from "@/lib/payroll-filters";
import { EMPTY_PAYROLL_RANGE, PayrollRangeFilterCard } from "@/components/agency/PayrollRangeFilter";
import { PvSummaryView } from "@/components/iz/PvSummaryView";
import { downloadPvBreakdownPdf } from "@/lib/pv-pdf";
import { buildAgencyPayee } from "@/lib/pv-template";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import type { AgencyCollectionInvoice } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Pencil,
  Plus,
  Receipt,
  Send,
  Shield,
} from "lucide-react";
import { OutletSection } from "@/components/outlet/OutletSection";
import { IzCard, IzPill, IzSelect, formatRM } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { historyRowHasPv } from "@/lib/agency-actions";
import {
  PV_WORKFLOW_STEPS,
  disputeDaysRemaining,
  pvWorkflowStepIndex,
  summarizePv,
  type PvEarningsBreakdown,
} from "@/lib/pv-breakdown";
import { AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/pv")({
  component: AgencyPV,
});

function statusPill(status: PrPvStatus) {
  return pvStatusPillVariant(status);
}

type PvStatusFilter = "all" | PrPvStatus;
type PayrollTab = "pv" | "collections" | "reconciliation" | "receipts";

const AGING_LABELS: Record<AgencyCollectionInvoice["aging"], string> = {
  current: "Current",
  "7d": "7d",
  "14d": "14d",
  "30d": "30d",
  "60d+": "60d+",
};

const PV_STATUS_FILTERS: { value: PvStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "SENT", label: "Sent" },
  { value: "SIGNED", label: "Signed" },
  { value: "PAID", label: "Paid" },
  { value: "DISPUTED", label: "Disputed" },
];

const PV_DATE_FILTERS: { value: PvDateRecencyFilter; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "latest", label: "Latest issue date" },
  { value: "previous", label: "Previous dates" },
];

function AgencyPV() {
  const prPaymentVouchers = useStore((s) => s.prPaymentVouchers ?? []);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const agencyCollections = useStore((s) => s.agencyCollections);
  const markCollectionSettled = useStore((s) => s.markCollectionSettled);
  const sendCollectionReminder = useStore((s) => s.sendCollectionReminder);
  const reconciliation = useStore((s) => s.agencyReconciliation);
  const confirmAgencyReconciliation = useStore((s) => s.confirmAgencyReconciliation);
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payrollTab, setPayrollTab] = useState<PayrollTab>("pv");
  const [statusFilter, setStatusFilter] = useState<PvStatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<PvDateRecencyFilter>("all");
  const [salesSort, setSalesSort] = useState<PvSalesSort>("default");
  const [collectionDetail, setCollectionDetail] = useState<string | null>(null);
  const [raisePvOpen, setRaisePvOpen] = useState(false);
  const [payrollRange, setPayrollRange] = useState<PayrollRangeFilter>(EMPTY_PAYROLL_RANGE);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const raiseAgencyPvFromHistory = useStore((s) => s.raiseAgencyPvFromHistory);
  const { date, time } = nowAgencyDateTime();
  const canRaisePv = agencyCan(agencySubRole, "raisePv");

  const raiseableShifts = useMemo(() => {
    return shiftHistory.filter((h) => !historyRowHasPv(h, prPaymentVouchers));
  }, [shiftHistory, prPaymentVouchers]);

  const latestIssuedMs = useMemo(
    () => getLatestPvIssuedMs(prPaymentVouchers),
    [prPaymentVouchers],
  );

  const awaiting = prPaymentVouchers.filter((p) => pvNeedsPrReview(p.status)).length;
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const queued = prPaymentVouchers.filter((p) => p.status === "SIGNED");
  const queuedTotal = queued.reduce((s, p) => s + p.net, 0);
  const paid = prPaymentVouchers.filter((p) => p.status === "PAID").length;

  const agencyReceiptScans = useMemo(
    () => getAgencyManagedReceiptScans(prReceiptScans, agencyPRs, prPaymentVouchers),
    [prReceiptScans, agencyPRs, prPaymentVouchers],
  );

  const rangeFilteredPvs = useMemo(
    () =>
      prPaymentVouchers.filter((p) =>
        matchesPayrollRange(parsePvIssuedMs(p.issued), payrollRange),
      ),
    [prPaymentVouchers, payrollRange],
  );

  const filteredVouchers = useMemo(() => {
    let list =
      statusFilter === "all"
        ? rangeFilteredPvs
        : rangeFilteredPvs.filter((p) => p.status === statusFilter);
    list = filterPvsByIssuedRecency(list, dateFilter, latestIssuedMs);
    return sortPvsBySales(list, salesSort);
  }, [rangeFilteredPvs, statusFilter, dateFilter, salesSort, latestIssuedMs]);

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
      PAID: 0,
      DISPUTED: 0,
    };
    for (const p of rangeFilteredPvs) counts[p.status] += 1;
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

  const collectionRow = agencyCollections.find((c) => c.id === collectionDetail);
  const pendingCollections = agencyCollections.filter((c) => c.status === "PENDING");

  if (collectionRow) {
    return (
      <div className="iz-screen">
        <AppTopbar onBack={() => setCollectionDetail(null)} backLabel="Collections" />
        <IzCard>
          <div className="iz-v-sum"><span className="iz-muted">Invoice</span><b>{collectionRow.id}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Outlet</span><b>{collectionRow.counterparty ?? collectionRow.outlet}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Issued</span><b>{collectionRow.issueDate}{collectionRow.issueTime ? ` · ${collectionRow.issueTime}` : ""}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Due</span><b>{collectionRow.dueDate}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Amount</span><b>{formatRM(collectionRow.amount)}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Status</span><IzPill variant={collectionRow.status === "SETTLED" ? "green" : "amber"}>{collectionRow.status}</IzPill></div>
        </IzCard>
        <OutletSection title="Linked PVs">
          {collectionRow.linkedPvIds.map((id) => {
            const pv = prPaymentVouchers.find((p) => p.id === id);
            return (
              <IzCard key={id} flat>
                <p className="iz-sm font-bold">{id}</p>
                {pv ? (
                  <p className="iz-tiny iz-muted mt-0.5">
                    {pv.prName} · issued {pv.issued} · {formatRM(pv.net)}
                  </p>
                ) : (
                  <p className="iz-tiny iz-muted2 mt-0.5">PV queued · awaiting agency raise</p>
                )}
              </IzCard>
            );
          })}
          {collectionRow.status === "PENDING" && (
            <button type="button" className="iz-btn iz-btn-primary mt-3 w-full" onClick={() => { markCollectionSettled(collectionRow.id); setCollectionDetail(null); }}>
              Mark received · Paid
            </button>
          )}
        </OutletSection>
        <OutletSection title="Receipt scans" hint="PR scans linked to this invoice">
          {agencyReceiptScans
            .filter((s) => s.pvId && collectionRow.linkedPvIds.includes(s.pvId))
            .map((scan) => (
              <ReceiptScanRow key={scan.id} scan={scan} />
            ))}
          {agencyReceiptScans.filter((s) => s.pvId && collectionRow.linkedPvIds.includes(s.pvId)).length === 0 && (
            <IzCard flat className="text-center">
              <p className="iz-tiny iz-muted">No scanned receipts linked yet</p>
            </IzCard>
          )}
        </OutletSection>
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
          <IzPill variant="violet" className="ml-1.5 !py-0 !text-[9px]">Per-item calc</IzPill>
        </p>
        <p className="iz-tiny iz-muted2 mt-1">
          {AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"]} · PR portal signs · Outlet confirms reconciliation
        </p>
      </header>

      <PayrollReconciliationBanner
        reconciliation={reconciliation}
        canConfirm={agencyCan(agencySubRole, "confirmReconciliation")}
        onConfirm={confirmAgencyReconciliation}
        onOpenReconciliation={() => setPayrollTab("reconciliation")}
      />

      <div className="mt-3 flex gap-1.5">
        {(["pv", "collections", "receipts", "reconciliation"] as PayrollTab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`flex-1 rounded-full border py-2 text-[10px] font-semibold capitalize ${payrollTab === t ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
            onClick={() => setPayrollTab(t)}
          >
            {t === "pv" ? "PV" : t === "receipts" ? `Scans (${agencyReceiptScans.length})` : t}
            {t === "collections" && pendingCollections.length > 0 && ` (${pendingCollections.length})`}
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

      {payrollTab === "receipts" && (
        <ReceiptsSection
          scans={agencyReceiptScans}
          payrollRange={payrollRange}
          onRangeChange={setPayrollRange}
          onClearRange={() => setPayrollRange(EMPTY_PAYROLL_RANGE)}
        />
      )}

      {payrollTab === "reconciliation" && (
        <ReconciliationSection
          reconciliation={reconciliation}
          onConfirm={confirmAgencyReconciliation}
          canConfirm={agencyCan(agencySubRole, "confirmReconciliation")}
        />
      )}

      {payrollTab !== "pv" ? null : (
        <>

      <div className="iz-grid2 mt-3">
        <div className="iz-stat-tile">
          <div className="n">{awaiting}</div>
          <div className="l">Awaiting PR review / sign</div>
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
          Duplicate payment blocked · Golden Audit Σ=0 · OT from check-out receipt timestamp · PDF export only
        </p>
      </IzCard>

      <OutletSection title="Vouchers" hint={PAYROLL_CYCLE.range}>

      <IzCard flat className="!mb-2.5">
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Filter className="h-3.5 w-3.5 shrink-0" />
          Filter &amp; sort
          {hasActiveFilters && (
            <button type="button" className="ml-auto text-[var(--iz-gold-l)]" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        <p className="iz-tiny iz-muted2 mt-2 mb-1">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {PV_STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const count = statusCounts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]"
                    : "border-[var(--iz-line)] text-[var(--iz-muted)] hover:border-[var(--iz-muted)]"
                }`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
                <span className={`ml-1 ${active ? "text-[var(--iz-gold)]" : "iz-muted2"}`}>({count})</span>
              </button>
            );
          })}
        </div>

        <p className="iz-tiny iz-muted2 mt-3 mb-1">Issue date</p>
        <div className="flex flex-wrap gap-1.5">
          {PV_DATE_FILTERS.map((f) => {
            const active = dateFilter === f.value;
            const count = dateCounts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]"
                    : "border-[var(--iz-line)] text-[var(--iz-muted)] hover:border-[var(--iz-muted)]"
                }`}
                onClick={() => setDateFilter(f.value)}
              >
                {f.label}
                <span className={`ml-1 ${active ? "text-[var(--iz-gold)]" : "iz-muted2"}`}>({count})</span>
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
        {filteredVouchers.length === 0 ? (
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
                {pv.prName} · {pv.outlet}
              </p>
              {pv.prIc && <p className="iz-tiny iz-muted2">IC {pv.prIc}</p>}
              <p className="iz-tiny iz-muted2 mt-0.5">Cycle: {pv.cycle}</p>
              <p className="iz-tiny iz-muted2">
                Issued {pv.issued} · Due {pv.due}
                {parsePvIssuedMs(pv.issued) >= latestIssuedMs && latestIssuedMs > 0 && (
                  <span className="ml-1 text-[var(--iz-violet)]">· Latest</span>
                )}
              </p>
              <p className="iz-tiny text-[var(--iz-gold-l)] mt-0.5">Sales {formatRM(getPvSalesTotal(pv))}</p>
            </div>
            <div className="shrink-0 text-right">
              <IzPill variant={statusPill(pv.status)}>{pvStatusLabel(pv.status)}</IzPill>
              <div className="iz-ledger font-sora mt-1.5 text-base font-bold">{formatRM(pv.net)}</div>
              <p className="iz-tiny iz-muted2 mt-0.5">Net payable</p>
            </div>
          </button>
          ))
        )}
      </div>

      {canRaisePv && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-2"
          onClick={() => setRaisePvOpen(true)}
        >
          <Plus className="h-4 w-4" /> Raise new PV
        </button>
      )}
      </OutletSection>
        </>
      )}

      <IzSheet open={raisePvOpen} onClose={() => setRaisePvOpen(false)}>
        <div className="iz-cardttl">Raise PV</div>
        <p className="iz-tiny iz-muted mb-2">
          Select PR + sealed shift · 4-part breakdown (wages · drinks · tips · OT) auto-pulled ·{" "}
          {agencyFinanceHead.name} e-sign stamped (1st of 2)
        </p>
        {raiseableShifts.length === 0 ? (
          <IzCard flat className="text-center">
            <p className="iz-sm iz-muted">No sealed shifts without a PV</p>
          </IzCard>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {raiseableShifts.slice(0, 12).map((row) => (
              <button
                key={row.id}
                type="button"
                className="iz-card iz-between w-full text-left"
                onClick={() => {
                  raiseAgencyPvFromHistory(row.id);
                  setRaisePvOpen(false);
                }}
              >
                <div>
                  <p className="font-sora text-sm font-bold">{row.prName}</p>
                  <p className="iz-tiny iz-muted">{row.outlet} · {row.dateDisplay}</p>
                  <p className="iz-tiny iz-muted2">
                    Drinks {formatRM(row.totalDrinks)} · Tips {formatRM(row.totalTips)} · OT at check-out
                  </p>
                </div>
                <span className="iz-ledger text-sm font-bold text-[var(--iz-gold)]">{formatRM(row.totalPayout)}</span>
              </button>
            ))}
          </div>
        )}
      </IzSheet>
    </div>
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
  const [kind, setKind] = useState<"outlet" | "agency">("outlet");
  const [agingFilter, setAgingFilter] = useState<AgencyCollectionInvoice["aging"] | "all">("all");
  const baseFiltered = useMemo(
    () =>
      invoices
        .filter((i) => (i.kind ?? "outlet") === kind)
        .filter((i) => matchesPayrollIssueDate(i.issueDate, i.issueTime, payrollRange)),
    [invoices, kind, payrollRange],
  );
  const filtered = useMemo(
    () => (agingFilter === "all" ? baseFiltered : baseFiltered.filter((i) => i.aging === agingFilter)),
    [baseFiltered, agingFilter],
  );

  return (
    <div className="mt-3">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-[11px] font-semibold ${kind === "outlet" ? "border-[var(--iz-gold)] text-[var(--iz-gold-l)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setKind("outlet")}
        >
          Outlet invoices
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full border py-2 text-[11px] font-semibold ${kind === "agency" ? "border-[var(--iz-violet)] text-[var(--iz-violet)]" : "border-[var(--iz-line)] text-[var(--iz-muted)]"}`}
          onClick={() => setKind("agency")}
        >
          Agency invoices
        </button>
      </div>
      <IzCard flat className="border-[rgba(124,107,255,.25)]">
        <p className="iz-tiny iz-muted">
          Platform ledger · SETTLED vs PENDING · Owner + Finance · auto-reminder pings outlet on unpaid cycles
        </p>
      </IzCard>
      <PayrollRangeFilterCard range={payrollRange} onChange={onRangeChange} onClear={onClearRange} />
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
        {filtered.map((inv) => (
          <IzCard key={inv.id}>
            <button type="button" className="w-full text-left" onClick={() => onOpen(inv.id)}>
              <div className="iz-between">
                <div>
                  <div className="font-sora text-sm font-bold">{inv.counterparty ?? inv.outlet}</div>
                  <p className="iz-tiny iz-muted mt-0.5">
                    {inv.id} · issued {inv.issueDate}
                    {inv.issueTime ? ` · ${inv.issueTime}` : ""} · due {inv.dueDate}
                  </p>
                  {inv.reminderSent && inv.status === "PENDING" && (
                    <p className="iz-tiny text-[var(--iz-amber)] mt-0.5">Auto-reminder sent to outlet</p>
                  )}
                </div>
                <div className="text-right">
                  <IzPill variant={inv.status === "SETTLED" ? "green" : "amber"}>{inv.status}</IzPill>
                  <p className="iz-ledger mt-1 text-sm font-bold">{formatRM(inv.amount)}</p>
                </div>
              </div>
            </button>
            {inv.status === "PENDING" && (
              <div className="mt-2 flex gap-2">
                <button type="button" className="iz-btn iz-btn-soft flex-1 !py-1.5 !text-xs" onClick={() => onRemind(inv.id)}>
                  <Bell className="h-3 w-3" /> Remind outlet
                </button>
                <button type="button" className="iz-btn iz-btn-primary flex-1 !py-1.5 !text-xs" onClick={() => onSettle(inv.id)}>
                  <Receipt className="h-3 w-3" /> Mark paid
                </button>
              </div>
            )}
          </IzCard>
        ))}
      </div>
    </div>
  );
}

function ReceiptScanRow({ scan }: { scan: PrReceiptScan }) {
  const [y, m, d] = scan.date;
  return (
    <IzCard flat className="!mb-2">
      <div className="iz-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-sora text-sm font-bold">{scan.id}</p>
          <p className="iz-tiny iz-muted mt-0.5">
            {scan.prName} · {scan.outlet}
          </p>
          <p className="iz-tiny iz-muted2 mt-0.5">Scanned {scan.scannedAt}</p>
          <p className="iz-tiny iz-muted2">
            Shift date {d}/{m}/{y}
            {scan.pvId ? ` · PV ${scan.pvId}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <IzPill variant={scan.status === "paid" ? "green" : scan.status === "in_pv" ? "amber" : "ink"}>
            {receiptStatusLabel(scan.status)}
          </IzPill>
          <p className="iz-ledger mt-1 text-sm font-bold">{formatRM(scan.totalLogged)}</p>
          <p className="iz-tiny iz-muted2">Comm {formatRM(scan.totalCommission)}</p>
        </div>
      </div>
      <div className="mt-2 border-t border-[var(--iz-line)] pt-2">
        {scan.items.map((item) => (
          <p key={`${scan.id}-${item.label}`} className="iz-tiny iz-muted py-0.5">
            {item.qty}× {item.label} · {formatRM(item.amount)}
          </p>
        ))}
      </div>
    </IzCard>
  );
}

function ReceiptsSection({
  scans,
  payrollRange,
  onRangeChange,
  onClearRange,
}: {
  scans: PrReceiptScan[];
  payrollRange: PayrollRangeFilter;
  onRangeChange: (r: PayrollRangeFilter) => void;
  onClearRange: () => void;
}) {
  const [outlet, setOutlet] = useState("");
  const outlets = useMemo(() => [...new Set(scans.map((s) => s.outlet))].sort(), [scans]);
  const filtered = useMemo(
    () =>
      scans.filter((s) => {
        if (outlet && s.outlet !== outlet) return false;
        return matchesPayrollRange(parseScannedAtMs(s.scannedAt), payrollRange);
      }),
    [scans, outlet, payrollRange],
  );

  return (
    <div className="mt-3">
      <IzCard flat>
        <p className="iz-tiny iz-muted">
          Agency copy of PR receipt scans — synced when PR logs scans on shift (Time-In → scan → Time-Out).
        </p>
      </IzCard>
      <PayrollRangeFilterCard range={payrollRange} onChange={onRangeChange} onClear={onClearRange} />
      <div className="mt-2">
        <IzSelect block className="!text-xs" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
          <option value="">All outlets</option>
          {outlets.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </IzSelect>
      </div>
      <p className="iz-tiny iz-muted2 mt-2 mb-2">{filtered.length} scan{filtered.length !== 1 ? "s" : ""} for managed PRs</p>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <IzCard className="text-center">
            <p className="iz-sm iz-muted">No receipt scans in this range</p>
          </IzCard>
        ) : (
          filtered.map((scan) => <ReceiptScanRow key={scan.id} scan={scan} />)
        )}
      </div>
    </div>
  );
}

function ReconciliationSection({
  reconciliation,
  onConfirm,
  canConfirm,
}: {
  reconciliation: import("@/lib/agency-demo").AgencyReconciliationDay;
  onConfirm: () => void;
  canConfirm: boolean;
}) {
  const adjustAgencyReconciliation = useStore((s) => s.adjustAgencyReconciliation);
  const [adjDrinks, setAdjDrinks] = useState("0");
  const [adjTips, setAdjTips] = useState("0");
  const [adjReason, setAdjReason] = useState(reconciliation.agencyAdjustReason ?? "");

  return (
    <div className="mt-3">
      <IzCard flat className="border-[rgba(232,194,122,.35)]">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
          <div>
            <p className="iz-sm font-bold">Daily reconciliation · {reconciliation.dateLabel}</p>
            <p className="iz-tiny iz-muted mt-1">
              Agency (Owner/Finance) + Outlet must both confirm · immutable once locked · month-end blocked until matched
            </p>
            <Link to="/outlet/billing" className="iz-tiny mt-1 inline-block text-[var(--iz-violet-l)]">
              Outlet confirms in Billing →
            </Link>
          </div>
        </div>
      </IzCard>
      <IzCard className="mt-2">
        <div className="iz-v-sum"><span className="iz-muted">Outlet-reported sales</span><b>{formatRM(reconciliation.outletSalesTotal)}</b></div>
        <div className="iz-v-sum"><span className="iz-muted">PV totals</span><b>{formatRM(reconciliation.pvTotal)}</b></div>
        <div className="iz-v-sum tot">
          <span className={reconciliation.variance !== 0 ? "text-[var(--iz-amber)]" : ""}>Variance</span>
          <b className={reconciliation.variance !== 0 ? "text-[var(--iz-amber)]" : ""}>{formatRM(reconciliation.variance)}</b>
        </div>
        <div className="iz-v-sum"><span className="iz-muted">Outlet confirmed</span><b>{reconciliation.outletConfirmed ? "Yes ✓" : "Pending"}</b></div>
        <div className="iz-v-sum"><span className="iz-muted">Agency confirmed</span><b>{reconciliation.agencyConfirmed ? "Yes ✓ · locked" : "Awaiting"}</b></div>
        {(reconciliation.agencyAdjustDrinks ?? 0) !== 0 && (
          <div className="iz-v-sum"><span className="iz-muted">Agency drink adj.</span><b>{reconciliation.agencyAdjustDrinks}</b></div>
        )}
      </IzCard>
      {reconciliation.variance !== 0 && canConfirm && !reconciliation.agencyConfirmed && (
        <IzCard flat className="mt-2">
          <p className="iz-tiny iz-muted mb-2">Adjust drinks/tips with reason if variance exists</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="iz-field-input !text-xs" placeholder="Drinks ±" value={adjDrinks} onChange={(e) => setAdjDrinks(e.target.value)} />
            <input type="number" className="iz-field-input !text-xs" placeholder="Tips RM ±" value={adjTips} onChange={(e) => setAdjTips(e.target.value)} />
          </div>
          <textarea className="iz-field-input mt-2 min-h-[60px] !text-xs" placeholder="Reason (required)" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
          <button
            type="button"
            className="iz-btn iz-btn-soft mt-2 w-full !text-xs"
            onClick={() => adjustAgencyReconciliation({ drinks: Number(adjDrinks) || 0, tips: Number(adjTips) || 0, reason: adjReason })}
          >
            Apply adjustment
          </button>
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
      {reconciliation.agencyConfirmed && reconciliation.outletConfirmed && (
        <p className="iz-tiny iz-muted2 mt-2 text-center">Both sides confirmed · month-end close eligible</p>
      )}
      {reconciliation.agencyConfirmed && !reconciliation.outletConfirmed && (
        <p className="iz-tiny iz-muted2 mt-2 text-center">Awaiting outlet confirmation in Outlet portal</p>
      )}
    </div>
  );
}

function PayrollReconciliationBanner({
  reconciliation,
  canConfirm,
  onConfirm,
  onOpenReconciliation,
}: {
  reconciliation: import("@/lib/agency-demo").AgencyReconciliationDay;
  canConfirm: boolean;
  onConfirm: () => void;
  onOpenReconciliation: () => void;
}) {
  if (reconciliation.agencyConfirmed && reconciliation.outletConfirmed) return null;
  return (
    <IzCard flat className="mt-3 border-[rgba(232,194,122,.4)] bg-[rgba(232,194,122,.06)]">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-amber)]" />
        <div className="min-w-0 flex-1">
          <p className="iz-sm font-bold">Confirm today&apos;s reconciliation</p>
          <p className="iz-tiny iz-muted mt-0.5">
            Outlet sales {formatRM(reconciliation.outletSalesTotal)} vs PV {formatRM(reconciliation.pvTotal)}
            {reconciliation.variance !== 0 && (
              <span className="text-[var(--iz-amber)]"> · variance {formatRM(reconciliation.variance)}</span>
            )}
          </p>
          <p className="iz-tiny iz-muted2 mt-1">
            Outlet {reconciliation.outletConfirmed ? "confirmed ✓" : "pending"} · Agency{" "}
            {reconciliation.agencyConfirmed ? "confirmed ✓" : "awaiting"}
          </p>
          <button type="button" className="iz-tiny mt-1 text-[var(--iz-gold-l)]" onClick={onOpenReconciliation}>
            Open reconciliation tab →
          </button>
          {canConfirm && !reconciliation.agencyConfirmed && (
            <button type="button" className="iz-btn iz-btn-primary mt-2 w-full !py-2 !text-xs" onClick={onConfirm}>
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
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
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
  const disputeDays = disputeDaysRemaining(pv.disputedAt);
  const displayPv: PrPaymentVoucher = editing
    ? {
        ...pv,
        rows,
        deduct,
        subtotal: rows.reduce((s, r) => s + r.amt, 0),
        net: rows.reduce((s, r) => s + r.amt, 0) - deduct,
      }
    : pv;

  const saveEdit = () => {
    editAgencyPv(pv.id, { rows, deduct });
    setEditing(false);
  };

  return (
    <>
      <div className="iz-pv-detail-bar mb-2.5">
        <div className="iz-pv-detail-bar-main">
          <IzPill variant={statusPill(pv.status)}>{pvStatusLabel(pv.status)}</IzPill>
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
          1st · {FINANCE_HEAD_LABEL}: <b className="text-[var(--iz-txt)]">{agencyFinanceHead.name}</b>
          {pv.financeHeadSignedAt ? ` · ${pv.financeHeadSignedAt}` : " · pending"}
        </p>
        <p className="iz-tiny iz-muted mt-0.5">
          2nd · PR ({pv.prName}): {pv.prSignedAt ? pv.prSignedAt : pv.status === "SENT" || pv.status === "PENDING_REVIEW" ? "awaiting sign" : "—"}
        </p>
      </IzCard>

      <PvBreakdownCard breakdown={breakdown} />

      {pv.status === "DISPUTED" && (
        <IzCard flat className="mb-2 border-[var(--iz-red)]">
          <p className="iz-tiny font-bold text-[var(--iz-red)]">PR dispute — resolve within 7 days</p>
          {pv.disputedAt && <p className="iz-tiny iz-muted2 mt-0.5">Raised {pv.disputedAt}</p>}
          {disputeDays !== null && (
            <p className="iz-tiny flex items-center gap-1 text-[var(--iz-amber)] mt-1">
              <Clock className="h-3 w-3" />
              {disputeDays > 0 ? `${disputeDays} day(s) left to adjust + re-send` : "Deadline passed — escalate to Admin"}
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
              <div key={r.i} className="iz-v-sum border-b border-[var(--iz-line)] py-2 last:border-0">
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
                <button type="button" className="iz-btn iz-btn-primary mt-2 w-full" onClick={saveEdit}>
                  Save dispute edit
                </button>
              </div>
            )}
          </IzCard>
        </OutletSection>
      )}

      <button
        type="button"
        className="iz-btn iz-btn-soft mt-2.5 w-full"
        onClick={() => {
          downloadPvBreakdownPdf(displayPv, payee);
          toast("Official PV opened — use Print → Save as PDF", "success");
        }}
      >
        <FileText className="h-4 w-4" /> Download official PV (PDF)
      </button>
      <p className="iz-tiny iz-muted2 mt-1.5 text-center">
        PDF export only · no editable Excel · duplicate payment blocked on send.
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
        <button type="button" className="iz-btn iz-btn-primary mt-2 w-full" onClick={() => sendAgencyPvToPr(pv.id)}>
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
            <Shield className="h-3 w-3" /> Overridden by {pv.overrideAudit.by} · {pv.overrideAudit.at}
          </p>
          <p className="iz-tiny iz-muted mt-1">{pv.overrideAudit.reason}</p>
        </IzCard>
      )}

      {canOverride && (pv.status === "SIGNED" || pv.status === "PAID") && (
        <button type="button" className="iz-btn iz-btn-ghost mt-2 w-full" onClick={() => setOverrideOpen(true)}>
          Override signed PV (audit logged)
        </button>
      )}

      <IzSheet open={overrideOpen} onClose={() => setOverrideOpen(false)}>
        <div className="iz-cardttl">Override signed PV</div>
        <p className="iz-tiny iz-muted mb-3">Finance may override with a mandatory audit reason — PV re-opens for PR review</p>
        <textarea className="iz-field-input min-h-[80px]" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason for override…" />
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
