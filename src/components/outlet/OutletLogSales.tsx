import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
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
  const logOutletSale = useStore((s) => s.logOutletSale);
  const setShiftLiveSales = useStore((s) => s.setShiftLiveSales);
  const toast = useStore((s) => s.toast);

  const liveSales = shift?.liveSales ?? 0;
  const [totalInput, setTotalInput] = useState(String(liveSales));

  useEffect(() => {
    setTotalInput(String(liveSales));
  }, [liveSales, shiftId]);

  if (!shift) return null;

  const saveTotal = () => {
    const raw = totalInput.replace(/,/g, "").trim();
    const n = parseFloat(raw);
    if (Number.isNaN(n) || raw === "") {
      toast("Enter a valid sales amount", "warn");
      return;
    }
    setShiftLiveSales(shiftId, n);
  };

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
          Enter the total gathered during the shift, or adjust with drink/table quick adds. Seal only after sales are
          final.
        </p>
      )}

      <div className={`flex flex-wrap items-stretch gap-2 ${compact ? "mt-2" : ""}`}>
        <div className="flex min-w-[8rem] flex-1 items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
          <input
            type="text"
            inputMode="decimal"
            value={totalInput}
            onChange={(e) => setTotalInput(e.target.value.replace(/[^\d.]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && saveTotal()}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-[var(--iz-txt)] outline-none"
            aria-label="Total shift sales in RM"
          />
        </div>
        <button
          type="button"
          onClick={saveTotal}
          className="iz-btn iz-btn-primary iz-btn-sm shrink-0 self-center"
        >
          Save
        </button>
      </div>

      <div className={`grid grid-cols-2 gap-2 ${compact ? "mt-2" : "mt-2.5"}`}>
        <SaleKindStepper
          kind="drink"
          label="Drink"
          icon={<Wine className="h-3.5 w-3.5" />}
          shiftId={shiftId}
          onAdjust={logOutletSale}
        />
        <SaleKindStepper
          kind="table"
          label="Table"
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          shiftId={shiftId}
          onAdjust={logOutletSale}
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
  onAdjust,
}: {
  kind: "drink" | "table";
  label: string;
  icon: React.ReactNode;
  shiftId: string;
  onAdjust: (shiftId: string, kind: "drink" | "table", direction: "add" | "subtract") => void;
}) {
  const bump = useStore((s) => s.saleUnitCosts[kind]);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onAdjust(shiftId, kind, "subtract")}
        className="iz-chip flex h-8 w-8 shrink-0 items-center justify-center !p-0"
        aria-label={`Remove ${label} sale (RM ${bump})`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onAdjust(shiftId, kind, "add")}
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

/** Home: set RM per drink/table tap before logging sales on bookings */
export function OutletSaleUnitCosts() {
  const saleUnitCosts = useStore((s) => s.saleUnitCosts);
  const setSaleUnitCost = useStore((s) => s.setSaleUnitCost);

  return (
    <IzCard className="mt-3 !mb-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
        Sale unit amounts
      </div>
      <p className="iz-tiny iz-muted mt-1 mb-2.5">
        Each +Drink or +Table on a booking adds or removes this amount from live sales.
      </p>
      <div className="flex gap-3">
        <UnitCostField kind="drink" label="Per drink" value={saleUnitCosts.drink} onSave={setSaleUnitCost} />
        <UnitCostField kind="table" label="Per table" value={saleUnitCosts.table} onSave={setSaleUnitCost} />
      </div>
    </IzCard>
  );
}
