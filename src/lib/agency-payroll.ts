import type { AgencyManagedPR } from "@/lib/agency-demo";
import type { PrPaymentVoucher, PrReceiptScan } from "@/lib/pr-demo";

function prNameMatchesAgency(scanName: string, pr: AgencyManagedPR): boolean {
  const sn = scanName.trim().toLowerCase();
  const full = pr.name.trim().toLowerCase();
  const first = full.split(/\s+/)[0] ?? "";
  return sn === full || sn === first || full.startsWith(sn);
}

/** Receipt scans belonging to PRs on the agency roster (or linked agency PVs). */
export function getAgencyManagedReceiptScans(
  scans: PrReceiptScan[],
  agencyPRs: AgencyManagedPR[],
  pvs: PrPaymentVoucher[],
): PrReceiptScan[] {
  const agencyPvIds = new Set(
    pvs.filter((pv) => agencyPRs.some((pr) => prNameMatchesAgency(pv.prName, pr))).map((pv) => pv.id),
  );

  return scans.filter((scan) => {
    if (scan.prId && agencyPRs.some((pr) => pr.id === scan.prId)) return true;
    if (agencyPRs.some((pr) => prNameMatchesAgency(scan.prName, pr))) return true;
    if (scan.pvId && agencyPvIds.has(scan.pvId)) return true;
    return false;
  });
}

export function receiptsForPv(scans: PrReceiptScan[], pv: PrPaymentVoucher): PrReceiptScan[] {
  const ids = new Set(pv.receiptIds ?? []);
  return scans.filter((s) => s.pvId === pv.id || ids.has(s.id));
}
