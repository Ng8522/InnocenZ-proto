import { Link } from "@tanstack/react-router";
import { ChevronDown, FileText, Sheet } from "lucide-react";
import { useState } from "react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";
import { PrWeeklyPaymentGrid } from "@/components/pr/PrWeeklyPaymentGrid";
import {
  buildPaymentHistoryRecords,
  paymentHistoryStatusLabel,
  paymentHistoryStatusMeta,
  paymentHistoryStatusPillVariant,
  paymentHistoryWeekSummary,
  type PaymentHistoryRecord,
} from "@/lib/pr-payment-history";
import { buildWeeklyPaymentSummary } from "@/lib/pr-weekly-payment";
import type { PrPaymentVoucher } from "@/lib/pr-demo";
import { cn } from "@/lib/utils";

type PaymentHistStatus = PaymentHistoryRecord["status"] | "";

const STATUS_CHIP_OPTIONS: {
  value: PaymentHistStatus;
  label: string;
  tone?: "green" | "amber";
}[] = [
  { value: "", label: "All" },
  { value: "PAID", label: "Paid", tone: "green" },
  { value: "SIGNED", label: "Signed", tone: "amber" },
];

export function PaymentHistStatusChips({
  value,
  onChange,
  className,
}: {
  value: PaymentHistStatus;
  onChange: (status: PaymentHistStatus) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("iz-pay-hist-status-chips", className)}
      role="group"
      aria-label="Filter by payment status"
    >
      {STATUS_CHIP_OPTIONS.map((opt) => (
        <button
          key={opt.value || "all"}
          type="button"
          className={cn(
            "iz-pay-hist-status-chip",
            opt.tone && `iz-pay-hist-status-chip--${opt.tone}`,
            value === opt.value && "iz-pay-hist-status-chip--on",
          )}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
  const statusTone = paymentHistoryStatusPillVariant(record.status);

  return (
    <IzCard className={cn("iz-pay-hist-card", `iz-pay-hist-card--${statusTone}`)}>
      <button type="button" className="iz-pay-hist-card__head" onClick={() => setOpen((o) => !o)}>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sora text-sm font-bold text-[var(--iz-txt)]">{record.weekLabel}</span>
            <IzPill variant={statusTone}>{paymentHistoryStatusLabel(record.status)}</IzPill>
          </div>
          <p className="iz-tiny iz-muted2 mt-0.5">
            {record.pvId} · {record.outlet}
          </p>
          <p className="iz-tiny iz-muted mt-1">
            {record.shiftDays} shift{record.shiftDays !== 1 ? "s" : ""} · Issued {record.issued}
          </p>
          <p
            className={cn(
              "iz-tiny mt-0.5 font-semibold",
              statusTone === "green" && "text-[var(--iz-green)]",
              statusTone === "amber" && "text-[var(--iz-amber)]",
            )}
          >
            {paymentHistoryStatusMeta(record)}
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
                  <td colSpan={3}>Net payable</td>
                  <td className="text-right font-bold text-[var(--iz-gold)]">{formatRM(record.net)}</td>
                </tr>
                {record.bankRef && record.status === "PAID" && (
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
            {onDownloadPdf && record.status === "PAID" && (
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
  statusFilter = "",
  onStatusFilterChange,
}: {
  vouchers: PrPaymentVoucher[];
  onDownloadPdf?: (pv: PrPaymentVoucher) => void;
  onDownloadCsv?: (pv: PrPaymentVoucher) => void;
  hideHeader?: boolean;
  statusFilter?: PaymentHistStatus;
  onStatusFilterChange?: (status: PaymentHistStatus) => void;
}) {
  const records = buildPaymentHistoryRecords(vouchers);
  const pvById = Object.fromEntries(vouchers.map((p) => [p.id, p]));
  const totalPaid = records.filter((r) => r.status === "PAID").reduce((s, r) => s + r.net, 0);
  const totalSigned = records.filter((r) => r.status === "SIGNED").reduce((s, r) => s + r.net, 0);
  const totalShifts = records.reduce((s, r) => s + r.shiftDays, 0);

  const statCells: {
    key: PaymentHistStatus;
    label: string;
    amount: number;
    tone: "green" | "amber";
  }[] = [
    { key: "PAID", label: "Paid", amount: totalPaid, tone: "green" },
    { key: "SIGNED", label: "Signed", amount: totalSigned, tone: "amber" },
  ];

  return (
    <div className={hideHeader ? "" : "mt-4"}>
      {!hideHeader && (
        <div className="iz-pay-hist-hero">
          <div>
            <p className="iz-pay-hist-hero__title">Payment history</p>
          </div>
        </div>
      )}

      {onStatusFilterChange && (
        <PaymentHistStatusChips
          className={hideHeader ? "mb-2.5" : "mt-3"}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      )}

      <div className={`iz-pay-hist-stat-strip${hideHeader ? " mt-0" : " mt-3"}`}>
        {statCells.map((cell) => {
          const active = statusFilter === cell.key;
          const clickable = Boolean(onStatusFilterChange);
          const inner = (
            <>
              <div className="l">{cell.label}</div>
              <div
                className={cn(
                  "n",
                  cell.tone === "green" && "text-[var(--iz-green)]",
                  cell.tone === "amber" && "text-[var(--iz-amber)]",
                )}
              >
                {formatRM(cell.amount)}
              </div>
            </>
          );
          if (!clickable) {
            return (
              <div key={cell.key} className="iz-pay-hist-stat-cell">
                {inner}
              </div>
            );
          }
          return (
            <button
              key={cell.key}
              type="button"
              className={cn("iz-pay-hist-stat-cell", active && "iz-pay-hist-stat-cell--on")}
              aria-pressed={active}
              onClick={() => onStatusFilterChange?.(active ? "" : cell.key)}
            >
              {inner}
            </button>
          );
        })}
        <div className="iz-pay-hist-stat-cell iz-pay-hist-stat-cell--meta">
          <div className="l">Weeks</div>
          <div className="n">{records.length}</div>
        </div>
        <div className="iz-pay-hist-stat-cell iz-pay-hist-stat-cell--meta">
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
