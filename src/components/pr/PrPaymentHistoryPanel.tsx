import { Link } from "@tanstack/react-router";
import { ChevronDown, FileText, Sheet } from "lucide-react";
import { useState } from "react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { PrWeeklyPaymentGrid } from "@/components/pr/PrWeeklyPaymentGrid";
import {
  buildPaymentHistoryRecords,
  paymentHistoryWeekSummary,
  type PaymentHistoryRecord,
} from "@/lib/pr-payment-history";
import { buildWeeklyPaymentSummary } from "@/lib/pr-weekly-payment";
import type { PrPaymentVoucher } from "@/lib/pr-demo";

function PaymentHistoryCard({
  record,
  pv,
  onDownloadPdf,
  onDownloadCsv,
}: {
  record: PaymentHistoryRecord;
  pv: PrPaymentVoucher;
  onDownloadPdf?: (pv: PrPaymentVoucher) => void;
  onDownloadCsv?: (pv: PrPaymentVoucher) => void;
}) {
  const [open, setOpen] = useState(false);
  const weekSummary = pv.weekStartIso
    ? buildWeeklyPaymentSummary({ weekStartIso: pv.weekStartIso, pv })
    : null;
  const synced = weekSummary ? paymentHistoryWeekSummary(pv) : null;

  return (
    <IzCard className="iz-pay-hist-card">
      <button type="button" className="iz-pay-hist-card__head" onClick={() => setOpen((o) => !o)}>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sora text-sm font-bold text-[var(--iz-txt)]">{record.weekLabel}</span>
            <IzPill
              variant={
                record.status === "PAID" ? "green" : record.status === "DISPUTED" ? "red" : "amber"
              }
            >
              {record.status}
            </IzPill>
          </div>
          <p className="iz-tiny iz-muted2 mt-0.5">
            {record.pvId} · {record.outlet}
          </p>
          <p className="iz-tiny iz-muted mt-1">
            {record.shiftDays} shift{record.shiftDays !== 1 ? "s" : ""} · Issued {record.issued}
            {record.paidAt ? ` · Paid ${record.paidAt}` : " · Transfer processing"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-sora text-base font-extrabold text-[var(--iz-gold)]">{formatRM(record.net)}</p>
          <ChevronDown className={`iz-pay-hist-card__chev ml-auto${open ? " open" : ""}`} />
        </div>
      </button>

      <div className="iz-pay-hist-card__metrics">
        <div>
          <span className="l">Wages</span>
          <span className="v wages">{formatRM(record.wages)}</span>
        </div>
        <div>
          <span className="l">Commission</span>
          <span className="v comm">{formatRM(record.commission)}</span>
        </div>
        {record.earlyWithdrawal > 0 && (
          <div>
            <span className="l">Early withdrawal</span>
            <span className="v deduct">−{formatRM(record.earlyWithdrawal)}</span>
          </div>
        )}
        {record.deductions > 0 && (
          <div>
            <span className="l">Other</span>
            <span className="v deduct">−{formatRM(record.deductions)}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="iz-pay-hist-card__body">
          {weekSummary && (
            <div className="mb-3">
              <p className="iz-tiny iz-muted2 mb-2 tracking-wide">WEEK BREAKDOWN</p>
              <PrWeeklyPaymentGrid summary={weekSummary} large />
            </div>
          )}

          <div className="iz-data-table-wrap">
            <table className="iz-data-table iz-pay-hist-lines">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Outlet</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(synced?.rows ?? pv.rows).map((row) => (
                  <tr key={`${row.i}-${row.desc}`}>
                    <td>
                      {row.date}
                      <div className="iz-tiny iz-muted2">{row.day}</div>
                    </td>
                    <td>{row.desc}</td>
                    <td>{row.outlet}</td>
                    <td
                      className={`text-right font-semibold${
                        row.desc.toLowerCase().includes("withdrawal") ? " text-[var(--iz-red)]" : " text-[var(--iz-gold-l)]"
                      }`}
                    >
                      {row.desc.toLowerCase().includes("withdrawal") ? "−" : ""}
                      {formatRM(row.amt)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="iz-data-table-tot">
                  <td colSpan={3}>Net paid</td>
                  <td className="text-right font-bold text-[var(--iz-gold)]">{formatRM(record.net)}</td>
                </tr>
                {record.bankRef && (
                  <tr>
                    <td colSpan={4} className="iz-tiny iz-muted2 pt-1">
                      Bank ref: {record.bankRef}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <div className="iz-pay-hist-card__actions">
            <Link to="/host/PaymentVoucher" search={{ pvId: record.pvId }} className="iz-btn iz-btn-soft iz-btn-sm">
              Open PV
            </Link>
            {onDownloadPdf && (
              <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm" onClick={() => onDownloadPdf(pv)}>
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            )}
            {onDownloadCsv && (
              <button type="button" className="iz-btn iz-btn-ghost iz-btn-sm" onClick={() => onDownloadCsv(pv)}>
                <Sheet className="h-3.5 w-3.5" /> Excel
              </button>
            )}
          </div>
        </div>
      )}
    </IzCard>
  );
}

export function PrPaymentHistoryPanel({
  vouchers,
  onDownloadPdf,
  onDownloadCsv,
  hideHeader = false,
}: {
  vouchers: PrPaymentVoucher[];
  onDownloadPdf?: (pv: PrPaymentVoucher) => void;
  onDownloadCsv?: (pv: PrPaymentVoucher) => void;
  hideHeader?: boolean;
}) {
  const records = buildPaymentHistoryRecords(vouchers);
  const pvById = Object.fromEntries(vouchers.map((p) => [p.id, p]));
  const totalPaid = records.filter((r) => r.status === "PAID").reduce((s, r) => s + r.net, 0);
  const totalSigned = records.filter((r) => r.status === "SIGNED").reduce((s, r) => s + r.net, 0);
  const totalShifts = records.reduce((s, r) => s + r.shiftDays, 0);

  return (
    <div className={hideHeader ? "" : "mt-4"}>
      {!hideHeader && (
        <div className="iz-pay-hist-hero">
          <div>
            <p className="iz-pay-hist-hero__title">Payment history</p>
          </div>
        </div>
      )}

      <div className={`iz-outlet-stat-strip${hideHeader ? " mt-0" : " mt-3"}`}>
        <div className="iz-outlet-stat-cell">
          <div className="l">Paid</div>
          <div className="n text-[var(--iz-green)]">{formatRM(totalPaid)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Signed</div>
          <div className="n text-[var(--iz-amber)]">{formatRM(totalSigned)}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Weeks</div>
          <div className="n">{records.length}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Shifts</div>
          <div className="n">{totalShifts}</div>
        </div>
      </div>

      {records.length === 0 && !hideHeader ? (
        <IzCard flat className="mt-4 px-4 py-8 text-center">
          <p className="text-sm font-semibold">No payments yet</p>
          <Link to="/host/PaymentVoucher" className="iz-btn iz-btn-soft mt-3">
            Open Payment
          </Link>
        </IzCard>
      ) : records.length > 0 ? (
        <div className="iz-pay-hist-list mt-3">
          {records.map((record) => (
            <PaymentHistoryCard
              key={record.pvId}
              record={record}
              pv={pvById[record.pvId]}
              onDownloadPdf={onDownloadPdf}
              onDownloadCsv={onDownloadCsv}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
