import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "@/components/Nav";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { CalendarDays, ClipboardList, Star, BarChart3, Receipt } from "lucide-react";

export const Route = createFileRoute("/outlet")({
  component: OutletLayout,
});

function OutletLayout() {
  const navigate = useNavigate();
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
        ]}
      />
      <button
        onClick={() => navigate({ to: "/" })}
        className="fixed left-1/2 top-2 z-50 -translate-x-1/2 text-[10px] text-muted-foreground/0"
        aria-hidden
      />
    </PhoneFrame>
  );
}
