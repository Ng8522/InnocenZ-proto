import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { IzSheet } from "@/components/iz/Sheet";
import { ArrowLeft, User, Lock, Eye, EyeOff } from "lucide-react";

type ResetChannel = "email" | "phone";

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "create" ? "create" : "signin") as "signin" | "create",
  }),
  component: SignIn,
});

function detectChannel(value: string): ResetChannel {
  return value.trim().includes("@") ? "email" : "phone";
}

function resolveIdentifier(value: string): { channel: ResetChannel; identifier: string } | null {
  const identifier = value.trim();
  if (!identifier) return null;
  return { channel: detectChannel(identifier), identifier };
}

function isValidDemoOtp(code: string) {
  return code === "123456" || code.length === 6;
}

function displayNameForContact(contact: { channel: ResetChannel; identifier: string }) {
  return contact.channel === "email" ? contact.identifier.split("@")[0] || "User" : "User";
}

function OtpVerifySheet({
  open,
  onClose,
  title,
  description,
  otp,
  onOtpChange,
  onVerify,
  onResend,
  verifyLabel = "Verify OTP",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  verifyLabel?: string;
}) {
  return (
    <IzSheet open={open} onClose={onClose}>
      <div className="iz-cardttl">{title}</div>
      <p className="iz-tiny iz-muted mb-3">{description}</p>
      <input
        value={otp}
        onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        placeholder="123456"
        className="iz-pv-dispute-input !min-h-0 py-3 text-center font-mono text-lg tracking-[0.35em]"
        aria-label="One-time password"
      />
      <button type="button" className="iz-btn iz-btn-primary mt-4 w-full" onClick={onVerify}>
        {verifyLabel}
      </button>
      <button type="button" className="iz-btn iz-btn-soft mt-2.5 w-full" onClick={onResend}>
        Resend OTP
      </button>
    </IzSheet>
  );
}

function SignIn() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const role = useStore((s) => s.role);
  const signIn = useStore((s) => s.signIn);
  const toast = useStore((s) => s.toast);
  const [identifier, setIdentifier] = useState("60123456789");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginOtpOpen, setLoginOtpOpen] = useState(false);
  const [forgotContact, setForgotContact] = useState<{
    channel: ResetChannel;
    identifier: string;
  } | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{
    displayName: string;
    contact: { channel: ResetChannel; identifier: string };
  } | null>(null);
  const [forgotOtp, setForgotOtp] = useState("");
  const [loginOtp, setLoginOtp] = useState("");

  useEffect(() => {
    if (mode === "create") {
      navigate({ to: "/register", replace: true });
    }
  }, [mode, navigate]);

  const portalPath =
    role === "vendor"
      ? "/outlet"
      : role === "host"
        ? "/host"
        : role === "agency"
          ? "/agency"
          : "/host";

  const completeSignIn = (displayName: string, loginIdentifier: string) => {
    signIn(displayName, loginIdentifier);
    navigate({ to: portalPath });
  };

  const otpChannelLabel = forgotContact?.channel === "phone" ? "mobile" : "email";

  const sendForgotOtpToast = () => {
    if (!forgotContact) return;
    toast(`Password reset OTP sent to your ${otpChannelLabel}`, "info");
  };

  const sendLoginOtpToast = () => {
    if (!pendingLogin) return;
    toast("Login OTP sent to your mobile", "info");
  };

  const openForgotPassword = () => {
    const contact = resolveIdentifier(identifier);
    if (!contact) {
      toast("Enter your email or phone number first", "warn");
      return;
    }
    setForgotContact(contact);
    setForgotOtp("");
    setForgotOpen(true);
    toast(
      `Password reset OTP sent to your ${contact.channel === "phone" ? "mobile" : "email"}`,
      "info",
    );
  };

  const verifyForgotOtp = () => {
    if (!forgotContact) return;
    if (isValidDemoOtp(forgotOtp)) {
      setForgotOpen(false);
      setForgotOtp("");
      navigate({
        to: "/reset-password",
        search: {
          channel: forgotContact.channel,
          identifier: forgotContact.identifier,
        },
      });
      return;
    }
    toast("Invalid OTP — try 123456 for demo", "warn");
  };

  const verifyLoginOtp = () => {
    if (!pendingLogin) return;
    if (!isValidDemoOtp(loginOtp)) {
      toast("Invalid OTP — try 123456 for demo", "warn");
      return;
    }
    const { displayName, contact } = pendingLogin;
    setLoginOtpOpen(false);
    setLoginOtp("");
    setPendingLogin(null);
    completeSignIn(displayName, contact.identifier);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = resolveIdentifier(identifier);
    if (!contact) {
      toast("Enter your email or phone number", "warn");
      return;
    }
    if (!password.trim()) {
      toast("Enter your password", "warn");
      return;
    }

    const displayName = displayNameForContact(contact);

    if (contact.channel === "phone") {
      setPendingLogin({ displayName, contact });
      setLoginOtp("");
      setLoginOtpOpen(true);
      toast("Login OTP sent to your mobile", "info");
      return;
    }

    completeSignIn(displayName, contact.identifier);
  };

  return (
    <PhoneFrame
      overlay={
        <>
          <Toasts />
          <OtpVerifySheet
            open={loginOtpOpen}
            onClose={() => {
              setLoginOtpOpen(false);
              setLoginOtp("");
              setPendingLogin(null);
            }}
            title="Verify mobile"
            description={
              <>
                Enter the 6-digit OTP sent to your mobile{" "}
                <b className="text-[var(--iz-txt)]">{pendingLogin?.contact.identifier}</b>
              </>
            }
            otp={loginOtp}
            onOtpChange={setLoginOtp}
            onVerify={verifyLoginOtp}
            onResend={sendLoginOtpToast}
            verifyLabel="Verify & sign in"
          />
          <OtpVerifySheet
            open={forgotOpen}
            onClose={() => setForgotOpen(false)}
            title="Verify OTP"
            description={
              <>
                Enter the 6-digit OTP sent to your {otpChannelLabel}{" "}
                <b className="text-[var(--iz-txt)]">{forgotContact?.identifier}</b>
              </>
            }
            otp={forgotOtp}
            onOtpChange={setForgotOtp}
            onVerify={verifyForgotOtp}
            onResend={sendForgotOtpToast}
          />
        </>
      }
    >
      <div className="iz-welcome flex flex-1 flex-col">
        <button type="button" onClick={() => navigate({ to: "/" })} className="iz-chip w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="iz-logo-tile mt-8">
          <span>Z</span>
        </div>

        <div className="text-center">
          <h1 className="font-sora mt-6 text-[27px] font-extrabold text-[var(--iz-txt)]">
            Innocen<span className="iz-wordmark-z">Z</span>
          </h1>
        </div>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <User className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or phone number"
                type="text"
                inputMode="text"
                autoComplete="username"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>

          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <Lock className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                className="iz-signin-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              className="iz-tiny text-[var(--iz-gold-l)] underline-offset-2 hover:underline"
              onClick={openForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="iz-btn iz-btn-primary mt-2">
            Sign In
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate({ to: "/register" })}
          className="iz-sm iz-muted mt-6 text-center"
        >
          New here? <span className="text-[var(--iz-gold-l)]">Create one</span>
        </button>
      </div>
    </PhoneFrame>
  );
}
