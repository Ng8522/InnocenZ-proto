import { useEffect } from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/PortalShell";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";
import {
  canAccessOutletPath,
  getOutletDefaultRoute,
  getOutletNavItems,
} from "@/lib/outlet-rbac";

export const Route = createFileRoute("/outlet")({
  component: OutletLayout,
});

function OutletLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const outletSubRole = useStore((s) => s.outletSubRole);
  const navItems = getOutletNavItems(outletSubRole);

  useEffect(() => {
    if (!canAccessOutletPath(outletSubRole, pathname)) {
      navigate({ to: getOutletDefaultRoute(outletSubRole), replace: true });
    }
  }, [pathname, outletSubRole, navigate]);

  return (
    <PortalShell portal="outlet" navItems={navItems} overlay={<Toasts />}>
      <Outlet />
    </PortalShell>
  );
}
