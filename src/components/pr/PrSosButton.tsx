import { useRef, useState } from "react";
import { AlertTriangle, Camera } from "lucide-react";
import { IzSheet } from "@/components/iz/Sheet";
import { IzCard } from "@/components/iz/ui";
import { useStore } from "@/lib/store";

export function PrSosFab() {
  const submitSosIncident = useStore((s) => s.submitSosIncident);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = () => {
    if (!note.trim()) {
      toast("Add a short incident note", "warn");
      return;
    }
    submitSosIncident(note.trim(), photo ?? undefined);
    setOpen(false);
    setNote("");
    setPhoto(null);
  };

  return (
    <>
      <button
        type="button"
        className="iz-sos-fab"
        aria-label="SOS Emergency — tap to report"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-5 w-5" />
        <span>SOS</span>
      </button>

      <IzSheet open={open} onClose={() => setOpen(false)}>
        <div className="iz-cardttl text-[var(--iz-red)]">SOS incident report</div>
        <IzCard flat className="border-[rgba(255,107,107,.35)]">
          <p className="iz-tiny iz-muted">
            Live location sent to Atlas Agency, outlet duty manager, InnocenZ Admin, and your emergency contacts.
          </p>
          <p className="iz-tiny mt-2 font-semibold text-[var(--iz-gold-l)]">
            GPS: Jalan Changkat, KL · 3.1478, 101.7005
          </p>
        </IzCard>
        <label className="iz-tiny iz-muted2 mt-3 block tracking-wide">WHAT HAPPENED?</label>
        <textarea
          className="iz-pv-dispute-input mt-1.5"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe the situation…"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setPhoto(r.result as string);
            r.readAsDataURL(f);
          }}
        />
        <button type="button" className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-auto" onClick={() => fileRef.current?.click()}>
          <Camera className="h-3.5 w-3.5" /> Attach photo
        </button>
        {photo && <img src={photo} alt="" className="mt-2 max-h-24 rounded-lg object-cover" />}
        <button type="button" className="iz-btn iz-btn-danger mt-4" onClick={send}>
          Send SOS alert
        </button>
      </IzSheet>
    </>
  );
}
