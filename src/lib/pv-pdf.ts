import type { PrPaymentVoucher, PrProfile, PrReceiptScan } from "@/lib/pr-demo";
import {
  PV_TEMPLATE_DISCLAIMER,
  PV_TEMPLATE_ISSUER,
  buildPvTemplateLines,
  formatPvPdfDash,
  formatPvVoucherDate,
  padPvTemplateLines,
  payeeFromPaymentVoucher,
  payeeFromProfile,
  type PvPayeeProfile,
} from "@/lib/pv-template";

/** @deprecated Use PV_TEMPLATE_ISSUER */
export const PV_PDF_AGENCY = {
  name: PV_TEMPLATE_ISSUER.name,
  regNo: PV_TEMPLATE_ISSUER.regNo,
  address: PV_TEMPLATE_ISSUER.address,
  tel: PV_TEMPLATE_ISSUER.phone,
  logoPath: PV_TEMPLATE_ISSUER.logoPath,
} as const;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function amt(n: number) {
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fieldRow(label: string, value: string) {
  return `<div class="fld"><span class="fld-lbl">${escapeHtml(label)}</span><span class="fld-val">${escapeHtml(value || "-")}</span></div>`;
}

/** Print/PDF HTML — matches PV Template.xlsx + PV-2606-001.pdf */
export function buildPvBreakdownHtml(
  pv: PrPaymentVoucher,
  payee: PvPayeeProfile,
  _receipts: PrReceiptScan[] = [],
) {
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${PV_TEMPLATE_ISSUER.logoPath}`
      : PV_TEMPLATE_ISSUER.logoPath;

  const templateLines = padPvTemplateLines(buildPvTemplateLines(pv), 5);
  const voucherDate = formatPvVoucherDate(pv.issued);
  const prSigned = Boolean(pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED");

  const rowHtml = templateLines
    .map((line) => {
      const blank = line.blank;
      return `<tr>
      <td class="c">${blank ? "" : escapeHtml(line.seq)}</td>
      <td class="desc">${blank ? "" : escapeHtml(line.description)}</td>
      <td class="c">${blank ? "-" : line.unit || "-"}</td>
      <td class="r">${formatPvPdfDash(blank ? undefined : line.unitPrice, blank)}</td>
      <td class="r">${formatPvPdfDash(blank ? undefined : line.amount, blank)}</td>
    </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pv.id)} — Payment Voucher</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      background: #fff;
      padding: 0;
    }
    .doc {
      border: 1px solid #000;
      padding: 14px 16px 12px;
      max-width: 210mm;
      margin: 0 auto;
    }
    /* ── Header: logo left, title + issuer centered ── */
    .hdr {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }
    .hdr-logo {
      display: table-cell;
      width: 110px;
      vertical-align: top;
    }
    .hdr-logo img { width: 100px; height: auto; }
    .hdr-mid {
      display: table-cell;
      vertical-align: top;
      text-align: center;
      padding: 0 8px;
    }
    .hdr-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }
    .hdr-issuer {
      font-size: 10px;
      line-height: 1.55;
      color: #000;
    }
    .hdr-rule {
      border: none;
      border-top: 1px solid #000;
      margin: 0 0 10px;
    }
    /* ── Payable + voucher meta ── */
    .top-row {
      display: table;
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .payable-cell {
      display: table-cell;
      width: 62%;
      vertical-align: top;
      padding-right: 0;
    }
    .meta-cell {
      display: table-cell;
      width: 38%;
      vertical-align: top;
    }
    .box {
      border: 1px solid #000;
    }
    .box-h {
      background: #d8d8d8;
      border-bottom: 1px solid #000;
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .box-body { padding: 6px 10px 8px; }
    .fld {
      display: table;
      width: 100%;
      margin-bottom: 3px;
      font-size: 10px;
      line-height: 1.5;
    }
    .fld:last-child { margin-bottom: 0; }
    .fld-lbl {
      display: table-cell;
      width: 118px;
      font-weight: 400;
      vertical-align: top;
      white-space: nowrap;
    }
    .fld-val {
      display: table-cell;
      vertical-align: top;
      word-break: break-word;
    }
    .meta-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #000;
      border-left: none;
    }
    .meta-tbl th,
    .meta-tbl td {
      border: 1px solid #000;
      padding: 5px 8px;
      vertical-align: middle;
    }
    .meta-tbl th {
      background: #d8d8d8;
      font-weight: 700;
      text-align: left;
      width: 42%;
      white-space: nowrap;
    }
    .meta-tbl td { font-weight: 400; }
    /* ── Line items — horizontal rules only (per PDF sample) ── */
    .items-wrap {
      border-left: 1px solid #000;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.items th {
      background: #d8d8d8;
      border-bottom: 1px solid #000;
      padding: 6px 8px;
      font-weight: 700;
      text-align: left;
    }
    table.items td {
      padding: 7px 8px;
      vertical-align: middle;
      border: none;
    }
    table.items .c { text-align: center; width: 36px; }
    table.items .desc { text-align: left; }
    table.items .r {
      text-align: right;
      white-space: nowrap;
      width: 90px;
      font-variant-numeric: tabular-nums;
    }
    table.items tbody tr:last-child td {
      padding-bottom: 10px;
    }
    /* ── Payment details + total ── */
    .bot-row {
      display: table;
      width: 100%;
      border-collapse: collapse;
    }
    .pay-cell {
      display: table-cell;
      width: 62%;
      vertical-align: top;
    }
    .total-cell {
      display: table-cell;
      width: 38%;
      vertical-align: top;
      padding-left: 0;
    }
    .pay-box {
      border: 1px solid #000;
      border-top: none;
    }
    .total-box {
      border: 2px solid #000;
      border-top: none;
      border-left: none;
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      gap: 12px;
    }
    .total-box .lbl {
      font-size: 22px;
      font-weight: 700;
      white-space: nowrap;
    }
    .total-box .val {
      font-size: 22px;
      font-weight: 700;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    /* ── Signature ── */
    .sig-wrap {
      margin-top: 0;
      padding: 12px 0 8px;
      text-align: right;
    }
    .sig-inner {
      display: inline-block;
      width: 240px;
      text-align: left;
      margin-right: 4px;
    }
    .sig-line {
      border-bottom: 1px solid #000;
      height: 36px;
      margin-bottom: 6px;
    }
    .sig-fld {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 10px;
    }
    .sig-fld .lbl { font-weight: 400; min-width: 38px; }
    .sig-fld .val {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 16px;
      padding-bottom: 1px;
    }
    /* ── Footer ── */
    .ftr-rule {
      border: none;
      border-top: 1px solid #000;
      margin: 8px 0 10px;
    }
    .disclaimer {
      font-size: 9px;
      line-height: 1.5;
      text-align: center;
      color: #000;
      padding: 0 4px;
    }
    .no-print { display: none; }
    @media print {
      body { padding: 0; }
      .doc { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="hdr">
      <div class="hdr-logo">
        <img src="${logoUrl}" alt="${escapeHtml(PV_TEMPLATE_ISSUER.brand)}" />
      </div>
      <div class="hdr-mid">
        <div class="hdr-title">Payment Voucher</div>
        <div class="hdr-issuer">
          ${escapeHtml(PV_TEMPLATE_ISSUER.name)} ${escapeHtml(PV_TEMPLATE_ISSUER.regNo)}<br />
          Phone No: ${escapeHtml(PV_TEMPLATE_ISSUER.phone)} Email Address: ${escapeHtml(PV_TEMPLATE_ISSUER.email)}<br />
          Address: ${escapeHtml(PV_TEMPLATE_ISSUER.address)}.
        </div>
      </div>
    </div>

    <hr class="hdr-rule" />

    <div class="top-row">
      <div class="payable-cell">
        <div class="box">
          <div class="box-h">Payable to:</div>
          <div class="box-body">
            ${fieldRow("Code:", payee.code)}
            ${fieldRow("Name:", payee.name)}
            ${fieldRow("Nickname:", payee.nickname)}
            ${fieldRow("IC/Passport No.:", payee.ic)}
            ${fieldRow("Phone No.:", payee.phone)}
          </div>
        </div>
      </div>
      <div class="meta-cell">
        <table class="meta-tbl">
          <tr><th>Voucher No.:</th><td>${escapeHtml(pv.id)}</td></tr>
          <tr><th>Voucher Date:</th><td>${escapeHtml(voucherDate)}</td></tr>
        </table>
      </div>
    </div>

    <div class="items-wrap">
      <table class="items">
        <thead>
          <tr>
            <th class="c">#</th>
            <th>Description</th>
            <th class="c">Unit</th>
            <th class="r">Unit Price (RM)</th>
            <th class="r">Amount (RM)</th>
          </tr>
        </thead>
        <tbody>
          ${rowHtml}
        </tbody>
      </table>
    </div>

    <div class="bot-row">
      <div class="pay-cell">
        <div class="pay-box">
          <div class="box-h">Payment Details:</div>
          <div class="box-body">
            ${fieldRow("Payment Method:", PV_TEMPLATE_ISSUER.paymentMethod)}
            ${fieldRow("Bank Name:", payee.bank)}
            ${fieldRow("Bank Account Name:", payee.accountName)}
            ${fieldRow("Bank Account No.:", payee.accountNo)}
          </div>
        </div>
      </div>
      <div class="total-cell">
        <div class="total-box">
          <span class="lbl">Total</span>
          <span class="val">RM ${amt(pv.net)}</span>
        </div>
      </div>
    </div>

    <div class="sig-wrap">
      <div class="sig-inner">
        <div class="sig-line"></div>
        <div class="sig-fld">
          <span class="lbl">Name:</span>
          <span class="val">${escapeHtml(prSigned ? payee.name : "")}</span>
        </div>
        <div class="sig-fld">
          <span class="lbl">Date:</span>
          <span class="val">${escapeHtml(prSigned ? (pv.prSignedAt ?? "") : "")}</span>
        </div>
      </div>
    </div>

    <hr class="ftr-rule" />
    <p class="disclaimer">${escapeHtml(PV_TEMPLATE_DISCLAIMER)}</p>
  </div>

  <p class="no-print" style="margin-top:12px;font-size:8px;color:#aaa;text-align:center;">
    Print → Save as PDF · ${escapeHtml(pv.id)}
  </p>
</body>
</html>`;
}

/** Open print-ready PV (Save as PDF) or download HTML fallback */
export function downloadPvBreakdownPdf(
  pv: PrPaymentVoucher,
  payee: PvPayeeProfile,
  receipts: PrReceiptScan[] = [],
) {
  const html = buildPvBreakdownHtml(pv, payee, receipts);
  const printWin = window.open("", "_blank");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      try {
        printWin.print();
      } catch {
        /* user may block print */
      }
    }, 600);
    return;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pv.id}-payment-voucher.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAgencyPvPdf(
  pv: PrPaymentVoucher,
  payeeOverrides?: Partial<PvPayeeProfile> & {
    mobile?: string;
    bank?: string;
    acc?: string;
    first?: string;
  },
) {
  const payee = payeeOverrides?.name
    ? payeeFromProfile(
        {
          name: payeeOverrides.name,
          ic: payeeOverrides.ic ?? pv.prIc ?? "—",
          mobile: payeeOverrides.mobile ?? payeeOverrides.phone,
          bank: payeeOverrides.bank,
          acc: payeeOverrides.acc ?? payeeOverrides.accountNo,
          first: payeeOverrides.first ?? payeeOverrides.nickname,
        },
        payeeOverrides,
      )
    : payeeFromPaymentVoucher(pv, payeeOverrides);

  downloadPvBreakdownPdf(pv, payee, []);
}

export function downloadPvReceipt(
  pv: PrPaymentVoucher,
  profile: Pick<PrProfile, "name" | "ic" | "mobile" | "bank" | "acc" | "first">,
  receipts: PrReceiptScan[] = [],
) {
  downloadPvBreakdownPdf(pv, payeeFromProfile(profile), receipts);
}
