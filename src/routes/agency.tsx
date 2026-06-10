import { useEffect } from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";
import {
  canAccessAgencyPath,
  getAgencyDefaultRoute,
  getAgencyNavItems,
} from "@/lib/agency-rbac";

export const Route = createFileRoute("/agency")({
  component: AgencyLayout,
});

function AgencyLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const agencySubRole = useStore((s) => s.agencySubRole);
  const navItems = getAgencyNavItems(agencySubRole);

  useEffect(() => {
    if (!canAccessAgencyPath(agencySubRole, pathname)) {
      navigate({ to: getAgencyDefaultRoute(agencySubRole), replace: true });
    }
  }, [pathname, agencySubRole, navigate]);

  return (
    <PhoneFrame
      overlay={<Toasts />}
      footer={navItems.length > 0 ? <BottomNav items={navItems} /> : undefined}
    >
      <Outlet />
    </PhoneFrame>
  );
}
