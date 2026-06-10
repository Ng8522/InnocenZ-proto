import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function OutletSection({
  title,
  hint,
  collapsible = false,
  defaultOpen = true,
  children,
  trailing,
  className,
}: {
  title: string;
  hint?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const header = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-sora text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--iz-muted)]">
          {title}
        </div>
        {hint && (!collapsible || !open) && (
          <p className="iz-tiny iz-muted2 mt-0.5 truncate">{hint}</p>
        )}
      </div>
      {trailing}
      {collapsible && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--iz-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      )}
    </div>
  );

  return (
    <section className={cn("mt-5", className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-xl py-0.5 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-0.5">{header}</div>
      )}
      {(!collapsible || open) && <div className="mt-2.5">{children}</div>}
    </section>
  );
}
