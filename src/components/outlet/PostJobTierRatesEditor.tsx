import type { ReactNode } from "react";
import { Award, Crown, Medal, Plus, Star, Trash2 } from "lucide-react";
import { IzSelect } from "@/components/iz/ui";
import { type OutletPrTier, type OutletTierRateSettings } from "@/lib/agency-demo";
import {
  applyPayTierRowChange,
  isCommissionOnlyPayTier,
  newPostJobPayTierRow,
  POST_JOB_PAY_TIER_OPTIONS,
  outletTierForPostJobPayTier,
  postJobPayTierLabel,
  totalPrCountFromPayTierRows,
  type PostJobPayTierId,
  type PostJobPayTierRow,
  clampPayTierRowsToMax,
  type CommissionOnlyRateSettings,
} from "@/lib/post-job-pay-tiers";
import { cn } from "@/lib/utils";
import { TierCountInput, TierPayInput } from "@/components/outlet/tier-rates-table-ui";

const TIER_COLUMN_ICONS = [Star, Medal, Award, Award, Crown] as const;

function tierColumnRank(payTierId: PostJobPayTierId): number {
  const idx = POST_JOB_PAY_TIER_OPTIONS.findIndex((o) => o.id === payTierId);
  return idx >= 0 && idx < 5 ? idx : 0;
}

function formatCommissionHint(row: PostJobPayTierRow): string {
  if (isCommissionOnlyPayTier(row.payTierId)) return "+ drinks & tips";
  const parts: string[] = [];
  if (row.drinkPct > 0) parts.push("drinks");
  if (row.tipPct > 0) parts.push("tips");
  if (parts.length === 0) return "—";
  if (parts.length === 1) return `+ ${parts[0]}`;
  return `+ ${parts.join(" & ")}`;
}

export function PostJobTierRatesEditor({
  rows,
  workspaceTierRates,
  commissionOnlyRates,
  maxPrTotal,
  onChange,
  planHint,
}: {
  rows: PostJobPayTierRow[];
  workspaceTierRates: Record<OutletPrTier, OutletTierRateSettings>;
  commissionOnlyRates?: CommissionOnlyRateSettings;
  /** Max total PRs across all tier rows (people needed). */
  maxPrTotal?: number;
  onChange: (rows: PostJobPayTierRow[]) => void;
  planHint?: ReactNode;
}) {
  const usedTierIds = new Set(rows.map((row) => row.payTierId));
  const unusedTierIds = POST_JOB_PAY_TIER_OPTIONS.filter((o) => !usedTierIds.has(o.id)).map(
    (o) => o.id,
  );
  const allocatedTotal = totalPrCountFromPayTierRows(rows);

  const sortedRows = [...rows].sort(
    (a, b) => tierColumnRank(a.payTierId) - tierColumnRank(b.payTierId),
  );

  const patchRow = (id: string, patch: Partial<PostJobPayTierRow>) => {
    let nextRows = rows.map((row) =>
      row.id === id ? applyPayTierRowChange(row, patch, workspaceTierRates, commissionOnlyRates) : row,
    );
    if (maxPrTotal != null && patch.prCount != null) {
      nextRows = clampPayTierRowsToMax(nextRows, maxPrTotal, id);
    }
    onChange(nextRows);
  };

  const changeRowTier = (id: string, payTierId: PostJobPayTierId) => {
    if (rows.some((row) => row.id !== id && row.payTierId === payTierId)) return;
    patchRow(id, { payTierId });
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((row) => row.id !== id));
  };

  const addRow = () => {
    const nextId = unusedTierIds[0];
    if (!nextId) return;
    const remaining =
      maxPrTotal != null ? Math.max(0, maxPrTotal - totalPrCountFromPayTierRows(rows)) : 1;
    const initialPrCount =
      maxPrTotal != null ? (remaining > 0 ? Math.min(1, remaining) : 0) : 1;
    onChange([
      ...rows,
      newPostJobPayTierRow({ payTierId: nextId, prCount: initialPrCount }, workspaceTierRates, commissionOnlyRates),
    ]);
  };

  const rowLabels = ["Base / hr", "Commission", "PR count"] as const;

  return (
    <div className="space-y-2">
      {maxPrTotal != null && maxPrTotal > 0 && (
        <p className="text-[10px] text-[var(--iz-muted)]">
          {allocatedTotal} of {maxPrTotal} PR{maxPrTotal === 1 ? "" : "s"} allocated across tiers
        </p>
      )}
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="min-w-[520px] px-1">
          <div
            className="iz-post-job-tier-grid"
            style={{
              gridTemplateColumns: `minmax(4.5rem, 5.5rem) repeat(${sortedRows.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="iz-post-job-tier-grid__corner" aria-hidden />
            {sortedRows.map((row) => {
              const rank = tierColumnRank(row.payTierId);
              const Icon = TIER_COLUMN_ICONS[rank];
              const tierLabel =
                outletTierForPostJobPayTier(row.payTierId) ?? postJobPayTierLabel(row.payTierId);
              const rowOptions = POST_JOB_PAY_TIER_OPTIONS.filter(
                (o) => o.id === row.payTierId || !usedTierIds.has(o.id),
              );

              return (
                <div key={`head-${row.id}`} className="iz-post-job-tier-col-head">
                  <span
                    className={cn(
                      "iz-post-job-tier-col-head__icon",
                      `iz-post-job-tier-col-head__icon--${rank + 1}`,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="iz-post-job-tier-col-head__select">
                    <IzSelect
                      block
                      value={row.payTierId}
                      onChange={(e) => changeRowTier(row.id, e.target.value as PostJobPayTierId)}
                      className="!cursor-pointer !rounded-md !border-0 !bg-transparent !py-0 !text-center !text-[11px] !font-bold !text-[var(--iz-gold-l)] !shadow-none"
                      aria-label={`Select ${tierLabel}`}
                    >
                      {rowOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {outletTierForPostJobPayTier(option.id) ?? option.label}
                        </option>
                      ))}
                    </IzSelect>
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="iz-post-job-tier-col-head__remove"
                      aria-label={`Remove ${tierLabel}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {rowLabels.map((label, labelIndex) => (
              <div key={label} className="contents">
                <div className="iz-post-job-tier-grid__row-label">{label}</div>
                {sortedRows.map((row) => {
                  const commissionOnly = isCommissionOnlyPayTier(row.payTierId);
                  const allocatedOthers = rows
                    .filter((r) => r.id !== row.id)
                    .reduce((sum, r) => sum + r.prCount, 0);
                  const rowMax =
                    maxPrTotal != null ? Math.max(0, maxPrTotal - allocatedOthers) : undefined;

                  if (labelIndex === 0) {
                    return (
                      <div
                        key={`${row.id}-pay`}
                        className="iz-post-job-tier-pay-cell"
                        title="Tap to edit base pay"
                      >
                        {commissionOnly ? (
                          <span className="text-xs font-medium text-[var(--iz-muted)]">No base</span>
                        ) : (
                          <>
                            <span className="text-[10px] font-semibold text-[var(--iz-muted)]">RM</span>
                            <TierPayInput
                              value={row.wagePerHour}
                              onChange={(wagePerHour) => patchRow(row.id, { wagePerHour })}
                            />
                          </>
                        )}
                      </div>
                    );
                  }

                  if (labelIndex === 1) {
                    const hint = formatCommissionHint(row);
                    return (
                      <div
                        key={`${row.id}-comm`}
                        className={cn(
                          "iz-post-job-tier-comm-cell",
                          hint === "—" && "iz-post-job-tier-comm-cell--none",
                        )}
                      >
                        {hint}
                      </div>
                    );
                  }

                  return (
                    <div key={`${row.id}-count`} className="iz-post-job-tier-count-cell">
                      <TierCountInput
                        value={row.prCount}
                        onChange={(prCount) => patchRow(row.id, { prCount })}
                        max={rowMax}
                        disabled={maxPrTotal === 0}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {planHint && <p className="iz-post-job-tier-plan-hint">{planHint}</p>}

      {unusedTierIds.length > 0 && (
        <div className="iz-post-job-tier-footer">
          <button type="button" onClick={addRow} className="iz-chip w-full justify-center text-[11px]">
            <Plus className="h-3.5 w-3.5" /> Add tier
          </button>
        </div>
      )}
    </div>
  );
}
