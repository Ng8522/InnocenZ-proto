import { getOutletRule } from "@/lib/agency-demo";
import { shiftHoursFromLabel } from "@/lib/outlet-demo";
import {
  calcReceiptCommissions,
  type PrActiveShiftSession,
  type PrReceiptItem,
  type PrReceiptScan,
} from "@/lib/pr-demo";

export type DutyWagesBreakdown = {
  wagePerHour: number;
  shiftHours: number;
  wages: number;
  detail: string;
};

/** Hourly wages from outlet rate × scheduled shift hours (+ OT after checkout). */
export function calcDutyWagesFromOutlet(
  outlet: string,
  shiftTime: string,
  overtimeMinutes = 0,
): DutyWagesBreakdown {
  const rule = getOutletRule(outlet);
  const shiftHours = shiftHoursFromLabel(shiftTime);
  const extraHours = overtimeMinutes / 60;
  const totalHours = shiftHours + extraHours;
  const baseHours = Math.min(totalHours, rule.otAfterHours);
  const otHours = Math.max(0, totalHours - rule.otAfterHours);
  const wages = baseHours * rule.wagePerHour + otHours * rule.wagePerHour * 1.5;
  const detail =
    overtimeMinutes > 0
      ? `RM ${rule.wagePerHour}/hr × ${shiftHours}h + OT ${overtimeMinutes}m`
      : `RM ${rule.wagePerHour}/hr × ${shiftHours}h · outlet rate`;
  return {
    wagePerHour: rule.wagePerHour,
    shiftHours,
    wages: Math.round(wages * 100) / 100,
    detail,
  };
}

export type ShiftSalesTargets = {
  drinkUnits: number;
  tipRm: number;
  tableUnits: number;
};

export const DEFAULT_SHIFT_SALES_TARGETS: ShiftSalesTargets = {
  drinkUnits: 20,
  tipRm: 150,
  tableUnits: 3,
};

export type ShiftStatusRowKind = "duty" | "receipt";

export type ShiftStatusRow = {
  kind: ShiftStatusRowKind;
  id: string;
  label: string;
  detail: string;
  drinks: string;
  tips: string;
  tables: string;
  wagesRm: number;
  commissionRm: number;
  verified: boolean;
  verifyNote?: string;
};

export function receiptItemsForShift(session: PrActiveShiftSession | null | undefined, scans: PrReceiptScan[]) {
  if (!session) return [];
  return scans.filter(
    (r) =>
      r.shiftSessionId === session.id ||
      session.receiptIds.includes(r.id) ||
      (r.pvId === session.pvId && (r.status === "attached" || r.status === "in_pv")),
  );
}

export function sumReceiptItems(items: PrReceiptItem[]) {
  let drinkUnits = 0;
  let tipRm = 0;
  let tableUnits = 0;
  for (const item of items) {
    if (item.category === "drinks") drinkUnits += item.qty;
    else if (item.category === "tips") tipRm += item.amount;
    else if (item.category === "tables") tableUnits += item.qty;
  }
  return { drinkUnits, tipRm, tableUnits };
}

export function aggregateShiftSales(scans: PrReceiptScan[]) {
  let drinkUnits = 0;
  let tipRm = 0;
  let tableUnits = 0;
  let drinkCommission = 0;
  let tipCommission = 0;
  let tableCommission = 0;
  for (const scan of scans) {
    const items = sumReceiptItems(scan.items);
    drinkUnits += items.drinkUnits;
    tipRm += items.tipRm;
    tableUnits += items.tableUnits;
    drinkCommission += scan.drinkCommission;
    tipCommission += scan.tipCommission;
    tableCommission += scan.tableCommission;
  }
  return {
    drinkUnits,
    tipRm,
    tableUnits,
    drinkCommission,
    tipCommission,
    tableCommission,
    commissionTotal: drinkCommission + tipCommission + tableCommission,
  };
}

export function verifyReceiptScan(scan: PrReceiptScan): { ok: boolean; note: string } {
  const expected = calcReceiptCommissions(scan.items);
  const itemTotal = scan.items.reduce((s, i) => s + i.amount, 0);
  const issues: string[] = [];
  if (Math.abs(itemTotal - scan.totalLogged) > 0.01) {
    issues.push("total mismatch");
  }
  if (expected.drinkCommission !== scan.drinkCommission) issues.push("drinks");
  if (expected.tipCommission !== scan.tipCommission) issues.push("tips");
  if (expected.tableCommission !== scan.tableCommission) issues.push("tables");
  if (issues.length === 0) return { ok: true, note: "Matches PV rules" };
  return { ok: false, note: `Check ${issues.join(", ")}` };
}

export function shiftDurationLabel(session: {
  shiftTime: string;
  shiftHours?: number;
  overtimeMinutes?: number;
}) {
  const baseMins = (session.shiftHours ?? shiftHoursFromLabel(session.shiftTime)) * 60;
  const total = baseMins + (session.overtimeMinutes ?? 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function buildShiftStatusRows(
  session: PrActiveShiftSession,
  scans: PrReceiptScan[],
  baseWages: number,
): ShiftStatusRow[] {
  const duty = calcDutyWagesFromOutlet(
    session.outlet,
    session.shiftTime,
    session.overtimeMinutes ?? 0,
  );
  const dutyWages = session.timeOut ? duty.wages : baseWages;
  const dutyDetail = session.timeOut
    ? `${session.timeIn} → ${session.timeOut} · ${duty.detail}`
    : `${session.timeIn} · ${duty.detail}`;

  const rows: ShiftStatusRow[] = [
    {
      kind: "duty",
      id: "duty",
      label: "Duty time",
      detail: dutyDetail,
      drinks: "—",
      tips: "—",
      tables: "—",
      wagesRm: dutyWages,
      commissionRm: 0,
      verified: true,
      verifyNote: "Sealed at outlet rate",
    },
  ];

  for (const scan of scans) {
    const items = sumReceiptItems(scan.items);
    const verify = verifyReceiptScan(scan);
    rows.push({
      kind: "receipt",
      id: scan.id,
      label: scan.receiptRef || scan.id,
      detail: scan.scannedAt,
      drinks: items.drinkUnits > 0 ? `${items.drinkUnits} u` : "—",
      tips: items.tipRm > 0 ? `RM ${items.tipRm.toFixed(0)}` : "—",
      tables: items.tableUnits > 0 ? `${items.tableUnits} u` : "—",
      wagesRm: 0,
      commissionRm: scan.totalCommission,
      verified: verify.ok,
      verifyNote: verify.note,
    });
  }

  return rows;
}

export function shiftCommissionTotal(scans: PrReceiptScan[]) {
  return aggregateShiftSales(scans).commissionTotal;
}

export function shiftPayoutTotal(baseWages: number, scans: PrReceiptScan[]) {
  const sales = aggregateShiftSales(scans);
  return baseWages + sales.commissionTotal;
}

export function formatShiftSalesLine(targets: ShiftSalesTargets, actual: ReturnType<typeof aggregateShiftSales>) {
  return `Drinks ${actual.drinkUnits}/${targets.drinkUnits} · Tips RM ${actual.tipRm}/${targets.tipRm} · Tables ${actual.tableUnits}/${targets.tableUnits}`;
}
