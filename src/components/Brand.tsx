export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${cls} font-display font-semibold tracking-tight leading-none`}>
        <span className="text-gradient-primary">Innocen</span>
        <span className="text-gradient-gold">Z</span>
      </div>
      {size !== "sm" && (
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Connect · Engage · Entertain
        </p>
      )}
    </div>
  );
}

export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto flex min-h-screen w-full max-w-[440px] flex-col ${className}`}>
      {children}
    </div>
  );
}
