import type { LucideIcon } from "lucide-react";
import { BarChart3, History, Home, Plus, Zap } from "lucide-react";

/** Matches Module 10 outlet columns: Owner, Finance, Ops Head */
export type OutletSubRole = "outlet_owner" | "outlet_finance" | "outlet_ops";

export const OUTLET_SUB_ROLE_LABELS: Record<OutletSubRole, string> = {
  outlet_owner: "Outlet Owner",
  outlet_finance: "Outlet Finance",
  outlet_ops: "Outlet Ops Head",
};

type Permission =
  | "postJob"
  | "viewLiveDashboard"
  | "logSales"
  | "sealShift"
  | "confirmShift"
  | "confirmDaily"
  | "viewBilling"
  | "viewSalesDashboard"
  | "ratePrs"
  | "viewHistory"
  | "manageShiftStaffing";

const ROLE_PERMISSIONS: Record<OutletSubRole, Permission[]> = {
  outlet_owner: [
    "postJob",
    "viewLiveDashboard",
    "logSales",
    "sealShift",
    "confirmShift",
    "confirmDaily",
    "viewBilling",
    "viewSalesDashboard",
    "ratePrs",
    "manageShiftStaffing",
    "viewHistory",
  ],
  outlet_finance: ["viewLiveDashboard", "viewHistory", "confirmDaily", "viewBilling"],
  outlet_ops: [
    "postJob",
    "viewLiveDashboard",
    "logSales",
    "sealShift",
    "confirmShift",
    "ratePrs",
    "manageShiftStaffing",
  ],
};

export function outletCan(role: OutletSubRole | null | undefined, permission: Permission): boolean {
  const r = role ?? "outlet_owner";
  return ROLE_PERMISSIONS[r].includes(permission);
}

export type OutletNavItem = { to: string; label: string; icon: LucideIcon; permission: Permission };

const ALL_NAV: OutletNavItem[] = [
  { to: "/outlet", label: "Home", icon: Home, permission: "viewLiveDashboard" },
  { to: "/outlet/bookings", label: "Post Job", icon: Plus, permission: "postJob" },
  { to: "/outlet/history", label: "History", icon: History, permission: "viewHistory" },
  { to: "/outlet/ratings", label: "Floor", icon: Zap, permission: "ratePrs" },
  { to: "/outlet/billing", label: "Reports", icon: BarChart3, permission: "viewBilling" },
];

export function getOutletNavItems(role: OutletSubRole | null | undefined): OutletNavItem[] {
  const r = role ?? "outlet_owner";
  return ALL_NAV.filter((item) => outletCan(r, item.permission));
}

export function getOutletDefaultRoute(role: OutletSubRole | null | undefined): string {
  const items = getOutletNavItems(role);
  return items[0]?.to ?? "/outlet/billing";
}

/** Route access for outlet sub-routes (pathname from router). */
export function canAccessOutletPath(role: OutletSubRole | null | undefined, pathname: string): boolean {
  const r = role ?? "outlet_owner";
  if (pathname === "/outlet" || pathname === "/outlet/") {
    return outletCan(r, "viewLiveDashboard");
  }
  if (pathname.startsWith("/outlet/bookings")) return outletCan(r, "postJob");
  if (pathname.startsWith("/outlet/history")) return outletCan(r, "viewHistory");
  if (pathname.startsWith("/outlet/ratings")) return outletCan(r, "ratePrs");
  if (pathname.startsWith("/outlet/billing")) {
    return outletCan(r, "viewBilling") || outletCan(r, "viewSalesDashboard");
  }
  if (pathname.startsWith("/outlet/profile")) return true;
  return true;
}
