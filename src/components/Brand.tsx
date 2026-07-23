import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { publicAssetPath } from "@/lib/public-asset";

export const INNOCENZ_LOGO_PATH = "/assets/innocenz-logo.png";
export const INNOCENZ_LOGO_HORIZONTAL_PATH = "/assets/innocenz-logo-horizontal.png";

/** Serif gold wordmark — matches brand lockup (Playfair Display, unified gold). */
export function InnocenZWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("iz-wordmark", className)}>
      Innocen<span className="iz-wordmark-z">Z</span>
    </span>
  );
}

export function InnocenZLogoHorizontal({ className }: { className?: string }) {
  return (
    <div className={cn("iz-logo-horizontal", className)}>
      <img
        src={publicAssetPath(INNOCENZ_LOGO_PATH)}
        alt=""
        aria-hidden
        className="iz-logo-horizontal__mark"
      />
      <InnocenZWordmark className="iz-logo-horizontal__wordmark" />
    </div>
  );
}

export function InnocenZLogoMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "iz-logo-tile--sm" : size === "lg" ? "iz-logo-tile--lg" : "";

  return (
    <div className={["iz-logo-tile", sizeClass, className].filter(Boolean).join(" ")}>
      <img src={publicAssetPath(INNOCENZ_LOGO_PATH)} alt="InnocenZ" className="iz-logo-tile__img" />
    </div>
  );
}

/**
 * InnocenZ brand mark — circular crown + Z lockup.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={publicAssetPath(INNOCENZ_LOGO_PATH)}
      alt="InnocenZ"
      className={["iz-logo-mark", className].filter(Boolean).join(" ")}
    />
  );
}

/** Compact circular mark for section headers and inline UI chrome. */
export function InnocenZBrandMark({ className }: { className?: string }) {
  return (
    <img
      src={publicAssetPath(INNOCENZ_LOGO_PATH)}
      alt=""
      className={cn("iz-brand-mark-icon", className)}
      aria-hidden
    />
  );
}

export function Logo({
  size = "md",
  showTagline = true,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const wordSize = size === "lg" ? "text-[22px]" : size === "sm" ? "text-lg" : "text-[22px]";
  return (
    <div className="flex flex-col items-center gap-1">
      <InnocenZWordmark className={wordSize} />
      {showTagline && size !== "sm" && (
        <p
          className="font-sora text-[10px] font-bold tracking-[0.3em] text-[var(--iz-gold)]"
          style={{ letterSpacing: "3px" }}
        >
          WORK · FLOW · ELEGANCE
        </p>
      )}
    </div>
  );
}

export function PhoneFrame({
  children,
  footer,
  overlay,
  framed = true,
}: {
  children: ReactNode;
  /** Bottom tab bar — pinned under the scroll area (sibling of viewport). */
  footer?: ReactNode;
  /** Sheets, toasts — full-screen over the phone frame. */
  overlay?: ReactNode;
  framed?: boolean;
}) {
  if (!framed) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[392px] flex-col">
        {children}
        {footer}
        {overlay}
      </div>
    );
  }

  return (
    <div className="iz-shell">
      <div className="iz-phone">
        <div className={footer ? "iz-viewport iz-viewport--tabbed" : "iz-viewport"}>{children}</div>
        {footer ? <div className="iz-phone-footer">{footer}</div> : null}
        {overlay}
      </div>
    </div>
  );
}
