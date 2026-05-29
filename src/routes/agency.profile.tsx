import { createFileRoute } from "@tanstack/react-router";
import { PortalProfile } from "@/components/PortalProfile";
import { Building2, Mail } from "lucide-react";

export const Route = createFileRoute("/agency/profile")({
  component: AgencyProfile,
});

function AgencyProfile() {
  return (
    <PortalProfile
      subtitle="InnocenZ · PR Agency"
      defaultName="Agency"
      rows={[
        { icon: Building2, label: "Organization", value: "Velvet Talent" },
        { icon: Mail, label: "Role", value: "Owner / Finance" },
      ]}
    />
  );
}
