import { useEffect, useState } from "react";
import type { OutletCommissionRule, OutletPrTier, OutletTierRateSettings } from "@/lib/agency-demo";
import {
  deriveTierMultipliersFromRates,
  getOutletRule,
  normalizeOutletTierMultipliers,
  OUTLET_BASE_TIER,
  OUTLET_PR_TIERS,
  snapTierWage,
  tierWageFromMultiplier,
} from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { rulesMatchOutlet } from "@/lib/outlet-agency-sync";
import { useStore } from "@/lib/store";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { Pencil } from "lucide-react";

function cloneCommissionRules(rules: OutletCommissionRule[]): OutletCommissionRule[] {
  return rules.map((r) => ({
    ...r,
    tierMultipliers: normalizeOutletTierMultipliers(r.tierMultipliers),
    tierRates: r.tierRates ? { ...r.tierRates } : undefined,
  }));
}

function updateRule(
  rules: OutletCommissionRule[],
  outlet: string,
  patch: Partial<OutletCommissionRule>,
): OutletCommissionRule[] {
  return rules.map((r) => (rulesMatchOutlet(r, outlet) ? { ...r, ...patch } : r));
}

function tierRatesFromMultipliers(
  row: OutletCommissionRule | undefined,
  baseWage: number,
  tierMultipliers: Record<OutletPrTier, number>,
): Record<OutletPrTier, OutletTierRateSettings> | undefined {
  if (!row?.tierRates) return undefined;
  return OUTLET_PR_TIERS.reduce(
    (acc, t) => {
      acc[t] = {
        ...row.tierRates![t],
        wagePerHour: tierWageFromMultiplier(baseWage, tierMultipliers[t]),
      };
      return acc;
    },
    {} as Record<OutletPrTier, OutletTierRateSettings>,
  );
}

export function AgencyCommissionRulesPanel({ outlet }: { outlet: string }) {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const saveAgencyProfileSettings = useStore((s) => s.saveAgencyProfileSettings);
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
  const scalingTierMultipliers = useStore((s) => s.scalingTierMultipliers);
  const toast = useStore((s) => s.toast);

  const canEdit = agencyCan(agencySubRole, "editSettings");
  const [editing, setEditing] = useState(false);
  const [commissionDraft, setCommissionDraft] = useState(() => cloneCommissionRules(outletCommissionRules));

  useEffect(() => {
    if (!editing) setCommissionDraft(cloneCommissionRules(outletCommissionRules));
  }, [outletCommissionRules, editing]);

  const commissions = editing ? commissionDraft : outletCommissionRules;
  const rule = commissions.find((r) => rulesMatchOutlet(r, outlet)) ?? getOutletRule(outlet, commissions);
  const syncedFromWorkspace = rulesMatchOutlet(rule, outletWorkspace.outletName);
  const displayTierRates =
    !editing && syncedFromWorkspace
      ? outletWorkspace.tierRates
      : (rule.tierRates as Record<OutletPrTier, OutletTierRateSettings> | undefined);
  const tierMultipliers = displayTierRates
    ? deriveTierMultipliersFromRates(displayTierRates)
    : normalizeOutletTierMultipliers(rule.tierMultipliers);

  const startEdit = () => {
    setCommissionDraft(cloneCommissionRules(outletCommissionRules));
    setEditing(true);
  };

  const cancelEdit = () => {
    setCommissionDraft(cloneCommissionRules(outletCommissionRules));
    setEditing(false);
  };

  const saveEdit = () => {
    for (const tier of OUTLET_PR_TIERS) {
      const value = commissionDraft.find((r) => rulesMatchOutlet(r, outlet))?.tierMultipliers?.[tier];
      if (!Number.isFinite(value) || value! < 0.5 || value! > 3) {
        toast(`Enter a valid multiplier for ${tier} (0.5–3×)`, "warn");
        return;
      }
    }
    const outletRule = commissionDraft.find((r) => rulesMatchOutlet(r, outlet));
    if (outletRule?.tierMultipliers?.[OUTLET_BASE_TIER] !== 1) {
      toast(`${OUTLET_BASE_TIER} must stay at 1× (base tier)`, "warn");
      return;
    }
    saveAgencyProfileSettings({
      owner: agencyOwner,
      financeHead: agencyFinanceHead,
      scalingTierMultipliers,
      outletCommissionRules: commissionDraft.map((r) => ({
        ...r,
        wagePerHour: snapTierWage(r.wagePerHour),
        tierMultipliers: normalizeOutletTierMultipliers(r.tierMultipliers),
      })),
    });
    setEditing(false);
  };

  const patchRule = (patch: Partial<OutletCommissionRule>) => {
    setCommissionDraft((rows) => {
      const row = rows.find((r) => rulesMatchOutlet(r, outlet));
      const nextPatch = { ...patch };
      if (nextPatch.wagePerHour != null) {
        nextPatch.wagePerHour = snapTierWage(nextPatch.wagePerHour);
        const tierMultipliers = normalizeOutletTierMultipliers(row?.tierMultipliers);
        const nextTierRates = tierRatesFromMultipliers(row, nextPatch.wagePerHour, tierMultipliers);
        if (nextTierRates) nextPatch.tierRates = nextTierRates;
      }
      return updateRule(rows, outlet, nextPatch);
    });
  };

  const patchTierMultiplier = (tier: OutletPrTier, value: number) => {
    setCommissionDraft((rows) => {
      const row = rows.find((r) => rulesMatchOutlet(r, outlet));
      const tierMultipliers = {
        ...normalizeOutletTierMultipliers(row?.tierMultipliers),
        [tier]: value,
      };
      const baseWage = snapTierWage(row?.wagePerHour ?? 0);
      const nextTierRates = tierRatesFromMultipliers(row, baseWage, tierMultipliers);
      return updateRule(rows, outlet, {
        tierMultipliers,
        ...(nextTierRates ? { tierRates: nextTierRates } : {}),
      });
    });
  };

  const resetTierMultipliers = () => {
    setCommissionDraft((rows) => {
      const row = rows.find((r) => rulesMatchOutlet(r, outlet));
      const tierMultipliers = normalizeOutletTierMultipliers();
      const baseWage = snapTierWage(row?.wagePerHour ?? 0);
      const nextTierRates = tierRatesFromMultipliers(row, baseWage, tierMultipliers);
      return updateRule(rows, outlet, {
        tierMultipliers,
        ...(nextTierRates ? { tierRates: nextTierRates } : {}),
      });
    });
  };

  return (
    <>
      <p className="iz-tiny iz-muted2 mb-2">
        Drink types · tables · tips · OT — synced with outlet workspace
      </p>

      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : ""}>
        {editing && canEdit ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="iz-tiny iz-muted">
              Wage (RM/hr)
              <input
                type="number"
                className="iz-field-input mt-1 !text-xs"
                value={rule.wagePerHour}
                onChange={(e) => patchRule({ wagePerHour: snapTierWage(Number(e.target.value)) })}
              />
            </label>
            <label className="iz-tiny iz-muted">
              OT after (hrs)
              <input
                type="number"
                className="iz-field-input mt-1 !text-xs"
                value={rule.otAfterHours}
                onChange={(e) => patchRule({ otAfterHours: Number(e.target.value) })}
              />
            </label>
            <label className="iz-tiny iz-muted">
              Drink %
              <input
                type="number"
                className="iz-field-input mt-1 !text-xs"
                value={rule.drinkPct}
                onChange={(e) => patchRule({ drinkPct: Number(e.target.value) })}
              />
            </label>
            <label className="iz-tiny iz-muted">
              Tip %
              <input
                type="number"
                className="iz-field-input mt-1 !text-xs"
                value={rule.tipPct}
                onChange={(e) => patchRule({ tipPct: Number(e.target.value) })}
              />
            </label>
            <label className="iz-tiny iz-muted">
              Table %
              <input
                type="number"
                className="iz-field-input mt-1 !text-xs"
                value={rule.tablePct}
                onChange={(e) => patchRule({ tablePct: Number(e.target.value) })}
              />
            </label>
          </div>
        ) : (
          <p className="iz-tiny iz-muted2">
            Wage RM{rule.wagePerHour}/hr · Drinks {rule.drinkPct}% · Tips {rule.tipPct}% · Table{" "}
            {rule.tablePct}% · OT after {rule.otAfterHours}h
          </p>
        )}

        {rulesMatchOutlet(rule, outletWorkspace.outletName) && outletWorkspace.drinkMenu.length > 0 && (
          <div className="mt-2 border-t border-[var(--iz-line)] pt-2">
            <p className="iz-tiny iz-muted2 mb-1.5">Drink menu · synced from outlet</p>
            <div className="flex flex-wrap gap-1.5">
              {outletWorkspace.drinkMenu.map((drink) => (
                <span
                  key={drink.id}
                  className="iz-tiny rounded-md bg-white/[0.04] px-2 py-0.5 font-semibold text-[var(--iz-gold-l)]"
                >
                  {drink.name} RM{drink.priceRm}
                </span>
              ))}
            </div>
          </div>
        )}
      </IzCard>

      <IzSectionLabel className="mt-4">Tier multipliers</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">
        Pay / hr by PR training tier · multipliers scale from {OUTLET_BASE_TIER} base wage
        {syncedFromWorkspace && !editing && " · synced from outlet workspace"}
      </p>
      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : ""}>
        <div className="flex items-stretch gap-1.5 overflow-x-auto">
          {OUTLET_PR_TIERS.map((tier) => {
            const roman = tier.replace("Tier ", "");
            const isBase = tier === OUTLET_BASE_TIER;
            const tierWage =
              displayTierRates?.[tier]?.wagePerHour ??
              tierWageFromMultiplier(rule.wagePerHour, tierMultipliers[tier]);
            return (
              <div
                key={tier}
                className={`flex min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center ${
                  isBase
                    ? "border-[rgba(217,185,122,.35)] bg-[rgba(232,194,122,.08)]"
                    : "border-[var(--iz-line)] bg-white/[0.02]"
                }`}
              >
                <span className="text-sm font-bold leading-tight text-[var(--iz-txt)]">
                  {roman}
                  {isBase && (
                    <span className="block text-xs font-medium text-[var(--iz-muted)]">base</span>
                  )}
                </span>
                <span className="text-lg font-extrabold leading-none tabular-nums text-[var(--iz-txt)]">
                  RM{tierWage}
                </span>
                {editing && canEdit ? (
                  <label className="flex items-center gap-1 text-xs text-[var(--iz-muted)]">
                    <input
                      type="number"
                      min={0.5}
                      max={3}
                      step={0.05}
                      className="w-12 rounded-md border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-1.5 py-1 text-center text-xs font-semibold text-[var(--iz-txt)] outline-none focus:border-[var(--iz-gold-d)]"
                      value={tierMultipliers[tier]}
                      onChange={(e) => patchTierMultiplier(tier, Number(e.target.value))}
                      readOnly={isBase}
                    />
                    <span>×</span>
                  </label>
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-[var(--iz-gold-l)]">
                    {tierMultipliers[tier]}×
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {editing && canEdit && (
          <button type="button" className="iz-chip mt-2.5 w-full" onClick={resetTierMultipliers}>
            Reset tier multipliers to defaults
          </button>
        )}
      </IzCard>

      {canEdit && (
        <div className="iz-profile-actions mt-3">
          {editing ? (
            <>
              <button type="button" className="iz-btn iz-btn-primary" onClick={saveEdit}>
                Save commission rules
              </button>
              <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={cancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="iz-btn iz-btn-soft w-full" onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Edit commission rules
            </button>
          )}
        </div>
      )}
    </>
  );
}
