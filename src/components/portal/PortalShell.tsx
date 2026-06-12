import { type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { BottomNav, type NavItem, navIsActive } from "@/components/Nav";
import { AGENCY_SUB_ROLE_LABELS, agencyCan } from "@/lib/agency-rbac";
import { goToWelcome } from "@/lib/go-welcome";
import { OUTLET_SUB_ROLE_LABELS, outletCan } from "@/lib/outlet-rbac";
import { useStore } from "@/lib/store";

export type PortalKind = "agency" | "outlet";

type ExtraNavItem = NavItem & { permission: string };

const AGENCY_EXTRAS: ExtraNavItem[] = [
  { to: "/agency/pending", label: "Approvals", icon: UserCheck, permission: "approvePrSignups" },
  { to: "/agency/prs", label: "Manage PR", icon: Users, permission: "managePr" },
  { to: "/agency/profile", label: "Settings", icon: Settings, permission: "viewSettings" },
];

const OUTLET_EXTRAS: ExtraNavItem[] = [
  { to: "/outlet/workspace", label: "Workspace", icon: SlidersHorizontal, permission: "viewWorkspace" },
  { to: "/outlet/settings", label: "Settings", icon: Settings, permission: "viewSettings" },
];

function portalGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function mergeNavItems(
  portal: PortalKind,
  base: NavItem[],
  agencySubRole: ReturnType<typeof useStore.getState>["agencySubRole"],
  outletSubRole: ReturnType<typeof useStore.getState>["outletSubRole"],
): NavItem[] {
  const seen = new Set(base.map((i) => i.to));
  const extras = portal === "agency" ? AGENCY_EXTRAS : OUTLET_EXTRAS;
  const filtered = extras.filter((item) => {
    if (seen.has(item.to)) return false;
    if (portal === "agency") return agencyCan(agencySubRole, item.permission as Parameters<typeof agencyCan>[1]);
    return outletCan(outletSubRole, item.permission as Parameters<typeof outletCan>[1]);
  });
  return [...base, ...filtered];
}

function PortalSidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = navIsActive(pathname, item.to);
  return (
    <Link
      to={item.to}
      className={`iz-portal-nav-link${active ? " on" : ""}`}
      onClick={onNavigate}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

function PortalSidebar({
  portal,
  items,
  orgName,
  subLabel,
  onNavigate,
}: {
  portal: PortalKind;
  items: NavItem[];
  orgName: string;
  subLabel: string;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const gradient =
    portal === "agency"
      ? "var(--iz-grad)"
      : "linear-gradient(135deg,#39D98A,#1f8f5c)";

  return (
    <aside className="iz-portal-sidebar">
      <div className="iz-portal-sidebar-brand">
        <div className="iz-wordmark text-lg">
          Innocen<span className="iz-wordmark-z">Z</span>
        </div>
        <p className="iz-tiny iz-muted mt-1">{portal === "agency" ? "Agency portal" : "Outlet portal"}</p>
      </div>

      <div className="iz-portal-sidebar-identity">
        <div className="iz-avatar iz-avatar--sm" style={{ background: gradient }}>
          {orgName.trim()[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <div className="truncate font-sora text-sm font-bold">{orgName}</div>
          <div className="iz-tiny iz-muted truncate">{subLabel}</div>
        </div>
      </div>

      <nav className="iz-portal-sidebar-nav">
        {items.map((item) => (
          <PortalSidebarLink key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="iz-portal-sidebar-foot">
        <button type="button" className="iz-portal-nav-link w-full" onClick={() => goToWelcome()}>
          <ArrowLeftRight className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>Switch role</span>
        </button>
      </div>
    </aside>
  );
}

function PortalHeader({ orgName }: { orgName: string }) {
  return (
    <header className="iz-portal-header">
      <div className="min-w-0">
        <h1 className="font-sora text-xl font-extrabold tracking-tight text-[var(--iz-txt)] md:text-2xl">
          {portalGreeting()}, <span className="text-[var(--iz-gold-l)]">{orgName}</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="iz-portal-header-badge" title="Verified portal">
          <Shield className="h-3.5 w-3.5" />
          RBAC
        </span>
        <button
          type="button"
          className="iz-topbar-action"
          title="Switch role"
          aria-label="Switch role"
          onClick={() => goToWelcome()}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

export function PortalShell({
  portal,
  navItems,
  children,
  overlay,
}: {
  portal: PortalKind;
  navItems: NavItem[];
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const agencySubRole = useStore((s) => s.agencySubRole);
  const outletSubRole = useStore((s) => s.outletSubRole);
  const agencyOwner = useStore((s) => s.agencyOwner);
  const shifts = useStore((s) => s.shifts);

  const orgName =
    portal === "agency"
      ? agencyOwner.orgName
      : (shifts.find((s) => s.date === "Tonight")?.outletName ?? "Velvet 23");

  const subLabel =
    portal === "agency"
      ? AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"]
      : OUTLET_SUB_ROLE_LABELS[outletSubRole ?? "outlet_owner"];

  const sidebarItems = mergeNavItems(portal, navItems, agencySubRole, outletSubRole);

  return (
    <div className="iz-portal" data-portal={portal}>
      <PortalSidebar
        portal={portal}
        items={sidebarItems}
        orgName={orgName}
        subLabel={subLabel}
      />

      <div className="iz-portal-main">
        <PortalHeader orgName={orgName} />

        <div className="iz-portal-viewport">{children}</div>
      </div>

      {navItems.length > 0 && (
        <div className="iz-portal-mobile-footer md:hidden">
          <BottomNav items={navItems} />
        </div>
      )}

      {overlay}
    </div>
  );
}
