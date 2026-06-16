import { cn } from "@/lib/utils";
import { Clock, X } from "lucide-react";
import { useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

/** Normalize HH:MM (or H:MM) for native `type="time"` inputs */
export function normalizeTimeValue(v: string): string {
  const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "00:00";
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function IzCard({
  children,
  className,
  glow,
  flat,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  flat?: boolean;
}) {
  return (
    <div className={cn("iz-card", flat && "iz-card-flat", glow && "iz-card-glow", className)}>
      {children}
    </div>
  );
}

export function IzPill({
  children,
  variant = "ink",
  className,
}: {
  children: ReactNode;
  variant?: "violet" | "green" | "red" | "amber" | "gold" | "ink";
  className?: string;
}) {
  const v = {
    violet: "iz-pill-violet",
    green: "iz-pill-green",
    red: "iz-pill-red",
    amber: "iz-pill-amber",
    gold: "iz-pill-gold",
    ink: "iz-pill-ink",
  }[variant];
  return <span className={cn("iz-pill", v, className)}>{children}</span>;
}

export function IzSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("iz-sect-label", className)}>{children}</div>;
}

export function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function IzSelect({
  className,
  block,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { block?: boolean }) {
  return (
    <select className={cn("iz-select", block && "iz-select-block", className)} {...props}>
      {children}
    </select>
  );
}

export function formatTimeLabel(hhmm: string): string {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(min).padStart(2, "0")} ${period}`;
}

/** Tap-to-open time picker — uses native OS clock UI */
export function IzTimeInput({
  value,
  onChange,
  className,
  showIcon = true,
  placeholder = "Tap to choose",
  disabledPlaceholder = "Pick date first",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
  placeholder?: string;
  disabledPlaceholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = Boolean(value?.trim());
  const disabled = Boolean(props.disabled);

  const openPicker = () => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
        return;
      }
    } catch {
      /* showPicker blocked — fall through */
    }
    el.focus();
    el.click();
  };

  const label = disabled
    ? disabledPlaceholder
    : hasValue
      ? formatTimeLabel(normalizeTimeValue(value))
      : placeholder;

  return (
    <div className={cn("iz-time-picker", className)}>
      <button
        type="button"
        className={cn("iz-time-picker-btn", hasValue && "has-value", disabled && "is-disabled")}
        onClick={openPicker}
        disabled={disabled}
        aria-label={props["aria-label"] ?? "Choose time"}
      >
        {showIcon && <Clock className="h-4 w-4 shrink-0 text-[var(--iz-muted2)]" />}
        <span className={cn("iz-time-picker-label", !hasValue && !disabled && "iz-muted2")}>{label}</span>
      </button>
      {hasValue && !disabled && (
        <button
          type="button"
          className="iz-time-picker-clear"
          aria-label="Clear time"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="time"
        className="iz-time-picker-native"
        tabIndex={-1}
        aria-hidden
        value={hasValue ? normalizeTimeValue(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        step={60}
        disabled={disabled}
      />
    </div>
  );
}

