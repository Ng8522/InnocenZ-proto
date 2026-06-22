import {
  PV_TEMPLATE_DISCLAIMER,
  PV_TEMPLATE_ISSUER,
  buildPvTemplateLines,
  formatPayeeField,
  formatPvAmount,
  padPvTemplateLines,
  type PvPayeeProfile,
} from "@/lib/pv-template";
import type { PrPaymentVoucher } from "@/lib/pr-demo";
import { publicAssetPath } from "@/lib/public-asset";

function PayeeField({ label, value }: { label: string; value: string }) {
  const display = formatPayeeField(value);
  return (
    <div className="iz-pv-doc-field">
      <span className="lbl">{label}</span>
      <span className={`val${display ? "" : " empty"}`}>{display || "—"}</span>
    </div>
  );
}

export function PvTemplateView({
  pv,
  payee,
  className,
  minRows = 5,
  padEmptyRows = false,
  showSignature,
  signerName,
  signerDate,
}: {
  pv: PrPaymentVoucher;
  payee: PvPayeeProfile;
  className?: string;
  minRows?: number;
  /** Pad to min rows — use for print/PDF only */
  padEmptyRows?: boolean;
  showSignature?: boolean;
  signerName?: string;
  signerDate?: string;
}) {
  const built = buildPvTemplateLines(pv);
  const lines = padEmptyRows ? padPvTemplateLines(built, minRows) : built;
  const prSigned = Boolean(pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED");
  const sigName = signerName ?? (prSigned ? payee.name : "");
  const sigDate = signerDate ?? (prSigned ? pv.prSignedAt ?? "" : "");

  return (
    <div className={`iz-pv-doc-shell${className ? ` ${className}` : ""}`}>
      <article className="iz-pv-doc" aria-label={`Payment voucher ${pv.id}`}>
        <header className="iz-pv-doc-head">
          <img className="iz-pv-doc-logo" src={publicAssetPath(PV_TEMPLATE_ISSUER.logoPath)} alt={PV_TEMPLATE_ISSUER.brand} />
          <div className="iz-pv-doc-title-block">
            <h1 className="iz-pv-doc-title">Payment Voucher</h1>
            <p className="iz-pv-doc-issuer">
              <strong>
                {PV_TEMPLATE_ISSUER.name} {PV_TEMPLATE_ISSUER.regNo}
              </strong>
              <span className="iz-pv-doc-issuer-line">
                Phone No: {PV_TEMPLATE_ISSUER.phone}
              </span>
              <span className="iz-pv-doc-issuer-line">
                Email Address: {PV_TEMPLATE_ISSUER.email}
              </span>
              <span className="iz-pv-doc-issuer-line">Address: {PV_TEMPLATE_ISSUER.address}</span>
            </p>
          </div>
        </header>

        <div className="iz-pv-doc-top">
          <section className="iz-pv-doc-box iz-pv-doc-payable">
            <div className="iz-pv-doc-box-h">Payable to:</div>
            <div className="iz-pv-doc-box-body">
              <PayeeField label="Code:" value={payee.code} />
              <PayeeField label="Name:" value={payee.name} />
              <PayeeField label="Nickname:" value={payee.nickname} />
              <PayeeField label="IC/Passport No.:" value={payee.ic} />
              <PayeeField label="Phone No.:" value={payee.phone} />
            </div>
          </section>

          <table className="iz-pv-doc-meta">
            <tbody>
              <tr>
                <th>Voucher No.</th>
                <td>{pv.id}</td>
              </tr>
              <tr>
                <th>Voucher Date</th>
                <td>{pv.issued}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="iz-pv-doc-table-wrap">
          <table className="iz-pv-doc-items">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Unit</th>
                <th>Unit Price (RM)</th>
                <th>Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={`${line.seq}-${idx}`} className={line.blank ? "blank" : undefined}>
                  <td className="c">{line.seq}</td>
                  <td className="desc">{line.description}</td>
                  <td className="c">{line.unit || ""}</td>
                  <td className="r">{formatPvAmount(line.unitPrice)}</td>
                  <td className="r">{formatPvAmount(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="iz-pv-doc-bottom">
          <section className="iz-pv-doc-box iz-pv-doc-payment">
            <div className="iz-pv-doc-box-h">Payment Details:</div>
            <div className="iz-pv-doc-box-body">
              <PayeeField label="Payment Method:" value={PV_TEMPLATE_ISSUER.paymentMethod} />
              <PayeeField label="Bank Name:" value={payee.bank} />
              <PayeeField label="Bank Account Name:" value={payee.accountName} />
              <PayeeField label="Bank Account No.:" value={payee.accountNo} />
            </div>
          </section>

          <div className="iz-pv-doc-total">
            <span className="lbl">Total</span>
            <span className="val">RM {formatPvAmount(pv.net)}</span>
          </div>
        </div>

        {(showSignature ?? true) && (
          <div className="iz-pv-doc-sig">
            <div className="iz-pv-doc-sig-line" />
            <div className="iz-pv-doc-sig-fields">
              <div>
                <span className="lbl">Name:</span>
                <span className={`line${sigName ? "" : " empty"}`}>{sigName || "—"}</span>
              </div>
              <div>
                <span className="lbl">Date:</span>
                <span className={`line${sigDate ? "" : " empty"}`}>{sigDate || "—"}</span>
              </div>
            </div>
          </div>
        )}

        <p className="iz-pv-doc-disclaimer">{PV_TEMPLATE_DISCLAIMER}</p>
      </article>
    </div>
  );
}
