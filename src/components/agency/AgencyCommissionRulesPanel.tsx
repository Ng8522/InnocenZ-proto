import { useState } from "react";
import type { OutletCommissionRule } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { rulesMatchOutlet } from "@/lib/outlet-agency-sync";
import { useStore } from "@/lib/store";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { Pencil } from "lucide-react";

function cloneCommissionRules(rules: OutletCommissionRule[]): OutletCommissionRule[] {
  return rules.map((r) => ({ ...r }));
}

export function AgencyCommissionRulesPanel() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const outletWorkspace = useStore((s) => s.outletWorkspace);
  const saveAgencyProfileSettings = useStore((s) => s.saveAgencyProfileSettings);
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
  const scalingTierMultipliers = useStore((s) => s.scalingTierMultipliers);

  const canEdit = agencyCan(agencySubRole, "editSettings");
  const [editing, setEditing] = useState(false);
  const [commissionDraft, setCommissionDraft] = useState(() => cloneCommissionRules(outletCommissionRules));

  const commissions = editing ? commissionDraft : outletCommissionRules;

  const startEdit = () => {
    setCommissionDraft(cloneCommissionRules(outletCommissionRules));
    setEditing(true);
  };

  const cancelEdit = () => {
    setCommissionDraft(cloneCommissionRules(outletCommissionRules));
    setEditing(false);
  };

  const saveEdit = () => {
    saveAgencyProfileSettings({
      owner: agencyOwner,
      financeHead: agencyFinanceHead,
      scalingTierMultipliers,
      outletCommissionRules: commissionDraft.map((r) => ({ ...r })),
    });
    setEditing(false);
  };

  return (
    <>
      <IzSectionLabel>Commission rules · per outlet</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">Drink types · tables · tips · OT — synced with outlet workspace</p>

      {commissions.map((rule) => (
        <IzCard key={rule.outlet} flat className={`!mb-2${editing ? " border-[rgba(217,185,122,.25)]" : ""}`}>
          <div className="font-sora text-sm font-bold text-[var(--iz-violet-l)]">{rule.outlet}</div>
          {editing && canEdit ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="iz-tiny iz-muted">
                Drink %
                <input
                  type="number"
                  className="iz-field-input mt-1 !text-xs"
                  value={rule.drinkPct}
                  onChange={(e) => {
                    const drinkPct = Number(e.target.value);
                    setCommissionDraft((rows) =>
                      rows.map((r) => (r.outlet === rule.outlet ? { ...r, drinkPct } : r)),
                    );
                  }}
                />
              </label>
              <label className="iz-tiny iz-muted">
                Tip %
                <input
                  type="number"
                  className="iz-field-input mt-1 !text-xs"
                  value={rule.tipPct}
                  onChange={(e) => {
                    const tipPct = Number(e.target.value);
                    setCommissionDraft((rows) =>
                      rows.map((r) => (r.outlet === rule.outlet ? { ...r, tipPct } : r)),
                    );
                  }}
                />
              </label>
            </div>
          ) : (
            <p className="iz-tiny iz-muted2 mt-1">
              Wage RM{rule.wagePerHour}/hr · Drinks {rule.drinkPct}% · Tips {rule.tipPct}% · Table {rule.tablePct}% · OT after {rule.otAfterHours}h
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
      ))}

      {canEdit && (
        <div className="iz-profile-actions mt-4">
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
            <button type="button" className="iz-btn iz-btn-primary" onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Edit commission rules
            </button>
          )}
        </div>
      )}
    </>
  );
}
