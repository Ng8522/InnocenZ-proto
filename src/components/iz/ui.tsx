import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

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

/** Native time picker — opens OS clock UI on mobile and desktop */
export function IzTimeInput({
  value,
  onChange,
  className,
  showIcon = true,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
}) {
  return (
    <div className="relative">
      {showIcon && (
        <Clock className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[var(--iz-muted2)]" />
      )}
      <input
        type="time"
        className={cn("iz-field-input iz-time-input", showIcon && "!pl-10", className)}
        value={normalizeTimeValue(value)}
        onChange={(e) => onChange(e.target.value)}
        step={60}
        {...props}
      />
    </div>
  );
}

