import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { CalendarDays, ClipboardList, Star, BarChart3, Receipt, User } from "lucide-react";

export const Route = createFileRoute("/outlet")({
  component: OutletLayout,
});

function OutletLayout() {
  return (
    <PhoneFrame>
      <Toasts />
      <main className="flex-1 pb-4">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { to: "/outlet", label: "Request", icon: ClipboardList },
          { to: "/outlet/bookings", label: "Bookings", icon: CalendarDays },
          { to: "/outlet/ratings", label: "Ratings", icon: Star },
          { to: "/outlet/sales", label: "Sales", icon: BarChart3 },
          { to: "/outlet/billing", label: "Billing", icon: Receipt },
          { to: "/outlet/profile", label: "Profile", icon: User },
        ]}
      />
    </PhoneFrame>
  );
}
