import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IzCard } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { TierRatesFields } from "@/components/outlet/TierRatesFields";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import type { OutletDrinkPrice } from "@/lib/outlet-demo";
import { drinkMenuPriceRange } from "@/lib/outlet-demo";
import {
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  buildDefaultTierRates,
  formatTierWageRange,
  snapTierWage,
  type OutletPrTier,
  type OutletTierRateSettings,
} from "@/lib/agency-demo";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/outlet/workspace")({
  component: OutletWorkspacePage,
});

function TimeField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm font-semibold outline-none"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
  readOnly,
}: {
  label: string;
  value: number | string;
  onChange?: (n: number) => void;
  suffix?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    if (!onChange) return;
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
        {suffix === "RM" && <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          readOnly={readOnly}
          onChange={(e) => !readOnly && setText(e.target.value.replace(/[^\d.:]/g, ""))}
          onBlur={commit}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none"
        />
        {suffix && suffix !== "RM" && <span className="text-[11px] text-[var(--iz-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function DrinkPriceInput({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange: (n: number) => void;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commitText = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned === "" || cleaned === ".") {
      setText("0");
      onChange(0);
      return;
    }
    let next = cleaned;
    if (text === "0" && next !== "0" && next.startsWith("0") && !next.startsWith("0.")) {
      next = next.replace(/^0+/, "") || "0";
    }
    setText(next);
    const n = parseFloat(next);
    if (!Number.isNaN(n)) onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      readOnly={readOnly}
      onChange={(e) => !readOnly && commitText(e.target.value)}
      onFocus={(e) => {
        if (!readOnly && text === "0") e.target.select();
      }}
      className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums outline-none"
    />
  );
}

function DrinkMenuEditor({
  drinks,
  onChange,
  readOnly,
}: {
  drinks: OutletDrinkPrice[];
  onChange: (next: OutletDrinkPrice[]) => void;
  readOnly?: boolean;
}) {
  const updateDrink = (id: string, patch: Partial<OutletDrinkPrice>) => {
    onChange(drinks.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDrink = (id: string) => {
    onChange(drinks.filter((d) => d.id !== id));
  };

  const addDrink = () => {
    onChange([
      ...drinks,
      { id: `drink-${Date.now()}`, name: "New drink", priceRm: 100 },
    ]);
  };

  return (
    <div className="space-y-2">
      {drinks.map((drink) => (
        <div key={drink.id} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
              Drink
            </div>
            <input
              type="text"
              value={drink.name}
              readOnly={readOnly}
              onChange={(e) => updateDrink(drink.id, { name: e.target.value })}
              className="w-full rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm font-semibold outline-none"
            />
          </div>
          <div className="w-24 shrink-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--iz-muted)]">
              Price
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-[var(--iz-muted)]">RM</span>
              <DrinkPriceInput
                value={drink.priceRm}
                readOnly={readOnly}
                onChange={(priceRm) => updateDrink(drink.id, { priceRm })}
              />
            </div>
          </div>
          {!readOnly && drinks.length > 1 && (
            <button
              type="button"
              onClick={() => removeDrink(drink.id)}
              className="iz-chip flex h-[38px] w-[38px] shrink-0 items-center justify-center !p-0 text-[var(--iz-red)]"
              aria-label={`Remove ${drink.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={addDrink} className="iz-chip w-full justify-center text-[11px]">
          <Plus className="h-3.5 w-3.5" /> Add drink
        </button>
      )}
    </div>
  );
}

function OutletWorkspacePage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { outletWorkspace, saveOutletWorkspace } = useStore();
  const canEdit = outletCan(outletSubRole, "manageWorkspace");
  const [draft, setDraft] = useState(outletWorkspace);
  const [activeTier, setActiveTier] = useState<OutletPrTier>(OUTLET_BASE_TIER);

  useEffect(() => {
    setDraft(outletWorkspace);
  }, [outletWorkspace]);

  const patch = (p: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchTier = (tier: OutletPrTier, tierPatch: Partial<OutletTierRateSettings>) => {
    setDraft((d) => {
      const patch = { ...tierPatch };
      if (patch.wagePerHour != null) patch.wagePerHour = snapTierWage(patch.wagePerHour);
      let nextTierRates = {
        ...d.tierRates,
        [tier]: { ...d.tierRates[tier], ...patch },
      };
      if (tier === OUTLET_BASE_TIER && patch.wagePerHour != null) {
        const rebuilt = buildDefaultTierRates(nextTierRates[OUTLET_BASE_TIER]);
        nextTierRates = { ...nextTierRates };
        for (const t of OUTLET_PR_TIERS) {
          nextTierRates[t] = { ...nextTierRates[t], wagePerHour: rebuilt[t].wagePerHour };
        }
      }
      const baseTier = nextTierRates[OUTLET_BASE_TIER];
      return {
        ...d,
        tierRates: nextTierRates,
        basePayPerHour: baseTier.wagePerHour,
        drinkPct: baseTier.drinkPct,
        tipPct: baseTier.tipPct,
        tablePct: baseTier.tablePct,
        otAfterHours: baseTier.otAfterHours,
      };
    });
  };
  const drinkRange = drinkMenuPriceRange(draft.drinkMenu ?? []);
  const activeRates = draft.tierRates[activeTier];
  const tierHint = `${activeRates.drinkPct}% drink · ${activeRates.tipPct}% tip · ${formatTierWageRange(draft.tierRates)} · synced to agency`;

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Workspace</h2>
        <p className="iz-tiny iz-muted mt-0.5">Rates for new shifts · {draft.outletName}</p>
        {!canEdit && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Read-only (Finance)
          </p>
        )}
      </header>

      <OutletSection
        title="Rates by PR tier"
        hint={`${activeTier} · ${tierHint}`}
        className="!mt-4"
      >
        <IzCard className="!py-3">
          <TierRatesFields
            tierRates={draft.tierRates}
            activeTier={activeTier}
            onActiveTierChange={setActiveTier}
            onPatchTier={patchTier}
            readOnly={!canEdit}
          />
        </IzCard>
      </OutletSection>

      <OutletSection
        title="Drink prices"
        hint={
          draft.drinkMenu?.length
            ? `${draft.drinkMenu.length} drinks · RM ${drinkRange.min}–${drinkRange.max}`
            : "Add drinks below"
        }
      >
      <IzCard className="!py-3">
        <DrinkMenuEditor
          drinks={draft.drinkMenu ?? []}
          readOnly={!canEdit}
          onChange={canEdit ? (drinkMenu) => patch({ drinkMenu }) : () => {}}
        />
      </IzCard>
      </OutletSection>

      <OutletSection title="Sale units" hint={`RM ${draft.perTableRm} per table`}>
      <IzCard className="!py-3">
        <NumField
          label="Per table"
          value={draft.perTableRm}
          suffix="RM"
          readOnly={!canEdit}
          onChange={canEdit ? (n) => patch({ perTableRm: n }) : undefined}
        />
      </IzCard>
      </OutletSection>

      <OutletSection title="Happy hour" hint={`${draft.happyHourStart}–${draft.happyHourEnd}`} collapsible defaultOpen={false}>
      <IzCard className="!py-3">
        <div className="flex gap-3">
          <TimeField
            label="Start"
            value={draft.happyHourStart}
            readOnly={!canEdit}
            onChange={canEdit ? (v) => patch({ happyHourStart: v }) : undefined}
          />
          <TimeField
            label="End"
            value={draft.happyHourEnd}
            readOnly={!canEdit}
            onChange={canEdit ? (v) => patch({ happyHourEnd: v }) : undefined}
          />
        </div>
        <div className="mt-2">
          <NumField
            label="Drink boost"
            value={draft.happyHourDrinkBoost}
            suffix="×"
            readOnly={!canEdit}
            onChange={canEdit ? (n) => patch({ happyHourDrinkBoost: n }) : undefined}
          />
        </div>
      </IzCard>
      </OutletSection>

      {canEdit && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-5"
          onClick={() => saveOutletWorkspace(draft)}
        >
          Save workspace
        </button>
      )}
    </div>
  );
}
