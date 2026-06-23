import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { IzCard } from "@/components/iz/ui";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import { goToWelcome } from "@/lib/go-welcome";
import { ChevronRight, Eye, EyeOff, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/host/security")({
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const signOut = useStore((s) => s.signOut);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast("Enter your current password", "warn");
      return;
    }
    if (!newPassword.trim()) {
      toast("Enter a new password", "warn");
      return;
    }
    if (newPassword.length < 6) {
      toast("New password must be at least 6 characters", "warn");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "warn");
      return;
    }
    if (newPassword === currentPassword) {
      toast("New password must be different from your current password", "warn");
      return;
    }
    toast("Password updated successfully", "success");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const confirmDeleteAccount = () => {
    setDeleteOpen(false);
    toast("Account deleted (demo)", "info");
    signOut();
    goToWelcome();
  };

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/host/profile" backLabel="Profile" />

      <IzCard glow className="iz-security-card mt-3">
        <div className="iz-security-card__head">
          <h1 className="iz-security-card__title">Security Settings</h1>
          <button
            type="button"
            className="iz-sheet-close"
            aria-label="Close"
            onClick={() => navigate({ to: "/host/profile" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={changePassword} className="iz-security-form">
          <PasswordField
            label="Current password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            placeholder="Enter your new password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
          />

          <button type="submit" className="iz-btn iz-btn-primary iz-security-form__submit">
            Change password
          </button>
        </form>

        <div className="iz-divider iz-security-divider" />

        <button
          type="button"
          className="iz-security-delete"
          onClick={() => setDeleteOpen(true)}
        >
          <span className="iz-security-delete__icon" aria-hidden>
            <Trash2 className="h-4 w-4" />
          </span>
          <span className="iz-security-delete__label">Delete account</span>
          <ChevronRight className="iz-security-delete__chevron" aria-hidden />
        </button>
      </IzCard>

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
          <button type="button" className="iz-btn iz-btn-soft flex-1" onClick={() => setDeleteOpen(false)}>
            Cancel
          </button>
          <button type="button" className="iz-btn iz-btn-danger flex-1" onClick={confirmDeleteAccount}>
            Delete account
          </button>
        </div>
      </IzSheet>
    </div>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="iz-field iz-security-field">
      <label>{label}</label>
      <div className="iz-security-field__wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="iz-signin-password-toggle iz-security-field__toggle"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={onToggleShow}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
