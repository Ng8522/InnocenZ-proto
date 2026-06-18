import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  RECEIPT_COMMISSION_RULES,
  PR_SHIFT_OFFERS,
  SHIFT_TODAY,
  buildDemoReceiptDraft,
  buildDemoReceiptDraftForCategory,
  findDuplicateReceiptScan,
  buildDemoReceiptRef,
  fmtHistDate,
  getPrProfile,
  getPrRosterId,
  receiptBelongsToPvLabel,
  receiptPvCalcNote,
} from "@/lib/pr-demo";
import { Camera, Check, History, Shield } from "lucide-react";
import { IzCard, IzPill, formatRM } from "@/components/iz/ui";

type ScanCategory = "drinks" | "tips" | "tables";

const SCAN_CATEGORY_LABEL: Record<ScanCategory, string> = {
  drinks: "Drinks",
  tips: "Tips",
  tables: "Tables",
};

export const Route = createFileRoute("/host/scan")({
  validateSearch: (search: Record<string, unknown>): { category?: ScanCategory } => {
    const raw = search.category;
    if (raw === "drinks" || raw === "tips" || raw === "tables") return { category: raw };
    return {};
  },
  component: ReceiptScanPage,
});

type ScanPhase = "idle" | "scanning" | "review" | "logged";

function ReceiptScanPage() {
  const { category } = Route.useSearch();
  const prSubRole = useStore((s) => s.prSubRole);
  const checkedIn = useStore((s) => s.checkedIn);
  const checkedOut = useStore((s) => s.checkedOut);
  const prActiveShift = useStore((s) => s.prActiveShift);
  const addReceiptScan = useStore((s) => s.addReceiptScan);
  const prReceiptScans = useStore((s) => s.prReceiptScans ?? []);
  const profile = getPrProfile(prSubRole);
  const prId = getPrRosterId(prSubRole);

  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [pendingReceiptRef, setPendingReceiptRef] = useState<string | null>(null);

  const outlet = prActiveShift?.outlet ?? PR_SHIFT_OFFERS[0].outlet;
  const shiftDate = prActiveShift?.date ?? SHIFT_TODAY;
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

  const categoryLabel = category ? SCAN_CATEGORY_LABEL[category] : null;

  const canScan = checkedIn && !checkedOut && prActiveShift;

  const runScan = () => {
    setPhase("scanning");
    setLoggedId(null);
    setPendingReceiptRef(buildDemoReceiptRef(outlet, shiftDate));
    setTimeout(() => setPhase("review"), 900);
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
    });
    if (!id) return;
    setLoggedId(id);
    setPhase("logged");
  };

  const loggedScan = loggedId ? prReceiptScans.find((s) => s.id === loggedId) : null;
  const [y, m, d] = SHIFT_TODAY;

  const resetScan = () => {
    setPhase("idle");
    setLoggedId(null);
    setPendingReceiptRef(null);
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (phase !== "idle") {
            resetScan();
            return;
          }
          return false;
        }}
        backLabel={phase === "logged" ? "Scan" : phase === "review" ? "Rescan" : undefined}
      />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">
        {categoryLabel ? `Scan ${categoryLabel.toLowerCase()} receipt` : "Receipt Scan"}
      </h2>
      <p className="iz-tiny iz-muted mt-0.5">
        Receipts scanned between Time-In and Time-Out attach to one PV for that shift only.
      </p>

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
          <div className="iz-scanbox">
            {phase === "idle" && (
              <span className="iz-tiny iz-muted">Tap scan to capture a receipt</span>
            )}
            {phase === "scanning" && (
              <span className="iz-tiny text-[var(--iz-violet-l)]">
                Scanning… reading OCR fields
              </span>
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
          </div>

          {phase === "review" && (
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
                    {draft.tableCommission > 0 && (
                      <tr>
                        <td>Tables</td>
                        <td className="iz-muted">
                          Per table × RM{RECEIPT_COMMISSION_RULES.tablePerUnit}
                        </td>
                        <td className="text-right">{formatRM(draft.tableCommission)}</td>
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
              <p className="iz-tiny iz-muted2 mt-2">
                Rolled into <b>{prActiveShift.pvId}</b> when you Time-Out (wages + all shift
                receipts).
              </p>
            </IzCard>
          )}

          {phase === "logged" && loggedScan && (
            <IzCard flat className="mt-3 border-[rgba(57,217,138,.3)] bg-[var(--iz-green-bg)]">
              <p className="iz-sm font-bold text-[var(--iz-green)]">
                <Check className="mr-1 inline h-4 w-4" />
                Receipt logged · {loggedScan.id}
              </p>
              <p className="iz-tiny iz-muted mt-1">{receiptPvCalcNote(loggedScan)}</p>
              <p className="iz-tiny text-[var(--iz-gold-l)] mt-1">
                Belongs to PV: <b>{loggedScan.pvId ?? "—"}</b>
              </p>
              <p className="iz-tiny iz-muted2 mt-1">
                {fmtHistDate(y, m, d)} · {loggedScan.scannedAt}
              </p>
            </IzCard>
          )}

          {phase !== "logged" && (
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-3"
              onClick={phase === "review" ? confirmLog : runScan}
              disabled={phase === "scanning"}
            >
              <Camera className="h-4 w-4" />
              {phase === "review" ? "Confirm & log receipt" : "Scan receipt now"}
            </button>
          )}

          {phase === "logged" && (
            <div className="iz-grid2 mt-3">
              <button type="button" className="iz-btn iz-btn-soft" onClick={() => setPhase("idle")}>
                Scan another
              </button>
              <Link
                to="/host/history"
                search={{ tab: "receipts" }}
                className="iz-btn iz-btn-primary"
              >
                <History className="h-4 w-4" /> View all records
              </Link>
            </div>
          )}
        </IzCard>
      )}

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <Shield className="mr-1 inline h-3 w-3" />
        Phase 2 replaces this with live POS API auto-sync.
      </IzCard>
      <Link to="/host/tonight" className="iz-btn iz-btn-soft mt-2.5">
        Back to attendance
      </Link>
    </div>
  );
}
