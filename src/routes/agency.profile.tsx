import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import type { AgencyFinanceHead, AgencyOwnerSettings } from "@/lib/agency-demo";
import { SCALING_TIER_MULTIPLIERS } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { Building2, Camera, CreditCard, Mail, Pencil, Phone, Shield, User, X } from "lucide-react";

const SCALING_TIER_ORDER = ["Tier III", "Tier IV", "Tier V"] as const;

export const Route = createFileRoute("/agency/profile")({
  component: AgencyProfile,
});

function AgencyProfile() {
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const scalingTierMultipliers = useStore((s) => s.scalingTierMultipliers);
  const saveAgencyProfileSettings = useStore((s) => s.saveAgencyProfileSettings);
  const sendAgencyOtp = useStore((s) => s.sendAgencyOtp);
  const verifyAgencyOtp = useStore((s) => s.verifyAgencyOtp);
  const signOut = useStore((s) => s.signOut);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [otp, setOtp] = useState("");
  const [draft, setDraft] = useState(agencyOwner);
  const [financeDraft, setFinanceDraft] = useState(agencyFinanceHead);
  const [scalingDraft, setScalingDraft] = useState(scalingTierMultipliers);
  const [inviteEmail, setInviteEmail] = useState(agencyFinanceHead.email);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const canEdit = agencyCan(agencySubRole, "editSettings");

  const owner = editing ? draft : agencyOwner;
  const finance = editing ? financeDraft : agencyFinanceHead;
  const scaling = editing ? scalingDraft : scalingTierMultipliers;
  const avatarLetter = owner.ownerName.trim()[0]?.toUpperCase() ?? owner.orgName.trim()[0]?.toUpperCase() ?? "A";
  const editCardClass = editing ? " border-[rgba(217,185,122,.25)]" : "";

  const update = (patch: Partial<AgencyOwnerSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const updateFinance = (patch: Partial<AgencyFinanceHead>) =>
    setFinanceDraft((d) => ({ ...d, ...patch }));

  const startEdit = () => {
    setDraft({ ...agencyOwner });
    setFinanceDraft({ ...agencyFinanceHead });
    setScalingDraft({ ...scalingTierMultipliers });
    setInviteEmail(agencyFinanceHead.email);
    setOtp("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({ ...agencyOwner });
    setFinanceDraft({ ...agencyFinanceHead });
    setScalingDraft({ ...scalingTierMultipliers });
    setInviteEmail(agencyFinanceHead.email);
    setOtp("");
    setEditing(false);
  };

  const openAvatarUpload = () => {
    if (!editing) return;
    avatarFileRef.current?.click();
  };

  const onAvatarFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editing) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file", "warn");
      return;
    }
    if (file.size > 2_500_000) {
      toast("Image must be under 2.5 MB", "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ avatarPhoto: reader.result as string });
      toast("Profile photo updated", "success");
    };
    reader.readAsDataURL(file);
  };

  const saveEdit = () => {
    if (!draft.ownerName.trim()) {
      toast("Enter owner name", "warn");
      return;
    }
    if (!draft.mobile.trim()) {
      toast("Enter mobile number", "warn");
      return;
    }
    for (const tier of SCALING_TIER_ORDER) {
      const value = scalingDraft[tier];
      if (!Number.isFinite(value) || value < 0.5 || value > 3) {
        toast(`Enter a valid multiplier for ${tier} (0.5–3×)`, "warn");
        return;
      }
    }
    const nextFinance = { ...financeDraft };
    const inviteChanged = inviteEmail.trim() !== agencyFinanceHead.email;
    if (inviteChanged && inviteEmail.trim()) {
      nextFinance.email = inviteEmail.trim();
      nextFinance.eSignatureStored = false;
    }
    saveAgencyProfileSettings({
      owner: { ...draft, ownerName: draft.ownerName.trim(), orgName: draft.orgName.trim() },
      financeHead: nextFinance,
      scalingTierMultipliers: { ...scalingDraft },
      outletCommissionRules: outletCommissionRules.map((r) => ({ ...r })),
    });
    if (inviteChanged && inviteEmail.trim()) {
      toast(`Invite queued for ${inviteEmail.trim()} — Finance Head must complete IC + e-signature`, "info");
    }
    setEditing(false);
    setOtp("");
  };

  if (!agencyCan(agencySubRole, "viewSettings")) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">You do not have access to agency settings.</p>
        </IzCard>
      </div>
    );
  }

  const isFinanceReadOnly = agencySubRole === "agency_finance";
  const fieldsLocked = !editing || !canEdit;

  return (
    <div className="iz-screen">
      {editing && <AppTopbar onBack={cancelEdit} backLabel="Cancel edit" />}
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Settings</h2>
        <p className="iz-tiny iz-muted mt-0.5">{owner.orgName}</p>
        {editing && <span className="iz-pill iz-pill-amber mt-2 !text-[10px]">Editing</span>}
        {isFinanceReadOnly && !editing && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Finance view — read-only · cannot edit owner or subscription
          </p>
        )}
      </header>

      <div className="flex flex-col items-center py-4">
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onAvatarFilePick}
        />
        <div className="relative">
          <div
            className={`iz-avatar h-16 w-16 text-xl${owner.avatarPhoto ? " iz-avatar-photo" : ""}`}
            style={owner.avatarPhoto ? undefined : { background: "var(--iz-grad)" }}
          >
            {owner.avatarPhoto ? <img src={owner.avatarPhoto} alt="" /> : avatarLetter}
          </div>
          {editing && canEdit && (
            <>
              <button
                type="button"
                className="iz-avatar-edit"
                aria-label="Upload profile photo"
                onClick={openAvatarUpload}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              {draft.avatarPhoto && (
                <button
                  type="button"
                  className="iz-avatar-remove"
                  aria-label="Remove profile photo"
                  onClick={() => update({ avatarPhoto: null })}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
        <div className="mt-3 font-sora text-lg font-bold">{owner.orgName}</div>
        <p className="iz-tiny iz-muted mt-0.5">{owner.ownerName}</p>
        <div className="mt-1 flex items-center gap-1 iz-tiny text-[var(--iz-green)]">
          <Shield className="h-3 w-3" />
          {owner.accountActivated ? "Verified · RM499/mo active" : "Pending OTP activation"}
        </div>
        {editing && canEdit && (
          <p className="iz-tiny iz-muted2 mt-2 text-center">Tap the camera to upload your agency profile photo.</p>
        )}
      </div>

      <IzSectionLabel>Owner information</IzSectionLabel>
      <IzCard className={editCardClass}>
        <Field icon={User} label="Owner name" value={owner.ownerName} onChange={(v) => update({ ownerName: v })} readOnly={fieldsLocked} />
        <Field icon={Phone} label="Mobile" value={owner.mobile} onChange={(v) => update({ mobile: v })} readOnly={fieldsLocked} />
        <Field icon={Mail} label="Email" value={owner.email} onChange={(v) => update({ email: v })} readOnly={fieldsLocked} />
        <Field icon={Shield} label="IC (for PV)" value={owner.ic} onChange={(v) => update({ ic: v })} readOnly={fieldsLocked} />
        <Field icon={Building2} label="Organization" value={owner.orgName} onChange={(v) => update({ orgName: v })} readOnly={fieldsLocked} />
      </IzCard>

      <IzSectionLabel>OTP &amp; 2FA</IzSectionLabel>
      <IzCard className={editCardClass}>
        <p className="iz-tiny iz-muted mb-2">Switch channel · enforce login MFA</p>
        {editing && canEdit ? (
          <>
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
            <button type="button" className="iz-btn iz-btn-primary mt-2 w-full" onClick={() => verifyAgencyOtp(otp)}>
              Verify &amp; activate
            </button>
          </>
        ) : (
          <p className="iz-tiny iz-muted">
            OTP channel: <b className="text-[var(--iz-txt)]">{owner.otpChannel === "email" ? "Email" : "Phone"}</b>
            {" · "}
            {owner.accountActivated ? "MFA active" : "Activation pending"}
          </p>
        )}
      </IzCard>

      <IzSectionLabel>Finance Head · dual-sign PV</IzSectionLabel>
      <IzCard className={editCardClass}>
        <p className="iz-tiny iz-muted mb-2">IC + e-signature auto-stamps every PV (1st of 2 sigs)</p>
        <Field icon={User} label="Name" value={finance.name} onChange={(v) => updateFinance({ name: v })} readOnly={fieldsLocked} />
        <Field icon={Shield} label="IC" value={finance.ic} onChange={(v) => updateFinance({ ic: v })} readOnly={fieldsLocked} />
        <Field icon={Mail} label="Email" value={finance.email} onChange={(v) => updateFinance({ email: v })} readOnly={fieldsLocked} />
        {finance.eSignatureStored && (
          <p className="iz-tiny text-[var(--iz-green)] mt-2">E-signature on file ✓</p>
        )}
      </IzCard>

      <IzSectionLabel>Scaling rules · tier multipliers</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">Volume-band multipliers applied to PR tier payouts</p>
      <IzCard flat className={editCardClass}>
        {SCALING_TIER_ORDER.map((tier) => (
          <div key={tier} className="flex items-center justify-between gap-3 border-b border-[var(--iz-line)] py-2.5 last:border-0">
            <span className="iz-tiny font-semibold text-[var(--iz-txt)]">{tier}</span>
            {editing && canEdit ? (
              <label className="flex items-center gap-1.5 iz-tiny iz-muted">
                <input
                  type="number"
                  min={0.5}
                  max={3}
                  step={0.05}
                  className="w-20 rounded-lg border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-2 py-1.5 text-right text-xs font-semibold text-[var(--iz-txt)] outline-none focus:border-[var(--iz-gold-d)]"
                  value={scaling[tier] ?? ""}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setScalingDraft((d) => ({ ...d, [tier]: next }));
                  }}
                />
                ×
              </label>
            ) : (
              <span className="iz-tiny iz-muted">{scaling[tier] ?? "—"}×</span>
            )}
          </div>
        ))}
        {editing && canEdit && (
          <button
            type="button"
            className="iz-chip mt-3 w-full"
            onClick={() => setScalingDraft({ ...SCALING_TIER_MULTIPLIERS })}
          >
            Reset scaling to defaults
          </button>
        )}
      </IzCard>

      {editing && canEdit && (
        <>
          <IzSectionLabel>Invite Finance Head</IzSectionLabel>
          <IzCard className={editCardClass}>
            <p className="iz-tiny iz-muted mb-2">Sub-role invite · requires IC + e-signature for dual-sign PV</p>
            <input
              className="iz-field-input !text-sm"
              placeholder="finance@agency.my"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </IzCard>
        </>
      )}

      <IzSectionLabel>Subscription</IzSectionLabel>
      <IzCard>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--iz-gold)]" />
          <div>
            <p className="iz-sm font-bold">RM499 / month</p>
            <p className="iz-tiny iz-muted">Card on file · renewal 15 Jul 2026</p>
          </div>
        </div>
        {editing && canEdit && (
          <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={() => toast("Plan management — demo", "info")}>
            Change plan
          </button>
        )}
      </IzCard>

      {canEdit && (
        <div className="iz-profile-actions mt-4">
          {editing ? (
            <>
              <button type="button" className="iz-btn iz-btn-primary" onClick={saveEdit}>
                Save settings
              </button>
              <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={cancelEdit}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="iz-btn iz-btn-primary" onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Edit settings
            </button>
          )}
        </div>
      )}

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
  readOnly,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="border-b border-[var(--iz-line)] py-2.5 last:border-0">
      <div className="flex items-center gap-2 iz-tiny iz-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {readOnly ? (
        <p className="mt-1 font-medium text-[var(--iz-txt)]">{value || "—"}</p>
      ) : (
        <input
          className="mt-1 w-full bg-transparent font-medium text-[var(--iz-txt)] outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
