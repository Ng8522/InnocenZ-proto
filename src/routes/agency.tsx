import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { LayoutDashboard, UserCheck, FileText, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/agency")({
  component: AgencyLayout,
});

function AgencyLayout() {
  return (
    <PhoneFrame>
      <Toasts />
      <main className="flex-1 pb-4">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { to: "/agency", label: "Hub", icon: LayoutDashboard },
          { to: "/agency/pending", label: "PRs", icon: UserCheck },
          { to: "/agency/pv", label: "PV", icon: FileText },
          { to: "/agency/reports", label: "Reports", icon: BarChart3 },
        ]}
      />
    </PhoneFrame>
  );
}
