import {
  OUTLET_PR_TIERS,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { postJobPayTierLabelForOutletTier } from "@/lib/post-job-pay-tiers";
import { cn } from "@/lib/utils";
import {
  fieldShell,
  TIER_TABLE_GRID_BASE,
  TIER_TABLE_GRID_COLS,
  tierTableCell,
  tierTableEditableCell,
  tierTableHeadCell,
  TierHoursInput,
  TierMoneyInput,
  TierPayInput,
  TierPctInput,
  TierRatesTableLegend,
} from "@/components/outlet/tier-rates-table-ui";

export function WorkspaceTierRatesEditor({
  tierRates,
  onPatchTier,
  readOnly,
}: {
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  onPatchTier: (tier: OutletPrTier, patch: Partial<OutletTierRateSettings>) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="min-w-[680px] px-1">
        <div className="overflow-hidden rounded-xl border border-[var(--iz-line)]">
          <div
            className={cn(
              TIER_TABLE_GRID_BASE,
              TIER_TABLE_GRID_COLS,
              "border-b border-[var(--iz-line)] bg-[rgba(255,255,255,0.03)]",
            )}
          >
            <div className={tierTableHeadCell(undefined, true)}>Tier</div>
            <div className={tierTableHeadCell(undefined, true)}>Base salary</div>
            <div className={tierTableHeadCell(undefined, true)}>Target sales</div>
            <div className={tierTableHeadCell(undefined, true)}>Drinks & tips</div>
            <div className={tierTableHeadCell(undefined, true)}>OT after</div>
          </div>
          {OUTLET_PR_TIERS.map((tier, rowIndex) => {
            const rates = tierRates[tier];
            return (
              <div
                key={tier}
                className={cn(
                  TIER_TABLE_GRID_BASE,
                  TIER_TABLE_GRID_COLS,
                  rowIndex < OUTLET_PR_TIERS.length - 1 && "border-b border-[var(--iz-line)]",
                )}
              >
                <div className={tierTableCell()} title={tier}>
                  <span className="text-xs font-semibold text-[var(--iz-txt)]">
                    {postJobPayTierLabelForOutletTier(tier)}
                  </span>
                </div>
                <div
                  className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell()}
                  title={readOnly ? undefined : "Tap to edit base salary"}
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
                <div
                  className={readOnly ? tierTableCell("bg-black/15 text-[var(--iz-muted)]") : tierTableEditableCell("justify-center")}
                  title={readOnly ? undefined : "Tap to edit OT threshold"}
                >
                  <div className={fieldShell("justify-center", true)}>
                    <TierHoursInput
                      value={rates.otAfterHours}
                      disabled={readOnly}
                      onChange={(otAfterHours) => onPatchTier(tier, { otAfterHours })}
                    />
                    <span className="text-[9px] text-[var(--iz-muted)]">hrs</span>
                  </div>
                </div>
              </div>
            );
          })}
          <TierRatesTableLegend />
        </div>
      </div>
    </div>
  );
}
