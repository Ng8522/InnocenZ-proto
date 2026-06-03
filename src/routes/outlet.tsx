import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { Home, Plus, Settings, Zap, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/outlet")({
  component: OutletLayout,
});

function OutletLayout() {
  return (
    <PhoneFrame
      overlay={<Toasts />}
      footer={
        <BottomNav
          items={[
            { to: "/outlet", label: "Home", icon: Home },
            { to: "/outlet/bookings", label: "Post Job", icon: Plus },
            { to: "/outlet/sales", label: "Workspace", icon: Settings },
            { to: "/outlet/ratings", label: "Floor", icon: Zap },
            { to: "/outlet/billing", label: "Reports", icon: BarChart3 },
          ]}
        />
      }
    >
      <Outlet />
    </PhoneFrame>
  );
}
