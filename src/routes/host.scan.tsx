import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  RECEIPT_COMMISSION_RULES,
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  buildDemoReceiptDraft,
  buildDemoReceiptDraftForCategory,
  buildManualReceiptItems,
  buildDrinkSelfLogItems,
  manualSelfLogTotal,
  buildDemoReceiptRef,
  fmtHistDate,
  getPrProfile,
  getPrRosterId,
  receiptPvCalcNote,
  calcReceiptCommissions,
  receiptScanCategory,
  isManualSelfLog,
  isSelfLogPendingAgency,
} from "@/lib/pr-demo";
import { getDrinkMenuForOutlet } from "@/lib/outlet-demo";
import { Camera, Check, History, PenLine, Shield, Droplets, RotateCcw, Minus, Plus } from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

type ScanCategory = "drinks" | "tips";

const SCAN_CATEGORY_LABEL: Record<ScanCategory, string> = {
  drinks: "Drinks",
  tips: "Tips",
};

export const Route = createFileRoute("/host/scan")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: ScanCategory; blurry?: boolean; rescan?: string; edit?: string } => {
    const raw = search.category;
    const category = raw === "drinks" || raw === "tips" ? (raw as ScanCategory) : undefined;
    const blurry = search.blurry === true || search.blurry === "true" || search.blurry === "1";
    const rescan = typeof search.rescan === "string" ? search.rescan : undefined;
    const edit = typeof search.edit === "string" ? search.edit : undefined;
    return { category, blurry, rescan, edit };
  },
  component: ReceiptScanPage,
});

type ScanPhase = "idle" | "scanning" | "review" | "blurry" | "manual" | "logged";

function ReceiptScanPage() {
  const { category, blurry: startBlurry, rescan: rescanId, edit: editId } = Route.useSearch();
  const prSubRole = useStore((s) => s.prSubRole);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const addReceiptScan = useStore((s) => s.addReceiptScan);
  const updateReceiptSelfLog = useStore((s) => s.updateReceiptSelfLog);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);

  const replaceScan = useMemo(
    () => (rescanId ? prReceiptScans.find((s) => s.id === rescanId) : undefined),
    [prReceiptScans, rescanId],
  );
  const editScan = useMemo(
    () => (editId ? prReceiptScans.find((s) => s.id === editId) : undefined),
    [prReceiptScans, editId],
  );

  const [phase, setPhase] = useState<ScanPhase>(() => {
    if (editId) return "manual";
    if (startBlurry) return "blurry";
    return "idle";
  });
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [pendingReceiptRef, setPendingReceiptRef] = useState<string | null>(() => {
    if (replaceScan) return replaceScan.receiptRef;
    if (editScan) return editScan.receiptRef;
    if (startBlurry) return buildDemoReceiptRef(PR_SHIFT_OFFERS[0].outlet, SHIFT_TODAY);
    return null;
  });
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("Receipt water-damaged / OCR unreadable");
  const [selectedDrinkId, setSelectedDrinkId] = useState("");
  const [drinkQty, setDrinkQty] = useState(1);

  const outlet = prActiveShift?.outlet ?? PR_SHIFT_OFFERS[0].outlet;
  const drinkMenu = useMemo(() => getDrinkMenuForOutlet(outlet), [outlet]);
  const selectedDrink = useMemo(
    () => drinkMenu.find((d) => d.id === selectedDrinkId),
    [drinkMenu, selectedDrinkId],
  );
  const shiftDate = prActiveShift?.date ?? SHIFT_TODAY;
  const scanCategory: ScanCategory = (() => {
    if (category) return category;
    const fromScan = replaceScan
      ? receiptScanCategory(replaceScan)
      : editScan
        ? receiptScanCategory(editScan)
        : "drinks";
    return fromScan;
  })();

  useEffect(() => {
    if (!editScan) return;
    if (!isManualSelfLog(editScan) || !isSelfLogPendingAgency(editScan)) {
      return;
    }
    const cat = receiptScanCategory(editScan);
    if (cat === "tips") {
      setManualAmount(String(editScan.totalLogged));
    } else {
      const drinkItem = editScan.items.find((i) => i.category === "drinks");
      if (drinkItem) {
        const match =
          drinkMenu.find((d) => d.name === drinkItem.label) ??
          drinkMenu.find((d) => d.priceRm === drinkItem.unitPrice);
        if (match) setSelectedDrinkId(match.id);
        setDrinkQty(Math.max(1, drinkItem.qty));
      }
    }
    setManualNote(editScan.manualReason ?? "Receipt water-damaged / OCR unreadable");
    setPendingReceiptRef(editScan.receiptRef);
    setPhase("manual");
  }, [editScan, drinkMenu]);

  useEffect(() => {
    if (scanCategory !== "drinks" || drinkMenu.length === 0) return;
    if (selectedDrinkId && drinkMenu.some((d) => d.id === selectedDrinkId)) return;
    setSelectedDrinkId(drinkMenu[0].id);
  }, [scanCategory, drinkMenu, selectedDrinkId]);

  const draft = useMemo(() => {
    if (category) {
      return buildDemoReceiptDraftForCategory(
        profile,
        outlet,
        prId,
        category,
        pendingReceiptRef ?? undefined,
      );
    }
    return buildDemoReceiptDraft(profile, outlet, 0, prId, pendingReceiptRef ?? undefined);
  }, [profile, outlet, prId, category, pendingReceiptRef]);

  const manualAmountNum = parseFloat(manualAmount.replace(/,/g, "")) || 0;
  const drinksTotal = useMemo(() => {
    if (!selectedDrink || drinkQty < 1) return 0;
    return manualSelfLogTotal(buildDrinkSelfLogItems(selectedDrink, drinkQty));
  }, [selectedDrink, drinkQty]);
  const manualPreview = useMemo(() => {
    if (scanCategory === "drinks") {
      if (!selectedDrink || drinkQty < 1) return null;
      return calcReceiptCommissions(buildDrinkSelfLogItems(selectedDrink, drinkQty));
    }
    if (manualAmountNum <= 0) return null;
    return calcReceiptCommissions(buildManualReceiptItems(scanCategory, manualAmountNum));
  }, [manualAmountNum, scanCategory, selectedDrink, drinkQty]);
  const manualSubmitTotal = scanCategory === "drinks" ? drinksTotal : manualAmountNum;
  const canSubmitManual = scanCategory === "drinks" ? drinksTotal > 0 : manualAmountNum > 0;

  const categoryLabel = category ? SCAN_CATEGORY_LABEL[category] : SCAN_CATEGORY_LABEL[scanCategory];
  const replaceScanId = replaceScan?.id ?? (editScan ? editScan.id : undefined);

  const canScan = checkedIn && !checkedOut && prActiveShift;

  const runScan = () => {
    setPhase("scanning");
    setLoggedId(null);
    const ref = buildDemoReceiptRef(outlet, shiftDate);
    setPendingReceiptRef(ref);
    setTimeout(() => {
      const ocrFailed = startBlurry || Math.random() < 0.35;
      setPhase(ocrFailed ? "blurry" : "review");
    }, 900);
  };

  const confirmLog = () => {
    const id = addReceiptScan({
      receiptRef: draft.receiptRef,
      outlet: draft.outlet,
      prCode: draft.prCode,
      prName: draft.prName,
      prId: draft.prId,
      items: draft.items,
      totalLogged: draft.totalLogged,
      replaceScanId,
    });
    if (!id) return;
    setLoggedId(id);
    setPhase("logged");
  };

  const confirmManualLog = () => {
    if (!canSubmitManual) return;
    if (editScan && isSelfLogPendingAgency(editScan)) {
      if (scanCategory === "drinks") {
        updateReceiptSelfLog(editScan.id, {
          drinkId: selectedDrinkId,
          drinkQty,
          reason: manualNote.trim() || undefined,
          category: "drinks",
        });
      } else {
        updateReceiptSelfLog(editScan.id, {
          amount: manualAmountNum,
          reason: manualNote.trim() || undefined,
          category: scanCategory,
        });
      }
      setLoggedId(editScan.id);
      setPhase("logged");
      return;
    }
    const ref = pendingReceiptRef ?? buildDemoReceiptRef(outlet, shiftDate);
    const id = addReceiptScan({
      receiptRef: ref,
      outlet: draft.outlet,
      prCode: draft.prCode,
      prName: draft.prName,
      prId: draft.prId,
      items: [],
      totalLogged: manualSubmitTotal,
      replaceScanId,
      manualSelfLog: {
        reason: manualNote.trim() || "OCR unreadable — water / blur on receipt",
        category: scanCategory,
        amount: manualSubmitTotal,
        ...(scanCategory === "drinks"
          ? { drinkId: selectedDrinkId, drinkQty }
          : {}),
      },
    });
    if (!id) return;
    setLoggedId(id);
    setPhase("logged");
  };

  const loggedScan = loggedId ? prReceiptScans.find((s) => s.id === loggedId) : null;
  const [y, m, d] = SHIFT_TODAY;

  const resetScan = () => {
    if (editId || rescanId) {
      window.history.back();
      return;
    }
    setPhase("idle");
    setLoggedId(null);
    setPendingReceiptRef(null);
    setManualAmount("");
  };

  const pageTitle = editScan
    ? "Edit self-log"
    : replaceScan
      ? "Scan again"
      : categoryLabel
        ? `Scan ${categoryLabel.toLowerCase()} receipt`
        : "Receipt Scan";

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (phase !== "idle" && !editId && !rescanId) {
            resetScan();
            return;
          }
          if (editId || rescanId) {
            resetScan();
            return;
          }
          return false;
        }}
        backLabel={
          phase === "logged"
            ? "Scan"
            : phase === "review" || phase === "manual"
              ? "Back"
              : undefined
        }
      />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">{pageTitle}</h2>
      <p className="iz-tiny iz-muted mt-0.5">
        {editScan
          ? scanCategory === "drinks"
            ? "Update drink, quantity, or note — agency is notified again for verification."
            : "Update amount or note — agency is notified again for verification."
          : replaceScan
            ? "Replace the wrong scan with a new OCR read or self-log."
            : "Receipts scanned between Time-In and Time-Out attach to one PV for that shift only."}
      </p>

      {replaceScan && phase !== "logged" && (
        <IzCard flat className="mt-2.5 border-[rgba(111,176,255,.35)]">
          <p className="iz-sm font-bold text-[var(--iz-blue)]">
            <RotateCcw className="mr-1 inline h-4 w-4" />
            Replacing {replaceScan.receiptRef}
          </p>
          <p className="iz-tiny iz-muted mt-1">
            Was {formatRM(replaceScan.totalLogged)} ·{" "}
            {isManualSelfLog(replaceScan) ? "self-log" : "OCR scan"}
          </p>
        </IzCard>
      )}

      {editScan && phase !== "logged" && (
        <IzCard flat className="mt-2.5 border-[rgba(232,194,122,.35)]">
          <p className="iz-sm font-bold text-[var(--iz-gold-l)]">
            <PenLine className="mr-1 inline h-4 w-4" />
            Editing self-log · {editScan.receiptRef}
          </p>
        </IzCard>
      )}

      {prActiveShift && checkedIn && !checkedOut && (
        <IzCard flat className="mt-2.5 border-[rgba(232,194,122,.35)]">
          <p className="iz-sm font-bold text-[var(--iz-gold-l)]">
            Active shift · {prActiveShift.outlet}
          </p>
          <p className="iz-tiny iz-muted mt-1">
            Belongs to <b className="text-[var(--iz-txt)]">{prActiveShift.pvId}</b> ·{" "}
            {prActiveShift.receiptIds.length} receipt(s) logged · Time-In {prActiveShift.timeIn}
          </p>
        </IzCard>
      )}

      {!canScan && (
        <IzCard flat className="mt-2.5 py-6 text-center">
          <p className="iz-sm iz-muted">Check in on Attendance before scanning receipts.</p>
          <Link to="/host/tonight" className="iz-btn iz-btn-primary iz-btn-sm mx-auto mt-3 w-auto">
            Go to Check-In
          </Link>
        </IzCard>
      )}

      {canScan && (
        <IzCard className="mt-3">
          {!editScan && (
            <div className="iz-scanbox">
              {phase === "idle" && (
                <span className="iz-tiny iz-muted">Tap scan to capture a receipt</span>
              )}
              {phase === "scanning" && (
                <span className="iz-tiny text-[var(--iz-violet-l)]">Scanning… reading OCR fields</span>
              )}
              {phase === "blurry" && (
                <div className="iz-scanbox--blurry font-sora w-full text-center text-[11px] leading-relaxed text-[var(--iz-muted)]">
                  <Droplets className="mx-auto mb-2 h-8 w-8 text-[var(--iz-blue)] opacity-70" />
                  <b className="text-[var(--iz-amber)]">OCR unreadable</b>
                  <br />
                  Receipt is water-damaged or too blurry to read.
                  <br />
                  {pendingReceiptRef && (
                    <span className="mt-1 block font-mono text-[10px] opacity-60">{pendingReceiptRef}</span>
                  )}
                </div>
              )}
              {(phase === "review" || phase === "logged") && (
                <div className="font-sora w-full text-left text-[11px] leading-relaxed text-[var(--iz-txt)]">
                  <b className="text-[var(--iz-violet-l)]">— OCR EXTRACTED —</b>
                  <br />
                  Receipt ID: {draft.receiptRef}
                  <br />
                  Outlet: {draft.outlet}
                  <br />
                  PR ID: {draft.prId} · {draft.prCode} ({draft.prName})
                  <br />
                  {draft.items.map((item) => (
                    <span key={item.label + item.qty}>
                      {item.qty}× {item.label} · {formatRM(item.amount)}
                      <br />
                    </span>
                  ))}
                  <b>Total logged: {formatRM(draft.totalLogged)}</b>
                </div>
              )}
              {phase === "manual" && !editScan && (
                <div className="font-sora w-full text-left text-[11px] leading-relaxed text-[var(--iz-txt)]">
                  <IzPill variant="amber" className="mb-2">
                    Manual self-log
                  </IzPill>
                  <p className="iz-tiny iz-muted2">
                    {scanCategory === "drinks"
                      ? "Select the drink sold and quantity — agency must verify before it counts toward your PV."
                      : "Key in the amount yourself — agency must verify before it counts toward your PV."}
                  </p>
                </div>
              )}
            </div>
          )}

          {phase === "blurry" && !editScan && (
            <div className="iz-self-log-callout mt-3">
              <PenLine className="h-4 w-4 shrink-0 text-[var(--iz-gold-l)]" />
              <div>
                <p className="iz-sm font-bold text-[var(--iz-gold-l)]">
                  {scanCategory === "drinks"
                    ? "Self-log drinks sold"
                    : "Self-log the amount manually"}
                </p>
                <p className="iz-tiny iz-muted2 mt-0.5">
                  {scanCategory === "drinks"
                    ? `When OCR fails, pick a drink from ${outlet}'s menu, enter how many were sold, and submit. Your agency receives a notification to verify.`
                    : "When OCR fails (water, blur, faded print), enter the total yourself. Your agency receives a notification to verify."}
                </p>
              </div>
            </div>
          )}

          {phase === "manual" && scanCategory === "drinks" && (
            <div className="iz-self-log-form mt-3">
              <label className="iz-self-log-form__label">Drink · {outlet}</label>
              <div className="iz-self-log-drink-grid mt-2">
                {drinkMenu.map((drink) => (
                  <button
                    key={drink.id}
                    type="button"
                    className={`iz-self-log-drink-option${selectedDrinkId === drink.id ? " iz-self-log-drink-option--selected" : ""}`}
                    onClick={() => setSelectedDrinkId(drink.id)}
                  >
                    <span className="iz-self-log-drink-option__name">{drink.name}</span>
                    <span className="iz-self-log-drink-option__price">{formatRM(drink.priceRm)} each</span>
                  </button>
                ))}
              </div>
              <label className="iz-self-log-form__label mt-3">Quantity sold</label>
              <div className="iz-self-log-qty mt-2">
                <button
                  type="button"
                  className="iz-chip flex h-9 w-9 shrink-0 items-center justify-center !p-0"
                  onClick={() => setDrinkQty((q) => Math.max(1, q - 1))}
                  disabled={drinkQty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="iz-self-log-qty__value">{drinkQty}</span>
                <button
                  type="button"
                  className="iz-chip flex h-9 w-9 shrink-0 items-center justify-center !p-0"
                  onClick={() => setDrinkQty((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {selectedDrink && drinkQty >= 1 && (
                <p className="iz-self-log-total mt-3">
                  {formatRM(selectedDrink.priceRm)} × {drinkQty} ={" "}
                  <b className="text-[var(--iz-gold-l)]">{formatRM(drinksTotal)}</b>
                </p>
              )}
              <label className="iz-self-log-form__label mt-3" htmlFor="self-log-note">
                Note for agency (optional)
              </label>
              <textarea
                id="self-log-note"
                className="iz-self-log-form__note"
                rows={2}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
              />
              {manualPreview && drinksTotal > 0 && (
                <p className="iz-tiny iz-muted2 mt-2">
                  Commission preview:{" "}
                  <b className="text-[var(--iz-gold-l)]">{formatRM(manualPreview.totalCommission)}</b>
                </p>
              )}
            </div>
          )}

          {phase === "manual" && scanCategory === "tips" && (
            <div className="iz-self-log-form mt-3">
              <label className="iz-self-log-form__label" htmlFor="self-log-amount">
                Amount to self-log ({SCAN_CATEGORY_LABEL[scanCategory]})
              </label>
              <div className="iz-self-log-form__amount-wrap">
                <span className="iz-self-log-form__prefix">RM</span>
                <input
                  id="self-log-amount"
                  type="text"
                  inputMode="decimal"
                  className="iz-self-log-form__input"
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="iz-self-log-form__label mt-3" htmlFor="self-log-note">
                Note for agency (optional)
              </label>
              <textarea
                id="self-log-note"
                className="iz-self-log-form__note"
                rows={2}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
              />
              {manualPreview && manualAmountNum > 0 && (
                <p className="iz-tiny iz-muted2 mt-2">
                  Commission preview:{" "}
                  <b className="text-[var(--iz-gold-l)]">{formatRM(manualPreview.totalCommission)}</b>
                </p>
              )}
            </div>
          )}

          {phase === "review" && !editScan && (
            <IzCard
              flat
              className="mt-3 border-[rgba(111,176,255,.25)] bg-[linear-gradient(180deg,rgba(111,176,255,.08),transparent)]"
            >
              <p className="iz-sm font-bold text-[var(--iz-blue)]">Commission preview (PV calc)</p>
              <div className="iz-data-table-wrap mt-2">
                <table className="iz-data-table">
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Calc</th>
                      <th className="text-right">RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.drinkCommission > 0 && (
                      <tr>
                        <td>Drinks</td>
                        <td className="iz-muted">
                          {draft.items
                            .filter((i) => i.category === "drinks")
                            .reduce((s, i) => s + i.qty, 0)}{" "}
                          units × RM
                          {RECEIPT_COMMISSION_RULES.drinkPerUnit}
                        </td>
                        <td className="text-right">{formatRM(draft.drinkCommission)}</td>
                      </tr>
                    )}
                    {draft.tipCommission > 0 && (
                      <tr>
                        <td>Tips</td>
                        <td className="iz-muted">100% of tip logged</td>
                        <td className="text-right">{formatRM(draft.tipCommission)}</td>
                      </tr>
                    )}
                    <tr className="iz-data-table-tot">
                      <td colSpan={2}>
                        <b>Total commission (→ PV line)</b>
                      </td>
                      <td className="text-right font-bold text-[var(--iz-gold-l)]">
                        {formatRM(draft.totalCommission)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="iz-tiny mt-2 font-semibold text-[var(--iz-amber)]"
                onClick={() => setPhase("manual")}
              >
                OCR looks wrong?{" "}
                {scanCategory === "drinks" ? "Self-log drinks instead" : "Self-log manually instead"}
              </button>
            </IzCard>
          )}

          {phase === "logged" && loggedScan && (
            <IzCard
              flat
              className={`mt-3 ${loggedScan.logSource === "manual" ? "border-[rgba(244,183,64,.45)] bg-[rgba(244,183,64,.08)]" : "border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]"}`}
            >
              <p
                className={`iz-sm font-bold ${loggedScan.logSource === "manual" ? "text-[var(--iz-amber)]" : "text-[var(--iz-green)]"}`}
              >
                <Check className="mr-1 inline h-4 w-4" />
                {loggedScan.logSource === "manual"
                  ? editScan
                    ? "Self-log updated"
                    : "Self-log submitted"
                  : replaceScan
                    ? "Receipt re-scanned"
                    : "Receipt logged"}{" "}
                · {loggedScan.id}
              </p>
              <p className="iz-tiny iz-muted mt-1">{receiptPvCalcNote(loggedScan)}</p>
              {loggedScan.logSource === "manual" && isSelfLogPendingAgency(loggedScan) && (
                <p className="iz-tiny text-[var(--iz-amber)] mt-1">
                  Pending agency verification in Payment — shows as <b>Pending verification</b> on your status table until approved.
                </p>
              )}
              <p className="iz-tiny text-[var(--iz-gold-l)] mt-1">
                Belongs to PV: <b>{loggedScan.pvId ?? "—"}</b>
              </p>
              <p className="iz-tiny iz-muted2 mt-1">
                {fmtHistDate(y, m, d)} · {loggedScan.scannedAt}
              </p>
            </IzCard>
          )}

          {phase === "blurry" && !editScan && (
            <div className="iz-grid2 mt-3">
              <button type="button" className="iz-btn iz-btn-soft" onClick={runScan}>
                Retry scan
              </button>
              <button type="button" className="iz-btn iz-btn-primary" onClick={() => setPhase("manual")}>
                <PenLine className="h-4 w-4" />{" "}
                {scanCategory === "drinks" ? "Self-log drinks" : "Self-log amount"}
              </button>
            </div>
          )}

          {phase === "manual" && (
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-3 w-full iz-self-log-form__submit"
              onClick={confirmManualLog}
              disabled={!canSubmitManual}
            >
              <PenLine className="h-4 w-4" />
              {editScan
                ? `Save changes · ${canSubmitManual ? formatRM(manualSubmitTotal) : scanCategory === "drinks" ? "select drink" : "enter amount"}`
                : `Submit self-log · ${canSubmitManual ? formatRM(manualSubmitTotal) : scanCategory === "drinks" ? "select drink" : "enter amount"}`}
            </button>
          )}

          {!editScan && phase !== "logged" && phase !== "blurry" && phase !== "manual" && (
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-3"
              onClick={phase === "review" ? confirmLog : runScan}
              disabled={phase === "scanning"}
            >
              <Camera className="h-4 w-4" />
              {phase === "review"
                ? replaceScan
                  ? "Confirm & replace scan"
                  : "Confirm & log receipt"
                : replaceScan
                  ? "Scan again now"
                  : "Scan receipt now"}
            </button>
          )}

          {phase === "logged" && (
            <div className="iz-grid2 mt-3">
              {!editScan && !replaceScan && (
                <button type="button" className="iz-btn iz-btn-soft" onClick={() => setPhase("idle")}>
                  Scan another
                </button>
              )}
              <Link
                to="/host/tonight"
                className={`iz-btn iz-btn-primary ${editScan || replaceScan ? "col-span-2" : ""}`}
              >
                Back to Check-In
              </Link>
            </div>
          )}
        </IzCard>
      )}

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <Shield className="mr-1 inline h-3 w-3" />
        Wrong scan? Open the receipt on Check-In and tap <b>Scan again</b>. Pending self-logs can be <b>edited</b>.
      </IzCard>
      <Link to="/host/tonight" className="iz-btn iz-btn-soft mt-2.5">
        Back to attendance
      </Link>
    </div>
  );
}
