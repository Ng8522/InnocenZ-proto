import { Link } from "@tanstack/react-router";
import { agencyCan } from "@/lib/agency-rbac";
import { useStore } from "@/lib/store";
import type { LucideIcon } from "lucide-react";
import { BarChart3, History, Settings, Users } from "lucide-react";
import { IzHScroll } from "@/components/iz/HScroll";

const SECONDARY: {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: "viewHistory" | "viewWorkforce" | "viewAnalytics" | "viewSettings";
}[] = [
  { to: "/agency/history", label: "History", icon: History, permission: "viewHistory" },
  { to: "/agency/roster", label: "Workforce", icon: Users, permission: "viewWorkforce" },
  { to: "/agency/reports", label: "Analytics", icon: BarChart3, permission: "viewAnalytics" },
  { to: "/agency/profile", label: "Settings", icon: Settings, permission: "viewSettings" },
];

export function AgencyHomeTiles() {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const tiles = SECONDARY.filter((t) => agencyCan(agencySubRole, t.permission));
  if (tiles.length === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
        More
      </span>
      <IzHScroll className="flex flex-1 gap-2 pb-0.5">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="iz-outlet-quick-chip shrink-0">
            <t.icon className="h-3.5 w-3.5 text-[var(--iz-gold)]" />
            {t.label}
          </Link>
        ))}
      </IzHScroll>
    </div>
  );
}
