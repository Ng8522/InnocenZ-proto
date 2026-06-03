import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function IzCard({
  children,
  className,
  glow,
  flat,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  flat?: boolean;
}) {
  return (
    <div className={cn("iz-card", flat && "iz-card-flat", glow && "iz-card-glow", className)}>
      {children}
    </div>
  );
}

export function IzPill({
  children,
  variant = "ink",
  className,
}: {
  children: ReactNode;
  variant?: "violet" | "green" | "red" | "amber" | "gold" | "ink";
  className?: string;
}) {
  const v = {
    violet: "iz-pill-violet",
    green: "iz-pill-green",
    red: "iz-pill-red",
    amber: "iz-pill-amber",
    gold: "iz-pill-gold",
    ink: "iz-pill-ink",
  }[variant];
  return <span className={cn("iz-pill", v, className)}>{children}</span>;
}

export function IzSectionLabel({ children }: { children: ReactNode }) {
  return <div className="iz-sect-label">{children}</div>;
}

export function formatRM(n: number) {
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

