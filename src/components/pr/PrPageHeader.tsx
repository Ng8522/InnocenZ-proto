export function PrPageHeader({
  label,
  title,
  meta,
  trailing,
}: {
  label: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="pt-1">
      <div className="iz-between items-start gap-3">
        <div className="min-w-0">
          <p className="iz-tiny uppercase tracking-widest text-[#d8c8ec]">{label}</p>
          <h2 className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">
            {title}
          </h2>
          {meta && <p className="iz-tiny iz-muted mt-0.5">{meta}</p>}
        </div>
        {trailing && <div className="shrink-0 text-right">{trailing}</div>}
      </div>
    </header>
  );
}
