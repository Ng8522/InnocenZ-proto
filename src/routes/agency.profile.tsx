import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { Building2, Mail, Phone, Shield, User } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/profile")({
  component: AgencyProfile,
});

function AgencyProfile() {
  const { agencyOwner, saveAgencyOwner, sendAgencyOtp, verifyAgencyOtp, signOut } = useStore();
  const [otp, setOtp] = useState("");
  const [draft, setDraft] = useState(agencyOwner);

  const update = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · PR Agency" title="Agency settings" />

      <div className="flex flex-col items-center py-4">
        <div className="iz-avatar h-16 w-16 text-xl" style={{ background: "var(--iz-grad)" }}>
          A
        </div>
        <div className="mt-3 font-sora text-lg font-bold">{draft.orgName}</div>
        <div className="mt-1 flex items-center gap-1 iz-tiny text-[var(--iz-green)]">
          <Shield className="h-3 w-3" />
          {draft.accountActivated ? "Verified" : "Pending OTP activation"}
        </div>
      </div>

      <IzSectionLabel>Owner information</IzSectionLabel>
      <IzCard>
        <Field icon={User} label="Owner name" value={draft.ownerName} onChange={(v) => update({ ownerName: v })} />
        <Field icon={Phone} label="Mobile" value={draft.mobile} onChange={(v) => update({ mobile: v })} />
        <Field icon={Mail} label="Email" value={draft.email} onChange={(v) => update({ email: v })} />
        <Field icon={Shield} label="IC (for PV)" value={draft.ic} onChange={(v) => update({ ic: v })} />
        <Field icon={Building2} label="Organization" value={draft.orgName} onChange={(v) => update({ orgName: v })} />
      </IzCard>

      <IzSectionLabel>OTP activation</IzSectionLabel>
      <IzCard>
        <p className="iz-tiny iz-muted mb-2">Send OTP to email or phone to activate account</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`iz-chip flex-1 ${draft.otpChannel === "email" ? "border-[var(--iz-gold)]" : ""}`}
            onClick={() => update({ otpChannel: "email" })}
          >
            Email
          </button>
          <button
            type="button"
            className={`iz-chip flex-1 ${draft.otpChannel === "phone" ? "border-[var(--iz-gold)]" : ""}`}
            onClick={() => update({ otpChannel: "phone" })}
          >
            Phone
          </button>
        </div>
        <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={sendAgencyOtp}>
          Send OTP
        </button>
        <input
          className="mt-2 w-full rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-sm"
          placeholder="Enter 6-digit OTP (demo: 123456)"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        <button
          type="button"
          className="iz-btn iz-btn-primary mt-2 w-full"
          onClick={() => verifyAgencyOtp(otp)}
        >
          Verify &amp; activate
        </button>
      </IzCard>

      <button
        type="button"
        className="iz-btn iz-btn-primary mt-3 w-full"
        onClick={() => saveAgencyOwner(draft)}
      >
        Save settings
      </button>

      <Link to="/agency/reports" className="iz-btn iz-btn-soft mt-2 block text-center">
        View commission rules
      </Link>

      <button
        type="button"
        className="mt-4 w-full rounded-full border border-[var(--iz-red)] py-3 text-sm font-semibold text-[var(--iz-red)]"
        onClick={signOut}
      >
        Sign out
      </button>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-b border-[var(--iz-line)] py-2.5 last:border-0">
      <div className="flex items-center gap-2 iz-tiny iz-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <input
        className="mt-1 w-full bg-transparent font-medium text-[var(--iz-txt)] outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
