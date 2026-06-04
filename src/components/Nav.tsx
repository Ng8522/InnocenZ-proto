import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Shield } from "lucide-react";
import { getPrProfile } from "@/lib/pr-demo";
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
  vendor: { name: "Velvet Room KL", label: "Outlet", av: "V", gradient: "linear-gradient(135deg,#39D98A,#1f8f5c)" },
};

export function AppTopbar({
  backTo,
  backLabel = "Back",
  showDateTime,
}: {
  backTo?: string;
  backLabel?: string;
  showDateTime?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const prSubRole = useStore((s) => s.prSubRole);
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

  return (
    <div className="iz-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {backTo && (
          <button type="button" className="iz-chip" onClick={() => navigate({ to: backTo })}>
            ← {backLabel}
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={`iz-avatar${prAvatarPhoto ? " iz-avatar-photo" : ""}`}
            style={prAvatarPhoto ? undefined : { background: displayGradient }}
          >
            {prAvatarPhoto ? <img src={prAvatarPhoto} alt="" /> : displayAv}
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="iz-topbar-name">{displayName}</div>
            <div className="iz-topbar-role">{meta.label}</div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {showDateTime && pathname.startsWith("/agency") && (
          <span className="iz-chip hidden text-[10px] sm:inline">
            {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short" })}{" "}
            {new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <span className="iz-chip">
          <Shield className="h-3 w-3" />
        </span>
        <Link to="/" className="iz-chip">
          Switch
        </Link>
      </div>
    </div>
  );
}

/** Screen shell: topbar + optional page title (wrap route content in `iz-screen`). */
export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <>
      <AppTopbar />
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
