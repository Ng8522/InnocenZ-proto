import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { Home, Calendar, FileText, History, BarChart3 } from "lucide-react";

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
            { to: "/agency/roster", label: "Roster", icon: Calendar },
            { to: "/agency/pv", label: "Payroll", icon: FileText },
            { to: "/agency/history", label: "History", icon: History },
            { to: "/agency/reports", label: "Analytics", icon: BarChart3 },
          ]}
        />
      }
    >
      <Outlet />
    </PhoneFrame>
  );
}
