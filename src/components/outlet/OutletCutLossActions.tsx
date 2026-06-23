import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { ShiftRequest } from "@/lib/store";
import { IzSheet } from "@/components/iz/Sheet";
import { IzPill } from "@/components/iz/ui";
import {
  outletShiftCutLoss,
  outletShiftCutLossAdjustmentsLabel,
  outletShiftSalesTargetHeadcount,
  outletShiftTargetSalesForShift,
  outletShiftTargetSalesRm,
  outletUnfilledDemandSlots,
  resolveShiftTierRates,
} from "@/lib/outlet-demo";
import { ArrowDownRight, Check, ChevronDown, TrendingDown, UserMinus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRm(amount: number): string {
  return `RM ${Math.round(amount).toLocaleString("en-MY")}`;
}

function cutLossSavings(
  shift: ShiftRequest,
  tierRates: ReturnType<typeof resolveShiftTierRates>,
  liveSales: number,
  patch: Partial<Pick<ShiftRequest, "releasedEarlyPrIds" | "demandCut" | "salesTargetPct">>,
): number {
  const before = outletShiftCutLoss(
    outletShiftTargetSalesForShift(shift, tierRates),
    liveSales,
  );
  const after = outletShiftCutLoss(
    outletShiftTargetSalesForShift({ ...shift, ...patch }, tierRates),
    liveSales,
  );
  return Math.max(0, before - after);
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
  const { releaseOutletPrsEarly, cutOutletUnfilledDemand, easeOutletSalesTarget } = useStore();

  const tierRates = resolveShiftTierRates(shift, outletWorkspace);
  const targetSales = outletShiftTargetSalesForShift(shift, tierRates);
  const cutLoss = outletShiftCutLoss(targetSales, shift.liveSales);

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(() => cutLoss > 0);
  const unfilled = outletUnfilledDemandSlots(shift);
  const adjustments = outletShiftCutLossAdjustmentsLabel(shift);
  const perPrTarget = outletShiftTargetSalesRm(tierRates, 1);
  const salesTargetPct = shift.salesTargetPct ?? 100;

  const releasablePrs = useMemo(
    () =>
      shift.prs.map((id) => {
        const pr = agencyPRs.find((p) => p.id === id);
        return { id, name: pr?.name ?? id };
      }),
    [shift.prs, agencyPRs],
  );

  const releaseTwoSavings = cutLossSavings(shift, tierRates, shift.liveSales, {
    releasedEarlyPrIds: [...(shift.releasedEarlyPrIds ?? []), ...releasablePrs.slice(0, 2).map((p) => p.id)],
  });
  const cutAllSavings = cutLossSavings(shift, tierRates, shift.liveSales, {
    demandCut: (shift.demandCut ?? 0) + unfilled,
  });
  const easeTenSavings = cutLossSavings(shift, tierRates, shift.liveSales, {
    salesTargetPct: Math.max(50, salesTargetPct - 10),
  });

  if (shift.status !== "confirmed") return null;

  const canReleaseTwo = releasablePrs.length >= 2;
  const canCutUnfilled = unfilled > 0;
  const canEaseTarget = salesTargetPct > 50;
  const hasActions = canReleaseTwo || canCutUnfilled || canEaseTarget || releasablePrs.length > 0;

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

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border border-[var(--iz-line)] bg-white/[0.02]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          Reduce cutlost
        </span>
        {cutLoss > 0 && (
          <IzPill variant="red" className="shrink-0 !py-0.5 !text-[9px]">
            {formatRm(cutLoss)}
          </IzPill>
        )}
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 shrink-0 text-[var(--iz-muted)]", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--iz-line)] px-2.5 pb-2.5 pt-2">
          <p className="text-[10px] leading-snug text-[var(--iz-muted2)]">
            Lower tonight&apos;s sales target when the floor is quieter than planned.
          </p>

          {adjustments && (
            <p className="iz-tiny iz-muted2 mt-1.5">
              Adjustments · {adjustments} · target headcount {outletShiftSalesTargetHeadcount(shift)}
            </p>
          )}

          <div className="mt-2 space-y-1.5">
        {canReleaseTwo && (
          <ActionRow
            icon={UserMinus}
            title="Release 2 PRs early"
            detail={`Drops target by ~${formatRm(perPrTarget * 2)}`}
            savings={releaseTwoSavings}
            onClick={() => releaseOutletPrsEarly(shift.id, releasablePrs.slice(0, 2).map((p) => p.id))}
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
            detail="Remove unfilled demand from tonight's target"
            savings={cutAllSavings}
            onClick={() => cutOutletUnfilledDemand(shift.id, unfilled)}
          />
        )}

        {canEaseTarget && (
          <ActionRow
            icon={ArrowDownRight}
            title="Ease target −10%"
            detail={`${salesTargetPct}% → ${Math.max(50, salesTargetPct - 10)}% per-PR sales goal`}
            savings={easeTenSavings}
            onClick={() => easeOutletSalesTarget(shift.id, 10)}
          />
        )}
          </div>
        </div>
      )}

      <IzSheet open={releaseOpen} onClose={() => setReleaseOpen(false)}>
        <div className="iz-cardttl">Release PRs early</div>
        <p className="iz-tiny iz-muted mt-1">
          Selected PRs are checked out on the roster and removed from tonight&apos;s sales target.
        </p>
        <div className="mt-3 space-y-1.5">
          {releasablePrs.map((pr) => {
            const active = picked.includes(pr.id);
            const savings = cutLossSavings(shift, tierRates, shift.liveSales, {
              releasedEarlyPrIds: [...(shift.releasedEarlyPrIds ?? []), pr.id],
            });
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
                  {savings > 0 && `−${formatRm(savings)} cutlost`}
                  {active && <Check className="h-3.5 w-3.5 text-[var(--iz-gold)]" />}
                </span>
              </button>
            );
          })}
        </div>
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
  savings,
  onClick,
}: {
  icon: typeof UserMinus;
  title: string;
  detail: string;
  savings?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-[var(--iz-line)] bg-[var(--iz-bg)] px-2.5 py-2 text-left transition-colors hover:border-[var(--iz-gold-d)]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
        <Icon className="h-3.5 w-3.5 text-[var(--iz-gold)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold">{title}</span>
        <span className="block text-[10px] text-[var(--iz-muted2)]">{detail}</span>
      </span>
      {savings != null && savings > 0 && (
        <span className="shrink-0 text-[10px] font-semibold text-[var(--iz-green)]">
          −{formatRm(savings)}
        </span>
      )}
    </button>
  );
}
