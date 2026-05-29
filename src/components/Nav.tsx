import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

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
    <nav className="sticky bottom-0 z-40 mt-auto border-t border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[440px] items-center justify-around px-2 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {items.map((i) => {
          const isActive = navIsActive(pathname, i.to);
          return (
            <Link
              key={i.to}
              to={i.to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <i.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_8px_oklch(0.62_0.24_305)]" : ""}`} />
              <span className="text-[10px] font-medium">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          {subtitle && <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{subtitle}</p>}
          <h1 className="text-lg font-display font-semibold">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}
