import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import { IzCard } from "@/components/iz/ui";
import { OtpVerifySheet } from "@/components/auth/OtpVerifySheet";
import { PasswordField } from "@/components/auth/PasswordField";
import { verifyDemoOtp } from "@/lib/verify-demo-otp";
import { useStore } from "@/lib/store";

type OtpPending = { field: "email" | "mobile"; value: string } | null;

export function AccountSecuritySection({
  email,
  mobile,
  canEdit = true,
  onUpdateEmail,
  onUpdateMobile,
}: {
  email: string;
  mobile: string;
  canEdit?: boolean;
  onUpdateEmail: (email: string) => void;
  onUpdateMobile: (mobile: string) => void;
}) {
  const toast = useStore((s) => s.toast);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpPending, setOtpPending] = useState<OtpPending>(null);

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
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

  const openOtpForEmail = () => {
    const next = newEmail.trim();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast("Enter a valid email address", "warn");
      return;
    }
    if (next === email.trim()) {
      toast("New email must be different from your current email", "warn");
      return;
    }
    setOtpPending({ field: "email", value: next });
    setOtp("");
    toast(`OTP sent to ${next}`, "info");
    setOtpOpen(true);
  };

  const openOtpForMobile = () => {
    const next = newMobile.trim();
    if (!next) {
      toast("Enter a mobile number", "warn");
      return;
    }
    if (next === mobile.trim()) {
      toast("New mobile must be different from your current number", "warn");
      return;
    }
    setOtpPending({ field: "mobile", value: next });
    setOtp("");
    toast(`OTP sent to ${next}`, "info");
    setOtpOpen(true);
  };

  const verifyContactOtp = () => {
    if (!otpPending) return;
    if (!verifyDemoOtp(otp)) {
      toast("Invalid OTP — try 123456 for demo", "warn");
      return;
    }
    if (otpPending.field === "email") {
      onUpdateEmail(otpPending.value);
      setNewEmail("");
    } else {
      onUpdateMobile(otpPending.value);
      setNewMobile("");
    }
    setOtpPending(null);
    setOtp("");
    setOtpOpen(false);
  };

  const resendOtp = () => {
    if (!otpPending) return;
    toast(`OTP resent to ${otpPending.value}`, "info");
  };

  const otpTitle = otpPending?.field === "email" ? "Verify new email" : "Verify new mobile";
  const otpDescription = otpPending ? (
    <>
      Enter the 6-digit code sent to <b className="text-[var(--iz-txt)]">{otpPending.value}</b>
    </>
  ) : (
    ""
  );

  return (
    <>
      <IzCard className="iz-account-security">
        <p className="iz-tiny iz-muted mb-4">
          Update your password anytime. Changing email or mobile requires OTP verification.
        </p>

        <div className="iz-account-security__block">
          <h3 className="iz-account-security__title">Password</h3>
          {canEdit ? (
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
          ) : (
            <p className="iz-tiny iz-muted">You do not have permission to change the password.</p>
          )}
        </div>

        <div className="iz-account-security__divider" />

        <div className="iz-account-security__block">
          <h3 className="iz-account-security__title">
            <Mail className="h-3.5 w-3.5" /> Email
          </h3>
          <p className="iz-account-security__current">{email || "—"}</p>
          {canEdit ? (
            <>
              <input
                type="email"
                className="iz-account-security__input"
                placeholder="New email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
              />
              <button
                type="button"
                className="iz-btn iz-btn-soft mt-2 w-full"
                onClick={openOtpForEmail}
              >
                Send OTP &amp; update email
              </button>
            </>
          ) : (
            <p className="iz-tiny iz-muted mt-1">Read-only for your role.</p>
          )}
        </div>

        <div className="iz-account-security__divider" />

        <div className="iz-account-security__block">
          <h3 className="iz-account-security__title">
            <Phone className="h-3.5 w-3.5" /> Mobile
          </h3>
          <p className="iz-account-security__current">{mobile || "—"}</p>
          {canEdit ? (
            <>
              <input
                type="tel"
                className="iz-account-security__input"
                placeholder="New mobile number"
                value={newMobile}
                onChange={(e) => setNewMobile(e.target.value)}
                autoComplete="tel"
              />
              <button
                type="button"
                className="iz-btn iz-btn-soft mt-2 w-full"
                onClick={openOtpForMobile}
              >
                Send OTP &amp; update mobile
              </button>
            </>
          ) : (
            <p className="iz-tiny iz-muted mt-1">Read-only for your role.</p>
          )}
        </div>
      </IzCard>

      <OtpVerifySheet
        open={otpOpen}
        onClose={() => {
          setOtpOpen(false);
          setOtpPending(null);
          setOtp("");
        }}
        title={otpTitle}
        description={otpDescription}
        otp={otp}
        onOtpChange={setOtp}
        onVerify={verifyContactOtp}
        onResend={resendOtp}
        verifyLabel="Verify & save"
      />
    </>
  );
}
