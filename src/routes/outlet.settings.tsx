import { createFileRoute } from "@tanstack/react-router";
import { AppTopbar } from "@/components/Nav";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { useStore } from "@/lib/store";
import { MapPin, Store } from "lucide-react";

export const Route = createFileRoute("/outlet/settings")({
  component: OutletSettingsPage,
});

function ToggleRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 border-b border-[var(--iz-line)] py-3 last:border-0 text-left"
    >
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="iz-tiny iz-muted mt-0.5">{desc}</div>
      </div>
      <span
        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${on ? "bg-[var(--iz-green)]" : "bg-[var(--iz-line)]"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

function OutletSettingsPage() {
  const { outletSettings, saveOutletSettings } = useStore();

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/outlet" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Settings</h2>
        <p className="iz-tiny iz-muted mt-0.5">{outletSettings.venueName}</p>
      </header>

      <IzSectionLabel className="mt-4">Venue</IzSectionLabel>
      <IzCard className="mt-2 !py-0 px-4">
        <div className="flex items-center gap-3 border-b border-[var(--iz-line)] py-2.5">
          <Store className="h-4 w-4 text-[var(--iz-muted)]" />
          <span className="text-sm">Venue</span>
          <input
            value={outletSettings.venueName}
            onChange={(e) => saveOutletSettings({ venueName: e.target.value })}
            className="ml-auto max-w-[55%] bg-transparent text-right text-xs outline-none"
          />
        </div>
        <div className="flex items-center gap-3 py-2.5">
          <MapPin className="h-4 w-4 text-[var(--iz-muted)]" />
          <span className="text-sm">Location</span>
          <input
            value={outletSettings.location}
            onChange={(e) => saveOutletSettings({ location: e.target.value })}
            className="ml-auto max-w-[55%] bg-transparent text-right text-xs outline-none"
          />
        </div>
      </IzCard>

      <IzSectionLabel>Notifications</IzSectionLabel>
      <IzCard className="mt-2 !py-0 px-4">
        <ToggleRow
          label="Shift updates"
          desc="PR accept/decline · roster changes"
          on={outletSettings.notifyShiftUpdates}
          onChange={(v) => saveOutletSettings({ notifyShiftUpdates: v })}
        />
        <ToggleRow
          label="Reconciliation"
          desc="Daily variance alerts"
          on={outletSettings.notifyReconciliation}
          onChange={(v) => saveOutletSettings({ notifyReconciliation: v })}
        />
        <ToggleRow
          label="Invoice due"
          desc="Billing reminders"
          on={outletSettings.notifyInvoiceDue}
          onChange={(v) => saveOutletSettings({ notifyInvoiceDue: v })}
        />
      </IzCard>
    </div>
  );
}
