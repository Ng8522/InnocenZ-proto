import {
  getOutletReportForWeek,
  getVelvetReportWeekOptions,
  payrollWeekRangeLabel,
  VELVET_OUTLET_NAME,
} from "@/lib/velvet-week-demo";
import { getPayrollWeekSundayIso } from "@/lib/demo-clock";

export type PrWeekTopRank = {
  rank: 1 | 2 | 3;
  weekLabel: string;
  weekSundayIso: string;
};

function canonicalOutlet(name: string): string {
  return name.trim().toLowerCase();
}

/** Top 1–3 PR earners per demo week at this outlet (matches Reports). */
export function buildOutletWeeklyTopPrRanks(outletName: string): Map<string, PrWeekTopRank[]> {
  const byPr = new Map<string, PrWeekTopRank[]>();
  if (canonicalOutlet(outletName) !== canonicalOutlet(VELVET_OUTLET_NAME)) return byPr;

  for (const week of getVelvetReportWeekOptions()) {
    const report = getOutletReportForWeek(outletName, week.weekSundayIso);
    if (!report) continue;
    report.topPrs.slice(0, 3).forEach((p, index) => {
      const rank = (index + 1) as 1 | 2 | 3;
      const entry: PrWeekTopRank = {
        rank,
        weekLabel: week.label,
        weekSundayIso: week.weekSundayIso,
      };
      const list = byPr.get(p.prId) ?? [];
      list.push(entry);
      byPr.set(p.prId, list);
    });
  }
  return byPr;
}

export function weekSundayIsoForDate(dateIso: string): string | undefined {
  for (const week of getVelvetReportWeekOptions()) {
    if (dateIso >= week.weekSundayIso && dateIso <= week.weekEndIso) {
      return week.weekSundayIso;
    }
  }
  return getPayrollWeekSundayIso();
}

export function weekLabelForSundayIso(weekSundayIso: string): string {
  return (
    getVelvetReportWeekOptions().find((w) => w.weekSundayIso === weekSundayIso)?.label ??
    payrollWeekRangeLabel(weekSundayIso)
  );
}

export function prWeeklyRankContext(
  prId: string,
  referenceDateIso: string,
  ranksByPr: Map<string, PrWeekTopRank[]>,
): { shiftWeek?: PrWeekTopRank; otherWeeks: PrWeekTopRank[] } {
  const shiftWeekSun = weekSundayIsoForDate(referenceDateIso);
  const all = ranksByPr.get(prId) ?? [];
  const shiftWeek = shiftWeekSun
    ? all.find((r) => r.weekSundayIso === shiftWeekSun)
    : undefined;
  const otherWeeks = all.filter((r) => r.weekSundayIso !== shiftWeekSun);
  return { shiftWeek, otherWeeks };
}

export const TOP_PR_RANK_STYLES: Record<1 | 2 | 3, string> = {
  1: "bg-[var(--iz-gold)] text-[#1a1408]",
  2: "bg-slate-300 text-slate-900",
  3: "bg-amber-700/90 text-amber-50",
};
