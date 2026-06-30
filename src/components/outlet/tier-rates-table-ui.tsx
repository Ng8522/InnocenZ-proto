import { useEffect, useState } from "react";
import { snapTierWage } from "@/lib/agency-demo";
import { cn } from "@/lib/utils";

export function TierMoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value != null && value > 0 ? String(value) : "");

  useEffect(() => {
    setText(value != null && value > 0 ? String(value) : "");
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(undefined);
      return;
    }
    const n = parseFloat(trimmed.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      onChange(Math.round(n));
      setText(String(Math.round(n)));
    } else {
      setText("");
      onChange(undefined);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => !disabled && setText(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={commit}
      className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[var(--iz-muted)] disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
    />
  );
}

export function TierPayInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      const snapped = snapTierWage(n);
      setText(String(snapped));
      onChange(snapped);
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => !disabled && setText(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={commit}
      className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
    />
  );
}

export function TierPctInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      const clamped = Math.min(100, Math.round(n));
      setText(String(clamped));
      onChange(clamped);
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => !disabled && setText(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={commit}
      className="w-9 min-w-0 bg-transparent text-center text-xs font-semibold tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
    />
  );
}

export function TierCountInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const n = parseInt(text, 10);
    if (!Number.isNaN(n) && n >= 1) {
      setText(String(n));
      onChange(n);
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      onChange={(e) => !disabled && setText(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
    />
  );
}

export function TierHoursInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (disabled) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 0) {
      const rounded = Math.round(n);
      setText(String(rounded));
      onChange(rounded);
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={(e) => !disabled && setText(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={commit}
      className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-text"
    />
  );
}

export function fieldShell(className?: string, flat?: boolean) {
  return cn(
    flat
      ? "flex items-center gap-1"
      : "flex items-center gap-1 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2 py-1.5",
    className,
  );
}

export const TIER_TABLE_GRID_BASE = "grid items-stretch";
export const TIER_TABLE_GRID_COLS =
  "grid-cols-[minmax(7.5rem,1.15fr)_minmax(5.5rem,0.9fr)_minmax(5.5rem,0.9fr)_minmax(7.5rem,1.1fr)_minmax(3.5rem,0.55fr)]";
export const TIER_TABLE_GRID_COLS_WITH_ACTION =
  "grid-cols-[minmax(7.5rem,1.15fr)_minmax(5.5rem,0.9fr)_minmax(5.5rem,0.9fr)_minmax(7.5rem,1.1fr)_minmax(3.5rem,0.55fr)_2.5rem]";

export function tierTableCell(className?: string) {
  return cn(
    "flex min-h-[2.75rem] items-center border-r border-[var(--iz-line)] px-2 py-1.5 last:border-r-0",
    className,
  );
}

export function tierTableEditableCell(className?: string) {
  return cn(
    tierTableCell(className),
    "cursor-text bg-white/[0.03] transition-colors hover:bg-[rgba(183,156,232,0.07)] focus-within:bg-[rgba(183,156,232,0.1)] focus-within:ring-1 focus-within:ring-inset focus-within:ring-[rgba(183,156,232,0.28)]",
  );
}

export function tierTableReadonlyCell(className?: string) {
  return cn(tierTableCell(className), "bg-black/15 text-[var(--iz-muted)]");
}

export function tierTableHeadCell(className?: string, editable?: boolean) {
  return cn(
    "border-r border-[var(--iz-line)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide last:border-r-0",
    editable ? "text-[var(--iz-gold-l)]/80" : "text-[var(--iz-muted)]",
    className,
  );
}

export function TierRatesTableLegend() {
  return (
    <div className="border-t border-[var(--iz-line)] px-2 py-1.5 text-[10px] leading-snug text-[var(--iz-muted2)]">
      <span className="text-[var(--iz-gold-l)]/90">Highlighted cells</span> are editable · tap to change ·{" "}
      <span className="text-[var(--iz-muted)]">dimmed cells</span> are read-only
    </div>
  );
}
