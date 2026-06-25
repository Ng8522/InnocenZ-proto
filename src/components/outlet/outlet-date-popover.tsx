import { useState } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateFromIsoKey, isoKeyFromDate } from "@/components/iz/HistDateCalendar";
import { cn } from "@/lib/utils";

export function formatOutletDateLabel(value: Date | string): string {
  const d = typeof value === "string" ? dateFromIsoKey(value) : value;
  if (!d) return typeof value === "string" ? value : "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const compactCalClass =
  "iz-outlet-report-cal-picker iz-outlet-report-cal-picker--popover p-0 [--cell-size:2rem]";

const compactCalClassNames = {
  root: "w-fit",
  months: "gap-0",
  month: "gap-1",
  month_caption: "h-7 !text-xs",
  caption_label: "!text-xs",
  nav: "h-7",
  button_previous: "!h-7 !w-7",
  button_next: "!h-7 !w-7",
  weekdays: "gap-0",
  weekday:
    "w-[var(--cell-size)] flex-none p-0 text-center !text-[10px] font-medium text-[var(--iz-muted)]",
  week: "mt-0.5 gap-0",
  day: "h-[var(--cell-size)] w-[var(--cell-size)] flex-none p-0",
} as const;

type RangeHighlight = {
  startIso: string;
  endIso: string;
};

export function OutletCompactRangeCalendar({
  rangeFrom,
  rangeTo,
  defaultMonth,
  startMonth,
  endMonth,
  onRangeSelect,
  disabled,
}: {
  rangeFrom?: Date;
  rangeTo?: Date;
  defaultMonth?: Date;
  startMonth?: Date;
  endMonth?: Date;
  onRangeSelect: (from: Date, to: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
}) {
  const selected: DateRange | undefined =
    rangeFrom ? { from: rangeFrom, to: rangeTo } : undefined;

  return (
    <Calendar
      mode="range"
      selected={selected}
      defaultMonth={defaultMonth ?? rangeFrom ?? rangeTo}
      startMonth={startMonth}
      endMonth={endMonth}
      disabled={disabled}
      onSelect={(range) => {
        if (!range?.from) return;
        onRangeSelect(range.from, range.to);
      }}
      className={compactCalClass}
      classNames={compactCalClassNames}
    />
  );
}

export function OutletDateRangePopover({
  from,
  to,
  onRangeChange,
  disabled,
  startMonth,
  endMonth,
  formatRangeLabel,
  className,
  fieldLabel = "Date range",
}: {
  from: Date;
  to: Date;
  onRangeChange: (from: Date, to: Date) => void;
  disabled?: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
  formatRangeLabel: (from: Date, to: Date) => string;
  className?: string;
  fieldLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const normalizeRange = (a: Date, b: Date) => {
    const start = new Date(a);
    start.setHours(0, 0, 0, 0);
    const end = new Date(b);
    end.setHours(0, 0, 0, 0);
    if (end < start) return { from: end, to: start };
    return { from: start, to: end };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "iz-outlet-report-range-target iz-outlet-report-range-combined",
            open && "is-active",
            className,
          )}
          aria-label="Choose date range"
        >
          <span className="iz-outlet-report-range-target-label">{fieldLabel}</span>
          <span className="iz-outlet-report-range-target-value">{formatRangeLabel(from, to)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="iz-outlet-report-cal-popover w-auto border-[var(--iz-line)] bg-[var(--iz-panel)] p-2"
      >
        <p className="iz-tiny iz-muted2 mb-2 px-0.5">Tap start day, then end day</p>
        <OutletCompactRangeCalendar
          rangeFrom={from}
          rangeTo={to}
          defaultMonth={from}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabled}
          onRangeSelect={(fromDay, toDay) => {
            if (disabled?.(fromDay)) return;
            if (!toDay) {
              onRangeChange(fromDay, fromDay);
              return;
            }
            if (disabled?.(toDay)) return;
            const n = normalizeRange(fromDay, toDay);
            onRangeChange(n.from, n.to);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function OutletCompactCalendar({
  selected,
  defaultMonth,
  startMonth,
  endMonth,
  onSelect,
  disabled,
  range,
}: {
  selected?: Date;
  defaultMonth?: Date;
  startMonth?: Date;
  endMonth?: Date;
  onSelect: (day: Date) => void;
  disabled?: (date: Date) => boolean;
  range?: RangeHighlight;
}) {
  return (
    <Calendar
      mode="single"
      selected={selected}
      defaultMonth={defaultMonth}
      startMonth={startMonth}
      endMonth={endMonth}
      onSelect={(day) => {
        if (day) onSelect(day);
      }}
      disabled={disabled}
      modifiers={
        range
          ? {
              reportRangeStart: (date) => isoKeyFromDate(date) === range.startIso,
              reportRangeEnd: (date) =>
                isoKeyFromDate(date) === range.endIso && range.endIso !== range.startIso,
              reportRangeMiddle: (date) => {
                const iso = isoKeyFromDate(date);
                return iso > range.startIso && iso < range.endIso;
              },
            }
          : undefined
      }
      modifiersClassNames={
        range
          ? {
              reportRangeStart: "iz-report-range-start",
              reportRangeEnd: "iz-report-range-end",
              reportRangeMiddle: "iz-report-range-middle",
            }
          : undefined
      }
      className={compactCalClass}
      classNames={compactCalClassNames}
    />
  );
}

export function OutletDatePopoverField({
  label,
  value,
  displayLabel,
  onChange,
  disabled,
  startMonth,
  endMonth,
  range,
  align = "start",
  className,
}: {
  label: string;
  value: Date;
  displayLabel?: string;
  onChange: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
  range?: RangeHighlight;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = displayLabel ?? formatOutletDateLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("iz-outlet-report-range-target", open && "is-active", className)}
          aria-label={`Choose ${label.toLowerCase()} date`}
        >
          <span className="iz-outlet-report-range-target-label">{label}</span>
          <span className="iz-outlet-report-range-target-value">{shown}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="iz-outlet-report-cal-popover w-auto border-[var(--iz-line)] bg-[var(--iz-panel)] p-2"
      >
        <OutletCompactCalendar
          selected={value}
          defaultMonth={value}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabled}
          range={range}
          onSelect={(day) => {
            if (disabled?.(day)) return;
            onChange(day);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function OutletDatePopoverChip({
  value,
  displayLabel,
  onChange,
  disabled,
}: {
  value: Date;
  displayLabel: string;
  onChange: (date: Date) => void;
  disabled?: (date: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="iz-chip flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 text-sm font-semibold text-[var(--iz-txt)]"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-[var(--iz-gold)]" />
          {displayLabel}
          <ChevronDown className="h-3.5 w-3.5 text-[var(--iz-muted)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="iz-outlet-report-cal-popover w-auto border-[var(--iz-line)] bg-[var(--iz-panel)] p-2"
      >
        <OutletCompactCalendar
          selected={value}
          defaultMonth={value}
          disabled={disabled}
          onSelect={(day) => {
            if (disabled?.(day)) return;
            onChange(day);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
