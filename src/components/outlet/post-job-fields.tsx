import { useMemo, useState } from "react";
import { format, startOfToday, addDays } from "date-fns";
import { Check, HelpCircle, Minus, Pencil, Plus, X } from "lucide-react";
import { OutletDatePopoverChip, OutletDatePopoverField, OutletDateRangePopover } from "@/components/outlet/outlet-date-popover";
import { IzCard, IzSelect, IzTimeInput, normalizeTimeValue } from "@/components/iz/ui";
import { IzHScroll } from "@/components/iz/HScroll";
import { TierRatesFields } from "@/components/outlet/TierRatesFields";
import { ShiftTierWagesStrip } from "@/components/outlet/ShiftTierWagesStrip";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  buildDefaultTierRates,
  cloneTierRates,
  collectAgencyPrLanguages,
  estimateShiftLaborCost,
  getOutletRule,
  languagesFromPr,
  normalizeOutletTierMultipliers,
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  snapTierWage,
  tierWageFromMultiplier,
  type AgencyManagedPR,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import type { OutletDrinkPrice, OutletWorkspaceSettings } from "@/lib/outlet-demo";
import {
  cloneDrinkMenu,
  DRESS_CODE_OPTIONS,
  drinkMenuPriceRange,
  formatOutletPlanPrPickerRule,
  getOutletSubscriptionPlan,
  SHIFT_DESTINATION_LABELS,
  SHIFT_EVENT_KIND_LABELS,
  SHIFT_SPECIAL_EVENT_OPTIONS,
  formatShiftDrinkPricingSummary,
  formatShiftEventTypeSummary,
  type ShiftDestination,
  type ShiftEventKind,
  type ShiftSpecialEventType,
} from "@/lib/outlet-demo";
import { OutletDrinkMenuEditor } from "@/components/outlet/OutletDrinkMenuEditor";
import {
  buildOutletWeeklyTopPrRanks,
  prWeeklyRankContext,
  TOP_PR_RANK_STYLES,
  type PrWeekTopRank,
  weekLabelForSundayIso,
  weekSundayIsoForDate,
} from "@/lib/outlet-pr-weekly-ranks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_DRAFT_TIER_BASE: OutletTierRateSettings = {
  wagePerHour: 60,
  drinkPct: 8,
  tipPct: 15,
  tablePct: 10,
  otAfterHours: 6,
};

export function draftTierRatesFromWorkspace(
  ws: Pick<OutletWorkspaceSettings, "tierRates">,
): Record<OutletPrTier, OutletTierRateSettings> {
  return cloneTierRates(ws.tierRates);
}

export function languagesForPrIds(prIds: string[], agencyPRs: AgencyManagedPR[]): string[] {
  const set = new Set<string>();
  for (const id of prIds) {
    const pr = agencyPRs.find((p) => p.id === id);
    if (pr) languagesFromPr(pr).forEach((lang) => set.add(lang));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export type DraftShift = {
  id: string;
  jobDate: Date;
  jobEndDate: Date;
  event: string;
  eventKind: ShiftEventKind;
  specialEventType?: ShiftSpecialEventType;
  /** Event-specific drink prices — only used when eventKind is special */
  eventDrinkMenu?: OutletDrinkPrice[];
  langs: string[];
  otherLang: string;
  starTiers: number[];
  shiftTime: string;
  quantity: number;
  prIds: string[];
  payPerHour: number;
  tierRates: Record<OutletPrTier, OutletTierRateSettings>;
  dressCode: string;
  destination: ShiftDestination;
};

export function newDraftShift(
  partial?: Partial<Omit<DraftShift, "id">>,
  workspace?: Pick<OutletWorkspaceSettings, "tierRates" | "drinkMenu">,
): DraftShift {
  const tierRates = partial?.tierRates
    ? cloneTierRates(partial.tierRates)
    : workspace?.tierRates
      ? cloneTierRates(workspace.tierRates)
      : buildDefaultTierRates(DEFAULT_DRAFT_TIER_BASE);
  const basePay = tierRates[OUTLET_BASE_TIER].wagePerHour;
  const eventKind = partial?.eventKind ?? "normal";
  const workspaceDrinks = workspace?.drinkMenu ?? [];
  const eventDrinkMenu =
    partial?.eventDrinkMenu ??
    (eventKind === "special" && workspaceDrinks.length > 0
      ? cloneDrinkMenu(workspaceDrinks)
      : undefined);
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    jobDate: partial?.jobDate ?? startOfToday(),
    jobEndDate: partial?.jobEndDate ?? partial?.jobDate ?? startOfToday(),
    event: partial?.event ?? "Private VIP - Hennessy Launch",
    eventKind,
    specialEventType: partial?.specialEventType ?? "vip",
    eventDrinkMenu,
    langs: partial?.langs ? [...partial.langs] : [],
    otherLang: partial?.otherLang ?? "",
    starTiers: partial?.starTiers ? [...partial.starTiers] : [4, 5],
    shiftTime: partial?.shiftTime ?? "22:00 - 04:00",
    quantity: partial?.quantity ?? 6,
    prIds: partial?.prIds ? [...partial.prIds] : [],
    tierRates,
    payPerHour: snapPayPerHour(partial?.payPerHour ?? basePay),
    dressCode: partial?.dressCode ?? DRESS_CODE_OPTIONS[0],
    destination: partial?.destination ?? "both",
  };
}

export function patchDraftTierRates(
  tierRates: Record<OutletPrTier, OutletTierRateSettings>,
  tier: OutletPrTier,
  tierPatch: Partial<OutletTierRateSettings>,
  options?: { cascadeFromBase?: boolean; tierMultipliers?: Record<OutletPrTier, number> },
): Record<OutletPrTier, OutletTierRateSettings> {
  const patch = { ...tierPatch };
  if (patch.wagePerHour != null) patch.wagePerHour = snapTierWage(patch.wagePerHour);
  const next = {
    ...tierRates,
    [tier]: { ...tierRates[tier], ...patch },
  };
  const cascade = options?.cascadeFromBase !== false;
  if (cascade && tier === OUTLET_BASE_TIER && patch.wagePerHour != null) {
    const base = next[OUTLET_BASE_TIER];
    const mults = options?.tierMultipliers;
    if (mults) {
      for (const t of OUTLET_PR_TIERS) {
        next[t] = {
          ...next[t],
          wagePerHour: tierWageFromMultiplier(base.wagePerHour, mults[t]),
          drinkPct: base.drinkPct,
          tipPct: base.tipPct,
          tablePct: base.tablePct,
          otAfterHours: base.otAfterHours,
        };
      }
    } else {
      const rebuilt = buildDefaultTierRates(base);
      for (const t of OUTLET_PR_TIERS) {
        next[t] = { ...rebuilt[t], targetSalesRm: next[t].targetSalesRm };
      }
    }
  }
  return next;
}

export function estimateDraftShiftCost(
  shift: Pick<DraftShift, "tierRates" | "quantity" | "shiftTime" | "prIds">,
  prTierById?: Record<string, string | undefined>,
): number {
  const p = parseShiftTime(shift.shiftTime);
  const start = p.startH * 60 + p.startM;
  let end = p.endH * 60 + p.endM;
  if (end <= start) end += 24 * 60;
  const hours = Math.max(1, Math.round((end - start) / 60));
  return estimateShiftLaborCost({
    tierRates: shift.tierRates,
    hours,
    quantity: shift.quantity,
    prIds: shift.prIds,
    prTierById,
  });
}

export function formatDraftPrNames(prIds: string[], prs: { id: string; name: string }[]): string {
  if (prIds.length === 0) return "None selected";
  return prIds.map((id) => prs.find((p) => p.id === id)?.name ?? id).join(", ");
}

export function formatJobDate(d: Date): string {
  const today = startOfToday();
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Tonight";
  if (diff === 1) return "Tomorrow";
  return format(d, "EEE d MMM");
}

export function isoFromJobDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type JobDateSpan = "3d" | "week";

function normalizeJobDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  if (end < start) return { from: end, to: start };
  return { from: start, to: end };
}

export function eachJobDateInRange(from: Date, to: Date): Date[] {
  const { from: start, to: end } = normalizeJobDateRange(from, to);
  const dates: Date[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return dates;
}

export function formatJobDateRange(from: Date, to: Date): string {
  if (isoFromJobDate(from) === isoFromJobDate(to)) return formatJobDate(from);
  return `${formatJobDate(from)} → ${formatJobDate(to)}`;
}

export function jobEndDateForSpan(from: Date, span: JobDateSpan): Date {
  return addDays(from, span === "3d" ? 2 : 6);
}

function jobRangeMatchesSpan(from: Date, to: Date, span: JobDateSpan): boolean {
  return isoFromJobDate(to) === isoFromJobDate(jobEndDateForSpan(from, span));
}

export function starTierToMinRating(tier: number): number {
  if (tier >= 5) return 4.5;
  if (tier >= 4) return 4;
  return tier;
}

export function buildLanguagesLabel(selected: string[], otherText = ""): string {
  const parts = [...selected];
  if (otherText.trim()) parts.push(otherText.trim());
  return parts.join(" / ");
}

/** Base rate on post-shift form — multiples of 5 only (40, 45, 50 …). */
export const PAY_RATE_STEP = 5;
export const PAY_RATE_MIN = 40;
export const PAY_RATE_MAX = 120;

/** @deprecated Use snapTierWage from agency-demo */
export function snapPayPerHour(value: number): number {
  return snapTierWage(value);
}

export type ShiftTimeParts = {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
};

const DEFAULT_SHIFT_TIME: ShiftTimeParts = { startH: 22, startM: 0, endH: 4, endM: 0 };

function clampTime(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parseTimeToken(raw: string, fallback: { h: number; m: number }) {
  const s = raw.trim();
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    return {
      h: clampTime(parseInt(colon[1], 10), 0, 23),
      m: clampTime(parseInt(colon[2], 10), 0, 59),
    };
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 3) {
    return {
      h: clampTime(parseInt(digits.slice(0, -2), 10), 0, 23),
      m: clampTime(parseInt(digits.slice(-2), 10), 0, 59),
    };
  }
  if (digits.length > 0) {
    return { h: clampTime(parseInt(digits, 10), 0, 23), m: 0 };
  }
  return fallback;
}

export function parseShiftTime(value: string): ShiftTimeParts {
  if (!value?.trim()) return { ...DEFAULT_SHIFT_TIME };
  const segments = value.replace(/—/g, "-").split(/\s*-\s*/);
  if (segments.length < 2) return { ...DEFAULT_SHIFT_TIME };
  const start = parseTimeToken(segments[0], { h: DEFAULT_SHIFT_TIME.startH, m: DEFAULT_SHIFT_TIME.startM });
  const end = parseTimeToken(segments[1], { h: DEFAULT_SHIFT_TIME.endH, m: DEFAULT_SHIFT_TIME.endM });
  return { startH: start.h, startM: start.m, endH: end.h, endM: end.m };
}

export function formatShiftTime(parts: ShiftTimeParts): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${z(parts.startH)}:${z(parts.startM)} - ${z(parts.endH)}:${z(parts.endM)}`;
}

const plainInputClass =
  "min-w-0 max-w-[10.5rem] flex-1 bg-transparent pr-2 text-right text-sm outline-none";

export function JobEventInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 bg-transparent text-right text-sm leading-snug outline-none"
    />
  );
}

export function JobTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={plainInputClass}
    />
  );
}

export function JobDatePicker({
  value,
  onChange,
  layout = "chip",
  className,
}: {
  value: Date;
  onChange: (d: Date) => void;
  layout?: "chip" | "field";
  className?: string;
}) {
  const label = formatJobDate(value);
  const isPast = (date: Date) => date < startOfToday();

  if (layout === "field") {
    return (
      <OutletDatePopoverField
        label="Date"
        value={value}
        displayLabel={label}
        onChange={onChange}
        disabled={isPast}
        align="start"
        className={cn("w-full", className)}
      />
    );
  }

  return (
    <OutletDatePopoverChip
      value={value}
      displayLabel={label}
      onChange={onChange}
      disabled={isPast}
    />
  );
}

export function JobDateRangePicker({
  jobDate,
  jobEndDate,
  onChange,
}: {
  jobDate: Date;
  jobEndDate: Date;
  onChange: (patch: { jobDate: Date; jobEndDate: Date }) => void;
}) {
  const isPast = (date: Date) => date < startOfToday();

  const applyRange = (from: Date, to: Date) => {
    const n = normalizeJobDateRange(from, to);
    onChange({ jobDate: n.from, jobEndDate: n.to });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {(["3d", "week"] as const).map((span) => (
          <button
            key={span}
            type="button"
            onClick={() => applyRange(jobDate, jobEndDateForSpan(jobDate, span))}
            className={cn(
              "iz-pill !text-[10px]",
              jobRangeMatchesSpan(jobDate, jobEndDate, span) ? "iz-pill-gold" : "iz-pill-ink",
            )}
          >
            {span === "3d" ? "3 days" : "1 week"}
          </button>
        ))}
      </div>
      <OutletDateRangePopover
        from={jobDate}
        to={jobEndDate}
        onRangeChange={applyRange}
        disabled={isPast}
        formatRangeLabel={formatJobDateRange}
        className="w-full"
      />
      <p className="iz-tiny iz-muted2">
        {eachJobDateInRange(jobDate, jobEndDate).length} day
        {eachJobDateInRange(jobDate, jobEndDate).length === 1 ? "" : "s"} in range
      </p>
    </div>
  );
}

export function JobLanguagePicker({
  options,
  selected,
  onSelectedChange,
}: {
  options: string[];
  selected: string[];
  onSelectedChange: (langs: string[]) => void;
}) {
  const toggle = (lang: string) => {
    onSelectedChange(selected.includes(lang) ? selected.filter((l) => l !== lang) : [...selected, lang]);
  };

  if (options.length === 0) {
    return (
      <p className="text-[11px] text-[var(--iz-muted)] text-right">
        Select PRs below to pull languages from their profiles.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-[220px] flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {options.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => toggle(l)}
            className={`iz-pill ${selected.includes(l) ? "iz-pill-violet" : "iz-pill-ink"} !text-[11px]`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(max !== undefined ? Math.min(max, value + step) : value + step);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={dec}
        className="iz-chip flex h-7 w-7 items-center justify-center !p-0"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2.5rem] text-center font-semibold">
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-normal text-[var(--iz-muted)]">{suffix}</span>}
      </span>
      <button
        type="button"
        onClick={inc}
        className="iz-chip flex h-7 w-7 items-center justify-center !p-0"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function hmFromParts(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function partsFromHm(hhmm: string): { h: number; m: number } {
  const normalized = normalizeTimeValue(hhmm);
  const [h, m] = normalized.split(":").map((x) => parseInt(x, 10));
  return { h, m };
}

export function ShiftTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = useMemo(() => parseShiftTime(value), [value]);

  return (
    <div className="flex w-full flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-2">
        <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          Start
        </span>
        <IzTimeInput
          value={hmFromParts(parts.startH, parts.startM)}
          onChange={(v) => {
            if (!v) return;
            const { h, m } = partsFromHm(v);
            onChange(formatShiftTime({ ...parts, startH: h, startM: m }));
          }}
          className="min-w-[8.5rem]"
          aria-label="Start time"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          End
        </span>
        <IzTimeInput
          value={hmFromParts(parts.endH, parts.endM)}
          onChange={(v) => {
            if (!v) return;
            const { h, m } = partsFromHm(v);
            onChange(formatShiftTime({ ...parts, endH: h, endM: m }));
          }}
          className="min-w-[8.5rem]"
          aria-label="End time"
        />
      </div>
    </div>
  );
}

export function DraftPrPicker({
  selected,
  onSelectedChange,
  quantity,
  excludePrIds,
  poolSize,
  maxSelect,
  dailyRemaining,
  poolHint,
  referenceDate,
  outletName,
}: {
  selected: string[];
  onSelectedChange: (prIds: string[]) => void;
  quantity: number;
  /** PRs already on the shift or pending request — hidden from the picker */
  excludePrIds?: string[];
  /** Subscription tier — max PRs shown in the scroll list */
  poolSize?: number;
  /** Subscription tier — max PRs selectable per shift */
  maxSelect?: number;
  /** Remaining PR slots today (subscription daily cap) */
  dailyRemaining?: number;
  poolHint?: string;
  /** Shift night — used to highlight top 1–3 earners for that week */
  referenceDate?: Date;
  outletName?: string;
}) {
  const prs = useStore((s) => s.prs);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const toast = useStore((s) => s.toast);

  const resolvedOutlet = outletName ?? outletWorkspace.outletName;
  const referenceDateIso = referenceDate ? isoFromJobDate(referenceDate) : undefined;
  const shiftWeekSun = referenceDateIso ? weekSundayIsoForDate(referenceDateIso) : undefined;
  const shiftWeekLabel = shiftWeekSun ? weekLabelForSundayIso(shiftWeekSun) : undefined;

  const weeklyRanks = useMemo(
    () => buildOutletWeeklyTopPrRanks(resolvedOutlet),
    [resolvedOutlet],
  );

  const blocked = useMemo(() => new Set(excludePrIds ?? []), [excludePrIds]);
  const selectCap = useMemo(() => {
    if (maxSelect === undefined) return quantity;
    let cap = maxSelect;
    if (dailyRemaining !== undefined) cap = Math.min(cap, dailyRemaining);
    return cap;
  }, [maxSelect, quantity, dailyRemaining]);

  const candidates = useMemo(() => {
    const sorted = [...prs].filter((p) => !blocked.has(p.id)).sort((a, b) => {
      if (shiftWeekSun) {
        const rankA =
          weeklyRanks.get(a.id)?.find((r) => r.weekSundayIso === shiftWeekSun)?.rank ?? 99;
        const rankB =
          weeklyRanks.get(b.id)?.find((r) => r.weekSundayIso === shiftWeekSun)?.rank ?? 99;
        if (rankA !== rankB) return rankA - rankB;
      }
      return b.rating - a.rating;
    });
    return poolSize !== undefined ? sorted.slice(0, poolSize) : sorted;
  }, [prs, blocked, poolSize, weeklyRanks, shiftWeekSun]);

  const toggle = (prId: string) => {
    const has = selected.includes(prId);
    if (!has && selected.length >= selectCap) {
      toast(
        maxSelect !== undefined
          ? dailyRemaining !== undefined && selected.length >= dailyRemaining
            ? `Daily PR limit — ${dailyRemaining} slot${dailyRemaining === 1 ? "" : "s"} left today on your plan`
            : `Your plan allows ${selectCap} PR${selectCap !== 1 ? "s" : ""} per shift — remove one to add another`
          : `This shift needs ${quantity} PR${quantity !== 1 ? "s" : ""} — remove one to add another`,
        "warn",
      );
      return;
    }
    onSelectedChange(has ? selected.filter((id) => id !== prId) : [...selected, prId]);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full min-w-0">
        {poolHint && (
          <p className="mb-2 text-[10px] leading-snug text-[var(--iz-muted2)]">{poolHint}</p>
        )}
        {shiftWeekLabel && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[var(--iz-muted)]">Top earners · {shiftWeekLabel}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--iz-line)] text-[var(--iz-muted)]"
                  aria-label="Top PR rank legend"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs leading-snug">
                <p className="font-semibold text-[var(--iz-txt)]">Weekly top PRs</p>
                <p className="mt-1 text-[var(--iz-muted2)]">
                  #1–#3 = highest outlet payouts that week. Badges on cards match the shift week (
                  {shiftWeekLabel}). Tap ? on a card to see other weeks they ranked top 3.
                </p>
              </TooltipContent>
            </Tooltip>
            <span className="flex items-center gap-1.5 text-[9px] text-[var(--iz-muted2)]">
              {([1, 2, 3] as const).map((n) => (
                <span
                  key={n}
                  className={cn(
                    "inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded px-1 font-bold",
                    TOP_PR_RANK_STYLES[n],
                  )}
                >
                  #{n}
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--iz-muted)]">
          {selected.length}/{selectCap} selected
          {poolSize !== undefined && (
            <span className="text-[var(--iz-muted2)]">
              {" "}
              · pool of {poolSize ?? candidates.length}
            </span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectedChange([])}
            className="text-[10px] font-semibold text-[var(--iz-gold)]"
          >
            Clear all
          </button>
        )}
      </div>
      {candidates.length === 0 ? (
        <p className="text-[11px] text-[var(--iz-muted)]">No PRs available to select.</p>
      ) : (
        <IzHScroll className="-mx-4 flex gap-2 pb-1 pl-2 pr-4">
          {candidates.map((p) => {
            const on = selected.includes(p.id);
            const full = !on && selected.length >= selectCap;
            const rankCtx = referenceDateIso
              ? prWeeklyRankContext(p.id, referenceDateIso, weeklyRanks)
              : { shiftWeek: undefined, otherWeeks: [] as PrWeekTopRank[] };
            const otherWeeksTooltip =
              rankCtx.otherWeeks.length > 0
                ? `Also top ${rankCtx.otherWeeks.map((w) => `#${w.rank} · ${w.weekLabel}`).join(" · ")}`
                : undefined;

            return (
              <div key={p.id} className="relative w-[118px] shrink-0 snap-start">
                {otherWeeksTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="absolute left-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[var(--iz-muted)] hover:text-[var(--iz-txt)]"
                        aria-label={otherWeeksTooltip}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {otherWeeksTooltip}
                    </TooltipContent>
                  </Tooltip>
                )}
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={full}
                  className={cn(
                    "relative iz-card iz-card-flat w-full !mb-0 p-2.5 text-left transition-opacity",
                    full && "opacity-40",
                    on && "ring-1 ring-[var(--iz-gold-d)]",
                    rankCtx.shiftWeek?.rank === 1 && !on && "ring-1 ring-[var(--iz-gold)]/40",
                  )}
                >
                  {rankCtx.shiftWeek && (
                    <span
                      className={cn(
                        "absolute right-1.5 top-1.5 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[9px] font-extrabold shadow-sm",
                        TOP_PR_RANK_STYLES[rankCtx.shiftWeek.rank],
                      )}
                    >
                      #{rankCtx.shiftWeek.rank}
                    </span>
                  )}
                <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--iz-violet-ink)] text-3xl">
                  {p.avatar}
                </div>
                <div className="mt-1.5 truncate text-xs font-semibold text-[var(--iz-txt)]">{p.name}</div>
                <div className="text-[10px] text-[var(--iz-gold)]">{p.rating}★</div>
                <div
                  className={cn(
                    "mt-1.5 flex w-full items-center justify-center gap-0.5 rounded-full py-1 text-[10px] font-semibold",
                    on ? "bg-[var(--iz-green-bg)] text-[var(--iz-green)]" : "bg-[rgba(255,255,255,0.06)] text-[var(--iz-muted)]",
                  )}
                >
                  {on ? (
                    <>
                      <Check className="h-3 w-3" /> Selected
                    </>
                  ) : (
                    "Tap to add"
                  )}
                </div>
              </button>
              </div>
            );
          })}
        </IzHScroll>
      )}
      </div>
    </TooltipProvider>
  );
}

function FormRow({
  label,
  children,
  last,
  alignTop,
  stacked,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  alignTop?: boolean;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className={`flex flex-col gap-1.5 py-2.5 ${last ? "" : "border-b border-[var(--iz-line)]"}`}>
        <span className="text-xs text-[var(--iz-muted)]">{label}</span>
        <div className="min-w-0 w-full">{children}</div>
      </div>
    );
  }
  return (
    <div
      className={`flex gap-3 py-2.5 ${alignTop ? "items-start" : "items-center"} ${last ? "" : "border-b border-[var(--iz-line)]"}`}
    >
      <span className="shrink-0 text-xs text-[var(--iz-muted)]">{label}</span>
      <div className="ml-auto flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

function SummaryLine({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 border-b border-[var(--iz-line)] py-2.5 last:border-0">
        <span className="text-xs text-[var(--iz-muted)]">{label}</span>
        <span className="break-words text-right text-sm leading-snug text-[var(--iz-txt)]">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--iz-line)] py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-[var(--iz-muted)]">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-[var(--iz-txt)]">{value}</span>
    </div>
  );
}

function DraftDrinkPricingSummary({ shift }: { shift: DraftShift }) {
  const workspaceMenu = useStore((s) => s.outletWorkspace.drinkMenu ?? []);
  return (
    <SummaryLine
      label="Drink prices"
      value={formatShiftDrinkPricingSummary(shift, workspaceMenu)}
    />
  );
}

export function DraftShiftSummary({
  shift,
  title,
  onEdit,
  onRemove,
  showRemove,
}: {
  shift: DraftShift;
  title: string;
  onEdit: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  const prs = useStore((s) => s.prs);

  return (
    <IzCard className="!mb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">{title}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onEdit} className="iz-chip flex items-center gap-1 px-2 py-1 text-[11px] font-semibold">
            <Pencil className="h-3 w-3" /> Edit
          </button>
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
              aria-label={`Remove ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <SummaryLine label="Date" value={formatJobDateRange(shift.jobDate, shift.jobEndDate)} />
      <SummaryLine
        label="Event type"
        value={formatShiftEventTypeSummary(shift.eventKind, shift.specialEventType)}
      />
      <DraftDrinkPricingSummary shift={shift} />
      <SummaryLine label="Event" value={shift.event} stacked />
      <SummaryLine label="Time" value={shift.shiftTime} />
      <SummaryLine label="People needed" value={String(shift.quantity)} />
      <SummaryLine
        label="PRs"
        value={`${shift.prIds.length}/${shift.quantity} · ${formatDraftPrNames(shift.prIds, prs)}`}
        stacked
      />
      <SummaryLine label="Languages" value={buildLanguagesLabel(shift.langs, shift.otherLang) || "—"} />
      <div className="border-b border-[var(--iz-line)] py-2.5 last:border-0">
        <span className="text-xs text-[var(--iz-muted)]">Pay & sales targets by tier</span>
        <ShiftTierWagesStrip tierRates={shift.tierRates} compact />
      </div>
      <SummaryLine label="Dress code" value={shift.dressCode} />
      <SummaryLine label="Post to" value={SHIFT_DESTINATION_LABELS[shift.destination]} />
    </IzCard>
  );
}

export function DraftShiftEditor({
  shift,
  onChange,
  onRemove,
  showRemove,
  title,
  onDone,
  namedPrsOnDate = 0,
}: {
  shift: DraftShift;
  onChange: (patch: Partial<DraftShift>) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  title: string;
  onDone?: () => void;
  /** Named agency PRs already booked on this shift date (excludes current shift selection) */
  namedPrsOnDate?: number;
}) {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const outletOwner = useStore((s) => s.outletOwner);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const [activeTier, setActiveTier] = useState<OutletPrTier>(OUTLET_BASE_TIER);

  const subscriptionPlan = getOutletSubscriptionPlan(outletOwner.subscriptionPlanId);
  const namedPrRemaining = Math.max(0, subscriptionPlan.prPerDayMax - namedPrsOnDate);
  const maxNamedPrSelect =
    namedPrRemaining === 0 ? 0 : Math.min(subscriptionPlan.prSelectMax, namedPrRemaining);
  const prPickerHint =
    namedPrRemaining === 0
      ? `${subscriptionPlan.label} plan · daily limit of ${subscriptionPlan.prPerDayMax} named PRs reached for this date`
      : `${subscriptionPlan.label} plan · ${formatOutletPlanPrPickerRule(subscriptionPlan)} · ${namedPrRemaining} named PR slot${namedPrRemaining === 1 ? "" : "s"} left today`;

  const languageOptions = useMemo(() => collectAgencyPrLanguages(agencyPRs), [agencyPRs]);
  const pickerOptions = useMemo(
    () => (shift.prIds.length > 0 ? languagesForPrIds(shift.prIds, agencyPRs) : languageOptions),
    [shift.prIds, agencyPRs, languageOptions],
  );
  const pickerSelected = useMemo(() => {
    const valid = shift.langs.filter((l) => pickerOptions.includes(l));
    if (valid.length > 0) return valid;
    return shift.prIds.length > 0 ? pickerOptions : [];
  }, [shift.langs, pickerOptions, shift.prIds.length]);

  const tierMultipliers = useMemo(
    () =>
      normalizeOutletTierMultipliers(
        getOutletRule(outletWorkspace.outletName, outletCommissionRules).tierMultipliers,
      ),
    [outletCommissionRules, outletWorkspace.outletName],
  );

  const patchTier = (tier: OutletPrTier, tierPatch: Partial<OutletTierRateSettings>) => {
    const tierRates = patchDraftTierRates(shift.tierRates, tier, tierPatch, { tierMultipliers });
    onChange({
      tierRates,
      payPerHour: tierRates[OUTLET_BASE_TIER].wagePerHour,
    });
  };

  return (
    <IzCard className="!mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">{title}</span>
        <div className="flex items-center gap-1.5">
          {onDone && (
            <button type="button" onClick={onDone} className="iz-chip px-2 py-1 text-[11px] font-semibold text-[var(--iz-gold)]">
              Done
            </button>
          )}
          {showRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="iz-chip flex h-6 w-6 items-center justify-center !p-0 text-[var(--iz-muted)]"
              aria-label={`Remove ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="border-b border-[var(--iz-line)] py-2.5">
        <JobDateRangePicker
          jobDate={shift.jobDate}
          jobEndDate={shift.jobEndDate}
          onChange={(patch) => onChange(patch)}
        />
      </div>
      <FormRow label="Event type" alignTop>
        <div className="flex w-full min-w-0 flex-col items-end gap-2">
          <div className="flex flex-nowrap justify-end gap-1">
            {(Object.keys(SHIFT_EVENT_KIND_LABELS) as ShiftEventKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  onChange({
                    eventKind: kind,
                    specialEventType: kind === "special" ? shift.specialEventType ?? "vip" : undefined,
                    eventDrinkMenu:
                      kind === "special"
                        ? shift.eventDrinkMenu ?? cloneDrinkMenu(outletWorkspace.drinkMenu ?? [])
                        : undefined,
                  })
                }
                className={`iz-pill !text-[10px] ${shift.eventKind === kind ? "iz-pill-violet" : "iz-pill-ink"}`}
              >
                {SHIFT_EVENT_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
          {shift.eventKind === "special" && (
            <IzHScroll className="flex w-full justify-end gap-1 pb-0.5">
              {SHIFT_SPECIAL_EVENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ specialEventType: option.id })}
                  className={`iz-pill shrink-0 whitespace-nowrap !text-[10px] ${
                    shift.specialEventType === option.id ? "iz-pill-gold" : "iz-pill-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </IzHScroll>
          )}
        </div>
      </FormRow>
      <FormRow label="Drink prices" stacked alignTop>
        {shift.eventKind === "special" ? (
          <div className="w-full min-w-0">
            <p className="mb-2 text-[10px] text-[var(--iz-muted)]">
              Set drink prices for this special event. Normal events always use Workspace prices.
            </p>
            <OutletDrinkMenuEditor
              drinks={shift.eventDrinkMenu ?? []}
              onChange={(eventDrinkMenu) => onChange({ eventDrinkMenu })}
            />
            <button
              type="button"
              className="iz-chip mt-2 w-full text-[11px]"
              onClick={() =>
                onChange({ eventDrinkMenu: cloneDrinkMenu(outletWorkspace.drinkMenu ?? []) })
              }
            >
              Reset to workspace prices
            </button>
          </div>
        ) : (
          <p className="text-right text-sm text-[var(--iz-txt)]">
            From Workspace
            {(() => {
              const range = drinkMenuPriceRange(outletWorkspace.drinkMenu ?? []);
              return ` · RM ${range.min}–${range.max}`;
            })()}
          </p>
        )}
      </FormRow>
      <FormRow label="Event" stacked>
        <JobEventInput value={shift.event} onChange={(event) => onChange({ event })} />
      </FormRow>
      <FormRow label="Time" alignTop>
        <ShiftTimePicker value={shift.shiftTime} onChange={(shiftTime) => onChange({ shiftTime })} />
      </FormRow>
      <FormRow label="People needed">
        <QuantityStepper
          value={shift.quantity}
          onChange={(quantity) => onChange({ quantity })}
        />
      </FormRow>
      <FormRow label="Languages" alignTop>
        <JobLanguagePicker
          options={pickerOptions}
          selected={pickerSelected}
          onSelectedChange={(langs) => onChange({ langs, otherLang: "" })}
        />
      </FormRow>
      <FormRow label="Pay by PR tier" stacked alignTop last={false}>
        <div className="w-full min-w-0">
          <p className="mb-2 text-[10px] text-[var(--iz-muted)]">
            Base pay scales by tier multiplier · optional sales target per tier · commission % from Workspace
          </p>
          <TierRatesFields
            tierRates={shift.tierRates}
            activeTier={activeTier}
            onActiveTierChange={setActiveTier}
            onPatchTier={patchTier}
            postJob
            tierMultipliers={tierMultipliers}
          />
          <button
            type="button"
            className="iz-chip mt-2.5 w-full text-[11px]"
            onClick={() =>
              onChange({
                tierRates: draftTierRatesFromWorkspace(outletWorkspace),
                payPerHour: outletWorkspace.tierRates[OUTLET_BASE_TIER].wagePerHour,
              })
            }
          >
            Reset to workspace rates
          </button>
        </div>
      </FormRow>
      <FormRow label="Dress code">
        <IzSelect
          value={shift.dressCode}
          onChange={(e) => onChange({ dressCode: e.target.value })}
          className="max-w-[168px] text-right text-sm"
        >
          {DRESS_CODE_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </IzSelect>
      </FormRow>
      <FormRow label="Post to">
        <div className="flex flex-wrap justify-end gap-1">
          {(Object.keys(SHIFT_DESTINATION_LABELS) as ShiftDestination[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ destination: key })}
              className={`iz-pill !text-[10px] ${shift.destination === key ? "iz-pill-violet" : "iz-pill-ink"}`}
            >
              {SHIFT_DESTINATION_LABELS[key]}
            </button>
          ))}
        </div>
      </FormRow>
      <FormRow label="Select PRs" stacked last>
        {maxNamedPrSelect === 0 ? (
          <p className="text-[11px] text-[var(--iz-muted)]">{prPickerHint}</p>
        ) : (
          <DraftPrPicker
            selected={shift.prIds}
            onSelectedChange={(prIds) =>
              onChange({
                prIds,
                quantity: Math.max(shift.quantity, prIds.length),
                langs: languagesForPrIds(prIds, agencyPRs),
                otherLang: "",
              })
            }
            quantity={shift.quantity}
            poolSize={subscriptionPlan.prPoolSize}
            maxSelect={subscriptionPlan.prSelectMax}
            dailyRemaining={namedPrRemaining}
            poolHint={prPickerHint}
            referenceDate={shift.jobDate}
            outletName={outletWorkspace.outletName}
          />
        )}
      </FormRow>
    </IzCard>
  );
}
