import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/host/special-service")({
  beforeLoad: () => {
    throw redirect({ to: "/host", search: { view: "services" } });
  },
});
