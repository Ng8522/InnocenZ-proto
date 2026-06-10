import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function SheetContent({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="iz-sheet-wrap open">
      <button type="button" className="iz-sheet-bg" aria-label="Close" onClick={onClose} />
      <div
        className="iz-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="iz-sheet-grab" />
        {children}
      </div>
    </div>
  );
}

export function IzSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [phoneEl, setPhoneEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPhoneEl(document.querySelector(".iz-phone"));
  }, []);

  if (!open) return null;

  const sheet = <SheetContent onClose={onClose}>{children}</SheetContent>;
  return phoneEl ? createPortal(sheet, phoneEl) : sheet;
}
