import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import type { LucideIcon } from "lucide-react";

import { ArrowLeft, ArrowLeftRight, Shield } from "lucide-react";

import { getPrProfile } from "@/lib/pr-demo";

import { AGENCY_SUB_ROLE_LABELS } from "@/lib/agency-rbac";

import { goToWelcome } from "@/lib/go-welcome";
import { PrNotificationBell } from "@/components/pr/PrNotificationBell";
import { getAutoBackLabel, getAutoBackTo, WELCOME_PATH } from "@/lib/nav-back";

import { OUTLET_SUB_ROLE_LABELS } from "@/lib/outlet-rbac";

import { useStore } from "@/lib/store";

export interface NavItem {

  to: string;

  label: string;

  icon: LucideIcon;

}



function navIsActive(pathname: string, to: string) {

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

  host: { name: "Maggie Chan", label: "PR", av: "M", gradient: "linear-gradient(135deg,#C99B4E,#8a5e22)" },

  host_tied: { name: "Maggie Chan", label: "PR \u00b7 Agency-Tied", av: "M", gradient: "linear-gradient(135deg,#C99B4E,#8a5e22)" },

  host_free: { name: "Jaya Nair", label: "PR \u00b7 Freelancer", av: "J", gradient: "linear-gradient(135deg,#5BA8FF,#2d63b8)" },

  agency: { name: "Atlas Agency", label: "PR Agency", av: "A", gradient: "var(--iz-grad)" },

  vendor: { name: "Velvet 23", label: "Outlet", av: "V", gradient: "linear-gradient(135deg,#39D98A,#1f8f5c)" },

};



export type AppTopbarProps = {

  backTo?: string;

  backLabel?: string;

  /** In-page back (detail sheets) — overrides `backTo` navigation */

  onBack?: () => void;

  hideBack?: boolean;

};



export function AppTopbar({

  backTo,

  backLabel,

  onBack,

  hideBack = false,

}: AppTopbarProps) {

  const navigate = useNavigate();

  const { pathname } = useLocation();



  const prSubRole = useStore((s) => s.prSubRole);

  const outletSubRole = useStore((s) => s.outletSubRole);

  const agencySubRole = useStore((s) => s.agencySubRole);

  const prDisplayName = useStore((s) => s.prDisplayName);

  const prAvatarPhoto = useStore((s) => s.prAvatarPhoto);

  let role: keyof typeof ROLE_LABELS = "host";

  if (pathname.startsWith("/outlet")) role = "vendor";

  else if (pathname.startsWith("/agency")) role = "agency";

  else if (pathname.startsWith("/host")) {

    role = prSubRole === "pr_free" ? "host_free" : "host_tied";

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

  const resolvedLabel = backLabel ?? getAutoBackLabel(pathname);

  const showBack = !hideBack && (onBack != null || resolvedBackTo != null);

  const goWelcome = () => {
    goToWelcome();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (resolvedBackTo === WELCOME_PATH) {
      goWelcome();
      return;
    }
    if (resolvedBackTo) void navigate({ to: resolvedBackTo });
  };

  return (
    <header className="iz-topbar">
      {showBack ? (
        <button
          type="button"
          className="iz-topbar-back"
          onClick={handleBack}
          aria-label={resolvedLabel}
          title={resolvedLabel}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span className="iz-topbar-back-label">{resolvedLabel}</span>
        </button>
      ) : (
        <span className="iz-topbar-spacer" aria-hidden />
      )}

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

      <div className="iz-topbar-actions">
        {pathname.startsWith("/host") && <PrNotificationBell />}
        <span className="iz-topbar-action iz-topbar-action--muted" title="Verified portal" aria-hidden>
          <Shield className="h-3.5 w-3.5" />
        </span>
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


