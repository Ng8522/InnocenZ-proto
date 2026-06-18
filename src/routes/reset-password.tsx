import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";

type ResetChannel = "email" | "phone";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    channel: (s.channel === "phone" ? "phone" : "email") as ResetChannel,
    identifier: typeof s.identifier === "string" ? s.identifier : "",
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const { channel, identifier } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast("Enter a new password", "warn");
      return;
    }
    if (password !== confirmPassword) {
      toast("Passwords do not match", "warn");
      return;
    }
    toast("Password updated — sign in with your new password", "success");
    navigate({ to: "/signin" });
  };

  return (
    <PhoneFrame overlay={<Toasts />}>
      <div className="iz-welcome flex flex-1 flex-col">
        <button type="button" onClick={() => navigate({ to: "/signin" })} className="iz-chip w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="iz-logo-tile mt-8">
          <span>Z</span>
        </div>

        <div className="text-center">
          <h1 className="font-sora mt-6 text-[27px] font-extrabold text-[var(--iz-txt)]">
            Innocen<span className="iz-wordmark-z">Z</span>
          </h1>
          <p className="iz-sm iz-muted mt-2">Set your new password</p>
          {identifier && (
            <p className="iz-tiny iz-muted2 mt-1">
              {channel === "email" ? "Email" : "Phone"} · {identifier}
            </p>
          )}
        </div>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <Lock className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
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

          <label className="iz-field">
            <span className="flex items-center gap-3 rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] px-4 py-3">
              <Lock className="h-4 w-4 shrink-0 text-[var(--iz-muted)]" />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                type={showConfirm ? "text" : "password"}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                className="iz-signin-password-toggle"
                aria-label={showConfirm ? "Hide password" : "Show password"}
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <button type="submit" className="iz-btn iz-btn-primary mt-2">
            Save password
          </button>
        </form>
      </div>
    </PhoneFrame>
  );
}
