import { createFileRoute } from "@tanstack/react-router";
import { SpecialServicePortalSection } from "@/components/special-service/SpecialServicePortalSection";

export const Route = createFileRoute("/host/special-service")({
  component: HostSpecialService,
});

function HostSpecialService() {
  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Special Service</h2>
        <p className="iz-tiny iz-muted mt-0.5">Agency add-on services</p>
      </header>
      <SpecialServicePortalSection role="pr" />
    </div>
  );
}
