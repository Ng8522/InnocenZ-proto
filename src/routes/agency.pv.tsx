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
  pvNeedsPrReview,
  pvStatusLabel,
  pvStatusPillVariant,
  sortPvsBySales,
  type PrPaymentVoucher,
  type PrPvRow,
  type PrPvStatus,
  type PvDateRecencyFilter,
  type PvSalesSort,
} from "@/lib/pr-demo";
import { downloadAgencyPvPdf } from "@/lib/pv-pdf";
import { nowAgencyDateTime } from "@/lib/agency-demo";
import { Calendar, FileText, Filter, Pencil, Plus } from "lucide-react";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";

export const Route = createFileRoute("/agency/pv")({
  component: AgencyPV,
});

function statusPill(status: PrPvStatus) {
  return pvStatusPillVariant(status);
}

type PvStatusFilter = "all" | PrPvStatus;

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
  const agencyOwner = useStore((s) => s.agencyOwner);
  const toast = useStore((s) => s.toast);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PvStatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<PvDateRecencyFilter>("all");
  const [salesSort, setSalesSort] = useState<PvSalesSort>("default");
  const { date, time } = nowAgencyDateTime();

  const latestIssuedMs = useMemo(
    () => getLatestPvIssuedMs(prPaymentVouchers),
    [prPaymentVouchers],
  );

  const awaiting = prPaymentVouchers.filter((p) => pvNeedsPrReview(p.status)).length;
  const disputed = prPaymentVouchers.filter((p) => p.status === "DISPUTED").length;
  const queued = prPaymentVouchers.filter((p) => p.status === "SIGNED");
  const queuedTotal = queued.reduce((s, p) => s + p.net, 0);
  const paid = prPaymentVouchers.filter((p) => p.status === "PAID").length;

  const filteredVouchers = useMemo(() => {
    let list =
      statusFilter === "all"
        ? prPaymentVouchers
        : prPaymentVouchers.filter((p) => p.status === statusFilter);
    list = filterPvsByIssuedRecency(list, dateFilter, latestIssuedMs);
    return sortPvsBySales(list, salesSort);
  }, [prPaymentVouchers, statusFilter, dateFilter, salesSort, latestIssuedMs]);

  const dateCounts = useMemo(() => {
    const latest = filterPvsByIssuedRecency(prPaymentVouchers, "latest", latestIssuedMs).length;
    const previous = filterPvsByIssuedRecency(prPaymentVouchers, "previous", latestIssuedMs).length;
    return { all: prPaymentVouchers.length, latest, previous };
  }, [prPaymentVouchers, latestIssuedMs]);

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || salesSort !== "default";

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setSalesSort("default");
  };

  const statusCounts = useMemo(() => {
    const counts: Record<PvStatusFilter, number> = {
      all: prPaymentVouchers.length,
      PENDING_REVIEW: 0,
      SENT: 0,
      SIGNED: 0,
      PAID: 0,
      DISPUTED: 0,
    };
    for (const p of prPaymentVouchers) counts[p.status] += 1;
    return counts;
  }, [prPaymentVouchers]);

  const detail = prPaymentVouchers.find((p) => p.id === detailId);

  if (detail) {
    return (
      <div className="iz-screen">
        <AppTopbar showDateTime />
        <PvDetail pv={detail} agencyIc={agencyOwner.ic} onClose={() => setDetailId(null)} />
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar showDateTime />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">
        Payroll &amp; PV
      </h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {date} · {time} · Cycle{" "}
        <span className="text-[var(--iz-gold-l)]">{PAYROLL_CYCLE.range}</span> · per-item calc
      </p>

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
          Duplicate payment blocked · OT from check-out · PDF export only
        </p>
      </IzCard>

      <IzSectionLabel>Vouchers · {PAYROLL_CYCLE.range}</IzSectionLabel>

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
  agencyIc,
  onClose,
}: {
  pv: PrPaymentVoucher;
  agencyIc: string;
  onClose: () => void;
}) {
  const editAgencyPv = useStore((s) => s.editAgencyPv);
  const resendAgencyPv = useStore((s) => s.resendAgencyPv);
  const resolveAgencyPvDispute = useStore((s) => s.resolveAgencyPvDispute);
  const toast = useStore((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<PrPvRow[]>(pv.rows);
  const [deduct, setDeduct] = useState(pv.deduct);

  const saveEdit = () => {
    editAgencyPv(pv.id, { rows, deduct });
    setEditing(false);
  };

  return (
    <>
      <div className="iz-between mb-2">
        <h2 className="font-sora text-xl font-extrabold">Payment Voucher</h2>
        <button type="button" className="iz-chip" onClick={onClose}>
          Close
        </button>
      </div>

      {pv.status === "DISPUTED" && (
        <IzCard flat className="mb-2 border-[var(--iz-red)]">
          <p className="iz-tiny font-bold text-[var(--iz-red)]">PR dispute — verify before re-issue</p>
          {pv.disputedAt && <p className="iz-tiny iz-muted2 mt-0.5">Raised {pv.disputedAt}</p>}
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
          <span className="iz-muted">PR IC</span>
          <b>{pv.prIc ?? "—"}</b>
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

      {rows.length > 0 && (
        <>
          <div className="iz-between mt-3">
            <IzSectionLabel>Line items · per item</IzSectionLabel>
            {pv.status === "DISPUTED" && (
              <button type="button" className="iz-chip" onClick={() => setEditing(!editing)}>
                <Pencil className="mr-1 inline h-3 w-3" /> {editing ? "Cancel" : "Edit"}
              </button>
            )}
          </div>
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
        </>
      )}

      <button
        type="button"
        className="iz-btn iz-btn-soft mt-2.5"
        onClick={() => {
          downloadAgencyPvPdf(pv, agencyIc);
          toast("PV PDF downloaded", "success");
        }}
      >
        <FileText className="h-4 w-4" /> Download PDF
      </button>

      {(pvNeedsPrReview(pv.status) || pv.status === "DISPUTED") && (
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2"
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

      <button type="button" className="iz-btn iz-btn-soft mt-2" onClick={onClose}>
        Back to payroll
      </button>
    </>
  );
}
