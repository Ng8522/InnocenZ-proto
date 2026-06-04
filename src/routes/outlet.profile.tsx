import { createFileRoute } from "@tanstack/react-router";
import { PortalProfile } from "@/components/PortalProfile";
import { MapPin, Store } from "lucide-react";

export const Route = createFileRoute("/outlet/profile")({
  component: OutletProfile,
});

function OutletProfile() {
  return (
    <PortalProfile
      subtitle="InnocenZ · Outlet"
      defaultName="Manager"
      rows={[
        { icon: Store, label: "Venue", value: "Velvet 23" },
        { icon: MapPin, label: "Location", value: "Bukit Bintang" },
      ]}
    />
  );
}
