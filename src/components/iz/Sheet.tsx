import type { ReactNode } from "react";

export function IzSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="iz-sheet-wrap open">
      <button type="button" className="iz-sheet-bg" aria-label="Close" onClick={onClose} />
      <div className="iz-sheet" role="dialog" aria-modal="true">
        <div className="iz-sheet-grab" />
        {children}
      </div>
    </div>
  );
}
