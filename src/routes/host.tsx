import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { iconForNav } from "@/lib/lucide-label-icons";

export const Route = createFileRoute("/host")({
  component: HostLayout,
});

function HostLayout() {
  const items = [
    { to: "/host", label: "Shifts", icon: iconForNav("Shifts") },
    { to: "/host/tonight", label: "Check-In", icon: iconForNav("Check-In") },
    { to: "/host/PaymentVoucher", label: "Payment", icon: iconForNav("Payment") },
    { to: "/host/history", label: "History", icon: iconForNav("History") },
    { to: "/host/profile", label: "Profile", icon: iconForNav("Profile") },
  ];

  return (
    <PhoneFrame overlay={<Toasts />} footer={<BottomNav items={items} className="iz-pr-tabbar" />}>
      <div className="iz-pr-app">
        <Outlet />
      </div>
    </PhoneFrame>
  );
}
