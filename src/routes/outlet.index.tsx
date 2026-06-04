import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { AppTopbar } from "@/components/Nav";
import { IzCard, IzSectionLabel, IzPill } from "@/components/iz/ui";
import { computeShiftLiveSales, DEFAULT_DRINK_UNITS, DEFAULT_PER_DRINK_RM, DEFAULT_PER_TABLE_RM, DEFAULT_TABLE_UNITS } from "@/lib/outlet-financial-sync";
import { Bell, Lock, Minus, Plus, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/outlet/")({
  component: OutletTonight,
});

function OutletTonight() {
  const {
    shifts,
    updateOutletShiftMoney,
    adjustOutletShiftUnits,
  } = useStore();
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];

  const confirmed = tonight?.filled ?? tonight?.prs.length ?? 0;
  const qty = tonight?.quantity ?? 6;
  const estimatedCost = tonight?.estimatedCost ?? qty * (tonight?.payPerHour ?? 60) * 6;
  const onTimeRisk = confirmed >= qty ? "Low" : confirmed >= qty / 2 ? "Medium" : "High";
  const riskTone =
    onTimeRisk === "Low"
      ? "text-[var(--iz-green)]"
      : onTimeRisk === "Medium"
        ? "text-[var(--iz-amber)]"
        : "text-[var(--iz-red)]";

  const livePreview = useMemo(() => {
    if (!tonight) return 0;
    return computeShiftLiveSales(tonight);
  }, [tonight]);

  if (!tonight) {
    return (
      <div className="iz-screen">
        <AppTopbar />
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">No active shift — post a job to get started</p>
          <Link to="/outlet/bookings" className="iz-btn iz-btn-primary mt-3 inline-flex">
            Post job <ChevronRight className="h-4 w-4" />
          </Link>
        </IzCard>
      </div>
    );
  }

  const sealed = tonight.status === "sealed";

  return (
    <div className="iz-screen">
      <AppTopbar />
      <div className="flex items-center justify-between">
        <h2 className="font-sora text-xl font-extrabold leading-tight text-[var(--iz-txt)]">
          Tonight — <span className="text-[var(--iz-gold-l)]">{tonight.event}</span>
        </h2>
        <button type="button" className="iz-chip relative">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--iz-gold)]" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Stat label="Confirmed PRs" value={`${confirmed}/${qty}`} />
        <Stat label="On-time risk" value={onTimeRisk} valueClass={riskTone} />
        <Stat label="Estimated cost" value={`RM ${estimatedCost.toLocaleString()}`} valueClass="text-[var(--iz-gold)]" />
        <Stat
          label="Live sales"
          value={`RM ${(tonight.liveSales ?? livePreview).toLocaleString()}`}
          valueClass="text-[var(--iz-green)]"
        />
      </div>

      <IzCard flat className="mt-3">
        <p className="iz-tiny iz-muted leading-relaxed">
          Each +Drink or +Table on a booking adds or removes this amount from live sales. Changes sync to{" "}
          <span className="text-[var(--iz-gold-l)]">Atlas Agency</span> immediately.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MoneyField
            label="Per drink"
            value={tonight.perDrinkRm ?? DEFAULT_PER_DRINK_RM}
            disabled={sealed}
            onChange={(v) => updateOutletShiftMoney(tonight.id, { perDrinkRm: v })}
          />
          <MoneyField
            label="Per table"
            value={tonight.perTableRm ?? DEFAULT_PER_TABLE_RM}
            disabled={sealed}
            onChange={(v) => updateOutletShiftMoney(tonight.id, { perTableRm: v })}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <UnitStepper
            label="+Drink units"
            value={tonight.drinkUnits ?? DEFAULT_DRINK_UNITS}
            disabled={sealed}
            onDelta={(d) => adjustOutletShiftUnits(tonight.id, "drink", d)}
          />
          <UnitStepper
            label="+Table units"
            value={tonight.tableUnits ?? DEFAULT_TABLE_UNITS}
            disabled={sealed}
            step={0.5}
            onDelta={(d) => adjustOutletShiftUnits(tonight.id, "table", d)}
          />
        </div>
        <p className="iz-tiny iz-muted2 mt-2 text-center">
          Live sales = {tonight.drinkUnits ?? DEFAULT_DRINK_UNITS}×{tonight.perDrinkRm ?? DEFAULT_PER_DRINK_RM} +{" "}
          {tonight.tableUnits ?? DEFAULT_TABLE_UNITS}×{tonight.perTableRm ?? DEFAULT_PER_TABLE_RM} = RM{" "}
          {livePreview.toLocaleString()}
        </p>
      </IzCard>

      <IzSectionLabel className="mt-4">Your bookings</IzSectionLabel>
      <IzCard>
        <div className="iz-between">
          <div>
            <div className="font-sora text-sm font-bold">{tonight.event}</div>
            <p className="iz-tiny iz-muted mt-0.5">
              {tonight.date} · {tonight.shift}
            </p>
          </div>
          {sealed ? (
            <IzPill variant="ink">
              <Lock className="mr-1 inline h-3 w-3" /> Sealed
            </IzPill>
          ) : (
            <IzPill variant="green">{tonight.status}</IzPill>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat label="Filled" value={`${confirmed}/${qty}`} />
          <MiniStat label="Cost" value={`RM ${estimatedCost.toLocaleString()}`} tone="text-[var(--iz-gold)]" />
          <MiniStat label="Sales" value={`RM ${tonight.liveSales.toLocaleString()}`} tone="text-[var(--iz-green)]" />
        </div>
      </IzCard>

      <Link to="/outlet/bookings" className="iz-btn iz-btn-soft mt-3 block text-center">
        Manage bookings &amp; seal shift <ChevronRight className="inline h-4 w-4" />
      </Link>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <span className="iz-field-label">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 iz-tiny text-[var(--iz-muted2)]">
          RM
        </span>
        <input
          type="number"
          min={0}
          disabled={disabled}
          className="iz-field-input !pl-10 disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
    </div>
  );
}

function UnitStepper({
  label,
  value,
  onDelta,
  disabled,
  step = 1,
}: {
  label: string;
  value: number;
  onDelta: (d: number) => void;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <div>
      <span className="iz-field-label">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className="iz-chip flex h-9 w-9 items-center justify-center !p-0 disabled:opacity-40"
          onClick={() => onDelta(-step)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex-1 text-center font-sora text-lg font-bold">{value}</span>
        <button
          type="button"
          disabled={disabled}
          className="iz-chip flex h-9 w-9 items-center justify-center !p-0 disabled:opacity-40"
          onClick={() => onDelta(step)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="iz-stat-tile">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">{label}</div>
      <div className={`font-sora mt-1.5 text-xl font-extrabold ${valueClass || "text-[var(--iz-txt)]"}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--iz-line)] bg-[rgba(0,0,0,.2)] p-2 text-center">
      <div className="iz-tiny iz-muted2">{label}</div>
      <div className={`font-sora mt-0.5 text-sm font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
