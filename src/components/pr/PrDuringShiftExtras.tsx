import { useState } from "react";
import { QrCode, ScanLine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { IzSheet } from "@/components/iz/Sheet";
import { IzHScroll } from "@/components/iz/HScroll";
import { useStore } from "@/lib/store";
import { getPrProfile } from "@/lib/pr-demo";

export function PrDuringShiftExtras() {
  const prSubRole = useStore((s) => s.prSubRole);
  const profile = getPrProfile(prSubRole);
  const [qrOpen, setQrOpen] = useState(false);

  const prCode = `PR-${profile.first.toUpperCase().slice(0, 3)}-${profile.ic.slice(-4)}`;

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">
          Sales
        </span>
        <IzHScroll className="flex flex-1 gap-2 pb-0.5">
          <button
            type="button"
            className="iz-outlet-quick-chip shrink-0"
            onClick={() => setQrOpen(true)}
          >
            <QrCode className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> My QR
          </button>
          <Link to="/host/scan" className="iz-outlet-quick-chip shrink-0">
            <ScanLine className="h-3.5 w-3.5 text-[var(--iz-gold)]" /> Scan receipt
          </Link>
        </IzHScroll>
      </div>

      <IzSheet open={qrOpen} onClose={() => setQrOpen(false)}>
        <div className="iz-cardttl">PR QR</div>
        <p className="iz-tiny iz-muted mb-3">Outlet scans to attribute sales to you.</p>
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-white p-3">
          <QrCode className="h-full w-full text-[#1a1a1a]" strokeWidth={1} />
        </div>
        <p className="font-sora iz-sm mt-3 text-center font-bold">{profile.name}</p>
        <p className="iz-tiny iz-muted text-center">{prCode}</p>
      </IzSheet>
    </>
  );
}
