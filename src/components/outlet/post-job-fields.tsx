import { useEffect, useMemo, useState } from "react";
import { format, startOfToday } from "date-fns";
import { CalendarIcon, Check, ChevronDown, Minus, Pencil, Plus, Star, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IzCard, IzSelect } from "@/components/iz/ui";
import { IzHScroll } from "@/components/iz/HScroll";
import { TierRatesFields } from "@/components/outlet/TierRatesFields";
import { ShiftTierWagesStrip } from "@/components/outlet/ShiftTierWagesStrip";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  buildDefaultTierRates,
  cloneTierRates,
  estimateShiftLaborCost,
  getOutletRule,
  normalizeOutletTierMultipliers,
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  snapTierWage,
  tierWageFromMultiplier,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import type { OutletWorkspaceSettings } from "@/lib/outlet-demo";
import {
  DRESS_CODE_OPTIONS,
  SHIFT_DESTINATION_LABELS,
  type ShiftDestination,
} from "@/lib/outlet-demo";

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

export const LANG_OPTIONS = ["English", "Mandarin", "Cantonese", "Others"] as const;

export const OTHER_LANG_HINTS = [
  "Japanese",
  "Korean",
  "Thai",
  "Hindi",
  "Tamil",
  "Tagalog",
  "French",
  "German",
  "Spanish",
  "Arabic",
  "Portuguese",
  "Bahasa Indonesia",
  "Vietnamese",
  "Bengali",
  "Punjabi",
  "Hokkien",
  "Teochew",
];

export type DraftShift = {
  id: string;
  jobDate: Date;
  event: string;
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
  workspaceTierRates?: Record<OutletPrTier, OutletTierRateSettings>,
): DraftShift {
  const tierRates = partial?.tierRates
    ? cloneTierRates(partial.tierRates)
    : workspaceTierRates
      ? cloneTierRates(workspaceTierRates)
      : buildDefaultTierRates(DEFAULT_DRAFT_TIER_BASE);
  const basePay = tierRates[OUTLET_BASE_TIER].wagePerHour;
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    jobDate: partial?.jobDate ?? startOfToday(),
    event: partial?.event ?? "Private VIP - Hennessy Launch",
    langs: partial?.langs ? [...partial.langs] : ["English", "Mandarin"],
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

export function starTierToMinRating(tier: number): number {
  if (tier >= 5) return 4.5;
  if (tier >= 4) return 4;
  return tier;
}

export function buildLanguagesLabel(selected: string[], otherText: string): string {
  const parts = selected.filter((l) => l !== "Others");
  if (selected.includes("Others") && otherText.trim()) {
    parts.push(otherText.trim());
  }
  return parts.join(" / ");
}

export function formatStarTiers(tiers: number[]): string {
  return tiers.map((t) => `${t}★`).join(", ");
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

export function JobDatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const label = formatJobDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="iz-chip flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 text-sm font-semibold text-[var(--iz-txt)]"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-[var(--iz-gold)]" />
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-[var(--iz-muted)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto border-[var(--iz-line)] bg-[var(--iz-panel)] p-0 text-[var(--iz-txt)]"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
          disabled={{ before: startOfToday() }}
          className="rounded-md [--cell-size:2.25rem]"
        />
      </PopoverContent>
    </Popover>
  );
}

export function JobLanguagePicker({
  selected,
  onSelectedChange,
  otherText,
  onOtherTextChange,
}: {
  selected: string[];
  onSelectedChange: (langs: string[]) => void;
  otherText: string;
  onOtherTextChange: (text: string) => void;
}) {
  const othersOn = selected.includes("Others");

  const hints = useMemo(() => {
    const q = otherText.trim().toLowerCase();
    if (!q) return OTHER_LANG_HINTS.slice(0, 6);
    return OTHER_LANG_HINTS.filter((h) => h.toLowerCase().includes(q)).slice(0, 6);
  }, [otherText]);

  const toggle = (lang: (typeof LANG_OPTIONS)[number]) => {
    if (lang === "Others") {
      if (selected.includes("Others")) {
        onSelectedChange(selected.filter((l) => l !== "Others"));
        onOtherTextChange("");
      } else {
        onSelectedChange([...selected, "Others"]);
      }
      return;
    }
    onSelectedChange(selected.includes(lang) ? selected.filter((l) => l !== lang) : [...selected, lang]);
  };

  return (
    <div className="flex w-full max-w-[220px] flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {LANG_OPTIONS.map((l) => (
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
      {othersOn && (
        <div className="relative w-full">
          <input
            type="text"
            value={otherText}
            onChange={(e) => onOtherTextChange(e.target.value)}
            placeholder="Type a language…"
            list="other-lang-hints"
            autoComplete="off"
            className="w-full rounded-xl border border-[var(--iz-line)] bg-[var(--iz-violet-ink)] px-3 py-2 text-right text-sm outline-none placeholder:text-[var(--iz-muted)] focus:border-[var(--iz-gold)]"
          />
          <datalist id="other-lang-hints">
            {OTHER_LANG_HINTS.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          {otherText.trim().length > 0 && hints.length > 0 && (
            <ul className="absolute right-0 top-full z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-xl border border-[var(--iz-line)] bg-[var(--iz-panel2)] py-1 shadow-lg">
              {hints.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-right text-xs text-[var(--iz-txt)] hover:bg-[var(--iz-violet-ink)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onOtherTextChange(h)}
                  >
                    {h}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function JobStarPicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (tiers: number[]) => void;
}) {
  const toggle = (tier: number) => {
    if (selected.includes(tier)) {
      onChange(selected.length <= 1 ? selected : selected.filter((t) => t !== tier));
    } else {
      onChange([...selected, tier].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {[1, 2, 3, 4, 5].map((tier) => {
        const on = selected.includes(tier);
        return (
          <button
            key={tier}
            type="button"
            onClick={() => toggle(tier)}
            className={cn(
              "iz-pill flex items-center gap-0.5 !px-2 !py-1 !text-[11px]",
              on ? "iz-pill-gold" : "iz-pill-ink",
            )}
            aria-pressed={on}
            aria-label={`${tier} star tier`}
          >
            <Star
              className={cn("h-3 w-3", on ? "fill-[var(--iz-gold)] text-[var(--iz-gold)]" : "text-[var(--iz-muted)]")}
            />
            {tier}
          </button>
        );
      })}
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

function stepHourValue(current: number, delta: number) {
  return ((current + delta) % 24 + 24) % 24;
}

function stepMinuteValue(current: number, delta: number) {
  return ((current + delta) % 60 + 60) % 60;
}

function TimeDigit({
  value,
  max,
  mode,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number;
  max: number;
  mode: "hour" | "minute";
  onChange: (n: number) => void;
  "aria-label": string;
}) {
  const [text, setText] = useState(() => String(value).padStart(2, "0"));

  useEffect(() => {
    setText(String(value).padStart(2, "0"));
  }, [value]);

  const adjust = (direction: -1 | 1) => {
    const delta = mode === "minute" ? direction * 15 : direction;
    const next = mode === "minute" ? stepMinuteValue(value, delta) : stepHourValue(value, delta);
    onChange(next);
  };

  const commit = (raw: string) => {
    const n = raw === "" ? 0 : parseInt(raw, 10);
    onChange(clampTime(Number.isNaN(n) ? 0 : n, 0, max));
  };

  const holdFocusOnStep = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onMouseDown={holdFocusOnStep}
        onClick={() => adjust(-1)}
        className="iz-chip flex h-6 w-6 items-center justify-center !p-0"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
          setText(raw);
          if (raw.length === 2) commit(raw);
        }}
        onBlur={() => commit(text)}
        className="iz-chip h-7 w-9 border-0 bg-[rgba(255,255,255,0.04)] px-0 text-center text-sm font-semibold tabular-nums text-[var(--iz-txt)] outline-none focus:ring-1 focus:ring-[var(--iz-gold-d)]"
      />
      <button
        type="button"
        onMouseDown={holdFocusOnStep}
        onClick={() => adjust(1)}
        className="iz-chip flex h-6 w-6 items-center justify-center !p-0"
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ShiftTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = useMemo(() => parseShiftTime(value), [value]);

  const update = (patch: Partial<ShiftTimeParts>) => {
    onChange(formatShiftTime({ ...parts, ...patch }));
  };

  return (
    <div className="flex w-full flex-col items-end gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
        <span className="mr-1 w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          Start
        </span>
        <TimeDigit
          aria-label="Start hour"
          mode="hour"
          value={parts.startH}
          max={23}
          onChange={(startH) => update({ startH })}
        />
        <span className="font-semibold text-[var(--iz-muted)]">:</span>
        <TimeDigit
          aria-label="Start minute"
          mode="minute"
          value={parts.startM}
          max={59}
          onChange={(startM) => update({ startM })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
        <span className="mr-1 w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          End
        </span>
        <TimeDigit
          aria-label="End hour"
          mode="hour"
          value={parts.endH}
          max={23}
          onChange={(endH) => update({ endH })}
        />
        <span className="font-semibold text-[var(--iz-muted)]">:</span>
        <TimeDigit
          aria-label="End minute"
          mode="minute"
          value={parts.endM}
          max={59}
          onChange={(endM) => update({ endM })}
        />
      </div>
    </div>
  );
}

export function DraftPrPicker({
  selected,
  onSelectedChange,
  starTiers,
  quantity,
}: {
  selected: string[];
  onSelectedChange: (prIds: string[]) => void;
  starTiers: number[];
  quantity: number;
}) {
  const prs = useStore((s) => s.prs);
  const toast = useStore((s) => s.toast);
  const minRating = starTiers.length > 0 ? Math.min(...starTiers.map(starTierToMinRating)) : 4.5;

  const candidates = useMemo(
    () => [...prs].sort((a, b) => b.rating - a.rating).filter((p) => p.rating >= minRating),
    [prs, minRating],
  );

  const toggle = (prId: string) => {
    const has = selected.includes(prId);
    if (!has && selected.length >= quantity) {
      toast(`This shift needs ${quantity} PR${quantity !== 1 ? "s" : ""} — remove one to add another`, "warn");
      return;
    }
    onSelectedChange(has ? selected.filter((id) => id !== prId) : [...selected, prId]);
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--iz-muted)]">
          {selected.length}/{quantity} selected
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
        <p className="text-[11px] text-[var(--iz-muted)]">No PRs match this star tier — lower the preferred profile.</p>
      ) : (
        <IzHScroll className="-mx-4 flex gap-2 pb-1 pl-2 pr-4">
          {candidates.map((p) => {
            const on = selected.includes(p.id);
            const full = !on && selected.length >= quantity;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                disabled={full}
                className={cn(
                  "iz-card iz-card-flat w-[118px] shrink-0 snap-start !mb-0 p-2.5 text-left transition-opacity",
                  full && "opacity-40",
                  on && "ring-1 ring-[var(--iz-gold-d)]",
                )}
              >
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
            );
          })}
        </IzHScroll>
      )}
    </div>
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
      <SummaryLine label="Date" value={formatJobDate(shift.jobDate)} />
      <SummaryLine label="Event" value={shift.event} stacked />
      <SummaryLine label="Time" value={shift.shiftTime} />
      <SummaryLine label="People needed" value={String(shift.quantity)} />
      <SummaryLine
        label="PRs"
        value={`${shift.prIds.length}/${shift.quantity} · ${formatDraftPrNames(shift.prIds, prs)}`}
        stacked
      />
      <SummaryLine label="Languages" value={buildLanguagesLabel(shift.langs, shift.otherLang) || "—"} />
      <SummaryLine label="Preferred profile" value={formatStarTiers(shift.starTiers)} />
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
}: {
  shift: DraftShift;
  onChange: (patch: Partial<DraftShift>) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  title: string;
  onDone?: () => void;
}) {
  const prs = useStore((s) => s.prs);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const [activeTier, setActiveTier] = useState<OutletPrTier>(OUTLET_BASE_TIER);

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
      <FormRow label="Date">
        <JobDatePicker value={shift.jobDate} onChange={(jobDate) => onChange({ jobDate })} />
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
          onChange={(quantity) => {
            const prIds = shift.prIds.length > quantity ? shift.prIds.slice(0, quantity) : shift.prIds;
            onChange({ quantity, prIds });
          }}
        />
      </FormRow>
      <FormRow label="Languages" alignTop>
        <JobLanguagePicker
          selected={shift.langs}
          onSelectedChange={(langs) => onChange({ langs })}
          otherText={shift.otherLang}
          onOtherTextChange={(otherLang) => onChange({ otherLang })}
        />
      </FormRow>
      <FormRow label="Preferred profile">
        <JobStarPicker
          selected={shift.starTiers}
          onChange={(starTiers) => {
            const minRating = starTiers.length > 0 ? Math.min(...starTiers.map(starTierToMinRating)) : 0;
            const prIds = shift.prIds.filter((id) => (prs.find((p) => p.id === id)?.rating ?? 0) >= minRating);
            onChange({ starTiers, prIds });
          }}
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
        <DraftPrPicker
          selected={shift.prIds}
          onSelectedChange={(prIds) => onChange({ prIds })}
          starTiers={shift.starTiers}
          quantity={shift.quantity}
        />
      </FormRow>
    </IzCard>
  );
}
