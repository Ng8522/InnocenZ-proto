import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { ShiftRequest } from "@/lib/store";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCardTitle, IzPill } from "@/components/iz/ui";
import {
  OUTLET_CUTLOSS_COST_SHARE,
  mergeReleasedEarlyPrIds,
  outletShiftActualLaborCostForShift,
  outletShiftCutLossAdjustmentsLabel,
  outletShiftCutLossForShift,
  outletShiftCutLossSavings,
  outletShiftDemandSupplied,
  outletShiftLaborCostForPrIds,
  outletShiftTargetLaborCost,
  outletShiftPlannedLaborPerSlot,
  resolveShiftTierRates,
  OUTLET_REDUCE_CUTLOST_SECTION_ID,
} from "@/lib/outlet-demo";
import { recommendBestEffortCutlost } from "@/lib/outlet-cutlost-recommendations";
import { cutlostRequestTitle } from "@/lib/outlet-cutlost-requests";
import { OutletSection } from "@/components/outlet/OutletSection";
import {
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UserMinus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatRm(amount: number): string {
  return `RM ${Math.round(amount).toLocaleString("en-MY")}`;
}

function formatCutLossSavings(savings: number, cutLoss: number): string | null {
  if (savings <= 0) return null;
  if (savings >= cutLoss - 1) return "Clears cutlost";
  return `−${formatRm(savings)}`;
}

type CutlostModelChoice = "guaranteed" | "best_effort";

export const OUTLET_OPEN_CUTLOST_EVENT = "outlet:open-cutlost";

export function OutletCutLossActions({
  shift,
  className,
  sectionId = OUTLET_REDUCE_CUTLOST_SECTION_ID,
}: {
  shift: ShiftRequest;
  className?: string;
  /** DOM id for scroll targets — unique per shift when inline in a list. */
  sectionId?: string;
}) {
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const pendingCutlostRequests = useStore((s) => s.pendingCutlostRequests);
  const requestOutletCutlostReduction = useStore((s) => s.requestOutletCutlostReduction);

  const tierRates = resolveShiftTierRates(shift, outletWorkspace);
  const prTierById = Object.fromEntries(agencyPRs.map((pr) => [pr.id, pr.trainingLevel]));
  const targetLabor = outletShiftTargetLaborCost(shift, tierRates, prTierById);
  const actualLabor = outletShiftActualLaborCostForShift(shift, tierRates, prTierById);
  const cutLoss = outletShiftCutLossForShift(shift, tierRates, prTierById);
  const laborGap = Math.max(0, targetLabor - actualLabor);

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [bestEffortOpen, setBestEffortOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<CutlostModelChoice | null>(null);
  const { demand, supplied, openSlots } = outletShiftDemandSupplied(shift);
  const adjustments = outletShiftCutLossAdjustmentsLabel(shift);
  const perSlotLabor = outletShiftPlannedLaborPerSlot(shift, tierRates, prTierById);

  useEffect(() => {
    const openFromChip = (event: Event) => {
      const targetId = (event as CustomEvent<{ sectionId?: string }>).detail?.sectionId;
      if (!targetId || targetId === sectionId) setOpen(true);
    };
    window.addEventListener(OUTLET_OPEN_CUTLOST_EVENT, openFromChip);
    return () => window.removeEventListener(OUTLET_OPEN_CUTLOST_EVENT, openFromChip);
  }, [sectionId]);

  const pendingRequest = useMemo(
    () => pendingCutlostRequests.find((r) => r.shiftId === shift.id && r.status === "pending"),
    [pendingCutlostRequests, shift.id],
  );

  const releasablePrs = useMemo(() => {
    const released = new Set(shift.releasedEarlyPrIds ?? []);
    return shift.prs
      .filter((id) => !released.has(id))
      .map((id) => {
        const pr = agencyPRs.find((p) => p.id === id);
        return { id, name: pr?.name ?? id };
      });
  }, [shift.prs, shift.releasedEarlyPrIds, agencyPRs]);

  const releaseTwoIds = releasablePrs.slice(0, 2).map((p) => p.id);
  const releaseTwoLabor = outletShiftLaborCostForPrIds(
    releaseTwoIds,
    shift.shift,
    tierRates,
    prTierById,
  );
  const releaseTwoSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    releasedEarlyPrIds: mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, releaseTwoIds),
  });

  const cutSlotsLabor = Math.round(perSlotLabor * openSlots);
  const cutAllSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    demandCut: (shift.demandCut ?? 0) + openSlots,
  });

  const bestEffortPlan = useMemo(
    () =>
      recommendBestEffortCutlost({
        shift,
        tierRates,
        prTierById,
        agencyPRs,
      }),
    [shift, tierRates, prTierById, agencyPRs],
  );

  if (shift.status !== "confirmed") return null;

  const canReleaseTwo = releasablePrs.length >= 2 && releaseTwoSavings > 0;
  const canCutUnfilled = openSlots > 0 && cutLoss > 0;
  const hasGuaranteedActions =
    canReleaseTwo || canCutUnfilled || releasablePrs.length > 0;
  const hasBestEffort = cutLoss > 0;
  const hasActions = hasGuaranteedActions || hasBestEffort;
  const actionsLocked = Boolean(pendingRequest);

  if (!hasActions && cutLoss <= 0 && !pendingRequest) return null;

  const togglePick = (id: string) => {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const submitRelease = (prIds: string[]) => {
    requestOutletCutlostReduction(shift.id, { kind: "release_prs", prIds, model: "guaranteed" });
    setPicked([]);
    setReleaseOpen(false);
    setActiveModel(null);
  };

  const submitBestEffort = () => {
    if (!bestEffortPlan) return;
    requestOutletCutlostReduction(shift.id, {
      kind: "best_effort",
      prIds: bestEffortPlan.prIds,
      slotsCut: bestEffortPlan.slotsCut,
      rationale: bestEffortPlan.rationale,
    });
    setBestEffortOpen(false);
    setActiveModel(null);
  };

  const pickedLabor = outletShiftLaborCostForPrIds(picked, shift.shift, tierRates, prTierById);
  const pickedSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    releasedEarlyPrIds: mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, picked),
  });

  const toggleModel = (model: CutlostModelChoice) => {
    if (model === "best_effort") {
      setBestEffortOpen(true);
      setActiveModel("best_effort");
      return;
    }
    setActiveModel((cur) => (cur === model ? null : model));
  };

  const cutlostHint =
    cutLoss > 0
      ? `${formatRm(cutLoss)} cutlost · ${formatRm(targetLabor)} target − ${formatRm(actualLabor)} actual`
      : "Pick a model to reduce planned labor";

  return (
    <>
      <OutletSection
        id={sectionId}
        title="Reduce cutlost"
        hint={cutlostHint}
        collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn("iz-outlet-cutlost-section !mt-2.5", className)}
        trailing={
          <span className="flex items-center gap-1.5">
            {cutLoss > 0 && (
              <IzPill variant="red" className="shrink-0 !py-0.5 !text-[11px]">
                {formatRm(cutLoss)}
              </IzPill>
            )}
            {pendingRequest && (
              <IzPill variant="amber" className="shrink-0 !py-0.5 !text-[11px]">
                Pending agency
              </IzPill>
            )}
          </span>
        }
      >
          <p className="text-xs leading-snug text-[var(--iz-muted2)]">
            Cutlost is {Math.round(OUTLET_CUTLOSS_COST_SHARE * 100)}% of planned labor minus wages
            for PRs on shift ({formatRm(targetLabor)} − {formatRm(actualLabor)} ={" "}
            {formatRm(laborGap)} gap). Pick a model — reductions still need agency approval.
          </p>

          {pendingRequest && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-[rgba(244,183,64,.28)] bg-[rgba(244,183,64,.08)] px-2.5 py-2 text-xs text-[var(--iz-amber)]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Awaiting agency · {cutlostRequestTitle(pendingRequest)} · ~
              {formatRm(pendingRequest.estimatedSavings)} savings
            </p>
          )}

          {adjustments && (
            <p className="mt-1 text-xs text-[var(--iz-muted2)]">Already applied · {adjustments}</p>
          )}

          <div className="mt-1.5 space-y-1">
            <ModelRow
              icon={ShieldCheck}
              title="Guaranteed Cut-Lost Model"
              detail="You choose exactly who to release or which slots to cut — savings are locked before agency approval."
              savingsLabel={
                hasGuaranteedActions ? formatCutLossSavings(releaseTwoSavings, cutLoss) : null
              }
              active={activeModel === "guaranteed"}
              disabled={actionsLocked || !hasGuaranteedActions}
              onClick={() => toggleModel("guaranteed")}
            />

            {activeModel === "guaranteed" && hasGuaranteedActions && (
              <div className="ml-2 space-y-1 border-l border-[var(--iz-line)] pl-2">
                {canReleaseTwo && (
                  <ActionRow
                    icon={UserMinus}
                    title="Release 2 PRs early"
                    detail={`~${formatRm(releaseTwoLabor)} less target & actual labor · 2 PRs checked out`}
                    savingsLabel={formatCutLossSavings(releaseTwoSavings, cutLoss)}
                    disabled={actionsLocked}
                    onClick={() => submitRelease(releaseTwoIds)}
                  />
                )}

                {releasablePrs.length > 0 && (
                  <ActionRow
                    icon={Users}
                    title="Choose PRs to release"
                    detail={`${releasablePrs.length} on shift · pick who goes home early`}
                    disabled={actionsLocked}
                    onClick={() => {
                      setPicked([]);
                      setReleaseOpen(true);
                    }}
                  />
                )}

                {canCutUnfilled && (
                  <ActionRow
                    icon={TrendingDown}
                    title={openSlots === 1 ? "Cut 1 open slot" : `Cut ${openSlots} open slots`}
                    detail={`~${formatRm(cutSlotsLabor)} off planned labor · ${openSlots} unfilled of ${demand} requested`}
                    savingsLabel={formatCutLossSavings(cutAllSavings, cutLoss)}
                    disabled={actionsLocked}
                    onClick={() =>
                      requestOutletCutlostReduction(shift.id, {
                        kind: "cut_slots",
                        slots: openSlots,
                        model: "guaranteed",
                      })
                    }
                  />
                )}
              </div>
            )}

            <ModelRow
              icon={Sparkles}
              title="Best Effort Cut-Lost"
              detail={
                openSlots > 0
                  ? `We analyze tonight's floor (${supplied} on shift · ${openSlots} open) and suggest the lowest-disruption mix.`
                  : "We analyze tonight's floor and suggest the lowest-disruption mix to shrink cutlost."
              }
              savingsLabel={
                bestEffortPlan
                  ? formatCutLossSavings(bestEffortPlan.estimatedSavings, cutLoss)
                  : cutLoss > 0
                    ? `Up to ${formatRm(cutLoss)}`
                    : null
              }
              active={activeModel === "best_effort"}
              disabled={actionsLocked || !hasBestEffort}
              onClick={() => toggleModel("best_effort")}
            />
          </div>
      </OutletSection>

      <IzSheet open={releaseOpen} onClose={() => setReleaseOpen(false)}>
        <IzCardTitle>Guaranteed cutlost · release PRs</IzCardTitle>
        <p className="iz-tiny iz-muted mt-1">
          Selected PRs are sent to your agency for approval. Once approved, they are checked out
          and target and actual labor both drop by their shift wages.
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
          onClick={() => submitRelease(picked)}
        >
          Request agency approval
        </button>
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => setReleaseOpen(false)}
        >
          Cancel
        </button>
      </IzSheet>

      <IzSheet open={bestEffortOpen} onClose={() => setBestEffortOpen(false)}>
        <IzCardTitle className="flex items-center gap-2">
          Best Effort Cut-Lost
        </IzCardTitle>
        <p className="iz-tiny iz-muted mt-1">
          Optimized for {shift.event} tonight — balances cutlost savings with minimal floor
          disruption.
        </p>
        {bestEffortPlan ? (
          <>
            <p className="mt-4 font-sora text-2xl font-bold tabular-nums text-[var(--iz-green)]">
              {formatCutLossSavings(bestEffortPlan.estimatedSavings, cutLoss) ?? formatRm(0)}
            </p>
            <p className="iz-tiny iz-muted2 mt-0.5">
              Estimated savings · {formatRm(bestEffortPlan.estimatedSavings)} off cutlost
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-[var(--iz-line)] bg-white/[0.02] p-3">
              {bestEffortPlan.slotsCut > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-gold)]" />
                  <span>
                    Cut {bestEffortPlan.slotsCut} open slot
                    {bestEffortPlan.slotsCut === 1 ? "" : "s"} from plan
                  </span>
                </div>
              )}
              {bestEffortPlan.prNames.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <UserMinus className="mt-0.5 h-4 w-4 shrink-0 text-[var(--iz-gold)]" />
                  <span>Release {bestEffortPlan.prNames.join(", ")} early</span>
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
                Why this mix
              </p>
              {bestEffortPlan.rationale.map((line) => (
                <p key={line} className="text-xs leading-snug text-[var(--iz-muted2)]">
                  · {line}
                </p>
              ))}
            </div>
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-4 w-full"
              disabled={actionsLocked}
              onClick={submitBestEffort}
            >
              Request agency approval
            </button>
          </>
        ) : (
          <p className="iz-tiny iz-muted mt-4 text-center leading-snug">
            No savings plan could be calculated for this shift right now.
          </p>
        )}
        <button
          type="button"
          className="iz-btn iz-btn-soft mt-2 w-full"
          onClick={() => setBestEffortOpen(false)}
        >
          Cancel
        </button>
      </IzSheet>
    </>
  );
}

function ModelRow({
  icon: Icon,
  title,
  detail,
  savingsLabel,
  active,
  disabled,
  onClick,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
  savingsLabel?: string | null;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-[var(--iz-gold-d)] bg-[var(--iz-gold)]/8"
          : "border-[var(--iz-line)] bg-[var(--iz-bg)]",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-[var(--iz-gold-d)]",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
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

function ActionRow({
  icon: Icon,
  title,
  detail,
  savingsLabel,
  disabled,
  onClick,
}: {
  icon: typeof UserMinus;
  title: string;
  detail: string;
  savingsLabel?: string | null;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-[var(--iz-line)] bg-[var(--iz-bg)] px-2.5 py-1.5 text-left transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-[var(--iz-gold-d)]",
      )}
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
