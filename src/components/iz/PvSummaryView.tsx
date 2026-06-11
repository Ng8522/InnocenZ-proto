import { formatRM } from "@/components/iz/ui";
import {
  PV_TEMPLATE_ISSUER,
  formatPayeeField,
  type PvPayeeProfile,
} from "@/lib/pv-template";
import type { PrPaymentVoucher } from "@/lib/pr-demo";

export function PvSummaryView({
  pv,
  payee,
  className,
}: {
  pv: PrPaymentVoucher;
  payee: PvPayeeProfile;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="iz-pv-summary">
        <div className="iz-pv-summary-hero">
          <div className="iz-pv-summary-hero-lbl">Net payable</div>
          <div className="iz-pv-summary-hero-amt">{formatRM(pv.net)}</div>
        </div>

        <div className="iz-pv-summary-grid">
          <SummaryRow label="Payee" value={payee.name} highlight />
          {formatPayeeField(payee.code) && <SummaryRow label="Code" value={payee.code} />}
          {formatPayeeField(payee.ic) && <SummaryRow label="IC / Passport" value={payee.ic} />}
          {formatPayeeField(payee.phone) && <SummaryRow label="Phone" value={payee.phone} />}
          <SummaryRow label="Cycle" value={pv.cycle} highlight />
          <SummaryRow label="Issued" value={pv.issued} />
          <SummaryRow label="Due (sign-by)" value={pv.due} />
          <SummaryRow label="Outlet" value={pv.outlet} />
          {pv.shiftTime && <SummaryRow label="Shift" value={pv.shiftTime} />}
          {pv.timeIn && <SummaryRow label="Time-In" value={pv.timeIn} />}
          {pv.timeOut && <SummaryRow label="Time-Out" value={pv.timeOut} />}
          {pv.receiptIds && pv.receiptIds.length > 0 && (
            <SummaryRow label="Receipt scans" value={`${pv.receiptIds.length} on this shift`} />
          )}
          {pv.financeHeadSignedAt && (
            <SummaryRow label="Finance Head" value={`${pv.financeHeadName} · ${pv.financeHeadSignedAt}`} />
          )}
          {pv.prSignedAt && <SummaryRow label="PR signed" value={pv.prSignedAt} />}
          {pv.paidAt && <SummaryRow label="Paid" value={pv.paidAt} />}
          {pv.bankRef && <SummaryRow label="Bank ref" value={pv.bankRef} />}
        </div>

        <div className="iz-pv-summary-bank">
          <div className="iz-pv-summary-bank-lbl">Payment to</div>
          <div className="iz-pv-summary-bank-val">
            {[
              PV_TEMPLATE_ISSUER.paymentMethod,
              formatPayeeField(payee.bank),
              formatPayeeField(payee.accountName),
              formatPayeeField(payee.accountNo),
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
      </div>

      {pv.rows.length > 0 && (
        <div className="iz-pv-summary-table-card">
          <div className="iz-pv-summary-table-h">Line items</div>
          <div className="iz-data-table-wrap">
            <table className="iz-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Outlet</th>
                  <th>Ref</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pv.rows.map((r) => (
                  <tr key={r.i}>
                    <td>{r.i}</td>
                    <td>
                      {r.date}
                      <div className="iz-tiny iz-muted2">{r.day}</div>
                    </td>
                    <td>{r.desc}</td>
                    <td>{r.outlet}</td>
                    <td>{r.ref}</td>
                    <td className="text-right font-semibold text-[var(--iz-gold-l)]">{formatRM(r.amt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="iz-data-table-tot">
                  <td colSpan={5}>Subtotal</td>
                  <td className="text-right">{formatRM(pv.subtotal)}</td>
                </tr>
                {pv.deduct > 0 && (
                  <tr className="iz-data-table-tot">
                    <td colSpan={5}>Deductions</td>
                    <td className="text-right text-[var(--iz-red)]">-{formatRM(pv.deduct)}</td>
                  </tr>
                )}
                <tr className="iz-data-table-tot">
                  <td colSpan={5}>
                    <b>Net payable</b>
                  </td>
                  <td className="text-right">
                    <b className="text-[var(--iz-gold)]">{formatRM(pv.net)}</b>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="iz-pv-summary-row">
      <span className="iz-pv-summary-lbl">{label}</span>
      <span className={`iz-pv-summary-val${highlight ? " highlight" : ""}`}>{value}</span>
    </div>
  );
}
