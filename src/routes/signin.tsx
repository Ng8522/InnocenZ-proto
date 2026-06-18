import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function SignIn() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const role = useStore((s) => s.role);
  const signIn = useStore((s) => s.signIn);
  const toast = useStore((s) => s.toast);
  const [identifier, setIdentifier] = useState("example@gmail.com");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotContact, setForgotContact] = useState<{ channel: ResetChannel; identifier: string } | null>(
    null,
  );
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (mode === "create") {
      navigate({ to: "/register", replace: true });
    }
  }, [mode, navigate]);

  const otpChannelLabel = forgotContact?.channel === "phone" ? "mobile" : "email";

  const sendOtpToast = () => {
    if (!forgotContact) return;
    toast(`Password reset OTP sent to your ${otpChannelLabel}`, "info");
  };

  const openForgotPassword = () => {
    const contact = resolveIdentifier(identifier);
    if (!contact) {
      toast("Enter your email or phone number first", "warn");
      return;
    }
    setForgotContact(contact);
    setOtp("");
    setForgotOpen(true);
    toast(`Password reset OTP sent to your ${contact.channel === "phone" ? "mobile" : "email"}`, "info");
  };

  const verifyForgotOtp = () => {
    if (!forgotContact) return;
    if (otp === "123456" || otp.length === 6) {
      setForgotOpen(false);
      setOtp("");
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
    const displayName =
      contact.channel === "email" ? contact.identifier.split("@")[0] || "User" : "User";
    signIn(displayName, contact.identifier);
    const path =
      role === "vendor"
        ? "/outlet"
        : role === "host"
          ? "/host"
          : role === "agency"
            ? "/agency"
            : "/host";
    navigate({ to: path });
  };

  return (
    <PhoneFrame
      overlay={
        <>
          <Toasts />
          <IzSheet open={forgotOpen} onClose={() => setForgotOpen(false)}>
            <div className="iz-cardttl">Verify OTP</div>
            <p className="iz-tiny iz-muted mb-3">
              Enter the 6-digit OTP sent to your {otpChannelLabel}{" "}
              <b className="text-[var(--iz-txt)]">{forgotContact?.identifier}</b>
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="iz-pv-dispute-input !min-h-0 py-3 text-center font-mono text-lg tracking-[0.35em]"
              aria-label="Password reset OTP"
            />
            <button
              type="button"
              className="iz-btn iz-btn-primary mt-4 w-full"
              onClick={verifyForgotOtp}
            >
              Verify OTP
            </button>
            <button
              type="button"
              className="iz-btn iz-btn-soft mt-2.5 w-full"
              onClick={sendOtpToast}
            >
              Resend OTP
            </button>
          </IzSheet>
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
