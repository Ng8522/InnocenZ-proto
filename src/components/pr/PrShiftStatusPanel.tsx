import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Shield, AlertTriangle, Camera, FileText, PenLine, RotateCcw } from "lucide-react";
import { formatRM } from "@/components/iz/ui";
import { IzHScroll } from "@/components/iz/HScroll";
import { IzSheet } from "@/components/iz/Sheet";
import { PrSection } from "@/components/pr/PrSection";
import { ReceiptScanSlip } from "@/components/pr/ReceiptScanSlip";
import { formatReceiptScannedTime, isManualSelfLog, isSelfLogPendingAgency, receiptPrimaryCategory, type PrActiveShiftSession, type PrReceiptScan } from "@/lib/pr-demo";
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
  scan,
}: {
  verified: boolean;
  kind: "duty" | "receipt";
  note?: string;
  scan?: PrReceiptScan;
}) {
  if (kind === "duty") {
    return (
      <span className="iz-pr-shift-verify iz-pr-shift-verify--sealed" title={note}>
        <Shield className="h-3 w-3" /> Sealed
      </span>
    );
  }
  if (scan && isManualSelfLog(scan)) {
    if (isSelfLogPendingAgency(scan)) {
      return (
        <span className="iz-pr-shift-verify iz-pr-shift-verify--selflog" title={note}>
          <PenLine className="h-3 w-3" /> Self-log
        </span>
      );
    }
    if (scan.agencyVerification === "approved") {
      return (
        <span className="iz-pr-shift-verify iz-pr-shift-verify--matched" title={note}>
          <Check className="h-3 w-3" /> Verified
        </span>
      );
    }
    return (
      <span className="iz-pr-shift-verify iz-pr-shift-verify--review" title={note}>
        <AlertTriangle className="h-3 w-3" /> Rejected
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

const SCAN_RECEIPT_ROWS: { category: "drinks" | "tips" | "tables"; label: string }[] = [
  { category: "drinks", label: "Drinks" },
  { category: "tips", label: "Tips" },
  { category: "tables", label: "Tables" },
];

function ShiftReceiptScanRows() {
  return (
    <div className="iz-pr-shift-scan-rows">
      {SCAN_RECEIPT_ROWS.map((row) => (
        <div key={row.category} className="iz-pr-shift-scan-row">
          <span className="iz-pr-shift-scan-row__label">{row.label}</span>
          <div className="flex w-full flex-col gap-1.5">
            <Link
              to="/host/scan"
              search={{ category: row.category }}
              className="iz-btn iz-btn-soft iz-btn-sm iz-pr-shift-scan-row__btn w-full"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan
            </Link>
            <Link
              to="/host/scan"
              search={{ category: row.category, blurry: true }}
              className="iz-btn iz-btn-soft iz-btn-sm iz-pr-shift-scan-row__btn iz-pr-shift-scan-row__btn--selflog w-full"
            >
              <PenLine className="h-3.5 w-3.5" />
              Self-log
            </Link>
          </div>
        </div>
      ))}
    </div>
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
  const pendingSelfLogs = receiptRows.filter(
    (r) => r.scan && isSelfLogPendingAgency(r.scan),
  ).length;
  const statusHint =
    receiptRows.length === 0
      ? "Use Scan receipt — each log adds a row below"
      : pendingSelfLogs > 0
        ? `${pendingSelfLogs} self-log${pendingSelfLogs !== 1 ? "s" : ""} awaiting agency verify`
        : pendingReceipts > 0
          ? `${pendingReceipts} receipt${pendingReceipts !== 1 ? "s" : ""} need review`
          : `${verifiedReceipts} receipt${verifiedReceipts !== 1 ? "s" : ""} matched · PV ready`;

  const [viewScan, setViewScan] = useState<PrReceiptScan | null>(null);

  const wagesFinalized = checkedOut || Boolean(session?.timeOut);

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

      {!checkedOut && <ShiftReceiptScanRows />}

      <PrSection title="Status" hint={statusHint} collapsible defaultOpen className="!mt-3">
        <IzHScroll className="iz-pr-shift-status__table-wrap iz-hscroll--free">
          <table className="iz-pr-shift-status__table iz-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Source</th>
                {wagesFinalized && <th>Wages</th>}
                <th>Comm.</th>
                <th>Verify</th>
                <th>Receipt</th>
                {!checkedOut && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.kind === "receipt" && row.scan && isManualSelfLog(row.scan)
                      ? "iz-pr-shift-status__row--selflog"
                      : row.kind === "receipt" && !row.verified
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
                  <td className="iz-pr-shift-status__product">
                    {row.kind === "receipt" ? row.product ?? "—" : "—"}
                  </td>
                  <td className="iz-pr-shift-status__qty">
                    {row.kind === "receipt" ? row.qty ?? "—" : "—"}
                  </td>
                  <td className="iz-pr-shift-status__source">{row.source}</td>
                  {wagesFinalized && (
                    <td className="iz-pr-shift-status__money wages">
                      {row.wagesRm > 0 ? formatRM(row.wagesRm) : "—"}
                    </td>
                  )}
                  <td className="iz-pr-shift-status__money commission">
                    {row.commissionRm > 0 ? formatRM(row.commissionRm) : "—"}
                  </td>
                  <td>
                    <VerifyBadge
                      verified={row.verified}
                      kind={row.kind}
                      note={row.verifyNote}
                      scan={row.scan}
                    />
                  </td>
                  <td className="iz-pr-shift-status__receipt">
                    {row.kind === "receipt" && row.scan ? (
                      <button
                        type="button"
                        className="iz-pr-shift-status__receipt-btn"
                        onClick={() => setViewScan(row.scan!)}
                        title="View scanned receipt"
                      >
                        <FileText className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{row.scan.receiptRef}</span>
                      </button>
                    ) : (
                      <span className="iz-tiny iz-muted2">—</span>
                    )}
                  </td>
                  {!checkedOut && (
                    <td className="iz-pr-shift-status__actions">
                      {row.kind === "receipt" && row.scan ? (
                        <div className="iz-pr-shift-status__action-btns">
                          {isManualSelfLog(row.scan) && isSelfLogPendingAgency(row.scan) ? (
                            <Link
                              to="/host/scan"
                              search={{ edit: row.scan.id }}
                              className="iz-pr-shift-status__action-btn iz-pr-shift-status__action-btn--edit"
                              title="Edit self-log"
                            >
                              <PenLine className="h-3 w-3" />
                            </Link>
                          ) : null}
                          <Link
                            to="/host/scan"
                            search={{
                              rescan: row.scan.id,
                              category: receiptPrimaryCategory(row.scan),
                            }}
                            className="iz-pr-shift-status__action-btn"
                            title="Scan again"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <span className="iz-tiny iz-muted2">—</span>
                      )}
                    </td>
                  )}
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
                    {wagesFinalized
                      ? `Payout ${formatRM(payout)} · hourly wages + commission`
                      : `Commission ${formatRM(commissionTotal)} · wages calculated at check-out`}
                  </p>
                </td>
                {wagesFinalized && (
                  <td className="iz-pr-shift-status__money wages font-sora font-bold">
                    {formatRM(baseWages)}
                  </td>
                )}
                <td className="iz-pr-shift-status__money commission font-sora font-bold">
                  {formatRM(commissionTotal)}
                </td>
                <td />
                <td />
                {!checkedOut && <td />}
              </tr>
            </tfoot>
          </table>
        </IzHScroll>

        <IzSheet open={viewScan !== null} onClose={() => setViewScan(null)}>
          {viewScan && (
            <div className="iz-sheet-body">
              <h3 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">
                {viewScan.receiptRef}
              </h3>
              <p className="iz-tiny iz-muted mt-0.5">
                Scanned receipt · {viewScan.outlet} · {formatReceiptScannedTime(viewScan.scannedAt)}
              </p>
              <ReceiptScanSlip scan={viewScan} />
              {!checkedOut && (
                <div className="mt-4 flex flex-col gap-2">
                  {isManualSelfLog(viewScan) && isSelfLogPendingAgency(viewScan) && (
                    <Link
                      to="/host/scan"
                      search={{ edit: viewScan.id }}
                      className="iz-btn iz-btn-primary iz-btn-sm w-full"
                      onClick={() => setViewScan(null)}
                    >
                      <PenLine className="h-4 w-4" /> Edit self-log
                    </Link>
                  )}
                  <Link
                    to="/host/scan"
                    search={{
                      rescan: viewScan.id,
                      category: receiptPrimaryCategory(viewScan),
                    }}
                    className="iz-btn iz-btn-soft iz-btn-sm w-full"
                    onClick={() => setViewScan(null)}
                  >
                    <RotateCcw className="h-4 w-4" /> Scan again
                  </Link>
                </div>
              )}
            </div>
          )}
        </IzSheet>

        {shiftScans.length === 0 && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">
            {wagesFinalized
              ? "Duty time is sealed at the outlet hourly rate (wages column). Scan receipts to add rows — each receipt scan is verified for commission."
              : "Duty wages are calculated when you check out. Scan receipts to add commission rows below."}
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
