import { Plus, Trash2 } from "lucide-react";
import { IzSelect } from "@/components/iz/ui";
import { type OutletPrTier, type OutletTierRateSettings } from "@/lib/agency-demo";
import {
  applyPayTierRowChange,
  isCommissionOnlyPayTier,
  newPostJobPayTierRow,
  POST_JOB_PAY_TIER_OPTIONS,
  postJobPayTierLabel,
  type PostJobPayTierId,
  type PostJobPayTierRow,
} from "@/lib/post-job-pay-tiers";
import { cn } from "@/lib/utils";
import {
  fieldShell,
  TIER_TABLE_GRID_BASE,
  TIER_TABLE_GRID_COLS,
  TIER_TABLE_GRID_COLS_WITH_ACTION,
  tierTableCell,
  tierTableEditableCell,
  tierTableHeadCell,
  tierTableReadonlyCell,
  TierCountInput,
  TierMoneyInput,
  TierPayInput,
  TierPctInput,
  TierRatesTableLegend,
} from "@/components/outlet/tier-rates-table-ui";

export function PostJobTierRatesEditor({
  rows,
  workspaceTierRates,
  onChange,
}: {
  rows: PostJobPayTierRow[];
  workspaceTierRates: Record<OutletPrTier, OutletTierRateSettings>;
  onChange: (rows: PostJobPayTierRow[]) => void;
}) {
  const usedTierIds = new Set(rows.map((row) => row.payTierId));
  const unusedTierIds = POST_JOB_PAY_TIER_OPTIONS.filter((o) => !usedTierIds.has(o.id)).map(
    (o) => o.id,
  );

  const patchRow = (id: string, patch: Partial<PostJobPayTierRow>) => {
    onChange(
      rows.map((row) =>
        row.id === id ? applyPayTierRowChange(row, patch, workspaceTierRates) : row,
      ),
    );
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
    onChange([...rows, newPostJobPayTierRow({ payTierId: nextId }, workspaceTierRates)]);
  };

  const showDeleteColumn = rows.length > 1;
  const tableGridCols = showDeleteColumn ? TIER_TABLE_GRID_COLS_WITH_ACTION : TIER_TABLE_GRID_COLS;

  return (
    <div className="space-y-2">
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="min-w-[680px] px-1">
          <div className="overflow-hidden rounded-xl border border-[var(--iz-line)]">
            <div
              className={cn(
                TIER_TABLE_GRID_BASE,
                tableGridCols,
                "border-b border-[var(--iz-line)] bg-[rgba(255,255,255,0.03)]",
              )}
            >
              <div className={tierTableHeadCell(undefined, true)}>Tier</div>
              <div className={tierTableHeadCell(undefined, true)}>Base salary</div>
              <div className={tierTableHeadCell(undefined, true)}>Target sales</div>
              <div className={tierTableHeadCell(undefined, true)}>Drinks & tips</div>
              <div className={tierTableHeadCell(undefined, true)}>PRs</div>
              {showDeleteColumn && <div className={tierTableHeadCell("border-r-0")} aria-hidden />}
            </div>
            {rows.map((row, rowIndex) => {
              const commissionOnly = isCommissionOnlyPayTier(row.payTierId);
              const rowOptions = POST_JOB_PAY_TIER_OPTIONS.filter(
                (o) => o.id === row.payTierId || !usedTierIds.has(o.id),
              );

              return (
                <div
                  key={row.id}
                  className={cn(
                    TIER_TABLE_GRID_BASE,
                    tableGridCols,
                    rowIndex < rows.length - 1 && "border-b border-[var(--iz-line)]",
                  )}
                >
                  <div
                    className={tierTableEditableCell("cursor-pointer")}
                    title="Tap to change tier"
                  >
                    <IzSelect
                      block
                      value={row.payTierId}
                      onChange={(e) => changeRowTier(row.id, e.target.value as PostJobPayTierId)}
                      className="!cursor-pointer !rounded-none !border-0 !bg-transparent !py-0 !text-xs !shadow-none"
                      aria-label={`Select ${postJobPayTierLabel(row.payTierId)}`}
                    >
                      {rowOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </IzSelect>
                  </div>
                  {commissionOnly ? (
                    <div
                      className={tierTableReadonlyCell()}
                      title="Commission only — no base salary"
                    >
                      <span className="text-xs font-medium">No base pay</span>
                    </div>
                  ) : (
                    <div className={tierTableEditableCell()} title="Tap to edit base salary">
                      <div className={fieldShell(undefined, true)}>
                        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
                        <TierPayInput
                          value={row.wagePerHour}
                          onChange={(wagePerHour) => patchRow(row.id, { wagePerHour })}
                        />
                      </div>
                    </div>
                  )}
                  <div className={tierTableEditableCell()} title="Tap to set target sales (optional)">
                    <div className={fieldShell(undefined, true)}>
                      <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
                      <TierMoneyInput
                        value={row.targetSalesRm}
                        placeholder="Optional"
                        onChange={(targetSalesRm) => patchRow(row.id, { targetSalesRm })}
                      />
                    </div>
                  </div>
                  <div className={tierTableEditableCell()} title="Tap to edit drinks and tips commission">
                    <div className={cn(fieldShell("w-full justify-between", true))}>
                      <div className="flex min-w-0 items-center gap-0.5">
                        <span className="text-[9px] text-[var(--iz-muted)]">Dr</span>
                        <TierPctInput
                          value={row.drinkPct}
                          onChange={(drinkPct) => patchRow(row.id, { drinkPct })}
                        />
                        <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-0.5">
                        <span className="text-[9px] text-[var(--iz-muted)]">Tip</span>
                        <TierPctInput
                          value={row.tipPct}
                          onChange={(tipPct) => patchRow(row.id, { tipPct })}
                        />
                        <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                      </div>
                    </div>
                  </div>
                  <div className={tierTableEditableCell("justify-center")} title="Tap to edit PR count">
                    <TierCountInput
                      value={row.prCount}
                      onChange={(prCount) => patchRow(row.id, { prCount })}
                    />
                  </div>
                  {showDeleteColumn && (
                    <div className={tierTableCell("justify-center !border-r-0 px-1")}>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="iz-chip flex h-8 w-8 items-center justify-center !p-0 text-[var(--iz-red)]"
                        aria-label={`Remove ${postJobPayTierLabel(row.payTierId)}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <TierRatesTableLegend />
          </div>
        </div>
      </div>
      {unusedTierIds.length > 0 && (
        <button type="button" onClick={addRow} className="iz-chip w-full justify-center text-[11px]">
          <Plus className="h-3.5 w-3.5" /> Add tier
        </button>
      )}
    </div>
  );
}
