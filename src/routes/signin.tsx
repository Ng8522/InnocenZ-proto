import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalSignInScreen } from "@/components/auth/PortalSignInScreen";
import { parseSignInPortal } from "@/lib/portal-signin";

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "create" ? "create" : "signin") as "signin" | "create",
    portal: parseSignInPortal(s.portal),
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { mode, portal } = Route.useSearch();

  useEffect(() => {
    if (mode === "create") {
      navigate({ to: "/register", replace: true });
    }
  }, [mode, navigate]);

  return <PortalSignInScreen portal={portal} />;
}
