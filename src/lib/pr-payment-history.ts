import type { HistRow, PrPaymentVoucher, PrPvRow } from "@/lib/pr-demo";
import { buildWeeklyPaymentSummary, syncWeeklyPvWithSummary } from "@/lib/pr-weekly-payment";

export type PaymentHistoryRecord = {
  pvId: string;
  weekLabel: string;
  weekStartIso?: string;
  weekEndIso?: string;
  status: "PAID" | "SIGNED";
  issued: string;
  paidAt?: string;
  bankRef?: string;
  outlet: string;
  shiftDays: number;
  wages: number;
  commission: number;
  earlyWithdrawal: number;
  deductions: number;
  gross: number;
  net: number;
};

function rowCategory(desc: string) {
  const d = desc.toLowerCase();
  if (d.includes("daily wage")) return "wages" as const;
  if (d.includes("withdrawal") || d.includes("advance")) return "withdrawal" as const;
  if (d.includes("deduct")) return "deduction" as const;
  if (d.includes("commission") || d.includes("drink") || d.includes("tip") || d.includes("table")) {
    return "commission" as const;
  }
  return "other" as const;
}

function sumRows(rows: PrPvRow[], cat: ReturnType<typeof rowCategory>) {
  return rows.reduce((s, r) => (rowCategory(r.desc) === cat ? s + r.amt : s), 0);
}

function countShiftDays(rows: PrPvRow[]) {
  const dates = new Set<string>();
  for (const r of rows) {
    if (rowCategory(r.desc) === "wages") dates.add(r.date);
  }
  return dates.size;
}

export function isPaymentHistoryPv(pv: PrPaymentVoucher) {
  return pv.status === "PAID" || pv.status === "SIGNED";
}

/** Shift history badge — derived from the weekly PV covering that shift date. */
export function deriveShiftHistoryStatus(
  dateIso: string,
  pvs: PrPaymentVoucher[],
): Pick<HistRow, "st" | "pill"> {
  const pv = pvs.find(
    (p) => p.weekStartIso && p.weekEndIso && dateIso >= p.weekStartIso && dateIso <= p.weekEndIso,
  );
  if (!pv) {
    return { st: "SEALED", pill: "ink" };
  }
  switch (pv.status) {
    case "PAID":
      return { st: "PAID", pill: "green" };
    case "SIGNED":
      return { st: "SIGNED", pill: "amber" };
    case "DISPUTED":
      return { st: "DISPUTED", pill: "red" };
    case "SENT":
    case "PENDING_REVIEW":
      return { st: "SENT", pill: "ink" };
    default:
      return { st: "SEALED", pill: "ink" };
  }
}

export function shiftHistoryStatusLabel(st: HistRow["st"]): string {
  switch (st) {
    case "PAID":
      return "Paid";
    case "SIGNED":
      return "Signed";
    case "SENT":
      return "In PV";
    case "DISPUTED":
      return "Disputed";
    case "SEALED":
      return "Sealed";
    default:
      return st;
  }
}

export function buildPaymentHistoryRecord(pv: PrPaymentVoucher): PaymentHistoryRecord {
  const wages = sumRows(pv.rows, "wages");
  const commission = sumRows(pv.rows, "commission");
  const earlyWithdrawal =
    pv.deduct > 0 ? pv.deduct : sumRows(pv.rows, "withdrawal");
  const deductions = sumRows(pv.rows, "deduction");
  const shiftDays = countShiftDays(pv.rows);
  const gross = pv.subtotal;
  return {
    pvId: pv.id,
    weekLabel: pv.cycle,
    weekStartIso: pv.weekStartIso,
    weekEndIso: pv.weekEndIso,
    status: pv.status as "PAID" | "SIGNED",
    issued: pv.issued,
    paidAt: pv.paidAt,
    bankRef: pv.bankRef,
    outlet: pv.outlet,
    shiftDays,
    wages,
    commission,
    earlyWithdrawal,
    deductions,
    gross,
    net: pv.net,
  };
}

export function buildPaymentHistoryRecords(pvs: PrPaymentVoucher[]): PaymentHistoryRecord[] {
  return pvs
    .filter(isPaymentHistoryPv)
    .map(buildPaymentHistoryRecord)
    .sort((a, b) => {
      const parse = (s: string) => {
        const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (!m) return 0;
        return Date.parse(`${m[2]} ${m[1]}, ${m[3]}`);
      };
      return parse(b.paidAt ?? b.issued) - parse(a.paidAt ?? a.issued);
    });
}

export function paymentHistoryWeekSummary(pv: PrPaymentVoucher) {
  if (!pv.weekStartIso) return null;
  const summary = buildWeeklyPaymentSummary({ weekStartIso: pv.weekStartIso, pv });
  return syncWeeklyPvWithSummary(pv, summary);
}
