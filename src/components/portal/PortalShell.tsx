import { type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { iconForNav } from "@/lib/lucide-label-icons";
import { LogOut } from "lucide-react";
import { BottomNav, type NavItem, navIsActive } from "@/components/Nav";
import { TitleWithIcon } from "@/components/iz/TitleWithIcon";
import { AGENCY_SUB_ROLE_LABELS, agencyCan } from "@/lib/agency-rbac";
import { signOutToWelcome } from "@/lib/go-welcome";
import { OUTLET_SUB_ROLE_LABELS, outletCan } from "@/lib/outlet-rbac";
import { OpsNotificationBell } from "@/components/portal/OpsNotificationBell";
import { useStore } from "@/lib/store";
import { publicAssetPath } from "@/lib/public-asset";

export type PortalKind = "agency" | "outlet";

type ExtraNavItem = NavItem & { permission: string };

const AGENCY_EXTRAS: ExtraNavItem[] = [
  { to: "/agency/prs", label: "Manage PR", icon: iconForNav("Manage PR"), permission: "managePr" },
  {
    to: "/agency/outlets",
    label: "Manage Outlet",
    icon: iconForNav("Manage Outlet"),
    permission: "managePr",
  },
  {
    to: "/agency/subscription",
    label: "Subscription",
    icon: iconForNav("Subscription"),
    permission: "viewSettings",
  },
  {
    to: "/agency/profile",
    label: "Settings",
    icon: iconForNav("Settings"),
    permission: "viewSettings",
  },
];

const OUTLET_EXTRAS: ExtraNavItem[] = [
  {
    to: "/outlet/workspace",
    label: "Workspace",
    icon: iconForNav("Workspace"),
    permission: "viewWorkspace",
  },
  {
    to: "/outlet/subscription",
    label: "Subscription",
    icon: iconForNav("Subscription"),
    permission: "viewSettings",
  },
  {
    to: "/outlet/settings",
    label: "Settings",
    icon: iconForNav("Settings"),
    permission: "viewSettings",
  },
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
    if (portal === "agency")
      return agencyCan(agencySubRole, item.permission as Parameters<typeof agencyCan>[1]);
    return outletCan(outletSubRole, item.permission as Parameters<typeof outletCan>[1]);
  });
  return [...base, ...filtered];
}

function portalAvatarGradient(portal: PortalKind) {
  return portal === "agency" ? "var(--iz-grad)" : "linear-gradient(135deg,#39D98A,#1f8f5c)";
}

function portalProfilePath(portal: PortalKind) {
  return portal === "agency" ? "/agency/profile" : "/outlet/settings";
}

function PortalAvatar({
  portal,
  ownerName,
  orgName,
  avatarPhoto,
  className,
}: {
  portal: PortalKind;
  ownerName: string;
  orgName: string;
  avatarPhoto?: string | null;
  className?: string;
}) {
  const avatarLetter =
    ownerName.trim()[0]?.toUpperCase() ?? orgName.trim()[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={`iz-avatar${className ? ` ${className}` : ""}${avatarPhoto ? " iz-avatar-photo iz-avatar-photo--logo" : ""}`}
      style={avatarPhoto ? undefined : { background: portalAvatarGradient(portal) }}
    >
      {avatarPhoto ? <img src={publicAssetPath(avatarPhoto)} alt="" /> : avatarLetter}
    </div>
  );
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
    <Link to={item.to} className={`iz-portal-nav-link${active ? " on" : ""}`} onClick={onNavigate}>
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

function PortalSidebar({
  portal,
  items,
  onNavigate,
}: {
  portal: PortalKind;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <aside className="iz-portal-sidebar">
      <div className="iz-portal-sidebar-brand">
        <div className="iz-wordmark text-lg">
          Innocen<span className="iz-wordmark-z">Z</span>
        </div>
        <p className="iz-tiny iz-muted mt-1">
          <TitleWithIcon icon={iconForNav(portal === "agency" ? "PR Agency" : "Outlet")}>
            {portal === "agency" ? "Agency portal" : "Outlet portal"}
          </TitleWithIcon>
        </p>
      </div>

      <nav className="iz-portal-sidebar-nav">
        {items.map((item) => (
          <PortalSidebarLink
            key={item.to}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="iz-portal-sidebar-foot">
        <button type="button" className="iz-portal-nav-link w-full" onClick={signOutToWelcome}>
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function PortalHeader({
  portal,
  orgName,
  ownerName,
  avatarPhoto,
  subLabel,
}: {
  portal: PortalKind;
  orgName: string;
  ownerName: string;
  avatarPhoto?: string | null;
  subLabel: string;
}) {
  return (
    <header className="iz-portal-header">
      <div className="min-w-0">
        <h1 className="font-sora text-xl font-extrabold tracking-tight text-[var(--iz-txt)] md:text-2xl">
          {portalGreeting()}, <span className="text-[var(--iz-gold-l)]">{orgName}</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <OpsNotificationBell portal={portal} />
        <Link
          to={portalProfilePath(portal)}
          className="iz-portal-header-profile"
          title={`${ownerName} · ${subLabel}`}
          aria-label={`Profile · ${ownerName}`}
        >
          <PortalAvatar
            portal={portal}
            ownerName={ownerName}
            orgName={orgName}
            avatarPhoto={avatarPhoto}
            className="iz-avatar--md"
          />
        </Link>
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
  const outletOwner = useStore((s) => s.outletOwner);
  const owner = portal === "agency" ? agencyOwner : outletOwner;
  const orgName = owner.orgName;

  const subLabel =
    portal === "agency"
      ? AGENCY_SUB_ROLE_LABELS[agencySubRole ?? "agency_owner"]
      : OUTLET_SUB_ROLE_LABELS[outletSubRole ?? "outlet_owner"];

  const sidebarItems = mergeNavItems(portal, navItems, agencySubRole, outletSubRole);

  return (
    <div className="iz-portal" data-portal={portal}>
      <PortalSidebar portal={portal} items={sidebarItems} />

      <div className="iz-portal-main">
        <PortalHeader
          portal={portal}
          orgName={orgName}
          ownerName={owner.ownerName}
          avatarPhoto={owner.avatarPhoto}
          subLabel={subLabel}
        />

        <div className="iz-portal-viewport">
          {children}
        </div>
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
