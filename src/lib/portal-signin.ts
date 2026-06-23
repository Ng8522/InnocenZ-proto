import type { Role } from "@/lib/store";
import { getAgencyDefaultRoute, type AgencySubRole } from "@/lib/agency-rbac";
import { getOutletDefaultRoute, type OutletSubRole } from "@/lib/outlet-rbac";
import type { PrSubRole } from "@/lib/pr-demo";

export type SignInPortal = "pr" | "outlet" | "agency";

export const PORTAL_SIGNIN_LABELS: Record<SignInPortal, string> = {
  pr: "PR",
  outlet: "Outlet",
  agency: "PR Agency",
};

export type PortalSubRoleItem = {
  label: string;
  role: Role;
  outletSubRole?: OutletSubRole;
  agencySubRole?: AgencySubRole;
  prSubRole?: PrSubRole;
};

export const OUTLET_SIGNIN_SUB_ROLES: PortalSubRoleItem[] = [
  { label: "Owner", role: "vendor", outletSubRole: "outlet_owner" },
  { label: "Finance", role: "vendor", outletSubRole: "outlet_finance" },
  { label: "Operations Head", role: "vendor", outletSubRole: "outlet_ops" },
];

export const AGENCY_SIGNIN_SUB_ROLES: PortalSubRoleItem[] = [
  { label: "Owner", role: "agency", agencySubRole: "agency_owner" },
  { label: "Finance", role: "agency", agencySubRole: "agency_finance" },
];

export function parseSignInPortal(value: unknown): SignInPortal {
  if (value === "outlet" || value === "agency") return value;
  return "pr";
}

export function portalHomePath(portal: SignInPortal, item?: PortalSubRoleItem): string {
  if (portal === "outlet") {
    return getOutletDefaultRoute(item?.outletSubRole ?? "outlet_owner");
  }
  if (portal === "agency") {
    return getAgencyDefaultRoute(item?.agencySubRole ?? "agency_owner");
  }
  return "/host";
}

export function subRolesForPortal(portal: SignInPortal): PortalSubRoleItem[] {
  if (portal === "outlet") return OUTLET_SIGNIN_SUB_ROLES;
  if (portal === "agency") return AGENCY_SIGNIN_SUB_ROLES;
  return [];
}
