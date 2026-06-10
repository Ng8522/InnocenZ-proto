import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { PrSosFab } from "@/components/pr/PrSosButton";
import { useStore } from "@/lib/store";
import { Briefcase, MapPin, History, FileText, User } from "lucide-react";

export const Route = createFileRoute("/host")({
  component: HostLayout,
});

function HostLayout() {
  const prSubRole = useStore((s) => s.prSubRole);
  const tied = prSubRole !== "pr_free";

  const items = [
    { to: "/host", label: "Shifts", icon: Briefcase },
    { to: "/host/tonight", label: "Check-In", icon: MapPin },
    ...(!tied ? [{ to: "/host/wallet", label: "Vouchers", icon: FileText }] : []),
    { to: "/host/history", label: tied ? "History & PV" : "History", icon: History },
    { to: "/host/profile", label: "Profile", icon: User },
  ];

  return (
    <PhoneFrame
      overlay={
        <>
          <Toasts />
          <PrSosFab />
        </>
      }
      footer={<BottomNav items={items} />}
    >
      <Outlet />
    </PhoneFrame>
  );
}
