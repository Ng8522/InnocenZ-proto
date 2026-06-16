import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import type { LucideIcon } from "lucide-react";

import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import { SHIFT_TODAY, fmtDTopbar, getPrProfile } from "@/lib/pr-demo";

import { AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";

import { goToWelcome } from "@/lib/go-welcome";
import { PrNotificationBell } from "@/components/pr/PrNotificationBell";
import { getAutoBackLabel, getAutoBackTo, WELCOME_PATH } from "@/lib/nav-back";

import { OUTLET_SUB_ROLE_LABELS } from "@/lib/outlet-rbac";

import { useStore } from "@/lib/store";
import { usePrPortalReady } from "@/lib/use-pr-sub-role";

export interface NavItem {

  to: string;

  label: string;

  icon: LucideIcon;

}



export function navIsActive(pathname: string, to: string) {

  if (pathname === to || pathname === `${to}/`) return true;

  const hubs = ["/host", "/outlet", "/agency"];

  if (hubs.includes(to)) return false;

  return pathname.startsWith(`${to}/`);

}



export function BottomNav({ items }: { items: NavItem[] }) {

  const { pathname } = useLocation();

  return (

    <nav className="iz-tabbar">

      {items.map((i) => {

        const isActive = navIsActive(pathname, i.to);

        return (

          <Link

            key={i.to}

            to={i.to}

            className={isActive ? "on" : ""}

            data-active={isActive ? "true" : undefined}

          >

            <i.icon className="h-5 w-5" strokeWidth={1.8} />

            <span>{i.label}</span>

          </Link>

        );

      })}

    </nav>

  );

}



const ROLE_LABELS: Record<string, { name: string; label: string; av: string; gradient: string }> = {

  host: { name: "PR", label: "PR", av: "P", gradient: "linear-gradient(135deg,#6b7280,#374151)" },

  host_tied: { name: "Luna", label: "PR \u00b7 Agency-Tied", av: "L", gradient: "linear-gradient(135deg,#C99B4E,#8a5e22)" },

  host_free: { name: "Jaya Nair", label: "PR \u00b7 Freelancer", av: "J", gradient: "linear-gradient(135deg,#5BA8FF,#2d63b8)" },

  agency: { name: "Atlas Agency", label: "PR Agency", av: "A", gradient: "var(--iz-grad)" },

  vendor: { name: "Velvet 23", label: "Outlet", av: "V", gradient: "linear-gradient(135deg,#39D98A,#1f8f5c)" },

};



function formatTopbarTime(d: Date) {
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function PrTopbarDateTime() {
  const [time, setTime] = useState(() => formatTopbarTime(new Date()));
  const dateLine = fmtDTopbar(SHIFT_TODAY[0], SHIFT_TODAY[1], SHIFT_TODAY[2]);

  useEffect(() => {
    const tick = () => setTime(formatTopbarTime(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="iz-topbar-datetime" aria-label={`${dateLine}, ${time}`}>
      <span className="iz-topbar-date">{dateLine}</span>
      <span className="iz-topbar-time">{time}</span>
    </div>
  );
}



export type AppTopbarProps = {

  backTo?: string;

  backLabel?: string;

  /** In-page back — return `false` to also run route navigation */

  onBack?: () => void | boolean;

  hideBack?: boolean;

};

export function PortalBackButton({

  backTo,

  backLabel,

  onBack,

  className,

}: {

  backTo?: string;

  backLabel?: string;

  onBack?: () => void | boolean;

  className?: string;

}) {

  const navigate = useNavigate();

  const { pathname } = useLocation();

  const resolvedBackTo = backTo ?? getAutoBackTo(pathname);

  const resolvedLabel = backLabel ?? getAutoBackLabel(pathname);

  const showBack = onBack != null || resolvedBackTo != null;

  if (!showBack) {

    return <span className="iz-topbar-spacer" aria-hidden />;

  }

  const handleBack = () => {

    if (onBack) {

      const fallThrough = onBack();

      if (fallThrough !== false) return;

    }

    if (resolvedBackTo === WELCOME_PATH) {

      goToWelcome();

      return;

    }

    if (resolvedBackTo) void navigate({ to: resolvedBackTo });

  };

  return (

    <button

      type="button"

      className={className ? `iz-topbar-back ${className}` : "iz-topbar-back"}

      onClick={handleBack}

      aria-label={resolvedLabel}

      title={resolvedLabel}

    >

      <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />

      <span className="iz-topbar-back-label">{resolvedLabel}</span>

    </button>

  );

}

export function AppTopbar({

  backTo,

  backLabel,

  onBack,

  hideBack = false,

}: AppTopbarProps) {

  const { pathname } = useLocation();



  const { role: prSubRole } = usePrPortalReady();

  const outletSubRole = useStore((s) => s.outletSubRole);

  const agencySubRole = useStore((s) => s.agencySubRole);

  const prDisplayName = useStore((s) => s.prDisplayName);

  const prAvatarPhoto = useStore((s) => s.prAvatarPhoto);

  let role: keyof typeof ROLE_LABELS = "host";

  if (pathname.startsWith("/outlet")) role = "vendor";

  else if (pathname.startsWith("/agency")) role = "agency";

  else if (pathname.startsWith("/host")) {

    if (prSubRole === "pr_free") role = "host_free";

    else if (prSubRole === "pr_tied") role = "host_tied";

    else role = "host";

  }



  const prProfile = prSubRole ? getPrProfile(prSubRole) : null;

  const meta = ROLE_LABELS[role];

  const displayName = prDisplayName ?? prProfile?.name ?? meta.name;

  const displayAv = displayName.trim()[0]?.toUpperCase() ?? prProfile?.av ?? meta.av;

  const displayGradient = prProfile?.avg ?? meta.gradient;

  const displayLabel =

    pathname.startsWith("/outlet") && outletSubRole

      ? OUTLET_SUB_ROLE_LABELS[outletSubRole]

      : pathname.startsWith("/agency") && agencySubRole

        ? AGENCY_SUB_ROLE_LABELS[agencySubRole]

        : meta.label;



  const resolvedBackTo = backTo ?? getAutoBackTo(pathname);
  const isPortalShell = pathname.startsWith("/outlet") || pathname.startsWith("/agency");

  if (isPortalShell && onBack == null) {
    return null;
  }

  const showBack =
    !hideBack &&
    (isPortalShell ? onBack != null : onBack != null || resolvedBackTo != null);

  const goWelcome = () => {
    goToWelcome();
  };

  const isPrPortal = pathname.startsWith("/host");

  return (
    <header className={`iz-topbar${isPortalShell ? " iz-topbar--minimal" : ""}`}>
      {showBack ? (
        <PortalBackButton backTo={backTo} backLabel={backLabel} onBack={onBack} />
      ) : (
        <span className="iz-topbar-spacer" aria-hidden />
      )}

      {!isPortalShell && (
        <>
          {isPrPortal ? (
            <div className="iz-topbar-center">
              <Link
                to="/host/profile"
                className="iz-topbar-identity iz-topbar-identity--link"
                aria-label="Open profile"
                title="Profile"
              >
                <div
                  className={`iz-avatar iz-avatar--sm${prAvatarPhoto ? " iz-avatar-photo" : ""}`}
                  style={prAvatarPhoto ? undefined : { background: displayGradient }}
                >
                  {prAvatarPhoto ? <img src={prAvatarPhoto} alt="" /> : displayAv}
                </div>
                <div className="iz-topbar-meta">
                  <div className="iz-topbar-name">{displayName}</div>
                  <div className="iz-topbar-role">{displayLabel}</div>
                </div>
              </Link>
              <PrTopbarDateTime />
            </div>
          ) : (
            <div className="iz-topbar-identity">
              <div
                className={`iz-avatar iz-avatar--sm${prAvatarPhoto ? " iz-avatar-photo" : ""}`}
                style={prAvatarPhoto ? undefined : { background: displayGradient }}
              >
                {prAvatarPhoto ? <img src={prAvatarPhoto} alt="" /> : displayAv}
              </div>
              <div className="iz-topbar-meta">
                <div className="iz-topbar-name">{displayName}</div>
                <div className="iz-topbar-role">{displayLabel}</div>
              </div>
            </div>
          )}

          <div className="iz-topbar-actions">
            {isPrPortal && <PrNotificationBell />}
            <button
              type="button"
              className="iz-topbar-action"
              title="Switch role"
              aria-label="Switch role"
              onClick={goWelcome}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </header>
  );
}



/** Standalone back row below topbar (detail overlays, sheets) */

export function BackBar({

  label = "Back",

  onBack,

  to,

}: {

  label?: string;

  onBack?: () => void;

  to?: string;

}) {

  const navigate = useNavigate();

  return (

    <button

      type="button"

      className="iz-chip mb-2"

      onClick={() => {

        if (onBack) onBack();

        else if (to) navigate({ to });

      }}

    >

      <ArrowLeft className="h-3.5 w-3.5" />

      {label}

    </button>

  );

}



/** Screen shell: topbar + optional page title (wrap route content in `iz-screen`). */

export function AppHeader({

  title,

  subtitle,

  right,

  ...topbar

}: AppTopbarProps & {

  title: string;

  subtitle?: string;

  right?: ReactNode;

}) {

  return (

    <>

      <AppTopbar {...topbar} />

      {(subtitle || title || right) && (

        <div className="pb-2">

          {subtitle && <p className="iz-tiny iz-muted2 uppercase tracking-widest">{subtitle}</p>}

          <div className="flex items-start justify-between gap-2">

            {title ? (

              <h1 className="font-sora text-[22px] font-extrabold tracking-tight text-[var(--iz-txt)]">{title}</h1>

            ) : (

              <span />

            )}

            {right}

          </div>

        </div>

      )}

    </>

  );

}


