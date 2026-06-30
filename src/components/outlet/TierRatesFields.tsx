import { useEffect, useState } from "react";
import {
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { TierRatePill } from "@/components/outlet/ShiftTierWagesStrip";
import { cn } from "@/lib/utils";

function NumField({
  label,
  value,
  onChange,
  suffix,
  readOnly,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange?: (n: number) => void;
  suffix?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (!onChange) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n)) onChange(n);
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
        {suffix === "RM" && <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => !readOnly && setText(e.target.value.replace(/[^\d.:]/g, ""))}
          onBlur={commit}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[var(--iz-muted)]"
        />
        {suffix && suffix !== "RM" && <span className="text-[11px] text-[var(--iz-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function OptionalNumField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange?: (n: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value != null && value > 0 ? String(value) : "");

  useEffect(() => {
    setText(value != null && value > 0 ? String(value) : "");
  }, [value]);

  const commit = () => {
    if (!onChange) return;
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(undefined);
      return;
    }
    const n = parseFloat(trimmed.replace(/,/g, ""));
    if (!Number.isNaN(n) && n > 0) onChange(Math.round(n));
    else {
      setText("");
      onChange(undefined);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
        {suffix === "RM" && <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value.replace(/[^\d.:]/g, ""))}
          onBlur={commit}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[var(--iz-muted)]"
        />
        {suffix && suffix !== "RM" && <span className="text-[11px] text-[var(--iz-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

export function TierRatesFields({
  tierRates,
  activeTier,
  onActiveTierChange,
  onPatchTier,
  readOnly,
  hint,
  wageOnly,
  postJob,
  hideTablePct,
  tierMultipliers,
}: {
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  activeTier: OutletPrTier;
  onActiveTierChange: (tier: OutletPrTier) => void;
  onPatchTier: (tier: OutletPrTier, patch: Partial<OutletTierRateSettings>) => void;
  readOnly?: boolean;
  hint?: string;
  /** Hide OT and commission % — wage per tier only */
  wageOnly?: boolean;
  /** Post Job: multiplier-scaled pay + optional sales targets per tier */
  postJob?: boolean;
  /** Outlet workspace: hide table commission % */
  hideTablePct?: boolean;
  tierMultipliers?: Record<OutletPrTier, number>;
}) {
  const activeRates = tierRates[activeTier];
  const isBase = activeTier === OUTLET_BASE_TIER;
  const payReadOnly = readOnly || (postJob && !isBase);

  return (
    <div>
      <div className="grid grid-cols-5 items-stretch gap-px">
        {OUTLET_PR_TIERS.map((tier) => {
          const on = activeTier === tier;
          const wage = tierRates[tier].wagePerHour;
          const salesTarget = tierRates[tier].targetSalesRm;
          const mult = tierMultipliers?.[tier];
          return (
            <TierRatePill
              key={tier}
              tier={tier}
              wage={wage}
              salesTarget={salesTarget}
              active={on}
              multiplier={postJob ? mult : undefined}
              onClick={() => onActiveTierChange(tier)}
            />
          );
        })}
      </div>
      <div className="mt-3 border-t border-[var(--iz-line)] pt-3">
        <p className="iz-tiny iz-muted2 mb-2">
          {hint ??
            (postJob ? (
              <>
                {isBase ? (
                  <>Base pay per shift scales other tiers via multiplier</>
                ) : (
                  <>
                    Pay per shift for{" "}
                    <span className="text-[var(--iz-gold-l)]">{activeTier}</span>
                    {" · "}
                    {tierMultipliers?.[activeTier]}× base
                  </>
                )}
                {" · "}optional sales target below
              </>
            ) : wageOnly ? (
              <>
                Target pay per shift for{" "}
                <span className="text-[var(--iz-gold-l)]">{activeTier}</span>
              </>
            ) : (
              <>
                Applied when a PR&apos;s training tier is{" "}
                <span className="text-[var(--iz-gold-l)]">{activeTier}</span>
              </>
            ))}
        </p>
        <div className={postJob || wageOnly ? "space-y-2" : "flex gap-3"}>
          <NumField
            label={postJob && isBase ? "Base pay per shift" : "Pay per shift"}
            value={activeRates.wagePerHour}
            suffix="RM"
            readOnly={payReadOnly}
            onChange={payReadOnly ? undefined : (n) => onPatchTier(activeTier, { wagePerHour: n })}
          />
          {postJob && (
            <OptionalNumField
              label="Target sales (floor)"
              value={activeRates.targetSalesRm}
              suffix="RM"
              placeholder="Optional"
              onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { targetSalesRm: n })}
            />
          )}
          {!wageOnly && !postJob && (
            <OptionalNumField
              label="Target sales (floor)"
              value={activeRates.targetSalesRm}
              suffix="RM"
              placeholder="Set floor target"
              onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { targetSalesRm: n })}
            />
          )}
          {!wageOnly && !postJob && (
            <NumField
              label="OT after"
              value={activeRates.otAfterHours}
              suffix="hrs"
              readOnly={readOnly}
              onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { otAfterHours: n })}
            />
          )}
        </div>
        {!wageOnly && !postJob && (
          <div className={cn("mt-2 grid gap-2", hideTablePct ? "grid-cols-2" : "grid-cols-3")}>
            <NumField
              label="Drink %"
              value={activeRates.drinkPct}
              suffix="%"
              readOnly={readOnly}
              onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { drinkPct: n })}
            />
            <NumField
              label="Tip %"
              value={activeRates.tipPct}
              suffix="%"
              readOnly={readOnly}
              onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { tipPct: n })}
            />
            {!hideTablePct && (
              <NumField
                label="Table %"
                value={activeRates.tablePct}
                suffix="%"
                readOnly={readOnly}
                onChange={readOnly ? undefined : (n) => onPatchTier(activeTier, { tablePct: n })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
