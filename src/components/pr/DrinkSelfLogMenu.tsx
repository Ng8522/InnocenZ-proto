import { useEffect, useRef, useState } from "react";
import { Camera, Minus, Plus, ScanLine, Wine } from "lucide-react";
import {
  catalogItemsByCategory,
  type OutletCatalogCategory,
  type OutletDrinkPrice,
} from "@/lib/outlet-drink-menu";
import { formatRM } from "@/components/iz/ui";

const CATALOG_SECTIONS: { key: OutletCatalogCategory; label: string }[] = [
  { key: "drinks", label: "Drinks" },
  { key: "service", label: "Service" },
  { key: "tips", label: "Tips" },
];

type DrinkSelfLogMenuProps = {
  outlet: string;
  /** Catalog items available for this self-log (already filtered to the section). */
  drinkMenu: OutletDrinkPrice[];
  /** Dropdown heading — "drink" or "tip / service item" etc. */
  itemNoun?: string;
  qtys: Record<string, number>;
  onQtyChange: (drinkId: string, qty: number) => void;
  note: string;
  onNoteChange: (value: string) => void;
  total: number;
  commissionPreview: number | null;
};

export function emptyDrinkQtys(menu: OutletDrinkPrice[]): Record<string, number> {
  return Object.fromEntries(menu.map((d) => [d.id, 0]));
}

export function drinkQtysFromScanItems(
  menu: OutletDrinkPrice[],
  items: { label: string; qty: number; unitPrice: number; category: string }[],
): Record<string, number> {
  const qtys = emptyDrinkQtys(menu);
  for (const item of items) {
    const match =
      menu.find((d) => d.name === item.label) ?? menu.find((d) => d.priceRm === item.unitPrice);
    if (match) qtys[match.id] = Math.max(qtys[match.id] ?? 0, item.qty);
  }
  return qtys;
}

/** Demo OCR — pick a random 1–3 catalog items as the "words" read off the receipt. */
function demoDetect(menu: OutletDrinkPrice[]): string[] {
  if (menu.length === 0) return [];
  const pool = [...menu];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = Math.min(pool.length, 1 + Math.floor(Math.random() * 3));
  return pool.slice(0, count).map((d) => d.id);
}

type ScanPhase = "idle" | "scanning" | "done";

export function DrinkSelfLogMenu({
  outlet,
  drinkMenu,
  itemNoun = "item",
  qtys,
  onQtyChange,
  note,
  onNoteChange,
  total,
  commissionPreview,
}: DrinkSelfLogMenuProps) {
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [detectedIds, setDetectedIds] = useState<string[]>([]);
  const [showManual, setShowManual] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editing an existing pending self-log: items are already chosen, so skip the
  // camera and show them straight away.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    const preset = drinkMenu.filter((d) => (qtys[d.id] ?? 0) > 0).map((d) => d.id);
    if (preset.length > 0) {
      seeded.current = true;
      setDetectedIds(preset);
      setScanPhase("done");
    }
  }, [drinkMenu, qtys]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const runOcr = () => {
    setScanPhase("scanning");
    timer.current = setTimeout(() => {
      const found = demoDetect(drinkMenu);
      setDetectedIds((prev) => Array.from(new Set([...prev, ...found])));
      for (const id of found) {
        onQtyChange(id, Math.max(1, qtys[id] ?? 0));
      }
      setScanPhase("done");
    }, 900);
  };

  const addManual = (id: string) => {
    if (!id) return;
    setDetectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onQtyChange(id, Math.max(1, qtys[id] ?? 0));
    setShowManual(false);
  };

  const detected = drinkMenu.filter((d) => detectedIds.includes(d.id));
  const undetected = drinkMenu.filter((d) => !detectedIds.includes(d.id));
  const totalUnits = detected.reduce((n, d) => n + (qtys[d.id] ?? 0), 0);
  const presentSections = CATALOG_SECTIONS.filter(
    (s) => catalogItemsByCategory(undetected, s.key).length > 0,
  );

  return (
    <div className="iz-self-log-form">
      <div className="iz-self-log-outlet-head">
        <Wine className="h-4 w-4 shrink-0 text-[var(--iz-gold-l)]" />
        <div className="min-w-0">
          <p className="iz-self-log-outlet-head__title">{outlet}</p>
          <p className="iz-self-log-outlet-head__sub">
            OCR reads the receipt & matches this outlet's {drinkMenu.length} {itemNoun}
            {drinkMenu.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Camera / OCR trigger */}
      <div className="iz-self-log-scanbox mt-3">
        {scanPhase === "scanning" ? (
          <div className="iz-self-log-scanbox__scanning">
            <ScanLine className="h-8 w-8 animate-pulse text-[var(--iz-violet-l)]" />
            <p className="iz-tiny text-[var(--iz-violet-l)] mt-1">
              Reading OCR… matching {itemNoun}s
            </p>
          </div>
        ) : (
          <>
            <Camera className="h-8 w-8 text-[var(--iz-gold-l)]" />
            <p className="iz-tiny iz-muted2 mt-1 text-center">
              {scanPhase === "idle"
                ? `Point at the receipt — OCR lists the ${itemNoun}s it reads`
                : `Scan again to catch a ${itemNoun} OCR missed`}
            </p>
            <button type="button" className="iz-btn iz-btn-primary iz-btn-sm mt-2" onClick={runOcr}>
              <Camera className="h-4 w-4" />
              {scanPhase === "idle" ? `Scan ${itemNoun}s` : "Scan again"}
            </button>
          </>
        )}
      </div>

      {scanPhase === "done" && detected.length > 0 && (
        <div className="iz-self-log-drink-menu mt-3">
          <p className="iz-self-log-drink-section__label">OCR detected · adjust quantity</p>
          {detected.map((drink) => {
            const qty = qtys[drink.id] ?? 0;
            const lineTotal = drink.priceRm * qty;
            return (
              <div
                key={drink.id}
                className={`iz-self-log-drink-row${qty > 0 ? " iz-self-log-drink-row--active" : ""}`}
              >
                <div className="iz-self-log-drink-row__info">
                  <p className="iz-self-log-drink-row__name">{drink.name}</p>
                  <p className="iz-self-log-drink-row__price">{formatRM(drink.priceRm)} each</p>
                  {qty > 0 && (
                    <p className="iz-self-log-drink-row__line-total">
                      {formatRM(drink.priceRm)} × {qty} ={" "}
                      <b className="text-[var(--iz-gold-l)]">{formatRM(lineTotal)}</b>
                    </p>
                  )}
                </div>
                <div className="iz-self-log-drink-row__qty">
                  <button
                    type="button"
                    className="iz-chip flex h-8 w-8 shrink-0 items-center justify-center !p-0"
                    onClick={() => onQtyChange(drink.id, Math.max(0, qty - 1))}
                    disabled={qty <= 0}
                    aria-label={`Decrease ${drink.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="iz-self-log-drink-row__qty-val" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="iz-chip flex h-8 w-8 shrink-0 items-center justify-center !p-0"
                    onClick={() => onQtyChange(drink.id, qty + 1)}
                    aria-label={`Increase ${drink.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback — OCR missed an item, add it by hand */}
      {scanPhase === "done" && undetected.length > 0 && (
        <div className="mt-2">
          {showManual ? (
            <select
              className="iz-self-log-form__input mt-1 w-full appearance-none rounded-xl border border-[var(--iz-line2)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-semibold outline-none"
              value=""
              onChange={(e) => addManual(e.target.value)}
            >
              <option value="">Add {itemNoun} OCR missed…</option>
              {presentSections.map((section) => (
                <optgroup key={section.key} label={section.label}>
                  {catalogItemsByCategory(undetected, section.key).map((drink) => (
                    <option key={drink.id} value={drink.id}>
                      {drink.name} · {formatRM(drink.priceRm)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className="iz-tiny font-semibold text-[var(--iz-blue)]"
              onClick={() => setShowManual(true)}
            >
              OCR missed one? Add manually
            </button>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="iz-self-log-summary">
          <div className="iz-self-log-summary__row">
            <span className="iz-self-log-summary__label">
              {detected.filter((d) => (qtys[d.id] ?? 0) > 0).length} {itemNoun}
              {detected.length !== 1 ? "s" : ""} · {totalUnits} unit
              {totalUnits !== 1 ? "s" : ""}
            </span>
            <span className="iz-self-log-summary__total">{formatRM(total)}</span>
          </div>
          {commissionPreview != null && commissionPreview > 0 && (
            <p className="iz-tiny iz-muted2 mt-1.5">
              Commission preview:{" "}
              <b className="text-[var(--iz-gold-l)]">{formatRM(commissionPreview)}</b>
            </p>
          )}
        </div>
      )}

      {scanPhase === "done" && (
        <>
          <label className="iz-self-log-form__label mt-3" htmlFor="self-log-note">
            Note for agency (optional)
          </label>
          <textarea
            id="self-log-note"
            className="iz-self-log-form__note"
            rows={2}
            placeholder="Receipt water-damaged / OCR unreadable"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
