import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IzCard } from "@/components/iz/ui";
import { OutletSection } from "@/components/outlet/OutletSection";
import { WorkspaceTierRatesEditor } from "@/components/outlet/WorkspaceTierRatesEditor";
import { useStore } from "@/lib/store";
import { outletCan } from "@/lib/outlet-rbac";
import { OutletDrinkMenuEditor } from "@/components/outlet/OutletDrinkMenuEditor";
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

function OutletWorkspacePage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const { outletWorkspace, saveOutletWorkspace } = useStore();
  const canEdit = outletCan(outletSubRole, "manageWorkspace");
  const [draft, setDraft] = useState(outletWorkspace);

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
      if (patch.otAfterHours != null) {
        nextTierRates = { ...nextTierRates };
        for (const t of OUTLET_PR_TIERS) {
          nextTierRates[t] = { ...nextTierRates[t], otAfterHours: patch.otAfterHours };
        }
      }
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
  const patchCommissionOnly = (patch: Partial<typeof draft.commissionOnlyRates>) =>
    setDraft((d) => ({
      ...d,
      commissionOnlyRates: { ...d.commissionOnlyRates, ...patch },
    }));
  const drinkRange = drinkMenuPriceRange(draft.drinkMenu ?? []);
  const tierHint = `${formatTierWageRange(draft.tierRates)} · paid on shift completion · synced to post job & agency`;

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
        hint={tierHint}
        className="!mt-4"
      >
        <IzCard className="!py-3">
          <WorkspaceTierRatesEditor
            tierRates={draft.tierRates}
            commissionOnlyRates={draft.commissionOnlyRates}
            onPatchTier={patchTier}
            onPatchCommissionOnly={patchCommissionOnly}
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
          <OutletDrinkMenuEditor
            drinks={draft.drinkMenu ?? []}
            readOnly={!canEdit}
            onChange={canEdit ? (drinkMenu) => patch({ drinkMenu }) : () => {}}
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
