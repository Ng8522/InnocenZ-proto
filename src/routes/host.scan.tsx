import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { Camera, Shield } from "lucide-react";
import { IzCard } from "@/components/iz/ui";

export const Route = createFileRoute("/host/scan")({
  component: ReceiptScanPage,
});

function ReceiptScanPage() {
  const [scanned, setScanned] = useState(false);

  const runScan = () => {
    setScanned(false);
    setTimeout(() => setScanned(true), 900);
  };

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora mx-0.5 mt-1 text-[22px] font-extrabold text-[var(--iz-txt)]">Receipt Scan</h2>
      <p className="iz-tiny iz-muted mt-0.5">
        Phase 1 MVP · OCR reads the receipt, you confirm the item logged against your session.
      </p>

      <IzCard className="mt-3">
        <div className="iz-scanbox">
          {scanned ? (
            <div className="font-sora text-[11px] leading-relaxed text-[var(--iz-txt)]">
              <b className="text-[var(--iz-violet-l)]">— OCR EXTRACTED —</b>
              <br />
              Outlet: MERMATE KL
              <br />
              PR #: PR-0042 (Maggie)
              <br />
              2× Cocktail · RM 90
              <br />
              1× Tip · RM 60
              <br />
              <b>Total logged: RM 150</b>
            </div>
          ) : (
            <span className="iz-tiny iz-muted">Tap scan to capture a receipt</span>
          )}
        </div>
        <button type="button" className="iz-btn iz-btn-primary mt-3" onClick={runScan}>
          <Camera className="h-4 w-4" /> Scan receipt now
        </button>
      </IzCard>

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
