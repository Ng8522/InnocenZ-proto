import type { AgencyManagedPR } from "@/lib/agency-demo";
import type {
  AgencyCollectionInvoice,
  CollectionLineGroup,
  CollectionLineItem,
} from "@/lib/agency-demo";
import type { PrPaymentVoucher, PrReceiptScan } from "@/lib/pr-demo";
import { getPvNetTotal, pvStatusLabel, type PrPvStatus } from "@/lib/pr-demo";

function prNameMatchesAgency(scanName: string, pr: AgencyManagedPR): boolean {
  const sn = scanName.trim().toLowerCase();
  const full = pr.name.trim().toLowerCase();
  const first = full.split(/\s+/)[0] ?? "";
  return sn === full || sn === first || full.startsWith(sn);
}

export function receiptBelongsToAgencyPr(scan: PrReceiptScan, pr: AgencyManagedPR): boolean {
  if (scan.prId && pr.id === scan.prId) return true;
  return prNameMatchesAgency(scan.prName, pr);
}

/** Canonical PR name on agency payroll — IC match + Luna → Vicky migration. */
export function resolvePvPrName(
  pv: Pick<PrPaymentVoucher, "prName" | "prIc">,
  agencyPRs: AgencyManagedPR[] = [],
): string {
  if (pv.prIc) {
    const byIc = agencyPRs.find((p) => p.ic === pv.prIc);
    if (byIc?.name) return byIc.name;
  }
  const byName = agencyPRs.find((p) => prNameMatchesAgency(pv.prName, p));
  if (byName?.name) return byName.name;
  if (pv.prName === "Luna") return "Vicky";
  return pv.prName;
}

export function pvBelongsToAgencyPr(
  pv: Pick<PrPaymentVoucher, "prName" | "prIc">,
  agencyPRs: AgencyManagedPR[] = [],
): boolean {
  if (pv.prIc && agencyPRs.some((p) => p.ic === pv.prIc)) return true;
  return agencyPRs.some((p) => prNameMatchesAgency(pv.prName, p));
}

export function getAgencyManagedPvs(
  pvs: PrPaymentVoucher[],
  agencyPRs: AgencyManagedPR[] = [],
): PrPaymentVoucher[] {
  return pvs.filter((pv) => pvBelongsToAgencyPr(pv, agencyPRs));
}

export type AgencyToPayRow = {
  prName: string;
  outlet: string;
  prIc?: string;
  totalNet: number;
  pvCount: number;
};

/** Group signed PVs by PR — matches Payroll → To pay → Payment queue. */
export function buildAgencyToPayRows(
  pvs: PrPaymentVoucher[],
  agencyPRs: AgencyManagedPR[] = [],
): AgencyToPayRow[] {
  const byPr = new Map<string, { row: AgencyToPayRow; outlets: Set<string> }>();
  for (const pv of pvs) {
    const prName = resolvePvPrName(pv, agencyPRs);
    const existing = byPr.get(prName);
    if (existing) {
      existing.row.totalNet += getPvNetTotal(pv);
      existing.row.pvCount += 1;
      existing.outlets.add(pv.outlet);
    } else {
      byPr.set(prName, {
        row: {
          prName,
          outlet: pv.outlet,
          prIc: pv.prIc,
          totalNet: getPvNetTotal(pv),
          pvCount: 1,
        },
        outlets: new Set([pv.outlet]),
      });
    }
  }
  return [...byPr.values()]
    .map(({ row, outlets }) => ({
      ...row,
      outlet: outlets.size > 1 ? `Multi-outlet (${outlets.size})` : row.outlet,
    }))
    .sort((a, b) => b.totalNet - a.totalNet);
}

/** Signed PV net total — same figure as Payroll → To pay → Payment queue. */
export function agencyPrToPayTotal(
  pvs: PrPaymentVoucher[] = [],
  agencyPRs: AgencyManagedPR[] = [],
): number {
  return buildAgencyToPayRows(
    pvs.filter((pv) => pv.status === "SIGNED"),
    agencyPRs,
  ).reduce((sum, row) => sum + row.totalNet, 0);
}

export function agencyPrToPayCount(
  pvs: PrPaymentVoucher[] = [],
  agencyPRs: AgencyManagedPR[] = [],
): number {
  return buildAgencyToPayRows(
    pvs.filter((pv) => pv.status === "SIGNED"),
    agencyPRs,
  ).length;
}

export function resolvePvPrId(
  pv: Pick<PrPaymentVoucher, "prName" | "prIc">,
  agencyPRs: AgencyManagedPR[] = [],
): string | undefined {
  if (pv.prIc) {
    const byIc = agencyPRs.find((p) => p.ic === pv.prIc);
    if (byIc) return byIc.id;
  }
  return agencyPRs.find((p) => prNameMatchesAgency(pv.prName, p))?.id;
}

/** Agency payroll display labels — aligned with History / PV filter chips. */
export const AGENCY_PV_STATUS_LABELS: Record<PrPvStatus, string> = {
  PENDING_REVIEW: "Pending Agency Review",
  SENT: "Pending PR Review",
  SIGNED: "Signed",
  DISPUTED: "Disputed",
  PAID: "Paid",
};

export function agencyPvStatusLabel(status: PrPvStatus): string {
  return AGENCY_PV_STATUS_LABELS[status] ?? pvStatusLabel(status);
}

/** Receipt scans belonging to PRs on the agency roster (or linked agency PVs). */
export function getAgencyManagedReceiptScans(
  scans: PrReceiptScan[],
  agencyPRs: AgencyManagedPR[],
  pvs: PrPaymentVoucher[],
): PrReceiptScan[] {
  const agencyPvIds = new Set(
    pvs
      .filter((pv) => agencyPRs.some((pr) => prNameMatchesAgency(pv.prName, pr)))
      .map((pv) => pv.id),
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
  const filtered = persisted.filter((row) => row.kind !== "agency" || seedById[row.id]);
  const merged = filtered.map((row) => {
    const seed = seedById[row.id];
    if (!seed) return row;
    const isAgencySubscription =
      seed.kind === "agency" &&
      seed.lines?.some((l) => l.label.toLowerCase().includes("subscription"));
    if (isAgencySubscription) {
      return { ...seed, ...row, amount: seed.amount, lines: seed.lines };
    }
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
