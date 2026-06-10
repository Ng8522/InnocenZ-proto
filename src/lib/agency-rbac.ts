import type { LucideIcon } from "lucide-react";
import { BarChart3, Calendar, FileText, History, Home } from "lucide-react";

/** Module 9 · Agency Owner vs Agency Finance */
export type AgencySubRole = "agency_owner" | "agency_finance";

export const AGENCY_SUB_ROLE_LABELS: Record<AgencySubRole, string> = {
  agency_owner: "Agency Owner",
  agency_finance: "Agency Finance",
};

type Permission =
  | "viewHome"
  | "approvePrSignups"
  | "assignShifts"
  | "managePr"
  | "viewSettings"
  | "editSettings"
  | "viewPv"
  | "raisePv"
  | "viewCollections"
  | "confirmReconciliation"
  | "viewHistory"
  | "viewAnalytics"
  | "exportReports"
  | "viewWorkforce";

const ROLE_PERMISSIONS: Record<AgencySubRole, Permission[]> = {
  agency_owner: [
    "viewHome",
    "approvePrSignups",
    "assignShifts",
    "managePr",
    "viewSettings",
    "editSettings",
    "viewPv",
    "raisePv",
    "viewCollections",
    "confirmReconciliation",
    "viewHistory",
    "viewAnalytics",
    "exportReports",
    "viewWorkforce",
  ],
  agency_finance: [
    "viewHome",
    "viewPv",
    "raisePv",
    "viewCollections",
    "confirmReconciliation",
    "viewHistory",
    "viewAnalytics",
    "exportReports",
    "viewWorkforce",
  ],
};

export function agencyCan(role: AgencySubRole | null | undefined, permission: Permission): boolean {
  const r = role ?? "agency_owner";
  return ROLE_PERMISSIONS[r].includes(permission);
}

export type AgencyNavItem = { to: string; label: string; icon: LucideIcon; permission: Permission };

const ALL_NAV: AgencyNavItem[] = [
  { to: "/agency", label: "Home", icon: Home, permission: "viewHome" },
  { to: "/agency/roster", label: "Roster", icon: Calendar, permission: "viewWorkforce" },
  { to: "/agency/pv", label: "Payroll", icon: FileText, permission: "viewPv" },
  { to: "/agency/history", label: "History", icon: History, permission: "viewHistory" },
  { to: "/agency/reports", label: "Analytics", icon: BarChart3, permission: "viewAnalytics" },
];

export function getAgencyNavItems(role: AgencySubRole | null | undefined): AgencyNavItem[] {
  const r = role ?? "agency_owner";
  return ALL_NAV.filter((item) => agencyCan(r, item.permission));
}

export function getAgencyDefaultRoute(role: AgencySubRole | null | undefined): string {
  const items = getAgencyNavItems(role);
  return items[0]?.to ?? "/agency/pv";
}

export function canAccessAgencyPath(role: AgencySubRole | null | undefined, pathname: string): boolean {
  const r = role ?? "agency_owner";
  if (pathname === "/agency" || pathname === "/agency/") return agencyCan(r, "viewHome");
  if (pathname.startsWith("/agency/roster")) return agencyCan(r, "viewWorkforce");
  if (pathname.startsWith("/agency/pv")) return agencyCan(r, "viewPv");
  if (pathname.startsWith("/agency/history")) return agencyCan(r, "viewHistory");
  if (pathname.startsWith("/agency/reports")) return agencyCan(r, "viewAnalytics");
  if (pathname.startsWith("/agency/pending")) return agencyCan(r, "approvePrSignups");
  if (pathname.startsWith("/agency/prs")) return agencyCan(r, "managePr");
  if (pathname.startsWith("/agency/profile")) return agencyCan(r, "viewSettings");
  if (pathname.startsWith("/agency/live")) return agencyCan(r, "viewWorkforce");
  return true;
}

export type AgencyHomeTile = {
  to: string;
  title: string;
  desc: string;
  permission: Permission;
  badge?: string;
};
