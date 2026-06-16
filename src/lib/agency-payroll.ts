import type { AgencyManagedPR } from "@/lib/agency-demo";
import type {
  AgencyCollectionInvoice,
  CollectionLineGroup,
  CollectionLineItem,
} from "@/lib/agency-demo";
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

function inferCollectionLineGroup(label: string): CollectionLineGroup {
  const d = label.toLowerCase();
  if (d.includes("wage") || d.includes("payroll") || d.includes("overtime") || d.includes(" ot")) {
    return "payroll";
  }
  if (d.includes("drink") || d.includes("tip") || d.includes("table") || d.includes("commission")) {
    return "commissions";
  }
  return "fees";
}

function pvRowToCollectionLine(
  row: { desc: string; amt: number },
  pv: PrPaymentVoucher,
): CollectionLineItem {
  return {
    label: row.desc,
    detail: `${pv.prName} · ${pv.id}`,
    amount: row.amt,
    group: inferCollectionLineGroup(row.desc),
  };
}

/** Line items owed — invoice breakdown or derived from linked PV rows */
export function collectionOwedLines(
  invoice: AgencyCollectionInvoice,
  pvs: PrPaymentVoucher[],
): CollectionLineItem[] {
  if (invoice.lines?.length) {
    return invoice.lines
      .filter((l) => l.amount > 0)
      .map((l) => ({ ...l, group: l.group ?? inferCollectionLineGroup(l.label) }));
  }
  const linked = invoice.linkedPvIds
    .map((id) => pvs.find((p) => p.id === id))
    .filter((p): p is PrPaymentVoucher => Boolean(p));
  if (linked.length) {
    return linked.flatMap((pv) => pv.rows.map((row) => pvRowToCollectionLine(row, pv)));
  }
  return [
    {
      label: "Agency payroll & fees",
      detail: invoice.id,
      amount: invoice.amount,
      group: "fees",
    },
  ];
}

export const COLLECTION_LINE_GROUPS: CollectionLineGroup[] = ["payroll", "commissions", "fees"];

export const COLLECTION_GROUP_LABELS: Record<CollectionLineGroup, string> = {
  payroll: "Payroll",
  commissions: "Commissions",
  fees: "Fees & platform",
};

export function groupCollectionLines(lines: CollectionLineItem[]) {
  return COLLECTION_LINE_GROUPS.map((group) => {
    const items = lines.filter((l) => (l.group ?? inferCollectionLineGroup(l.label)) === group);
    return {
      group,
      label: COLLECTION_GROUP_LABELS[group],
      lines: items,
      subtotal: items.reduce((s, l) => s + l.amount, 0),
    };
  }).filter((g) => g.lines.length > 0);
}

export function mergeAgencyCollections(
  persisted: AgencyCollectionInvoice[] | undefined,
  seeds: AgencyCollectionInvoice[],
): AgencyCollectionInvoice[] {
  if (!persisted?.length) return seeds;
  const seedById = Object.fromEntries(seeds.map((s) => [s.id, s]));
  const merged = persisted.map((row) => {
    const seed = seedById[row.id];
    if (!seed) return row;
    return {
      ...seed,
      ...row,
      lines: row.lines?.length ? row.lines : seed.lines,
      linkedPvIds: seed.linkedPvIds?.length ? seed.linkedPvIds : row.linkedPvIds,
    };
  });
  const ids = new Set(merged.map((m) => m.id));
  return [...merged, ...seeds.filter((s) => !ids.has(s.id))];
}
