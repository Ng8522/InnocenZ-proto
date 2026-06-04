import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  DEFAULT_PER_DRINK_RM,
  DEFAULT_PER_TABLE_RM,
} from "@/lib/outlet-financial-sync";
import { IzCard } from "@/components/iz/ui";
import { Minus, ScanLine, UtensilsCrossed, Wine } from "lucide-react";

type OutletShiftSalesPanelProps = {
  shiftId: string;
  sealed?: boolean;
  /** Shown when logging sales for a specific booking card */
  label?: string;
  compact?: boolean;
};

export function OutletShiftSalesPanel({
  shiftId,
  sealed = false,
  label,
  compact = false,
}: OutletShiftSalesPanelProps) {
  const shift = useStore((s) => s.shifts.find((sh) => sh.id === shiftId));
  const adjustOutletShiftUnits = useStore((s) => s.adjustOutletShiftUnits);
  const toast = useStore((s) => s.toast);

  if (!shift) return null;

  const liveSales = shift.liveSales ?? 0;

  if (sealed) {
    return (
      <p className={`text-[10px] text-[var(--iz-muted)] ${compact ? "mt-2" : "mt-3"}`}>
        Sales are locked after the shift is sealed.
      </p>
    );
  }

  return (
    <div className={compact ? "mt-2.5 rounded-xl border border-[var(--iz-line)] bg-background/40 p-2.5" : "mt-3 !mb-0"}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
        {label ?? "Log shift sales"}
      </div>
      {!compact && (
        <p className="iz-tiny iz-muted mt-1 mb-2.5">
          Adjust drink/table counts — live sales sync to agency PNL automatically.
        </p>
      )}

      <div className={`flex items-center gap-2 ${compact ? "mt-2" : "mt-2.5"}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">Live total</span>
        <span className="font-sora ml-auto text-sm font-bold tabular-nums text-[var(--iz-green)]">
          RM {liveSales.toLocaleString()}
        </span>
      </div>

      <div className={`grid grid-cols-2 gap-2 ${compact ? "mt-2" : "mt-2.5"}`}>
        <SaleKindStepper
          kind="drink"
          label="Drink"
          icon={<Wine className="h-3.5 w-3.5" />}
          shiftId={shiftId}
          bump={shift.perDrinkRm ?? DEFAULT_PER_DRINK_RM}
          onAdjust={adjustOutletShiftUnits}
        />
        <SaleKindStepper
          kind="table"
          label="Table"
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          shiftId={shiftId}
          bump={shift.perTableRm ?? DEFAULT_PER_TABLE_RM}
          onAdjust={adjustOutletShiftUnits}
        />
      </div>
      <button
        type="button"
        onClick={() => toast("Barcode scan · sale logged", "success")}
        className="iz-btn iz-btn-violet iz-btn-sm mt-2 w-full"
        aria-label="Scan barcode"
      >
        <ScanLine className="h-3.5 w-3.5" /> Scan sale
      </button>
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

function UnitCostField({
  kind,
  label,
  value,
  onSave,
}: {
  kind: "drink" | "table";
  label: string;
  value: number;
  onSave: (kind: "drink" | "table", amount: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const raw = text.replace(/,/g, "").trim();
    const n = parseFloat(raw);
    if (Number.isNaN(n) || raw === "") return;
    onSave(kind, n);
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-[var(--iz-txt)] outline-none"
          aria-label={`${label} unit cost`}
        />
      </div>
    </div>
  );
}

/** Home: set RM per drink/table for tonight's shift before logging sales on bookings */
export function OutletSaleUnitCosts() {
  const shifts = useStore((s) => s.shifts);
  const updateOutletShiftMoney = useStore((s) => s.updateOutletShiftMoney);
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];

  if (!tonight) return null;

  const perDrink = tonight.perDrinkRm ?? DEFAULT_PER_DRINK_RM;
  const perTable = tonight.perTableRm ?? DEFAULT_PER_TABLE_RM;

  const saveUnit = (kind: "drink" | "table", amount: number) => {
    updateOutletShiftMoney(
      tonight.id,
      kind === "drink" ? { perDrinkRm: amount } : { perTableRm: amount },
    );
  };

  return (
    <IzCard className="mt-3 !mb-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
        Sale unit amounts
      </div>
      <p className="iz-tiny iz-muted mt-1 mb-2.5">
        Each +Drink or +Table on a booking adds or removes this amount from live sales.
      </p>
      <div className="flex gap-3">
        <UnitCostField kind="drink" label="Per drink" value={perDrink} onSave={saveUnit} />
        <UnitCostField kind="table" label="Per table" value={perTable} onSave={saveUnit} />
      </div>
    </IzCard>
  );
}
