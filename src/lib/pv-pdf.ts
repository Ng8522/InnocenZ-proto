import {
  FINANCE_HEAD_SIGNER,
  formatRMPlain,
  type PrPaymentVoucher,
  type PrProfile,
  type PrReceiptScan,
} from "@/lib/pr-demo";

export const PV_PDF_AGENCY = {
  name: "Atmosphere Event Planner Sdn. Bhd.",
  regNo: "(000001-08-7778)",
  address: "B-05-33, Emhub, Kota Damansara, 47810 Petaling Jaya, Selangor",
  tel: "+603 9775 9599",
  logoPath: "/assets/atmosphere-logo.png",
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

export function buildPvBreakdownHtml(
  pv: PrPaymentVoucher,
  profile: Pick<PrProfile, "name" | "ic" | "mobile" | "email" | "bank" | "acc">,
  receipts: PrReceiptScan[] = [],
) {
  const logoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${PV_PDF_AGENCY.logoPath}` : PV_PDF_AGENCY.logoPath;

  const linkedReceipts = receipts.filter(
    (r) => r.pvId === pv.id || pv.receiptIds?.includes(r.id) || pv.rows.some((row) => row.receiptIds?.includes(r.id)),
  );

  const rowHtml = pv.rows
    .map(
      (r) => `
    <tr>
      <td class="c">${r.i}</td>
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.day)}</td>
      <td>${escapeHtml(r.outlet)}</td>
      <td>
        <div class="desc">${escapeHtml(r.desc)}</div>
        <div class="ref">${escapeHtml(r.ref)}</div>
        ${r.receiptIds?.length ? `<div class="ref">Receipts: ${r.receiptIds.map(escapeHtml).join(", ")}</div>` : ""}
      </td>
      <td class="c">${r.qty}</td>
      <td class="r">${amt(r.amt)}</td>
    </tr>`,
    )
    .join("");

  const receiptHtml =
    linkedReceipts.length > 0
      ? `
    <h3 class="sub-h">Receipt scans on this shift (→ ${escapeHtml(pv.id)})</h3>
    <table class="items">
      <thead>
        <tr>
          <th>Receipt ID</th>
          <th>Scanned</th>
          <th>Outlet</th>
          <th>Logged (RM)</th>
          <th>Commission (RM)</th>
        </tr>
      </thead>
      <tbody>
        ${linkedReceipts
          .map(
            (r) => `
        <tr>
          <td><b>${escapeHtml(r.id)}</b></td>
          <td>${escapeHtml(r.scannedAt)}</td>
          <td>${escapeHtml(r.outlet)}</td>
          <td class="r">${amt(r.totalLogged)}</td>
          <td class="r">${amt(r.totalCommission)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
      : "";

  const shiftMeta =
    pv.timeIn || pv.timeOut
      ? `<p class="shift-meta"><b>Shift:</b> ${escapeHtml(pv.shiftTime ?? "—")} · Time-In ${escapeHtml(pv.timeIn ?? "—")} · Time-Out ${escapeHtml(pv.timeOut ?? "—")}</p>`
      : "";

  const deductHtml =
    pv.deduct > 0
      ? `<tr><td colspan="6" class="deduct-lbl">Deductions per agency rules</td><td class="r deduct">${amt(pv.deduct)}</td></tr>`
      : `<tr><td colspan="6" class="deduct-lbl">Total Deductible RM</td><td class="r">0.00</td></tr>`;

  const financeSigned = Boolean(pv.financeHeadSignedAt);
  const prSigned = Boolean(pv.prSignedAt || pv.status === "PAID" || pv.status === "SIGNED");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pv.id)} — Payment Voucher</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 24px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .logo { width: 120px; height: auto; }
    .title-block { text-align: right; flex: 1; }
    .title { font-family: Georgia, "Times New Roman", serif; font-size: 28px; font-weight: 400; margin: 0 0 4px; color: #1a1a1a; }
    .co { font-size: 11px; color: #444; margin: 0; }
    .addr { font-size: 10px; color: #555; line-height: 1.5; max-width: 220px; margin-top: 12px; }
    .meta { border-collapse: collapse; font-size: 10px; margin-top: 8px; }
    .meta td, .meta th { border: 1px solid #d4c4e8; padding: 5px 10px; }
    .meta th { background: #ebe3f5; text-align: left; font-weight: 600; }
    .attention { background: #ebe3f5; padding: 8px 12px; font-weight: 700; font-size: 12px; margin: 18px 0 10px; }
    .payee { font-size: 10px; line-height: 1.65; margin-bottom: 14px; }
    .payee b { display: inline-block; min-width: 118px; font-weight: 600; }
    .shift-meta { font-size: 10px; color: #555; margin: 0 0 12px; }
    .sub-h { font-size: 11px; font-weight: 700; margin: 16px 0 8px; color: #333; }
    table.items { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.items th { background: #ebe3f5; border: 1px solid #d4c4e8; padding: 7px 6px; text-align: left; font-weight: 600; }
    table.items td { border: 1px solid #e0e0e0; padding: 7px 6px; vertical-align: top; }
    table.items .c { text-align: center; }
    table.items .r { text-align: right; white-space: nowrap; }
    .desc { font-weight: 600; }
    .ref { font-size: 9px; color: #666; margin-top: 2px; }
    .summary { width: 100%; margin-top: 4px; font-size: 11px; border-collapse: collapse; }
    .summary td { padding: 6px 8px; border: 1px solid #e0e0e0; }
    .summary .lbl { text-align: right; font-weight: 700; width: 78%; }
    .summary .deduct-lbl { text-align: right; font-weight: 600; color: #666; }
    .summary .deduct { color: #c00; }
    .summary .pay-row td { background: #fff8dc; font-weight: 800; font-size: 12px; }
    .sigs { display: flex; gap: 40px; margin-top: 28px; page-break-inside: avoid; }
    .sig { flex: 1; font-size: 10px; }
    .sig-lbl { font-weight: 600; margin-bottom: 28px; }
    .sig-line { border-bottom: 1px solid #333; margin-bottom: 6px; min-height: 20px; }
    .sig-name { font-weight: 700; font-size: 11px; }
    .sig-sub { color: #555; font-size: 9px; }
    .foot { margin-top: 20px; font-size: 9px; color: #888; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="head">
    <img class="logo" src="${logoUrl}" alt="Atmosphere Event Planner" />
    <div class="title-block">
      <h1 class="title">Payment Voucher</h1>
      <p class="co">${escapeHtml(PV_PDF_AGENCY.name)} ${escapeHtml(PV_PDF_AGENCY.regNo)}</p>
      <table class="meta" style="margin-left:auto;">
        <tr><th>Payment Voucher #</th><td>${escapeHtml(pv.id)}</td></tr>
        <tr><th>Date</th><td>${escapeHtml(pv.issued)}</td></tr>
        <tr><th>Cycle</th><td>${escapeHtml(pv.cycle)}</td></tr>
        <tr><th>Term</th><td>Weekly · Bank Transfer</td></tr>
        <tr><th>Status</th><td>${escapeHtml(pv.status)}</td></tr>
      </table>
    </div>
  </div>
  <div class="addr">
    ${escapeHtml(PV_PDF_AGENCY.address)}<br />
    Tel / Fax: ${escapeHtml(PV_PDF_AGENCY.tel)}
  </div>

  <div class="attention">Attention: ${escapeHtml(profile.name)}</div>
  <div class="payee">
    <div><b>Mobile Number</b> ${escapeHtml(profile.mobile)}</div>
    <div><b>Identification No</b> ${escapeHtml(profile.ic)}</div>
    <div><b>Address</b> Kota Damansara, Selangor</div>
    <div><b>Email</b> ${escapeHtml(profile.email)}</div>
    <div><b>Bank</b> ${escapeHtml(profile.bank)}</div>
    <div><b>Bank Account No</b> ${escapeHtml(profile.acc)}</div>
  </div>
  ${shiftMeta}

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Day</th>
        <th>Outlet</th>
        <th>Description</th>
        <th>Qty</th>
        <th>RM</th>
      </tr>
    </thead>
    <tbody>
      ${rowHtml || `<tr><td colspan="7" style="text-align:center;color:#888;">No line items</td></tr>`}
    </tbody>
  </table>

  ${receiptHtml}

  <table class="summary">
    <tr><td class="lbl" colspan="2">Sub-Total RM</td><td class="r" style="width:90px;font-weight:700;">${amt(pv.subtotal)}</td></tr>
    ${deductHtml}
    <tr class="pay-row"><td class="lbl" colspan="2">Total Payable RM</td><td class="r">${amt(pv.net)}</td></tr>
  </table>

  <div class="sigs">
    <div class="sig">
      <div class="sig-lbl">Prepared &amp; signed by Finance:</div>
      <div class="sig-line">${financeSigned ? "✓" : ""}</div>
      <div class="sig-name">${escapeHtml(pv.financeHeadName || FINANCE_HEAD_SIGNER)}</div>
      <div class="sig-sub">Finance Manager · Atmosphere Event Planner</div>
      <div class="sig-sub">${escapeHtml(pv.financeHeadSignedAt ?? "")}</div>
    </div>
    <div class="sig">
      <div class="sig-lbl">Reviewed &amp; Accepted by PR:</div>
      <div class="sig-line">${prSigned ? "✓" : ""}</div>
      <div class="sig-name">${escapeHtml(profile.name)}</div>
      <div class="sig-sub">${escapeHtml(profile.ic)}</div>
      <div class="sig-sub">${escapeHtml(pv.prSignedAt ?? (prSigned ? "Signed" : "Pending"))}</div>
    </div>
  </div>

  <p class="foot">
    InnocenZ · One PV per shift (Time-In → receipt scans → Time-Out). Immutable once PAID.
    Generated ${escapeHtml(new Date().toLocaleString("en-MY"))}.
  </p>
  <p class="foot no-print">Use your browser Print dialog → Save as PDF.</p>
</body>
</html>`;
}

/** Open print-ready PV breakdown (Save as PDF) or download HTML fallback */
export function downloadPvBreakdownPdf(
  pv: PrPaymentVoucher,
  profile: Pick<PrProfile, "name" | "ic" | "mobile" | "email" | "bank" | "acc">,
  receipts: PrReceiptScan[] = [],
) {
  const html = buildPvBreakdownHtml(pv, profile, receipts);
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
    }, 500);
    return;
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pv.id}-breakdown.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadAgencyPvPdf(pv: PrPaymentVoucher, agencyIc?: string) {
  void agencyIc;
  downloadPvBreakdownPdf(
    pv,
    {
      name: pv.prName,
      ic: pv.prIc ?? "—",
      mobile: "—",
      email: "—",
      bank: "—",
      acc: "—",
    },
    [],
  );
}
