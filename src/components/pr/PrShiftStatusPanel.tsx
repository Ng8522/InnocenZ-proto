import { useMemo } from "react";
import { Check, Shield, AlertTriangle } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import { PrSection } from "@/components/pr/PrSection";
import type { PrActiveShiftSession, PrReceiptScan } from "@/lib/pr-demo";
import {
  DEFAULT_SHIFT_SALES_TARGETS,
  buildShiftStatusRows,
  receiptItemsForShift,
  shiftCommissionTotal,
  shiftDurationLabel,
  shiftPayoutTotal,
  shiftCommissionRemaining,
  shiftSalesTargetRm,
} from "@/lib/pr-shift-status";

function VerifyBadge({
  verified,
  kind,
  note,
}: {
  verified: boolean;
  kind: "duty" | "receipt";
  note?: string;
}) {
  if (kind === "duty") {
    return (
      <span className="iz-pr-shift-verify iz-pr-shift-verify--sealed" title={note}>
        <Shield className="h-3 w-3" /> Sealed
      </span>
    );
  }
  if (verified) {
    return (
      <span className="iz-pr-shift-verify iz-pr-shift-verify--matched" title={note}>
        <Check className="h-3 w-3" /> Matched
      </span>
    );
  }
  return (
    <span className="iz-pr-shift-verify iz-pr-shift-verify--review" title={note}>
      <AlertTriangle className="h-3 w-3" /> Review
    </span>
  );
}

export function PrShiftStatusPanel({
  session,
  scans,
  baseWages,
  checkedOut,
}: {
  session: PrActiveShiftSession | null | undefined;
  scans: PrReceiptScan[];
  baseWages: number;
  checkedOut: boolean;
}) {
  const shiftScans = useMemo(() => receiptItemsForShift(session, scans), [session, scans]);
  const rows = useMemo(
    () => (session ? buildShiftStatusRows(session, shiftScans, baseWages) : []),
    [session, shiftScans, baseWages],
  );
  const commissionTotal = shiftCommissionTotal(shiftScans);
  const payout = shiftPayoutTotal(baseWages, shiftScans);
  const targets = DEFAULT_SHIFT_SALES_TARGETS;
  const targetRm = shiftSalesTargetRm(targets);
  const remaining = shiftCommissionRemaining(commissionTotal, targets);
  const targetMet = remaining <= 0;
  const targetPct = Math.min(100, targetRm > 0 ? (commissionTotal / targetRm) * 100 : 0);
  const receiptRows = rows.filter((r) => r.kind === "receipt");
  const verifiedReceipts = receiptRows.filter((r) => r.verified).length;
  const pendingReceipts = receiptRows.length - verifiedReceipts;
  const statusHint =
    receiptRows.length === 0
      ? "Use Scan receipt — each log adds a row below"
      : pendingReceipts > 0
        ? `${pendingReceipts} receipt${pendingReceipts !== 1 ? "s" : ""} need review`
        : `${verifiedReceipts} receipt${verifiedReceipts !== 1 ? "s" : ""} matched · PV ready`;

  if (!session) return null;

  return (
    <div className="iz-pr-shift-status">
      <div className="iz-pr-shift-status__times">
        <div className="iz-pr-shift-status__time-cell">
          <span className="l">Check-in</span>
          <span className="n">{session.timeIn}</span>
        </div>
        <div className="iz-pr-shift-status__time-cell">
          <span className="l">Check-out</span>
          <span className="n">{session.timeOut ?? (checkedOut ? "—" : "Pending")}</span>
        </div>
        <div className="iz-pr-shift-status__time-cell">
          <span className="l">Duration</span>
          <span className="n">
            {session.timeOut || checkedOut ? shiftDurationLabel(session) : "In progress"}
          </span>
        </div>
      </div>

      <div className="iz-pr-shift-status__targets">
        <p className="iz-pr-shift-status__targets-label">
          {targetMet ? "Shift target" : "To target"}
        </p>
        <div className="iz-pr-shift-status__target-price">
          {targetMet ? (
            <>
              <span className="v text-[var(--iz-green)]">Met</span>
              <span className="t">{formatRM(targetRm)}</span>
            </>
          ) : (
            <>
              <span className="v">{formatRM(remaining)}</span>
              <span className="t">left · target {formatRM(targetRm)}</span>
            </>
          )}
        </div>
        <div className="iz-pr-shift-status__bar iz-pr-shift-status__bar--single">
          <div
            className="iz-pr-shift-status__bar-fill commission"
            style={{ width: `${targetPct}%` }}
          />
        </div>
      </div>

      <PrSection title="Status" hint={statusHint} collapsible defaultOpen className="!mt-3">
        <div className="iz-pr-shift-status__table-wrap iz-hscroll">
          <table className="iz-pr-shift-status__table iz-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th>Wages</th>
                <th>Commission</th>
                <th>Verify</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.kind === "receipt" && !row.verified
                      ? "iz-pr-shift-status__row--warn"
                      : undefined
                  }
                >
                  <td>
                    <div className="iz-pr-shift-status__item">
                      <span className="iz-pr-shift-status__item-label">{row.label}</span>
                      {row.detail && (
                        <span className="iz-pr-shift-status__item-detail">{row.detail}</span>
                      )}
                      {row.kind === "receipt" && row.verifyNote && !row.verified && (
                        <span className="iz-pr-shift-status__item-note">{row.verifyNote}</span>
                      )}
                    </div>
                  </td>
                  <td className="iz-pr-shift-status__source">{row.source}</td>
                  <td className="iz-pr-shift-status__money wages">
                    {row.wagesRm > 0 ? formatRM(row.wagesRm) : "—"}
                  </td>
                  <td className="iz-pr-shift-status__money commission">
                    {row.commissionRm > 0 ? formatRM(row.commissionRm) : "—"}
                  </td>
                  <td>
                    <VerifyBadge verified={row.verified} kind={row.kind} note={row.verifyNote} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="iz-pr-shift-status__foot">
                <td colSpan={2}>
                  <span className="font-sora text-[10px] font-bold uppercase tracking-wide text-[var(--iz-muted)]">
                    Totals
                  </span>
                  <p className="iz-tiny iz-muted2 mt-0.5">
                    Payout {formatRM(payout)} · hourly wages + commission
                  </p>
                </td>
                <td className="iz-pr-shift-status__money wages font-sora font-bold">
                  {formatRM(baseWages)}
                </td>
                <td className="iz-pr-shift-status__money commission font-sora font-bold">
                  {formatRM(commissionTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {shiftScans.length === 0 && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            Duty time is sealed at the outlet hourly rate (wages column). Scan receipts to add rows
            — each receipt scan is verified for commission.
          </p>
        )}
        {receiptRows.length > 0 && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            {verifiedReceipts}/{receiptRows.length} receipts verified against commission rules
          </p>
        )}
      </PrSection>
    </div>
  );
}
