import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { PhoneFrame } from "@/components/Brand";
import { Toasts } from "@/components/Toasts";
import { isValidDemoOtp, OtpVerifySheet } from "@/components/auth/OtpVerifySheet";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import {
  PORTAL_SIGNIN_LABELS,
  portalHomePath,
  subRolesForPortal,
  type PortalSubRoleItem,
  type SignInPortal,
} from "@/lib/portal-signin";

type ResetChannel = "email" | "phone";

function detectChannel(value: string): ResetChannel {
  return value.trim().includes("@") ? "email" : "phone";
}

function resolveIdentifier(value: string): { channel: ResetChannel; identifier: string } | null {
  const identifier = value.trim();
  if (!identifier) return null;
  return { channel: detectChannel(identifier), identifier };
}

function displayNameForContact(contact: { channel: ResetChannel; identifier: string }) {
  return contact.channel === "email" ? contact.identifier.split("@")[0] || "User" : "User";
}

export function PortalSignInScreen({ portal }: { portal: SignInPortal }) {
  const navigate = useNavigate();
  const signIn = useStore((s) => s.signIn);
  const setRole = useStore((s) => s.setRole);
  const setPrSubRole = useStore((s) => s.setPrSubRole);
  const setOutletSubRole = useStore((s) => s.setOutletSubRole);
  const setAgencySubRole = useStore((s) => s.setAgencySubRole);
  const toast = useStore((s) => s.toast);

  const [identifier, setIdentifier] = useState("60123456789");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotContact, setForgotContact] = useState<{
    channel: ResetChannel;
    identifier: string;
  } | null>(null);
  const [forgotOtp, setForgotOtp] = useState("");
  const [subRoleOpen, setSubRoleOpen] = useState(false);
  const [pendingContact, setPendingContact] = useState<{
    displayName: string;
    loginIdentifier: string;
  } | null>(null);

  const portalLabel = PORTAL_SIGNIN_LABELS[portal];
  const subRoles = subRolesForPortal(portal);
  const needsSubRole = subRoles.length > 0;

  const enterPortal = (item?: PortalSubRoleItem) => {
    navigate({ to: portalHomePath(portal, item) });
  };

  const completeSignIn = (displayName: string, loginIdentifier: string) => {
    signIn(displayName, loginIdentifier);
    if (needsSubRole) {
      setPendingContact({ displayName, loginIdentifier });
      setSubRoleOpen(true);
      return;
    }
    enterPortal();
  };

  const pickSubRole = (item: PortalSubRoleItem) => {
    setRole(item.role);
    setPrSubRole(item.prSubRole ?? null);
    setOutletSubRole(item.outletSubRole ?? null);
    setAgencySubRole(item.agencySubRole ?? null);
    setSubRoleOpen(false);
    setPendingContact(null);
    enterPortal(item);
  };

  const otpChannelLabel = forgotContact?.channel === "phone" ? "mobile" : "email";

  const sendForgotOtpToast = () => {
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
    completeSignIn(displayNameForContact(contact), contact.identifier);
  };

  return (
    <PhoneFrame
      overlay={
        <>
          <Toasts />
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
          <IzSheet
            open={subRoleOpen}
            onClose={() => {
              setSubRoleOpen(false);
              setPendingContact(null);
            }}
          >
            <div className="iz-cardttl">{portalLabel} sub-role</div>
            <p className="iz-tiny iz-muted mt-1">
              {pendingContact
                ? `Signed in as ${pendingContact.displayName} — pick how you enter ${portalLabel.toLowerCase()}.`
                : `Pick how you enter ${portalLabel.toLowerCase()}.`}
            </p>
            <div className="mt-3 space-y-2">
              {subRoles.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="iz-card iz-between flex w-full cursor-pointer text-left"
                  onClick={() => pickSubRole(item)}
                >
                  <div className="font-sora text-[15px] font-bold text-[var(--iz-txt)]">{item.label}</div>
                  <span className="iz-iconbox">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
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
          <p className="iz-tiny iz-muted mt-1.5">{portalLabel} sign in</p>
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

        {portal === "pr" && (
          <button
            type="button"
            onClick={() => navigate({ to: "/register" })}
            className="iz-sm iz-muted mt-6 text-center"
          >
            New here? <span className="text-[var(--iz-gold-l)]">Create one</span>
          </button>
        )}
      </div>
    </PhoneFrame>
  );
}
