import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { SCALING_TIER_MULTIPLIERS } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzSectionLabel } from "@/components/iz/ui";
import { Building2, CreditCard, Mail, Phone, Shield, User, Users } from "lucide-react";

export const Route = createFileRoute("/agency/profile")({
  component: AgencyProfile,
});

function AgencyProfile() {
  const agencyOwner = useStore((s) => s.agencyOwner);
  const agencyFinanceHead = useStore((s) => s.agencyFinanceHead);
  const outletCommissionRules = useStore((s) => s.outletCommissionRules);
  const scalingTierMultipliers = useStore((s) => s.scalingTierMultipliers);
  const saveAgencyOwner = useStore((s) => s.saveAgencyOwner);
  const saveAgencyFinanceHead = useStore((s) => s.saveAgencyFinanceHead);
  const saveOutletCommissionRule = useStore((s) => s.saveOutletCommissionRule);
  const saveScalingMultipliers = useStore((s) => s.saveScalingMultipliers);
  const inviteFinanceHead = useStore((s) => s.inviteFinanceHead);
  const sendAgencyOtp = useStore((s) => s.sendAgencyOtp);
  const verifyAgencyOtp = useStore((s) => s.verifyAgencyOtp);
  const signOut = useStore((s) => s.signOut);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const [otp, setOtp] = useState("");
  const [draft, setDraft] = useState(agencyOwner);
  const [financeDraft, setFinanceDraft] = useState(agencyFinanceHead);
  const canEdit = agencyCan(agencySubRole, "editSettings");

  const update = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateFinance = (patch: Partial<typeof financeDraft>) =>
    setFinanceDraft((d) => ({ ...d, ...patch }));

  if (!agencyCan(agencySubRole, "viewSettings")) {
    return (
      <div className="iz-screen">
        <AppTopbar backTo="/agency" backLabel="Home" />
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

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/agency" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Settings</h2>
        <p className="iz-tiny iz-muted mt-0.5">{agencyOwner.orgName}</p>
        {isFinanceReadOnly && (
          <p className="iz-tiny iz-muted mt-2 rounded-lg border border-dashed border-[var(--iz-line)] px-2.5 py-1.5">
            Finance view — read-only · cannot edit owner or subscription
          </p>
        )}
      </header>

      <div className="flex flex-col items-center py-4">
        <div className="iz-avatar h-16 w-16 text-xl" style={{ background: "var(--iz-grad)" }}>
          A
        </div>
        <div className="mt-3 font-sora text-lg font-bold">{draft.orgName}</div>
        <div className="mt-1 flex items-center gap-1 iz-tiny text-[var(--iz-green)]">
          <Shield className="h-3 w-3" />
          {draft.accountActivated ? "Verified · RM499/mo active" : "Pending OTP activation"}
        </div>
      </div>

      <IzSectionLabel>Owner information</IzSectionLabel>
      <IzCard>
        <Field icon={User} label="Owner name" value={draft.ownerName} onChange={(v) => update({ ownerName: v })} readOnly={!canEdit} />
        <Field icon={Phone} label="Mobile" value={draft.mobile} onChange={(v) => update({ mobile: v })} readOnly={!canEdit} />
        <Field icon={Mail} label="Email" value={draft.email} onChange={(v) => update({ email: v })} readOnly={!canEdit} />
        <Field icon={Shield} label="IC (for PV)" value={draft.ic} onChange={(v) => update({ ic: v })} readOnly={!canEdit} />
        <Field icon={Building2} label="Organization" value={draft.orgName} onChange={(v) => update({ orgName: v })} readOnly={!canEdit} />
      </IzCard>

      <IzSectionLabel>OTP &amp; 2FA</IzSectionLabel>
      <IzCard>
        <p className="iz-tiny iz-muted mb-2">Switch channel · enforce login MFA</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canEdit}
            className={`iz-chip flex-1 ${draft.otpChannel === "email" ? "border-[var(--iz-gold)]" : ""}`}
            onClick={() => update({ otpChannel: "email" })}
          >
            Email
          </button>
          <button
            type="button"
            disabled={!canEdit}
            className={`iz-chip flex-1 ${draft.otpChannel === "phone" ? "border-[var(--iz-gold)]" : ""}`}
            onClick={() => update({ otpChannel: "phone" })}
          >
            Phone
          </button>
        </div>
        {canEdit && (
          <>
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
        )}
      </IzCard>

      <IzSectionLabel>Finance Head · dual-sign PV</IzSectionLabel>
      <IzCard>
        <p className="iz-tiny iz-muted mb-2">IC + e-signature auto-stamps every PV (1st of 2 sigs)</p>
        <Field icon={User} label="Name" value={financeDraft.name} onChange={(v) => updateFinance({ name: v })} readOnly={!canEdit} />
        <Field icon={Shield} label="IC" value={financeDraft.ic} onChange={(v) => updateFinance({ ic: v })} readOnly={!canEdit} />
        <Field icon={Mail} label="Email" value={financeDraft.email} onChange={(v) => updateFinance({ email: v })} readOnly={!canEdit} />
        {financeDraft.eSignatureStored && (
          <p className="iz-tiny text-[var(--iz-green)] mt-2">E-signature on file ✓</p>
        )}
        {canEdit && (
          <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={() => saveAgencyFinanceHead(financeDraft)}>
            Save Finance Head
          </button>
        )}
      </IzCard>

      <IzSectionLabel>Commission rules · per outlet</IzSectionLabel>
      <p className="iz-tiny iz-muted2 -mt-1 mb-2">Drink types · tables · tips · OT — synced with outlet workspace</p>
      {outletCommissionRules.map((rule) => (
        <IzCard key={rule.outlet} flat className="!mb-2">
          <div className="font-sora text-xs font-bold">{rule.outlet}</div>
          {canEdit ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="iz-tiny iz-muted">Drink %
                <input type="number" className="iz-field-input mt-1 !text-xs" defaultValue={rule.drinkPct} onBlur={(e) => saveOutletCommissionRule(rule.outlet, { drinkPct: Number(e.target.value) })} />
              </label>
              <label className="iz-tiny iz-muted">Tip %
                <input type="number" className="iz-field-input mt-1 !text-xs" defaultValue={rule.tipPct} onBlur={(e) => saveOutletCommissionRule(rule.outlet, { tipPct: Number(e.target.value) })} />
              </label>
            </div>
          ) : (
            <p className="iz-tiny iz-muted2 mt-1">
              Wage RM{rule.wagePerHour}/hr · Drinks {rule.drinkPct}% · Tips {rule.tipPct}% · Table {rule.tablePct}% · OT after {rule.otAfterHours}h
            </p>
          )}
        </IzCard>
      ))}

      <IzSectionLabel>Scaling rules · tier multipliers</IzSectionLabel>
      <IzCard flat>
        {Object.entries(scalingTierMultipliers).map(([tier, mult]) => (
          <p key={tier} className="iz-tiny iz-muted py-1">{tier} · {mult}×</p>
        ))}
        {canEdit && (
          <button
            type="button"
            className="iz-chip mt-2"
            onClick={() => saveScalingMultipliers({ ...SCALING_TIER_MULTIPLIERS, "Tier V": 1.25 })}
          >
            Reset demo multipliers
          </button>
        )}
      </IzCard>

      {canEdit && (
        <>
          <IzSectionLabel>Invite Finance Head</IzSectionLabel>
          <IzCard>
            <p className="iz-tiny iz-muted mb-2">Sub-role invite · requires IC + e-signature for dual-sign PV</p>
            <input
              className="iz-field-input !text-sm"
              placeholder="finance@agency.my"
              defaultValue={financeDraft.email}
              onBlur={(e) => inviteFinanceHead(e.target.value)}
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
        {canEdit && (
          <button type="button" className="iz-btn iz-btn-soft mt-2 w-full" onClick={() => toast("Plan management — demo", "info")}>
            Change plan
          </button>
        )}
      </IzCard>

      {canEdit && (
        <button type="button" className="iz-btn iz-btn-primary mt-3 w-full" onClick={() => saveAgencyOwner(draft)}>
          Save settings
        </button>
      )}

      <Link to="/agency/reports" className="iz-btn iz-btn-soft mt-2 block text-center">
        <Users className="mr-1 inline h-4 w-4" /> View analytics &amp; PNL
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
      <input
        className="mt-1 w-full bg-transparent font-medium text-[var(--iz-txt)] outline-none disabled:opacity-60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
      />
    </div>
  );
}
