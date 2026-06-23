import { Flag } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import { fmtDtable } from "@/lib/pr-demo";
import type {
  WeeklyDayStatus,
  WeeklyDisputeTarget,
  WeeklyIncomeRow,
  WeeklyPaymentSummary,
} from "@/lib/pr-weekly-payment";

function statusClass(status: WeeklyDayStatus) {
  if (status === "verified") return "iz-pr-week-pay__cell--verified";
  if (status === "disputed") return "iz-pr-week-pay__cell--disputed";
  if (status === "pending") return "iz-pr-week-pay__cell--pending";
  return "iz-pr-week-pay__cell--empty";
}

function statusLabel(status: WeeklyDayStatus) {
  if (status === "disputed") return "Disputed";
  if (status === "pending") return "Pending";
  if (status === "verified") return "Verified";
  return "—";
}

function cellAmount(value: number) {
  if (value <= 0) return "—";
  return formatRM(value).replace("RM ", "");
}

export function PrWeeklyPaymentGrid({
  summary,
  large,
  interactive,
  onDisputeDay,
  weekPhase = "open",
  activeDisputeKey,
}: {
  summary: WeeklyPaymentSummary;
  large?: boolean;
  interactive?: boolean;
  onDisputeDay?: (targets: WeeklyDisputeTarget[]) => void;
  /** open = current week (PV not yet issued); issued = past week with PV sent */
  weekPhase?: "open" | "issued";
  /** Highlights the cell the user tapped to dispute */
  activeDisputeKey?: string | null;
}) {
  const canDispute = interactive && Boolean(onDisputeDay);

  const handleCellDispute = (colIdx: number, row: WeeklyIncomeRow) => {
    if (!onDisputeDay || summary.dayStatus[colIdx] === "empty") return;
    const amount = row.cells[colIdx];
    if (amount <= 0) return;
    const col = summary.columns[colIdx];
    const [y, m, d] = col.dateIso.split("-").map(Number);
    onDisputeDay([
      {
        dateIso: col.dateIso,
        dateLabel: fmtDtable(y, m, d),
        dayLabel: col.dayLabel,
        incomeKey: row.key,
        incomeLabel: row.label,
        amount,
        outlet: summary.dayOutlets[colIdx],
      },
    ]);
  };

  return (
    <div className={`iz-pr-week-pay${large ? " iz-pr-week-pay--large" : ""}`}>
      <div className="iz-pr-week-pay__scroll">
        <table className="iz-pr-week-pay__table">
          <thead>
            <tr>
              <th className="iz-pr-week-pay__corner" />
              {summary.columns.map((col) => (
                <th
                  key={col.dateIso}
                  className={`iz-pr-week-pay__day${col.isToday ? " today" : ""}${col.isFuture ? " future" : ""}`}
                >
                  <span className="d">{col.dayLabel}</span>
                  <span className="n">{col.dayNum}</span>
                </th>
              ))}
              <th className="iz-pr-week-pay__total-h">Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => {
              const rowTotal = row.cells.reduce((s, v) => s + v, 0);
              return (
                <tr key={row.key}>
                  <th className="iz-pr-week-pay__row-label">{row.label}</th>
                  {row.cells.map((value, idx) => {
                    const cellKey = `${summary.columns[idx].dateIso}-${row.key}`;
                    const isActive = activeDisputeKey === cellKey;
                    return (
                    <td
                      key={`${row.key}-${summary.columns[idx].dateIso}`}
                      className={`${statusClass(summary.dayStatus[idx])}${canDispute && value > 0 ? " iz-pr-week-pay__cell--tap" : ""}${isActive ? " iz-pr-week-pay__cell--dispute-active" : ""}`}
                    >
                      {canDispute && value > 0 ? (
                        <button
                          type="button"
                          className="iz-pr-week-pay__cell-btn"
                          title={`Dispute ${row.label} on ${summary.columns[idx].dayLabel} ${summary.columns[idx].dayNum}`}
                          onClick={() => handleCellDispute(idx, row)}
                        >
                          <span>{cellAmount(value)}</span>
                          <Flag className="iz-pr-week-pay__cell-flag" aria-hidden />
                        </button>
                      ) : (
                        cellAmount(value)
                      )}
                    </td>
                    );
                  })}
                  <td className="iz-pr-week-pay__row-total">{cellAmount(rowTotal)}</td>
                </tr>
              );
            })}
            <tr className="iz-pr-week-pay__status-row">
              <th className="iz-pr-week-pay__row-label">Status</th>
              {summary.dayStatus.map((status, idx) => (
                <td key={`st-${summary.columns[idx].dateIso}`} className={statusClass(status)}>
                  <span className="iz-pr-week-pay__status-pill">{statusLabel(status)}</span>
                </td>
              ))}
              <td className="iz-pr-week-pay__row-total iz-tiny">
                {summary.verifiedDayCount} verified
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={summary.columns.length + 1}>
                <span className="iz-pr-week-pay__foot-note">
                  All sealed shifts counted · synced with PV line items
                  {weekPhase === "open" ? (
                    <>
                      {" "}
                      · PV issues <b>{summary.issueDayLabel} (Sun)</b>
                    </>
                  ) : (
                    <> · PV issued</>
                  )}
                </span>
              </td>
              <td className="iz-pr-week-pay__net font-sora font-extrabold text-[var(--iz-gold)]">
                {formatRM(summary.totals.net)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {canDispute && (
        <p className="iz-pr-week-pay__hint">
          Tap any amount to flag a wrong wage or commission line — sent to your agency with date &amp;
          time.
        </p>
      )}
    </div>
  );
}
