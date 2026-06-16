import { useMemo } from "react";
import { Check, Shield, AlertTriangle } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import { PrSection } from "@/components/pr/PrSection";
import type { PrActiveShiftSession, PrReceiptScan } from "@/lib/pr-demo";
import {
  DEFAULT_SHIFT_SALES_TARGETS,
  aggregateShiftSales,
  buildShiftStatusRows,
  formatShiftSalesLine,
  receiptItemsForShift,
  shiftCommissionTotal,
  shiftDurationLabel,
  shiftPayoutTotal,
} from "@/lib/pr-shift-status";

function VerifyBadge({ verified, kind, note }: { verified: boolean; kind: "duty" | "receipt"; note?: string }) {
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
  const sales = useMemo(() => aggregateShiftSales(shiftScans), [shiftScans]);
  const rows = useMemo(
    () => (session ? buildShiftStatusRows(session, shiftScans, baseWages) : []),
    [session, shiftScans, baseWages],
  );
  const commissionTotal = shiftCommissionTotal(shiftScans);
  const payout = shiftPayoutTotal(baseWages, shiftScans);
  const targets = DEFAULT_SHIFT_SALES_TARGETS;
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
        <p className="iz-pr-shift-status__targets-label">Target sales (commission)</p>
        <div className="iz-pr-shift-status__targets-grid">
          <div>
            <span className="k">Drinks</span>
            <span className="v">
              {sales.drinkUnits}
              <span className="iz-muted"> / {targets.drinkUnits}</span>
            </span>
            <div className="iz-pr-shift-status__bar">
              <div
                className="iz-pr-shift-status__bar-fill drinks"
                style={{ width: `${Math.min(100, (sales.drinkUnits / targets.drinkUnits) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <span className="k">Tips</span>
            <span className="v">
              RM {sales.tipRm}
              <span className="iz-muted"> / {targets.tipRm}</span>
            </span>
            <div className="iz-pr-shift-status__bar">
              <div
                className="iz-pr-shift-status__bar-fill tips"
                style={{ width: `${Math.min(100, (sales.tipRm / targets.tipRm) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <span className="k">Tables</span>
            <span className="v">
              {sales.tableUnits}
              <span className="iz-muted"> / {targets.tableUnits}</span>
            </span>
            <div className="iz-pr-shift-status__bar">
              <div
                className="iz-pr-shift-status__bar-fill tables"
                style={{ width: `${Math.min(100, (sales.tableUnits / targets.tableUnits) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        <p className="iz-tiny iz-muted2 mt-2">{formatShiftSalesLine(targets, sales)}</p>
      </div>

      <PrSection title="Status" hint={statusHint} collapsible defaultOpen className="!mt-3">
        <div className="iz-pr-shift-status__table-wrap iz-hscroll">
          <table className="iz-pr-shift-status__table iz-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Drinks</th>
                <th>Tips</th>
                <th>Tables</th>
                <th>Wages</th>
                <th>Commission</th>
                <th>Verify</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.kind === "receipt" && !row.verified ? "iz-pr-shift-status__row--warn" : undefined}
                >
                  <td>
                    <div className="iz-pr-shift-status__item">
                      <span className="iz-pr-shift-status__item-label">{row.label}</span>
                      <span className="iz-pr-shift-status__item-detail">{row.detail}</span>
                      {row.kind === "receipt" && row.verifyNote && !row.verified && (
                        <span className="iz-pr-shift-status__item-note">{row.verifyNote}</span>
                      )}
                    </div>
                  </td>
                  <td>{row.drinks}</td>
                  <td>{row.tips}</td>
                  <td>{row.tables}</td>
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
                <td colSpan={4}>
                  <span className="font-sora text-[10px] font-bold uppercase tracking-wide text-[var(--iz-muted)]">
                    Totals
                  </span>
                  <p className="iz-tiny iz-muted2 mt-0.5">
                    Payout {formatRM(payout)} · hourly wages + commission
                  </p>
                </td>
                <td className="iz-pr-shift-status__money wages font-sora font-bold">{formatRM(baseWages)}</td>
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
            Duty time is sealed at the outlet hourly rate (wages column). Scan receipts to add rows — each receipt
            is checked against drinks, tips & tables for commission.
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
