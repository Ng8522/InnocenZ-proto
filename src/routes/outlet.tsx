import { useEffect } from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
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
    <PhoneFrame
      overlay={<Toasts />}
      footer={navItems.length > 0 ? <BottomNav items={navItems} /> : undefined}
    >
      <Outlet />
    </PhoneFrame>
  );
}
