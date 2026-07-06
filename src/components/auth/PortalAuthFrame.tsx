import type { ReactNode } from "react";
import { InnocenZLogoHorizontal } from "@/components/Brand";
import { PORTAL_AUTH_TAGLINES, PORTAL_SIGNIN_LABELS, type SignInPortal } from "@/lib/portal-signin";

export function PortalAuthFrame({
  portal,
  children,
  overlay,
}: {
  portal: "outlet" | "agency";
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const label = PORTAL_SIGNIN_LABELS[portal];

  return (
    <div className="iz-portal-auth" data-portal={portal}>
      <aside className="iz-portal-auth-brand">
        <div className="iz-portal-auth-brand-inner">
          <p className="iz-tiny iz-muted">{label} portal</p>
          <InnocenZLogoHorizontal className="iz-portal-auth-brand-logo" />

          <h1 className="font-sora mt-8 text-[32px] font-extrabold leading-tight text-[var(--iz-txt)]">
            Sign in to {label}
          </h1>
          <p className="iz-sm iz-muted mt-3 max-w-sm leading-relaxed">
            {PORTAL_AUTH_TAGLINES[portal]}
          </p>
        </div>
      </aside>

      <main className="iz-portal-auth-main">{children}</main>
      {overlay}
    </div>
  );
}
