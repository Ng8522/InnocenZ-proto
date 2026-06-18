import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { deriveLiveWorkforce } from "@/lib/portal-sync";
import { computeAvailabilityStats, DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { ChevronRight, Sparkles } from "lucide-react";

export function AiSuggestionsPanel() {
  const agencyRoster = useStore((s) => s.agencyRoster);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const perDrinkRm = useStore((s) => s.outletWorkspace.perDrinkRm);
  const workforce = deriveLiveWorkforce(agencyRoster, DEFAULT_ROSTER_DATE_ISO, outletCommissionRules, perDrinkRm);
  const avail = computeAvailabilityStats(agencyPRs, agencyRoster, DEFAULT_ROSTER_DATE_ISO);

  const onyxCount = workforce.filter((w) => w.outlet.includes("Onyx")).length;
  const pearlCount = workforce.filter((w) => w.outlet.includes("Pearl")).length;
  const lowKpi = agencyPRs.find((p) => !p.detached && (p.kpiScore ?? 100) < 75);

  const suggestions: { title: string; desc: string; to: string }[] = [];

  if (avail.free > 0) {
    suggestions.push({
      title: `Assign ${avail.free} free PR${avail.free === 1 ? "" : "s"} to outlets`,
      desc: "Planning → pick outlet · bulk or one-by-one",
      to: "/agency/roster",
    });
  } else if (onyxCount < 2) {
    suggestions.push({
      title: `Reassign ${2 - onyxCount} PRs to Onyx KL`,
      desc: "Demand spike — floor understaffed",
      to: "/agency/roster",
    });
  }
  if (pearlCount > 0) {
    suggestions.push({
      title: "Boost incentive at Pearl Lounge",
      desc: "Retention risk on late shift",
      to: "/agency/outlets",
      search: { outlet: "Pearl Lounge" },
    });
  }
  if (lowKpi) {
    suggestions.push({
      title: `Flag ${lowKpi.name} for review`,
      desc: `KPI ${lowKpi.kpiScore} — attendance pattern`,
      to: "/agency/prs",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Roster looks balanced",
      desc: "No urgent AI actions tonight",
      to: "/agency/roster",
    });
  }

  return (
    <section className="iz-portal-panel iz-portal-ai">
      <div className="iz-portal-panel-head">
        <h3 className="flex items-center gap-1.5 font-sora text-base font-bold">
          <Sparkles className="h-4 w-4 text-[var(--iz-violet)]" />
          AI suggestions
        </h3>
      </div>
      <div className="space-y-2 p-3 pt-0">
        {suggestions.slice(0, 3).map((s) => (
          <Link key={s.title} to={s.to} className="iz-portal-ai-card">
            <div className="min-w-0 flex-1">
              <div className="font-sora text-sm font-semibold leading-snug">{s.title}</div>
              <p className="iz-tiny iz-muted mt-0.5">{s.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
