import type { OutletCommissionRule } from "@/lib/agency-demo";
import type { OutletWorkspaceSettings } from "@/lib/outlet-demo";
import { outletMatches } from "@/lib/portal-sync";

export function rulesMatchOutlet(rule: OutletCommissionRule, outletName: string): boolean {
  return outletMatches(rule.outlet, outletName) || rule.outlet === outletName;
}

/** Push outlet workspace wage + commission fields into agency per-outlet rules. */
export function syncCommissionRulesFromWorkspace(
  workspace: OutletWorkspaceSettings,
  rules: OutletCommissionRule[],
): OutletCommissionRule[] {
  return rules.map((r) =>
    rulesMatchOutlet(r, workspace.outletName)
      ? {
          ...r,
          outlet: workspace.outletName,
          wagePerHour: workspace.basePayPerHour,
          drinkPct: workspace.drinkPct,
          tipPct: workspace.tipPct,
          tablePct: workspace.tablePct,
          otAfterHours: workspace.otAfterHours,
        }
      : r,
  );
}

/** Pull agency commission rule for this outlet back into workspace settings. */
export function syncWorkspaceFromCommissionRules(
  workspace: OutletWorkspaceSettings,
  rules: OutletCommissionRule[],
): OutletWorkspaceSettings {
  const rule = rules.find((r) => rulesMatchOutlet(r, workspace.outletName));
  if (!rule) return workspace;
  return {
    ...workspace,
    basePayPerHour: rule.wagePerHour,
    drinkPct: rule.drinkPct,
    tipPct: rule.tipPct,
    tablePct: rule.tablePct,
    otAfterHours: rule.otAfterHours,
  };
}
