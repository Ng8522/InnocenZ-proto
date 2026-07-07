import { formatTierWageRange } from "@/lib/agency-demo";
import { resolveOutletTierRates, rulesMatchOutlet } from "@/lib/outlet-agency-sync";
import { drinkMenuPriceRange } from "@/lib/outlet-demo";
import { useStore } from "@/lib/store";
import { IzCard } from "@/components/iz/ui";
import { WorkspaceTierRatesEditor } from "@/components/outlet/WorkspaceTierRatesEditor";

export function AgencyCommissionRulesPanel({
  outlet,
  tableOnly = false,
}: {
  outlet: string;
  tableOnly?: boolean;
}) {
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const outletWorkspace = useStore((s) => s.outletWorkspace);

  const tierRates = resolveOutletTierRates(outlet, outletCommissionRules, outletWorkspace);
  const syncedFromWorkspace = rulesMatchOutlet(outlet, outletWorkspace.outletName);
  const tierHint = `${formatTierWageRange(tierRates)} · synced from outlet workspace`;
  const drinkMenu = outletWorkspace.drinkMenu ?? [];
  const drinkRange = drinkMenu.length > 0 ? drinkMenuPriceRange(drinkMenu) : null;

  return (
    <>
      {!tableOnly && (
        <p className="iz-tiny iz-muted2 mb-2">
          {syncedFromWorkspace
            ? `${tierHint} · read-only`
            : "Outlet tier rates · read-only on agency"}
        </p>
      )}

      <div className={tableOnly ? "iz-outlet-detail-tier-table" : undefined}>
        <IzCard flat className="!py-3">
          <WorkspaceTierRatesEditor
            tierRates={tierRates}
            commissionOnlyRates={outletWorkspace.commissionOnlyRates}
            onPatchTier={() => {}}
            onPatchCommissionOnly={() => {}}
            readOnly
            hideTargetSales
          />
        </IzCard>
      </div>

      {!tableOnly && syncedFromWorkspace && drinkRange && (
        <IzCard flat className="mt-3 !py-3">
          <p className="iz-tiny iz-muted2 mb-1.5">Drink prices · synced from outlet</p>
          <p className="iz-tiny iz-muted mb-2">
            {drinkMenu.length} drinks · RM {drinkRange.min}–{drinkRange.max}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {drinkMenu.map((drink) => (
              <span
                key={drink.id}
                className="iz-tiny rounded-md bg-white/[0.04] px-2 py-0.5 font-semibold text-[var(--iz-gold-l)]"
              >
                {drink.name} RM{drink.priceRm}
              </span>
            ))}
          </div>
        </IzCard>
      )}
    </>
  );
}
