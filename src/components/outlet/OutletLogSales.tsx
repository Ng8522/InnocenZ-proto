import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  DEFAULT_PER_DRINK_RM,
  DEFAULT_PER_TABLE_RM,
} from "@/lib/outlet-financial-sync";
import { ChevronDown, Minus, ScanLine, UtensilsCrossed, Wine } from "lucide-react";
import { cn } from "@/lib/utils";

type OutletShiftSalesPanelProps = {
  shiftId: string;
  sealed?: boolean;
  label?: string;
  compact?: boolean;
  collapsible?: boolean;
};

export function OutletShiftSalesPanel({
  shiftId,
  sealed = false,
  label,
  compact = false,
  collapsible = false,
}: OutletShiftSalesPanelProps) {
  const shift = useStore((s) => s.shifts.find((sh) => sh.id === shiftId));
  const adjustOutletShiftUnits = useStore((s) => s.adjustOutletShiftUnits);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(!collapsible);

  if (!shift) return null;

  const liveSales = shift.liveSales ?? 0;

  if (sealed) {
    return (
      <p className={`text-[10px] text-[var(--iz-muted)] ${compact ? "mt-2" : "mt-3"}`}>
        Sales locked after seal.
      </p>
    );
  }

  const controls = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <SaleKindStepper
          kind="drink"
          label="Drink"
          icon={<Wine className="h-3 w-3" />}
          shiftId={shiftId}
          bump={shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM}
          onAdjust={adjustOutletShiftUnits}
        />
        <SaleKindStepper
          kind="table"
          label="Table"
          icon={<UtensilsCrossed className="h-3 w-3" />}
          shiftId={shiftId}
          bump={shift.perTableRm ?? DEFAULT_PER_TABLE_RM}
          onAdjust={adjustOutletShiftUnits}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => toast("Barcode scan · sale logged", "success")}
          className="iz-chip flex-1 justify-center text-[11px]"
          aria-label="Scan barcode"
        >
          <ScanLine className="h-3.5 w-3.5" /> Scan
        </button>
        <Link to="/outlet/workspace" className="iz-chip flex-1 justify-center text-[11px]">
          Unit rates
        </Link>
      </div>
    </>
  );

  if (collapsible) {
    return (
      <div className="mt-2.5 rounded-xl border border-[var(--iz-line)] bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
            {label ?? "Log sales"}
          </span>
          <span className="font-sora ml-auto text-xs font-bold text-[var(--iz-green)]">
            RM {liveSales.toLocaleString()}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--iz-muted)]", open && "rotate-180")} />
        </button>
        {open && <div className="border-t border-[var(--iz-line)] px-2.5 pb-2.5 pt-2">{controls}</div>}
      </div>
    );
  }

  return (
    <div className={compact ? "mt-2.5 rounded-xl border border-[var(--iz-line)] p-2.5" : "mt-3 !mb-0"}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
          {label ?? "Log sales"}
        </span>
        <span className="font-sora ml-auto text-sm font-bold text-[var(--iz-green)]">
          RM {liveSales.toLocaleString()}
        </span>
      </div>
      <div className="mt-2">{controls}</div>
    </div>
  );
}

function SaleKindStepper({
  kind,
  label,
  icon,
  shiftId,
  bump,
  onAdjust,
}: {
  kind: "drink" | "table";
  label: string;
  icon: React.ReactNode;
  shiftId: string;
  bump: number;
  onAdjust: (shiftId: string, kind: "drink" | "table", delta: number) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onAdjust(shiftId, kind, -1)}
        className="iz-chip flex h-8 w-8 shrink-0 items-center justify-center !p-0"
        aria-label={`Remove ${label} sale (RM ${bump})`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onAdjust(shiftId, kind, 1)}
        className="iz-btn iz-btn-soft iz-btn-sm min-w-0 flex-1 !py-2 text-[11px]"
      >
        {icon} +{label}
      </button>
    </div>
  );
}

/** Unit rates live in Workspace — no duplicate block on Home */
export function OutletSaleUnitCosts() {
  return null;
}
