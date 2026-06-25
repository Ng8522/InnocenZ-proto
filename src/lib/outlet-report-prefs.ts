import { addDaysToIso } from "@/lib/demo-clock";
import { VELVET_REPORT_WEEK_OPTIONS, velvetReportDateBounds } from "@/lib/velvet-week-demo";

export type OutletReportTab = "this_week" | "last_week" | "custom";

export type OutletReportPeriod = "3d" | "week" | "month";

export interface OutletReportPrefs {
  tab: OutletReportTab;
  /** Selected week (Sunday ISO) when browsing week history */
  weekSundayIso: string;
  customStartIso: string;
  customEndIso: string;
  customPeriod: OutletReportPeriod;
}

const STORAGE_PREFIX = "innocenz-outlet-report-prefs";

export function clampReportStartIso(iso: string): string {
  const { minIso, maxIso } = velvetReportDateBounds();
  if (!iso || iso < minIso) return minIso;
  if (iso > maxIso) return maxIso;
  return iso;
}

export function clampReportEndIso(iso: string): string {
  const { minIso, maxIso } = velvetReportDateBounds();
  if (!iso || iso < minIso) return minIso;
  if (iso > maxIso) return maxIso;
  return iso;
}

export function normalizeCustomReportRange(
  startIso: string,
  endIso: string,
): { startIso: string; endIso: string } {
  let start = clampReportStartIso(startIso);
  let end = clampReportEndIso(endIso);
  if (end < start) [start, end] = [end, start];
  return { startIso: start, endIso: end };
}

export function defaultOutletReportPrefs(): OutletReportPrefs {
  const current = VELVET_REPORT_WEEK_OPTIONS[0];
  const prior = VELVET_REPORT_WEEK_OPTIONS[1];
  const customStartIso =
    prior?.nights[0]?.dateIso ?? current?.nights[0]?.dateIso ?? velvetReportDateBounds().minIso;
  const customEndIso = endIsoForReportPeriod(customStartIso, "week");
  return {
    tab: "this_week",
    weekSundayIso: current?.weekSundayIso ?? velvetReportDateBounds().maxIso,
    customStartIso,
    customEndIso,
    customPeriod: "week",
  };
}

function storageKey(orgName: string) {
  return `${STORAGE_PREFIX}:${orgName.trim().toLowerCase() || "outlet"}`;
}

export function loadOutletReportPrefs(orgName: string): OutletReportPrefs {
  if (typeof window === "undefined") return defaultOutletReportPrefs();
  try {
    const raw = localStorage.getItem(storageKey(orgName));
    if (!raw) return defaultOutletReportPrefs();
    const parsed = JSON.parse(raw) as Partial<OutletReportPrefs>;
    const defaults = defaultOutletReportPrefs();
    const customStartIso = clampReportStartIso(parsed.customStartIso ?? defaults.customStartIso);
    const customPeriod = parsed.customPeriod ?? defaults.customPeriod;
    const customEndIso = normalizeCustomReportRange(
      customStartIso,
      parsed.customEndIso ?? endIsoForReportPeriod(customStartIso, customPeriod),
    ).endIso;
    return {
      tab: parsed.tab ?? defaults.tab,
      weekSundayIso: parsed.weekSundayIso ?? defaults.weekSundayIso,
      customStartIso,
      customEndIso,
      customPeriod,
    };
  } catch {
    return defaultOutletReportPrefs();
  }
}

export function saveOutletReportPrefs(orgName: string, prefs: OutletReportPrefs) {
  if (typeof window === "undefined") return;
  const range = normalizeCustomReportRange(prefs.customStartIso, prefs.customEndIso);
  try {
    localStorage.setItem(
      storageKey(orgName),
      JSON.stringify({
        ...prefs,
        customStartIso: range.startIso,
        customEndIso: range.endIso,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function endIsoForReportPeriod(startIso: string, period: OutletReportPeriod): string {
  const { maxIso } = velvetReportDateBounds();
  let end: string;
  if (period === "3d") end = addDaysToIso(startIso, 2);
  else if (period === "week") end = addDaysToIso(startIso, 6);
  else {
    const [y, m] = startIso.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
  return end > maxIso ? maxIso : end;
}

export function customRangeMatchesPeriod(
  startIso: string,
  endIso: string,
  period: OutletReportPeriod,
): boolean {
  return endIso === endIsoForReportPeriod(startIso, period);
}

export function periodLabel(period: OutletReportPeriod): string {
  if (period === "3d") return "3 days";
  if (period === "week") return "1 week";
  return "Whole month";
}
