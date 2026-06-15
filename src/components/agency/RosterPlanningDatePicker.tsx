import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { fmtDateLabelFromIso } from "@/lib/pr-demo";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

function dateFromIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function isoFromDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function RosterPlanningDatePicker({
  value,
  onChange,
  rosterDates = [],
  placeholder = "Pick date",
  allowClear = false,
  hint = "Dots mark days with roster shifts.",
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  rosterDates?: string[];
  placeholder?: string;
  allowClear?: boolean;
  hint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = dateFromIso(value);
  const rosterDateSet = new Set(rosterDates);
  const label = value ? fmtDateLabelFromIso(value) : placeholder;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("iz-roster-planning-date", className)}>
      <button
        type="button"
        className={`iz-roster-planning-date-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose date"
      >
        <span className={`flex min-w-0 items-center gap-1.5 truncate${value ? "" : " text-[var(--iz-muted2)]"}`}>
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--iz-gold-l)]" />
          <span className="truncate">{label}</span>
        </span>
        {allowClear && value ? (
          <span
            role="button"
            tabIndex={0}
            className="iz-hist-clear"
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--iz-muted2)] transition-transform${open ? " rotate-180" : ""}`}
          />
        )}
      </button>
      {open && (
        <div className="iz-hist-cal iz-hist-cal--popover iz-roster-planning-date-popover">
          <CalendarUi
            mode="single"
            selected={selected}
            defaultMonth={selected ?? dateFromIso(rosterDates[0] ?? value) ?? new Date()}
            onSelect={(d) => {
              if (d) onChange(isoFromDate(d));
              setOpen(false);
            }}
            modifiers={{
              hasShifts: (date) => rosterDateSet.has(isoFromDate(date)),
            }}
            modifiersClassNames={{
              hasShifts: "iz-roster-cal-has-shifts",
            }}
            className="rounded-[14px] border-0 bg-transparent p-0 text-[var(--iz-txt)]"
          />
          {hint ? <p className="iz-tiny iz-muted2 mt-1 px-1">{hint}</p> : null}
        </div>
      )}
    </div>
  );
}
