import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { IzSheet } from "@/components/iz/Sheet";
import { ArrowLeft, Mail, Phone, User, Lock, Eye, EyeOff } from "lucide-react";

type LoginChannel = "email" | "phone";

const SIGNIN_DEFAULTS: Record<LoginChannel, string> = {
  email: "example@gmail.com",
  phone: "+60123456789",
};

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "create" ? "create" : "signin") as "signin" | "create",
  }),
  component: SignIn,
});

function formatLoginLabel(channel: LoginChannel, value: string) {
  return channel === "email" ? value : value.trim();
}

function SignIn() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const role = useStore((s) => s.role);
  const signIn = useStore((s) => s.signIn);
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState(mode === "create" ? "" : "Alex Tan");
  const [loginChannel, setLoginChannel] = useState<LoginChannel>("email");
  const [identifier, setIdentifier] = useState(mode === "create" ? "" : SIGNIN_DEFAULTS.email);
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (mode === "create") {
      navigate({ to: "/register", replace: true });
    }
  }, [mode, navigate]);

  const otpChannelLabel = loginChannel === "email" ? "email" : "mobile";

  const switchLoginChannel = (channel: LoginChannel) => {
    setLoginChannel(channel);
    if (mode === "signin") {
      setIdentifier(SIGNIN_DEFAULTS[channel]);
    } else if (loginChannel !== channel) {
      setIdentifier("");
    }
  };

  const sendOtpToast = () => {
    toast(`Password reset OTP sent to your ${otpChannelLabel}`, "info");
  };

  const openForgotPassword = () => {
    if (!identifier.trim()) {
      toast(`Enter your ${loginChannel === "email" ? "email" : "phone number"} first`, "warn");
      return;
    }
    setOtp("");
    setForgotOpen(true);
    sendOtpToast();
  };

  const verifyForgotOtp = () => {
    if (otp === "123456" || otp.length === 6) {
      setForgotOpen(false);
      setOtp("");
      navigate({
        to: "/reset-password",
        search: {
          channel: loginChannel,
          identifier: formatLoginLabel(loginChannel, identifier),
        },
      });
      return;
    }
    toast("Invalid OTP — try 123456 for demo", "warn");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = identifier.trim();
    if (!loginId) return;
    const displayName = name.trim() || (loginChannel === "email" ? loginId.split("@")[0] : "User");
    signIn(displayName, loginId);
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
              <b className="text-[var(--iz-txt)]">{formatLoginLabel(loginChannel, identifier)}</b>
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
          {mode === "create" ? (
            <>
              <h1 className="font-sora mt-6 text-2xl font-extrabold text-[var(--iz-txt)]">
                Create your account
              </h1>
              <p className="iz-sm iz-muted mt-1">Join with your email or phone number.</p>
            </>
          ) : (
            <h1 className="font-sora mt-6 text-[27px] font-extrabold text-[var(--iz-txt)]">
              Innocen<span className="iz-wordmark-z">Z</span>
            </h1>
          )}
        </div>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          {mode === "create" && (
            <label className="iz-field">
              <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
                <User className="h-4 w-4 text-[var(--iz-muted)]" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className={`iz-chip flex-1 ${loginChannel === "email" ? "border-[var(--iz-gold)]" : ""}`}
              onClick={() => switchLoginChannel("email")}
            >
              Email
            </button>
            <button
              type="button"
              className={`iz-chip flex-1 ${loginChannel === "phone" ? "border-[var(--iz-gold)]" : ""}`}
              onClick={() => switchLoginChannel("phone")}
            >
              Phone
            </button>
          </div>

          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              {loginChannel === "email" ? (
                <Mail className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              ) : (
                <Phone className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              )}
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginChannel === "email" ? "Email" : "Phone number"}
                type={loginChannel === "email" ? "email" : "tel"}
                inputMode={loginChannel === "phone" ? "tel" : "email"}
                autoComplete={loginChannel === "email" ? "email" : "tel"}
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

          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                className="iz-tiny text-[var(--iz-gold-l)] underline-offset-2 hover:underline"
                onClick={openForgotPassword}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="iz-btn iz-btn-primary mt-2">
            {mode === "create" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate({ to: mode === "create" ? "/signin" : "/register" })}
          className="iz-sm iz-muted mt-6 text-center"
        >
          {mode === "create" ? "Already have an account? " : "New here? "}
          <span className="text-[var(--iz-gold-l)]">
            {mode === "create" ? "Sign in" : "Create one"}
          </span>
        </button>
      </div>
    </PhoneFrame>
  );
}
