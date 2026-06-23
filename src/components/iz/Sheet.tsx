import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type MountMode = "phone" | "overlay";

function resolveSheetMount(): { el: HTMLElement; mode: MountMode } {
  const phone = document.querySelector(".iz-phone");
  if (phone instanceof HTMLElement) return { el: phone, mode: "phone" };
  return { el: document.body, mode: "overlay" };
}

function lockScroll() {
  const targets: HTMLElement[] = [];
  for (const sel of [".iz-portal-viewport", ".iz-viewport", ".iz-phone"]) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) targets.push(el);
  }
  const saved = targets.map((el) => ({ el, overflow: el.style.overflow, top: el.scrollTop }));
  targets.forEach((el) => {
    el.style.overflow = "hidden";
  });
  const bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    saved.forEach(({ el, overflow, top }) => {
      el.style.overflow = overflow;
      el.scrollTop = top;
    });
    document.body.style.overflow = bodyOverflow;
  };
}

function SheetContent({
  onClose,
  children,
  mode,
  wide,
  rating,
}: {
  onClose: () => void;
  children: ReactNode;
  mode: MountMode;
  wide?: boolean;
  rating?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`iz-sheet-wrap open iz-sheet-wrap--${mode}`}>
      <button type="button" className="iz-sheet-bg" aria-label="Close" onClick={onClose} />
      <div
        className={`iz-sheet${mode === "overlay" ? " iz-sheet--dialog" : ""}${wide ? " iz-sheet--wide" : ""}${rating ? " iz-sheet--rating" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="iz-sheet-grab" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function IzSheet({
  open,
  onClose,
  children,
  wide = false,
  rating = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  rating?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    return lockScroll();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const mount = resolveSheetMount();
  const sheet = (
    <SheetContent onClose={onClose} mode={mount.mode} wide={wide} rating={rating}>
      {children}
    </SheetContent>
  );

  return createPortal(sheet, mount.el);
}
