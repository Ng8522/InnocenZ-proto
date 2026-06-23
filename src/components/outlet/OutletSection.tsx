import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function OutletSection({
  id,
  title,
  hint,
  collapsible = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
  trailing,
  className,
}: {
  id?: string;
  title: string;
  hint?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (next: boolean | ((value: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(open) : next;
    if (!isControlled) setInternalOpen(resolved);
    onOpenChange?.(resolved);
  };

  if (!collapsible) {
    return (
      <section id={id} className={cn("mt-5", className)}>
        <div className="flex items-center gap-2 py-0.5">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="iz-outlet-section-title font-sora text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--iz-muted)]">
                {title}
              </div>
              {hint && <p className="iz-tiny iz-muted2 mt-0.5 truncate">{hint}</p>}
            </div>
            {trailing}
          </div>
        </div>
        <div className="mt-2.5">{children}</div>
      </section>
    );
  }

  return (
    <section id={id} className={cn("iz-collapsible-section", open && "is-open", className)}>
      <button
        type="button"
        className="iz-collapsible-section__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          <span className="iz-collapsible-section__title">{title}</span>
          {hint && !open && <span className="iz-collapsible-section__hint">{hint}</span>}
          <span className="iz-collapsible-section__action">{open ? "Tap to collapse" : "Tap to expand"}</span>
        </span>
        {trailing && (
          <span
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {trailing}
          </span>
        )}
        <span className="iz-collapsible-section__chev" aria-hidden>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="iz-collapsible-section__body">{children}</div>}
    </section>
  );
}
