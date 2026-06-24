import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { ShiftRequest } from "@/lib/store";
import { IzSheet } from "@/components/iz/Sheet";
import { IzPill } from "@/components/iz/ui";
import {
  OUTLET_CUTLOSS_COST_SHARE,
  outletShiftActualLaborCost,
  outletShiftCutLossAdjustmentsLabel,
  outletShiftCutLossForShift,
  outletShiftCutLossSavings,
  outletShiftLaborCostForPrIds,
  outletShiftPlannedLaborPerSlot,
  outletUnfilledDemandSlots,
  resolveShiftTierRates,
} from "@/lib/outlet-demo";
import { Check, ChevronDown, TrendingDown, UserMinus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRm(amount: number): string {
  return `RM ${Math.round(amount).toLocaleString("en-MY")}`;
}

function formatCutLossSavings(savings: number, cutLoss: number): string | null {
  if (savings <= 0) return null;
  if (savings >= cutLoss - 1) return "Clears cutlost";
  return `−${formatRm(savings)}`;
}

export function OutletCutLossActions({
  shift,
  className,
}: {
  shift: ShiftRequest;
  className?: string;
}) {
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const { releaseOutletPrsEarly, cutOutletUnfilledDemand } = useStore();

  const tierRates = resolveShiftTierRates(shift, outletWorkspace);
  const prTierById = Object.fromEntries(agencyPRs.map((pr) => [pr.id, pr.trainingLevel]));
  const targetLabor = shift.estimatedCost;
  const actualLabor = outletShiftActualLaborCost(shift, tierRates, prTierById);
  const cutLoss = outletShiftCutLossForShift(shift, tierRates, prTierById);
  const laborGap = Math.max(0, targetLabor - actualLabor);

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(() => cutLoss > 0);
  const unfilled = outletUnfilledDemandSlots(shift);
  const adjustments = outletShiftCutLossAdjustmentsLabel(shift);
  const perSlotLabor = outletShiftPlannedLaborPerSlot(shift);

  const releasablePrs = useMemo(
    () =>
      shift.prs.map((id) => {
        const pr = agencyPRs.find((p) => p.id === id);
        return { id, name: pr?.name ?? id };
      }),
    [shift.prs, agencyPRs],
  );

  const releaseTwoIds = releasablePrs.slice(0, 2).map((p) => p.id);
  const releaseTwoLabor = outletShiftLaborCostForPrIds(
    releaseTwoIds,
    shift.shift,
    tierRates,
    prTierById,
  );
  const releaseTwoSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    releasedEarlyPrIds: [...(shift.releasedEarlyPrIds ?? []), ...releaseTwoIds],
  });

  const cutSlotsLabor = Math.round(perSlotLabor * unfilled);
  const cutAllSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    demandCut: (shift.demandCut ?? 0) + unfilled,
  });

  if (shift.status !== "confirmed") return null;

  const canReleaseTwo = releasablePrs.length >= 2 && releaseTwoSavings > 0;
  const canCutUnfilled = unfilled > 0 && cutAllSavings > 0;
  const hasActions = canReleaseTwo || canCutUnfilled || releasablePrs.length > 0;

  if (!hasActions && cutLoss <= 0) return null;

  const togglePick = (id: string) => {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const confirmRelease = () => {
    if (!picked.length) return;
    releaseOutletPrsEarly(shift.id, picked);
    setPicked([]);
    setReleaseOpen(false);
  };

  const pickedLabor = outletShiftLaborCostForPrIds(picked, shift.shift, tierRates, prTierById);
  const pickedSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    releasedEarlyPrIds: [...(shift.releasedEarlyPrIds ?? []), ...picked],
  });

  return (
    <div
      className={cn("mt-2.5 rounded-xl border border-[var(--iz-line)] bg-white/[0.02]", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          Reduce cutlost
        </span>
        {cutLoss > 0 && (
          <IzPill variant="red" className="shrink-0 !py-0.5 !text-[11px]">
            {formatRm(cutLoss)}
          </IzPill>
        )}
        <ChevronDown
          className={cn("ml-auto h-4 w-4 shrink-0 text-[var(--iz-muted)]", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--iz-line)] px-3 pb-2 pt-1.5">
          <p className="text-xs leading-snug text-[var(--iz-muted2)]">
            Cutlost is {Math.round(OUTLET_CUTLOSS_COST_SHARE * 100)}% of planned labor minus wages
            for PRs on shift ({formatRm(targetLabor)} − {formatRm(actualLabor)} ={" "}
            {formatRm(laborGap)} gap).
          </p>

          {adjustments && (
            <p className="mt-1 text-xs text-[var(--iz-muted2)]">Already applied · {adjustments}</p>
          )}

          <div className="mt-1.5 space-y-1">
            {canReleaseTwo && (
              <ActionRow
                icon={UserMinus}
                title="Release 2 PRs early"
                detail={`~${formatRm(releaseTwoLabor)} less target & actual labor · 2 PRs checked out`}
                savingsLabel={formatCutLossSavings(releaseTwoSavings, cutLoss)}
                onClick={() => releaseOutletPrsEarly(shift.id, releaseTwoIds)}
              />
            )}

            {releasablePrs.length > 0 && (
              <ActionRow
                icon={Users}
                title="Choose PRs to release"
                detail={`${releasablePrs.length} on shift · pick who goes home early`}
                onClick={() => {
                  setPicked([]);
                  setReleaseOpen(true);
                }}
              />
            )}

            {canCutUnfilled && (
              <ActionRow
                icon={TrendingDown}
                title={unfilled === 1 ? "Cut 1 open slot" : `Cut ${unfilled} open slots`}
                detail={`~${formatRm(cutSlotsLabor)} off planned labor only · ${unfilled} unfilled slot${unfilled === 1 ? "" : "s"}`}
                savingsLabel={formatCutLossSavings(cutAllSavings, cutLoss)}
                onClick={() => cutOutletUnfilledDemand(shift.id, unfilled)}
              />
            )}
          </div>
        </div>
      )}

      <IzSheet open={releaseOpen} onClose={() => setReleaseOpen(false)}>
        <div className="iz-cardttl">Release PRs early</div>
        <p className="iz-tiny iz-muted mt-1">
          Selected PRs are checked out on the roster. Target and actual labor both drop by their
          shift wages.
        </p>
        <div className="mt-3 space-y-1.5">
          {releasablePrs.map((pr) => {
            const active = picked.includes(pr.id);
            const prLabor = outletShiftLaborCostForPrIds(
              [pr.id],
              shift.shift,
              tierRates,
              prTierById,
            );
            return (
              <button
                key={pr.id}
                type="button"
                onClick={() => togglePick(pr.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-[var(--iz-gold-d)] bg-[var(--iz-gold)]/10"
                    : "border-[var(--iz-line)] bg-white/[0.02]",
                )}
              >
                <span className="font-medium">{pr.name}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--iz-muted)]">
                  ~{formatRm(prLabor)} labor
                  {active && <Check className="h-3.5 w-3.5 text-[var(--iz-gold)]" />}
                </span>
              </button>
            );
          })}
        </div>
        {picked.length > 0 && (
          <p className="iz-tiny iz-muted mt-2 text-center">
            {formatCutLossSavings(pickedSavings, cutLoss) ?? "No cutlost change"} · ~
            {formatRm(pickedLabor)} labor
          </p>
        )}
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-3 w-full"
          disabled={!picked.length}
          onClick={confirmRelease}
        >
          Release {picked.length || ""} PR{picked.length === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => setReleaseOpen(false)}
        >
          Cancel
        </button>
      </IzSheet>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  detail,
  savingsLabel,
  onClick,
}: {
  icon: typeof UserMinus;
  title: string;
  detail: string;
  savingsLabel?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--iz-line)] bg-[var(--iz-bg)] px-2.5 py-1.5 text-left transition-colors hover:border-[var(--iz-gold-d)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
        <Icon className="h-4 w-4 text-[var(--iz-gold)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--iz-muted2)]">{detail}</span>
      </span>
      {savingsLabel && (
        <span className="shrink-0 text-xs font-semibold leading-tight text-[var(--iz-green)]">
          {savingsLabel}
        </span>
      )}
    </button>
  );
}
