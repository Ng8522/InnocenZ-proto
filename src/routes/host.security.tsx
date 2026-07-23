import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePrTopbar } from "@/components/pr/PrChrome";
import { PrSecuritySettingsSheets } from "@/components/pr/PrSecuritySettingsSheets";
import { IzCard, IzPageTitle } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import { goToWelcome } from "@/lib/go-welcome";
import { getPrProfile, getPrRosterId, resolvePrAccountFields } from "@/lib/pr-demo";
import { ChevronRight, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/host/security")({
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const signOut = useStore((s) => s.signOut);
  const prSubRole = useStore((s) => s.prSubRole);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prIcName = useStore((s) => s.prIcName);
  const prMobile = useStore((s) => s.prMobile);
  const prEmail = useStore((s) => s.prEmail);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const savePrContact = useStore((s) => s.savePrContact);

  const [securityOpen, setSecurityOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const profile = getPrProfile(prSubRole);
  const agencyPr = agencyPRs.find((p) => p.id === getPrRosterId(prSubRole));
  const account = resolvePrAccountFields(prSubRole, {
    prDisplayName,
    prIcName,
    prMobile,
    prEmail,
    agencyPr,
  });

  const closeSecurity = () => {
    setSecurityOpen(false);
    navigate({ to: "/host/profile" });
  };

  const confirmDeleteAccount = () => {
    setDeleteOpen(false);
    toast("Account deleted (demo)", "info");
    signOut();
    goToWelcome();
  };

  usePrTopbar({ backTo: "/host/profile", backLabel: "Profile" });

  return (
    <div className="iz-screen">
      <header className="mb-2">
        <IzPageTitle>Security settings</IzPageTitle>
        <p className="iz-tiny iz-muted mt-0.5">{profile.name}</p>
      </header>

      <IzCard className="iz-security-card">
        <button
          type="button"
          className="iz-btn iz-btn-primary w-full"
          onClick={() => setSecurityOpen(true)}
        >
          Open security settings
        </button>
      </IzCard>

      <IzCard className="iz-security-card mt-4">
        <button type="button" className="iz-security-delete" onClick={() => setDeleteOpen(true)}>
          <span className="iz-security-delete__icon" aria-hidden>
            <Trash2 className="h-4 w-4" />
          </span>
          <span className="iz-security-delete__label">Delete account</span>
          <ChevronRight className="iz-security-delete__chevron" aria-hidden />
        </button>
      </IzCard>

      <PrSecuritySettingsSheets
        open={securityOpen}
        onClose={closeSecurity}
        email={account.email}
        mobile={account.mobile}
        onUpdateEmail={(email) => savePrContact({ email })}
        onUpdateMobile={(mobile) => savePrContact({ mobile })}
      />

      <IzSheet open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="iz-sheet-head">
          <h3>Delete account?</h3>
          <button
            type="button"
            className="iz-sheet-close"
            onClick={() => setDeleteOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="iz-sm iz-muted">
          This permanently removes your InnocenZ profile, shift history, and payment records. This
          action cannot be undone in the prototype.
        </p>
        <div className="iz-sheet-actions mt-4">
          <button
            type="button"
            className="iz-btn iz-btn-soft flex-1"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="iz-btn iz-btn-danger flex-1"
            onClick={confirmDeleteAccount}
          >
            Delete account
          </button>
        </div>
      </IzSheet>
    </div>
  );
}
