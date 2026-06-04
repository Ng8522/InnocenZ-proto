import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { Home, Calendar, FileText, LayoutGrid, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/agency")({
  component: AgencyLayout,
});

function AgencyLayout() {
  return (
    <PhoneFrame
      overlay={<Toasts />}
      footer={
        <BottomNav
          items={[
            { to: "/agency", label: "Home", icon: Home },
            { to: "/agency/pending", label: "Roster", icon: Calendar },
            { to: "/agency/pv", label: "Payroll", icon: FileText },
            { to: "/agency/reports", label: "Live", icon: LayoutGrid },
            { to: "/agency/profile", label: "Analytics", icon: BarChart3 },
          ]}
        />
      }
    >
      <Outlet />
    </PhoneFrame>
  );
}
