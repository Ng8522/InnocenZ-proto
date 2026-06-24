import type { ReactNode } from "react";

export function PrPageHeader({
  label,
  title,
  meta,
  trailing,
}: {
  label: string;
  title: ReactNode;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="iz-pr-page-header">
      <div className="iz-between items-start gap-3">
        <div className="min-w-0">
          <p className="iz-pr-page-header__label">{label}</p>
          <h2 className="iz-pr-page-header__title">{title}</h2>
          {meta && <p className="iz-pr-page-header__meta">{meta}</p>}
        </div>
        {trailing && <div className="shrink-0 text-right">{trailing}</div>}
      </div>
    </header>
  );
}
