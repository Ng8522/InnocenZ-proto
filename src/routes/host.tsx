import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { Briefcase, MapPin, Wallet, User } from "lucide-react";

export const Route = createFileRoute("/host")({
  component: HostLayout,
});

function HostLayout() {
  return (
    <PhoneFrame>
      <Toasts />
      <main className="flex-1 pb-4"><Outlet /></main>
      <BottomNav
        items={[
          { to: "/host", label: "Shifts", icon: Briefcase },
          { to: "/host/tonight", label: "Tonight", icon: MapPin },
          { to: "/host/wallet", label: "Wallet", icon: Wallet },
          { to: "/host/profile", label: "Profile", icon: User },
        ]}
      />
    </PhoneFrame>
  );
}
