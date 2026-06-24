import type { ReactNode } from "react";
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
          <div className="iz-wordmark text-[26px]">
            Innocen<span className="iz-wordmark-z">Z</span>
          </div>
          <p className="iz-tiny iz-muted mt-1.5">{label} portal</p>

          <div className="iz-logo-tile iz-portal-auth-logo !mt-8 !mb-0">
            <span>Z</span>
          </div>

          <h1 className="font-sora mt-6 text-[32px] font-extrabold leading-tight text-[var(--iz-txt)]">
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
