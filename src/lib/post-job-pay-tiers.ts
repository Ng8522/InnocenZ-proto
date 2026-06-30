import {
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  snapTierWage,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";

export const POST_JOB_PAY_TIER_OPTIONS = [
  { id: "tier_1", label: "Tier 1", outletTier: "Tier I" as OutletPrTier },
  { id: "tier_2", label: "Tier 2", outletTier: "Tier II" as OutletPrTier },
  { id: "tier_3", label: "Tier 3", outletTier: "Tier III" as OutletPrTier },
  { id: "tier_4", label: "Tier 4", outletTier: "Tier IV" as OutletPrTier },
  { id: "tier_5", label: "Tier 5", outletTier: "Tier V" as OutletPrTier },
  { id: "commission_only", label: "Commission only", outletTier: null },
] as const;

export type PostJobPayTierId = (typeof POST_JOB_PAY_TIER_OPTIONS)[number]["id"];

export type PostJobPayTierRow = {
  id: string;
  payTierId: PostJobPayTierId;
  wagePerHour: number;
  targetSalesRm?: number;
  drinkPct: number;
  tipPct: number;
  prCount: number;
};

export const COMMISSION_ONLY_DEFAULT_DRINK_PCT = 14;
export const COMMISSION_ONLY_DEFAULT_TIP_PCT = 28;

export function isCommissionOnlyPayTier(payTierId: PostJobPayTierId): boolean {
  return payTierId === "commission_only";
}

export function postJobPayTierLabel(payTierId: PostJobPayTierId): string {
  return POST_JOB_PAY_TIER_OPTIONS.find((o) => o.id === payTierId)?.label ?? payTierId;
}

export function postJobPayTierLabelForOutletTier(tier: OutletPrTier): string {
  return POST_JOB_PAY_TIER_OPTIONS.find((o) => o.outletTier === tier)?.label ?? tier;
}

export function outletTierForPostJobPayTier(payTierId: PostJobPayTierId): OutletPrTier | null {
  return POST_JOB_PAY_TIER_OPTIONS.find((o) => o.id === payTierId)?.outletTier ?? null;
}

export function newPostJobPayTierRow(
  partial?: Partial<Omit<PostJobPayTierRow, "id">>,
  workspaceTierRates?: Record<OutletPrTier, OutletTierRateSettings>,
): PostJobPayTierRow {
  const payTierId = partial?.payTierId ?? "tier_1";
  const outletTier = outletTierForPostJobPayTier(payTierId);
  const ws = outletTier && workspaceTierRates ? workspaceTierRates[outletTier] : undefined;
  const commissionOnly = isCommissionOnlyPayTier(payTierId);

  return {
    id: `pay-tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    payTierId,
    wagePerHour: commissionOnly ? 0 : snapTierWage(partial?.wagePerHour ?? ws?.wagePerHour ?? 50),
    targetSalesRm: partial?.targetSalesRm,
    drinkPct: partial?.drinkPct ?? (commissionOnly ? COMMISSION_ONLY_DEFAULT_DRINK_PCT : ws?.drinkPct ?? 8),
    tipPct: partial?.tipPct ?? (commissionOnly ? COMMISSION_ONLY_DEFAULT_TIP_PCT : ws?.tipPct ?? 15),
    prCount: Math.max(1, partial?.prCount ?? 1),
  };
}

export function defaultPostJobPayTierRows(
  workspaceTierRates: Record<OutletPrTier, OutletTierRateSettings>,
  quantity = 6,
): PostJobPayTierRow[] {
  return [
    newPostJobPayTierRow(
      { payTierId: "tier_1", prCount: quantity },
      workspaceTierRates,
    ),
  ];
}

export function payTierRowsFromLegacy(
  payTierIds: OutletPrTier[] | undefined,
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  quantity: number,
): PostJobPayTierRow[] {
  if (!payTierIds?.length) {
    return defaultPostJobPayTierRows(tierRates, quantity);
  }
  const perTier = Math.max(1, Math.floor(quantity / payTierIds.length));
  return payTierIds.map((outletTier) => {
    const option = POST_JOB_PAY_TIER_OPTIONS.find((o) => o.outletTier === outletTier);
    const rates = tierRates[outletTier];
    return newPostJobPayTierRow(
      {
        payTierId: option?.id ?? "tier_1",
        wagePerHour: rates.wagePerHour,
        targetSalesRm: rates.targetSalesRm,
        drinkPct: rates.drinkPct,
        tipPct: rates.tipPct,
        prCount: perTier,
      },
      tierRates,
    );
  });
}

export function clonePostJobPayTierRow(row: PostJobPayTierRow): PostJobPayTierRow {
  return { ...row };
}

export function totalPrCountFromPayTierRows(rows?: PostJobPayTierRow[]): number {
  return (rows ?? []).reduce((sum, row) => sum + row.prCount, 0);
}

export function workspaceTierRatesSignature(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): string {
  return OUTLET_PR_TIERS.map((tier) => {
    const r = tierRates[tier];
    return `${tier}:${r.wagePerHour},${r.drinkPct},${r.tipPct},${r.targetSalesRm ?? ""},${r.otAfterHours}`;
  }).join("|");
}

/** Pull latest workspace wage, commission, and sales targets into post-job pay rows (keeps tier + PR count). */
export function syncPayTierRowsFromWorkspace(
  rows: PostJobPayTierRow[],
  workspaceTierRates: Record<OutletPrTier, OutletTierRateSettings>,
): PostJobPayTierRow[] {
  return rows.map((row) => {
    const outletTier = outletTierForPostJobPayTier(row.payTierId);
    if (!outletTier) return row;
    const ws = workspaceTierRates[outletTier];
    return {
      ...row,
      wagePerHour: snapTierWage(ws.wagePerHour),
      drinkPct: ws.drinkPct,
      tipPct: ws.tipPct,
      targetSalesRm: ws.targetSalesRm,
    };
  });
}

export function syncTierRatesFromPayTierRows(
  rows: PostJobPayTierRow[],
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
): Record<OutletPrTier, OutletTierRateSettings> {
  const next = { ...tierRates };
  for (const tier of OUTLET_PR_TIERS) {
    next[tier] = { ...next[tier] };
  }
  for (const row of rows) {
    const outletTier = outletTierForPostJobPayTier(row.payTierId);
    if (!outletTier) continue;
    next[outletTier] = {
      ...next[outletTier],
      wagePerHour: row.wagePerHour,
      drinkPct: row.drinkPct,
      tipPct: row.tipPct,
      targetSalesRm: row.targetSalesRm,
    };
  }
  return next;
}

export function applyPayTierRowChange(
  row: PostJobPayTierRow,
  patch: Partial<PostJobPayTierRow>,
  workspaceTierRates: Record<OutletPrTier, OutletTierRateSettings>,
): PostJobPayTierRow {
  const nextPayTierId = patch.payTierId ?? row.payTierId;
  const switchingTier = patch.payTierId != null && patch.payTierId !== row.payTierId;
  const commissionOnly = isCommissionOnlyPayTier(nextPayTierId);
  const outletTier = outletTierForPostJobPayTier(nextPayTierId);
  const ws = outletTier ? workspaceTierRates[outletTier] : undefined;

  let next: PostJobPayTierRow = { ...row, ...patch, payTierId: nextPayTierId };

  if (switchingTier) {
    next = {
      ...next,
      wagePerHour: commissionOnly ? 0 : snapTierWage(ws?.wagePerHour ?? 50),
      drinkPct: commissionOnly ? COMMISSION_ONLY_DEFAULT_DRINK_PCT : ws?.drinkPct ?? 8,
      tipPct: commissionOnly ? COMMISSION_ONLY_DEFAULT_TIP_PCT : ws?.tipPct ?? 15,
      targetSalesRm: ws?.targetSalesRm,
    };
  }

  if (commissionOnly && patch.wagePerHour == null && !switchingTier) {
    next.wagePerHour = 0;
  }

  if (patch.wagePerHour != null && !commissionOnly) {
    next.wagePerHour = snapTierWage(patch.wagePerHour);
  }

  if (patch.prCount != null) {
    next.prCount = Math.max(1, patch.prCount);
  }

  return next;
}

export function formatPayTierRowSummary(row: PostJobPayTierRow): string {
  const parts = [
    postJobPayTierLabel(row.payTierId),
    isCommissionOnlyPayTier(row.payTierId)
      ? "No base pay"
      : `RM ${row.wagePerHour}/hr`,
    `${row.drinkPct}% drinks · ${row.tipPct}% tips`,
    row.targetSalesRm ? `Target RM ${row.targetSalesRm}` : null,
    `${row.prCount} PR${row.prCount === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function estimatePayTierRowsLaborCost(
  rows: PostJobPayTierRow[],
  shiftTime: string,
): number {
  const p = shiftTime.replace(/—/g, "-").split(/\s*-\s*/);
  if (p.length < 2) return 0;
  const parseHm = (s: string) => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  const start = parseHm(p[0]);
  let end = parseHm(p[1]);
  let duration = end - start;
  if (duration <= 0) duration += 24 * 60;
  const hours = Math.max(1, Math.round(duration / 60));
  return rows.reduce((sum, row) => sum + row.wagePerHour * hours * row.prCount, 0);
}

export function basePayFromPayTierRows(rows?: PostJobPayTierRow[]): number {
  if (!rows?.length) return 0;
  const tier1 = rows.find((r) => r.payTierId === "tier_1");
  if (tier1) return tier1.wagePerHour;
  const firstPaid = rows.find((r) => !isCommissionOnlyPayTier(r.payTierId));
  return firstPaid?.wagePerHour ?? rows[0]?.wagePerHour ?? 0;
}
