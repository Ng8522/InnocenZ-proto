import {
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  formatTierSalesTargets,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { cn } from "@/lib/utils";

function formatTargetAmount(targetSalesRm: number): string {
  if (targetSalesRm >= 1000) {
    return `RM ${(targetSalesRm / 1000).toFixed(1)}k`;
  }
  return `RM ${targetSalesRm.toLocaleString("en-MY")}`;
}

export function TierSalesTargetChip({
  targetSalesRm,
  active,
  className,
}: {
  targetSalesRm: number;
  active?: boolean;
  className?: string;
}) {
  if (targetSalesRm <= 0) return null;
  return (
    <div
      className={cn(
        "w-full rounded-md border px-1.5 py-1 text-center",
        active
          ? "border-[rgba(62,207,142,.45)] bg-[rgba(62,207,142,.18)]"
          : "border-[rgba(62,207,142,.3)] bg-[rgba(62,207,142,.12)]",
        className,
      )}
    >
      <span className="block text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--iz-green)]">
        Sales target
      </span>
      <span className="font-sora text-[11px] font-extrabold tabular-nums leading-tight text-[var(--iz-green)]">
        ≥ {formatTargetAmount(targetSalesRm)}
      </span>
    </div>
  );
}

export function TierRatePill({
  tier,
  wage,
  salesTarget,
  active,
  accent,
  multiplier,
  onClick,
}: {
  tier: OutletPrTier;
  wage: number;
  salesTarget?: number;
  active?: boolean;
  accent?: boolean;
  multiplier?: number;
  onClick?: () => void;
}) {
  const roman = tier.replace("Tier ", "");
  const isBase = tier === OUTLET_BASE_TIER;
  const hasTarget = (salesTarget ?? 0) > 0;
  const showMultiplier = multiplier != null;
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col items-center rounded-lg border px-1.5 py-2 text-center",
        showMultiplier ? "h-[8rem]" : "h-[7.5rem]",
        accent || isBase
          ? "border-[rgba(217,185,122,.35)] bg-[rgba(232,194,122,.08)]"
          : "border-[var(--iz-line)] bg-white/[0.02]",
        active && "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)]",
        onClick && "transition-colors hover:border-[var(--iz-muted)]",
      )}
    >
      <div className="flex h-7 shrink-0 flex-col items-center justify-center leading-none">
        <span
          className={cn(
            "text-[10px] font-bold",
            active ? "text-[var(--iz-gold-l)]" : "text-[var(--iz-txt)]",
          )}
        >
          {roman}
        </span>
        <span className={cn("text-[9px] font-medium", isBase ? "text-[var(--iz-muted)]" : "invisible")}>
          base
        </span>
      </div>
      <span className="mt-0.5 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
        Pay / hr
      </span>
      <span
        className={cn(
          "shrink-0 font-sora text-xs font-extrabold tabular-nums leading-none",
          active ? "text-[var(--iz-gold-l)]" : "text-[var(--iz-txt)]",
        )}
      >
        RM{wage}
      </span>
      {showMultiplier && (
        <span className="shrink-0 text-[10px] font-semibold tabular-nums leading-none text-[var(--iz-gold-l)]">
          {multiplier}×
        </span>
      )}
      <div className="mt-auto flex w-full min-h-[2.5rem] items-end justify-center">
        {hasTarget ? (
          <TierSalesTargetChip targetSalesRm={salesTarget!} active={active} />
        ) : (
          <div className="h-[2.5rem]" aria-hidden />
        )}
      </div>
    </Tag>
  );
}

export function ShiftTierWagesStrip({
  tierRates,
}: {
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  compact?: boolean;
}) {
  const hasSalesTargets = OUTLET_PR_TIERS.some((t) => (tierRates[t].targetSalesRm ?? 0) > 0);

  return (
    <div className="mt-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
        {hasSalesTargets ? "Target pay & sales by tier" : "Target pay / hr by tier"}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {OUTLET_PR_TIERS.map((tier) => (
          <TierRatePill
            key={tier}
            tier={tier}
            wage={tierRates[tier].wagePerHour}
            salesTarget={tierRates[tier].targetSalesRm}
            accent={tier === OUTLET_BASE_TIER}
          />
        ))}
      </div>
      {formatTierSalesTargets(tierRates) && (
        <p className="mt-1.5 text-[10px] font-medium text-[var(--iz-muted)]">
          Week range · {formatTierSalesTargets(tierRates)}
        </p>
      )}
    </div>
  );
}
