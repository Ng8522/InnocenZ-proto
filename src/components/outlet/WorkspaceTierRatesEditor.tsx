import {
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import {
  postJobPayTierIdForOutletTier,
  postJobPayTierLabelForOutletTier,
  type CommissionOnlyRateSettings,
  type PostJobPayTierId,
  type ShiftTierStaffing,
} from "@/lib/post-job-pay-tiers";
import { cn } from "@/lib/utils";
import {
  fieldShell,
  TIER_TABLE_GRID_BASE,
  TIER_TABLE_GRID_COLS,
  TIER_TABLE_GRID_COLS_RATES_ONLY,
  TIER_TABLE_GRID_COLS_WITH_STAFFING,
  TIER_TABLE_GRID_COLS_WITH_STAFFING_RATES_ONLY,
  tierTableCell,
  tierTableEditableCell,
  tierTableHeadCell,
  tierTableReadonlyCell,
  TierHoursInput,
  TierMoneyInput,
  TierPayInput,
  TierPctInput,
  TierRatesTableLegend,
} from "@/components/outlet/tier-rates-table-ui";

export function WorkspaceTierRatesEditor({
  tierRates,
  commissionOnlyRates,
  onPatchTier,
  onPatchCommissionOnly,
  readOnly,
  tierStaffingByPayTier,
  hideTargetSales,
}: {
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  commissionOnlyRates: CommissionOnlyRateSettings;
  onPatchTier: (tier: OutletPrTier, patch: Partial<OutletTierRateSettings>) => void;
  onPatchCommissionOnly: (patch: Partial<CommissionOnlyRateSettings>) => void;
  readOnly?: boolean;
  /** When set, replaces OT-after column with requested / supplied per tier. */
  tierStaffingByPayTier?: Partial<Record<PostJobPayTierId, ShiftTierStaffing>>;
  /** Outlet/agency rate card — pay & commission only; targets are set per shift in post job. */
  hideTargetSales?: boolean;
}) {
  const defaultOtAfterHours =
    tierRates[OUTLET_BASE_TIER]?.otAfterHours ?? 6;
  const showTierStaffing = tierStaffingByPayTier != null;
  const gridCols = showTierStaffing
    ? hideTargetSales
      ? TIER_TABLE_GRID_COLS_WITH_STAFFING_RATES_ONLY
      : TIER_TABLE_GRID_COLS_WITH_STAFFING
    : hideTargetSales
      ? TIER_TABLE_GRID_COLS_RATES_ONLY
      : TIER_TABLE_GRID_COLS;

  const staffingCell = (payTierId: PostJobPayTierId, kind: "demand" | "supplied") => {
    const staffing = tierStaffingByPayTier?.[payTierId];
    const value = kind === "demand" ? (staffing?.demand ?? 0) : (staffing?.supplied ?? 0);
    return (
      <div
        className={tierTableCell(
          cn(
            "justify-center tabular-nums bg-black/15",
            kind === "supplied" ? "text-[var(--iz-green)]" : "text-[var(--iz-muted)]",
          ),
        )}
      >
        <span className="text-xs font-medium">{value}</span>
      </div>
    );
  };

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className={cn("px-1", showTierStaffing ? "min-w-[720px]" : hideTargetSales ? "min-w-[520px]" : "min-w-[680px]")}>
        <div className="overflow-hidden rounded-xl border border-[var(--iz-line)]">
          <div
            className={cn(
              TIER_TABLE_GRID_BASE,
              gridCols,
              "border-b border-[var(--iz-line)] bg-[rgba(255,255,255,0.03)]",
            )}
          >
            <div className={tierTableHeadCell(undefined, true)}>Tier</div>
            <div className={tierTableHeadCell(undefined, true)}>Pay per shift</div>
            {!hideTargetSales && (
              <div className={tierTableHeadCell(undefined, true)}>Target sales</div>
            )}
            <div className={tierTableHeadCell(undefined, true)}>Drinks & tips</div>
            {showTierStaffing ? (
              <>
                <div className={tierTableHeadCell("text-center", true)}>Requested</div>
                <div className={tierTableHeadCell("text-center", true)}>Supplied</div>
              </>
            ) : (
              <div className={tierTableHeadCell("text-center", true)}>OT after</div>
            )}
          </div>
          {OUTLET_PR_TIERS.map((tier) => {
            const rates = tierRates[tier];
            return (
              <div
                key={tier}
                className={cn(
                  TIER_TABLE_GRID_BASE,
                  gridCols,
                  "border-b border-[var(--iz-line)]",
                )}
              >
                <div className={tierTableCell()} title={tier}>
                  <span className="text-xs font-semibold text-[var(--iz-txt)]">
                    {postJobPayTierLabelForOutletTier(tier)}
                  </span>
                </div>
                <div
                  className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
                  title={readOnly ? undefined : "Tap to edit pay per shift"}
                >
                  <div className={fieldShell(undefined, true)}>
                    <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
                    <TierPayInput
                      value={rates.wagePerHour}
                      disabled={readOnly}
                      onChange={(wagePerHour) => onPatchTier(tier, { wagePerHour })}
                    />
                  </div>
                </div>
                {!hideTargetSales && (
                  <div
                    className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
                    title={readOnly ? undefined : "Tap to set target sales (optional)"}
                  >
                    <div className={fieldShell(undefined, true)}>
                      <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
                      <TierMoneyInput
                        value={rates.targetSalesRm}
                        placeholder="Optional"
                        disabled={readOnly}
                        onChange={(targetSalesRm) => onPatchTier(tier, { targetSalesRm })}
                      />
                    </div>
                  </div>
                )}
                <div
                  className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
                  title={readOnly ? undefined : "Tap to edit drinks and tips commission"}
                >
                  <div className={cn(fieldShell("w-full justify-between", true))}>
                    <div className="flex min-w-0 items-center gap-0.5">
                      <span className="text-[9px] text-[var(--iz-muted)]">Dr</span>
                      <TierPctInput
                        value={rates.drinkPct}
                        disabled={readOnly}
                        onChange={(drinkPct) => onPatchTier(tier, { drinkPct })}
                      />
                      <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-0.5">
                      <span className="text-[9px] text-[var(--iz-muted)]">Tip</span>
                      <TierPctInput
                        value={rates.tipPct}
                        disabled={readOnly}
                        onChange={(tipPct) => onPatchTier(tier, { tipPct })}
                      />
                      <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                    </div>
                  </div>
                </div>
                {showTierStaffing ? (
                  <>
                    {staffingCell(postJobPayTierIdForOutletTier(tier), "demand")}
                    {staffingCell(postJobPayTierIdForOutletTier(tier), "supplied")}
                  </>
                ) : (
                  <div
                    className={
                      readOnly
                        ? tierTableCell("justify-center bg-black/15 text-[var(--iz-muted)]")
                        : tierTableEditableCell("justify-center")
                    }
                    title={readOnly ? undefined : "Tap to edit OT threshold"}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <TierHoursInput
                        value={rates.otAfterHours ?? defaultOtAfterHours}
                        disabled={readOnly}
                        compact
                        onChange={(otAfterHours) => onPatchTier(tier, { otAfterHours })}
                      />
                      <span className="text-[9px] text-[var(--iz-muted)]">hrs</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className={cn(TIER_TABLE_GRID_BASE, gridCols)}>
            <div className={tierTableCell()} title="Commission only">
              <span className="text-xs font-semibold text-[var(--iz-txt)]">Commission only</span>
            </div>
            <div className={tierTableReadonlyCell()} title="Commission only — no shift pay">
              <span className="text-xs font-medium text-[var(--iz-muted)]">No shift pay</span>
            </div>
            {!hideTargetSales && (
              <div
                className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
                title={readOnly ? undefined : "Tap to set target sales (optional)"}
              >
                <div className={fieldShell(undefined, true)}>
                  <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
                  <TierMoneyInput
                    value={commissionOnlyRates.targetSalesRm}
                    placeholder="Optional"
                    disabled={readOnly}
                    onChange={(targetSalesRm) => onPatchCommissionOnly({ targetSalesRm })}
                  />
                </div>
              </div>
            )}
            <div
              className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
              title={readOnly ? undefined : "Tap to edit drinks and tips commission"}
            >
              <div className={cn(fieldShell("w-full justify-between", true))}>
                <div className="flex min-w-0 items-center gap-0.5">
                  <span className="text-[9px] text-[var(--iz-muted)]">Dr</span>
                  <TierPctInput
                    value={commissionOnlyRates.drinkPct}
                    disabled={readOnly}
                    onChange={(drinkPct) => onPatchCommissionOnly({ drinkPct })}
                  />
                  <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                </div>
                <div className="flex min-w-0 items-center gap-0.5">
                  <span className="text-[9px] text-[var(--iz-muted)]">Tip</span>
                  <TierPctInput
                    value={commissionOnlyRates.tipPct}
                    disabled={readOnly}
                    onChange={(tipPct) => onPatchCommissionOnly({ tipPct })}
                  />
                  <span className="text-[9px] text-[var(--iz-muted)]">%</span>
                </div>
              </div>
            </div>
            {showTierStaffing ? (
              <>
                {staffingCell("commission_only", "demand")}
                {staffingCell("commission_only", "supplied")}
              </>
            ) : (
              <div className={tierTableReadonlyCell("justify-center")} title="Not applicable">
                <span className="text-xs text-[var(--iz-muted)]">—</span>
              </div>
            )}
          </div>
          {!readOnly && <TierRatesTableLegend />}
        </div>
      </div>
    </div>
  );
}
