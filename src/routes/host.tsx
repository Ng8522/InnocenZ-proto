import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { Briefcase, MapPin, History, FileText, User } from "lucide-react";

export const Route = createFileRoute("/host")({
  component: HostLayout,
});

function HostLayout() {
  return (
    <PhoneFrame
      overlay={<Toasts />}
      footer={
        <BottomNav
          items={[
            { to: "/host", label: "Shifts", icon: Briefcase },
            { to: "/host/tonight", label: "Check-In", icon: MapPin },
            { to: "/host/history", label: "History", icon: History },
            { to: "/host/wallet", label: "Vouchers", icon: FileText },
            { to: "/host/profile", label: "Profile", icon: User },
          ]}
        />
      }
    >
      <Outlet />
    </PhoneFrame>
  );
}
