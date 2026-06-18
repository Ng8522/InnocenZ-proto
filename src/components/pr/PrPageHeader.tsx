export function PrPageHeader({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta?: string;
}) {
  return (
    <header className="pt-1">
      <p className="iz-tiny uppercase tracking-widest text-[#d8c8ec]">{label}</p>
      <h2 className="font-sora mt-0.5 text-lg font-extrabold leading-snug text-[var(--iz-txt)]">{title}</h2>
      {meta && <p className="iz-tiny iz-muted mt-0.5">{meta}</p>}
    </header>
  );
}
