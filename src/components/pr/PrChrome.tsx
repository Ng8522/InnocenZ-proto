import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppTopbar, type AppTopbarProps } from "@/components/Nav";

type PrTopbarConfig = Pick<AppTopbarProps, "onBack" | "backLabel" | "backTo" | "hideBack">;

/** Serialisable back-button state that actually drives a topbar re-render. */
type PrTopbarMeta = {
  backLabel?: string;
  backTo?: string;
  hideBack?: boolean;
  hasBack: boolean;
};

const EMPTY_META: PrTopbarMeta = { hasBack: false };

type PrTopbarCtx = {
  register: (config: PrTopbarConfig) => void;
  reset: () => void;
};

const PrTopbarContext = createContext<PrTopbarCtx | null>(null);

/**
 * Persistent PR identity/status bar. Rendered once by the /host layout so the
 * avatar + name + date/time + notification bell stay pinned on every PR page
 * instead of each page scrolling its own copy away. Pages configure the back
 * button (and only the back button) through {@link usePrTopbar}.
 */
export function PrTopbarProvider({ children }: { children: ReactNode }) {
  // The onBack closure changes identity on every page render; keep it in a ref
  // so updating it never triggers a re-render (which would loop). Only the
  // serialisable back meta lives in state and re-renders the bar.
  const onBackRef = useRef<AppTopbarProps["onBack"]>(undefined);
  const [meta, setMeta] = useState<PrTopbarMeta>(EMPTY_META);

  const register = useCallback((config: PrTopbarConfig) => {
    onBackRef.current = config.onBack;
    setMeta((prev) => {
      const next: PrTopbarMeta = {
        backLabel: config.backLabel,
        backTo: config.backTo,
        hideBack: config.hideBack,
        hasBack: config.onBack != null,
      };
      if (
        prev.backLabel === next.backLabel &&
        prev.backTo === next.backTo &&
        prev.hideBack === next.hideBack &&
        prev.hasBack === next.hasBack
      ) {
        return prev; // no meaningful change → skip re-render, break the loop
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    onBackRef.current = undefined;
    setMeta((prev) => (prev === EMPTY_META ? prev : EMPTY_META));
  }, []);

  const ctx = useMemo(() => ({ register, reset }), [register, reset]);

  // Stable handler passed to the bar; always reads the latest page closure.
  const handleBack = useCallback(() => onBackRef.current?.(), []);

  return (
    <PrTopbarContext.Provider value={ctx}>
      <div className="iz-pr-chrome">
        <AppTopbar
          onBack={meta.hasBack ? handleBack : undefined}
          backLabel={meta.backLabel}
          backTo={meta.backTo}
          hideBack={meta.hideBack}
        />
      </div>
      {children}
    </PrTopbarContext.Provider>
  );
}

/**
 * Configure the persistent PR topbar for the current page. Call with no args
 * for an identity-only bar (home), or pass back-button config for detail pages.
 */
export function usePrTopbar(config: PrTopbarConfig = {}) {
  const ctx = useContext(PrTopbarContext);
  const { onBack, backLabel, backTo, hideBack } = config;

  // Re-register after every render so the bar tracks the latest onBack closure
  // and back-label state; `register` shallow-compares meta to avoid a loop.
  useEffect(() => {
    ctx?.register({ onBack, backLabel, backTo, hideBack });
  });

  // Clear config on unmount so the next page starts from a clean identity bar.
  useEffect(() => {
    return () => ctx?.reset();
  }, [ctx]);
}
