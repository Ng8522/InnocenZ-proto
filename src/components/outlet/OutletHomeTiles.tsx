import { Link } from "@tanstack/react-router";
import { outletCan } from "@/lib/outlet-rbac";
import { useStore } from "@/lib/store";
import type { LucideIcon } from "lucide-react";
import { Settings, SlidersHorizontal } from "lucide-react";
import { IzHScroll } from "@/components/iz/HScroll";

/** Secondary routes not in bottom nav — keep home uncluttered */
const SECONDARY: { to: string; label: string; icon: LucideIcon; permission: "viewWorkspace" | "viewSettings" }[] = [
  { to: "/outlet/workspace", label: "Workspace", icon: SlidersHorizontal, permission: "viewWorkspace" },
  { to: "/outlet/settings", label: "Settings", icon: Settings, permission: "viewSettings" },
];

export function OutletHomeTiles() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const tiles = SECONDARY.filter((t) => outletCan(outletSubRole, t.permission));
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
