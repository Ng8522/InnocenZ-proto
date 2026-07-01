import type { AgencyPR, OutletPrTier } from "@/lib/agency-demo";
import type { ShiftRequest } from "@/lib/store";
import type { OutletTierRateSettings } from "@/lib/outlet-demo";
import {
  mergeReleasedEarlyPrIds,
  outletShiftActivePrIds,
  outletShiftCutLossForShift,
  outletShiftCutLossSavings,
  outletShiftDemandSupplied,
  outletShiftLaborCostForPrIds,
} from "@/lib/outlet-demo";

export type CutlostModel = "guaranteed" | "best_effort";

export type BestEffortCutlostPlan = {
  prIds: string[];
  prNames: string[];
  slotsCut: number;
  estimatedSavings: number;
  clearsCutlost: boolean;
  rationale: string[];
};

function prReleaseScore(pr: AgencyPR, laborRm: number): number {
  const tierNum = Number.parseInt(pr.trainingLevel.replace(/\D/g, ""), 10) || 3;
  const ratingPenalty = Math.max(0, 5 - pr.rating);
  return ratingPenalty * 10 + tierNum * 2 - laborRm / 500;
}

export function recommendBestEffortCutlost(opts: {
  shift: ShiftRequest;
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  prTierById: Record<string, string | undefined>;
  agencyPRs: AgencyPR[];
}): BestEffortCutlostPlan | null {
  const { shift, tierRates, prTierById, agencyPRs } = opts;
  const cutlostBefore = outletShiftCutLossForShift(shift, tierRates, prTierById);
  if (cutlostBefore <= 0) return null;

  const releasable = outletShiftActivePrIds(shift);
  const { openSlots: unfilled } = outletShiftDemandSupplied(shift);

  let slotsCut = 0;
  const prIds: string[] = [];
  const rationale: string[] = [];

  if (unfilled > 0) {
    const slotSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
      demandCut: (shift.demandCut ?? 0) + unfilled,
    });
    if (slotSavings > 0 || cutlostBefore > 0) {
      slotsCut = unfilled;
      rationale.push(
        unfilled === 1
          ? "Cut 1 unfilled slot — no one on the floor is affected."
          : `Cut ${unfilled} unfilled slots — planned labor drops with zero floor disruption.`,
      );
    }
  }

  let remainingCutlost = outletShiftCutLossForShift(
    {
      ...shift,
      demandCut: (shift.demandCut ?? 0) + slotsCut,
      releasedEarlyPrIds: mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, prIds),
      prs: shift.prs ?? [],
    },
    tierRates,
    prTierById,
  );

  if (remainingCutlost > 0 && releasable.length > 0) {
    const ranked = releasable
      .map((id) => {
        const pr = agencyPRs.find((p) => p.id === id);
        const laborRm = outletShiftLaborCostForPrIds([id], shift.shift, tierRates, prTierById);
        return {
          id,
          name: pr?.name ?? id,
          pr,
          laborRm,
          score: pr ? prReleaseScore(pr, laborRm) : 999,
        };
      })
      .sort((a, b) => b.score - a.score || b.laborRm - a.laborRm);

    for (const candidate of ranked) {
      if (remainingCutlost <= 0) break;
      const nextReleased = mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, [...prIds, candidate.id]);
      const savings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
        demandCut: (shift.demandCut ?? 0) + slotsCut,
        releasedEarlyPrIds: nextReleased,
      });
      if (savings <= 0) continue;
      prIds.push(candidate.id);
      rationale.push(
        `Release ${candidate.name} early — lower floor impact (${candidate.pr?.rating?.toFixed(1) ?? "?"}★ · ${candidate.pr?.trainingLevel ?? "Tier"}) while trimming ~${Math.round(candidate.laborRm).toLocaleString("en-MY")} labor.`,
      );
      remainingCutlost = outletShiftCutLossForShift(
        {
          ...shift,
          demandCut: (shift.demandCut ?? 0) + slotsCut,
          releasedEarlyPrIds: nextReleased,
          prs: (shift.prs ?? []).filter((id) => !prIds.includes(id)),
        },
        tierRates,
        prTierById,
      );
    }
  }

  let estimatedSavings = outletShiftCutLossSavings(shift, tierRates, prTierById, {
    demandCut: (shift.demandCut ?? 0) + slotsCut,
    releasedEarlyPrIds: mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, prIds),
  });

  if (estimatedSavings <= 0 && (slotsCut > 0 || prIds.length > 0)) {
    const after = outletShiftCutLossForShift(
      {
        ...shift,
        demandCut: (shift.demandCut ?? 0) + slotsCut,
        releasedEarlyPrIds: mergeReleasedEarlyPrIds(shift.releasedEarlyPrIds, prIds),
        prs: (shift.prs ?? []).filter((id) => !prIds.includes(id)),
      },
      tierRates,
      prTierById,
    );
    estimatedSavings = Math.max(0, cutlostBefore - after);
  }

  if (estimatedSavings <= 0 && slotsCut === 0 && prIds.length === 0) return null;

  const prNames = prIds.map((id) => agencyPRs.find((p) => p.id === id)?.name ?? id);

  return {
    prIds,
    prNames,
    slotsCut,
    estimatedSavings,
    clearsCutlost: estimatedSavings >= cutlostBefore - 1,
    rationale:
      rationale.length > 0
        ? rationale
        : ["Balanced mix of slot cuts and early releases to shrink cutlost with minimal floor impact."],
  };
}
