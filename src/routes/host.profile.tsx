import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { PrSecuritySettingsSheets } from "@/components/pr/PrSecuritySettingsSheets";
import { useStore } from "@/lib/store";
import { goToWelcome } from "@/lib/go-welcome";
import {
  PORTFOLIO_SLOT_COUNT,
  PR_AGENCIES,
  getPrAgencyById,
  getPrProfile,
  getPrRosterId,
  resolvePrAccountFields,
  type PrComcard,
} from "@/lib/pr-demo";
import { Comcard3dPreviewVisual } from "@/components/agency/Comcard3dPreview";
import {
  PortfolioComcardVisual,
  StaticComcardVisual,
  canGeneratePortfolioComcard,
  portfolioPhotosForComcard,
} from "@/components/pr/PortfolioComcardVisual";
import { ProfileLanguagePicker } from "@/components/iz/ProfileLanguagePicker";
import { Camera, Check, ChevronDown, Pencil, Star, X } from "lucide-react";
import { IzCard, IzPill } from "@/components/iz/ui";
import { publicAssetPath } from "@/lib/public-asset";

export const Route = createFileRoute("/host/profile")({
  component: ProfilePage,
});

type ProfileDraft = {
  displayName: string;
  icName: string;
  mobile: string;
  email: string;
  avatarPhoto: string | null;
  comcard: PrComcard;
  portfolio: (string | null)[];
  languages: string[];
};

function buildProfileDraft(
  account: ReturnType<typeof resolvePrAccountFields>,
  prAvatarPhoto: string | null,
  prComcard: PrComcard,
  prPortfolio: (string | null)[],
  prLanguages: string[],
): ProfileDraft {
  return {
    displayName: account.displayName,
    icName: account.icName,
    mobile: account.mobile,
    email: account.email,
    avatarPhoto: prAvatarPhoto,
    comcard: { ...prComcard },
    portfolio: [...prPortfolio],
    languages: [...prLanguages],
  };
}

function ProfilePage() {
  const prSubRole = useStore((s) => s.prSubRole);
  const prComcard = useStore((s) => s.prComcard);
  const prPortfolio = useStore((s) => s.prPortfolio);
  const prLanguages = useStore((s) => s.prLanguages);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prIcName = useStore((s) => s.prIcName);
  const prMobile = useStore((s) => s.prMobile);
  const prEmail = useStore((s) => s.prEmail);
  const agencyPRs = useStore((s) => s.agencyPRs);
  const prAgencies = useStore((s) => s.prAgencies);
  const prAvatarPhoto = useStore((s) => s.prAvatarPhoto);
  const linkedAgencyNames =
    prAgencies
      .map((id) => getPrAgencyById(id)?.name)
      .filter(Boolean)
      .join(", ") || "Atlas Agency";
  const savePrProfile = useStore((s) => s.savePrProfile);
  const savePrContact = useStore((s) => s.savePrContact);
  const requestPrAgencyChange = useStore((s) => s.requestPrAgencyChange);
  const signOut = useStore((s) => s.signOut);
  const toast = useStore((s) => s.toast);

  const u = getPrProfile(prSubRole);
  const agencyPr = agencyPRs.find((p) => p.id === getPrRosterId(prSubRole));
  const account = resolvePrAccountFields(prSubRole, {
    prDisplayName,
    prIcName,
    prMobile,
    prEmail,
    agencyPr,
  });

  const [editing, setEditing] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    buildProfileDraft(account, prAvatarPhoto, prComcard, prPortfolio, prLanguages),
  );
  const [agencyDraft, setAgencyDraft] = useState<string[]>(prAgencies);
  const [agencyMenuOpen, setAgencyMenuOpen] = useState(false);

  const portfolioFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<number>(0);

  const startEdit = () => {
    setDraft(buildProfileDraft(account, prAvatarPhoto, prComcard, prPortfolio, prLanguages));
    setAgencyDraft(prAgencies);
    setAgencyMenuOpen(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildProfileDraft(account, prAvatarPhoto, prComcard, prPortfolio, prLanguages));
    setAgencyDraft(prAgencies);
    setEditing(false);
  };

  const saveEdit = () => {
    const name = draft.displayName.trim();
    if (!name) {
      toast("Enter your display name", "warn");
      return;
    }
    const icName = draft.icName.trim();
    if (!icName) {
      toast("Enter your IC name (legal full name)", "warn");
      return;
    }
    const mobile = account.mobile.trim();
    if (!mobile) {
      toast("Enter your mobile number", "warn");
      return;
    }
    const email = account.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid email address", "warn");
      return;
    }
    const height = Math.max(
      100,
      Math.min(220, Math.round(draft.comcard.height) || COMCARD_DEFAULT.height),
    );
    const weight = Math.max(
      35,
      Math.min(120, Math.round(draft.comcard.weight) || COMCARD_DEFAULT.weight),
    );
    const age = Math.max(18, Math.min(60, Math.round(draft.comcard.age) || COMCARD_DEFAULT.age));
    if (draft.languages.length === 0) {
      toast("Select at least one language", "warn");
      return;
    }
    savePrProfile({
      displayName: name,
      icName,
      mobile,
      email,
      avatarPhoto: draft.avatarPhoto,
      comcard: {
        height,
        weight,
        age,
        imageUrl: draft.comcard.imageUrl ?? prComcard.imageUrl,
      },
      portfolio: draft.portfolio.slice(0, PORTFOLIO_SLOT_COUNT),
      languages: draft.languages,
    });
    // Agency selection: notify each added/removed agency to dispatch or suspend.
    requestPrAgencyChange(agencyDraft);
    setEditing(false);
  };

  const displayName = editing ? draft.displayName : account.displayName;
  const icName = editing ? draft.icName : account.icName;
  const mobile = editing ? draft.mobile : account.mobile;
  const email = editing ? draft.email : account.email;
  const avatarPhoto = editing ? draft.avatarPhoto : prAvatarPhoto;
  const avatarLetter = displayName.trim()[0]?.toUpperCase() ?? u.av;
  const comcard = editing ? draft.comcard : prComcard;
  const portfolio = editing ? draft.portfolio : prPortfolio;
  const languages = editing ? draft.languages : prLanguages;

  const comcardPr = {
    id: getPrRosterId(prSubRole),
    name: displayName,
    height: comcard.height,
    weight: comcard.weight,
    age: comcard.age,
  };

  const portfolioComcardPhotos = useMemo(() => portfolioPhotosForComcard(portfolio), [portfolio]);
  const hasPhotoComcard = canGeneratePortfolioComcard(portfolio);
  const photosNeededForComcard = Math.max(0, 4 - portfolioComcardPhotos.length);

  const openPortfolioUpload = (slot: number) => {
    if (!editing) return;
    uploadSlotRef.current = slot;
    portfolioFileRef.current?.click();
  };

  const openAvatarUpload = () => {
    if (!editing) return;
    avatarFileRef.current?.click();
  };

  const readImageFile = (file: File, onLoad: (dataUrl: string) => void) => {
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file", "warn");
      return;
    }
    if (file.size > 2_500_000) {
      toast("Image must be under 2.5 MB (prototype limit)", "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onPortfolioFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    readImageFile(file, (dataUrl) => {
      setDraft((prev) => {
        const next = [...prev.portfolio];
        while (next.length < PORTFOLIO_SLOT_COUNT) next.push(null);
        next[uploadSlotRef.current] = dataUrl;
        return { ...prev, portfolio: next };
      });
      toast("Photo added to portfolio", "success");
    });
  };

  const onAvatarFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    readImageFile(file, (dataUrl) => {
      setDraft((prev) => ({ ...prev, avatarPhoto: dataUrl }));
      toast("Profile photo updated — tap Save profile", "success");
    });
  };

  const removePhoto = (slot: number) => {
    setDraft((prev) => {
      const next = [...prev.portfolio];
      next[slot] = null;
      return { ...prev, portfolio: next };
    });
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={() => {
          if (editing) {
            cancelEdit();
            return;
          }
          return false;
        }}
        backLabel={editing ? "Cancel edit" : undefined}
      />

      <IzCard
        glow
        className={`iz-pr-account-hero mt-3${editing ? " iz-pr-account-hero--edit" : ""}`}
      >
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onAvatarFilePick}
        />

        <div className="iz-pr-account-hero__head">
          <p className="iz-pr-account-hero__eyebrow">Account</p>
          <div className="iz-pr-account-hero__head-badges">
            {editing && (
              <span className="iz-pr-account-hero__badge iz-pr-account-hero__badge--amber">
                Editing
              </span>
            )}
            <span className="iz-pr-account-hero__badge">
              {hasPhotoComcard ? "Photo Comcard · IC · v3" : "3D Comcard · IC · v3"}
            </span>
          </div>
        </div>

        <div className="iz-pr-account-hero__profile">
          <div className="relative shrink-0">
            <div
              className={`iz-avatar iz-pr-account-hero__avatar${avatarPhoto ? " iz-avatar-photo" : ""}`}
              style={avatarPhoto ? undefined : { background: u.avg }}
            >
              {avatarPhoto ? <img src={publicAssetPath(avatarPhoto)} alt="" /> : avatarLetter}
            </div>
            {editing && (
              <>
                <button
                  type="button"
                  className="iz-avatar-edit"
                  aria-label="Change profile photo"
                  onClick={openAvatarUpload}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {draft.avatarPhoto && (
                  <button
                    type="button"
                    className="iz-avatar-remove"
                    aria-label="Remove profile photo"
                    onClick={() => setDraft((p) => ({ ...p, avatarPhoto: null }))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="iz-pr-account-hero__profile-body">
            {editing ? (
              <>
                <div className="iz-field iz-pr-account-hero__name-field !mb-0">
                  <label className="!text-[9px]">Display name</label>
                  <input
                    type="text"
                    value={draft.displayName}
                    maxLength={40}
                    placeholder="Your name"
                    onChange={(e) => setDraft((p) => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
                <div className="iz-field iz-pr-account-hero__name-field !mb-0 mt-2">
                  <label className="!text-[9px]">IC name (legal full name)</label>
                  <input
                    type="text"
                    value={draft.icName}
                    maxLength={80}
                    placeholder="As printed on IC / passport"
                    autoComplete="name"
                    onChange={(e) => setDraft((p) => ({ ...p, icName: e.target.value }))}
                  />
                </div>
                <p className="iz-tiny iz-muted2 mt-2">
                  Mobile and email are updated in{" "}
                  <button
                    type="button"
                    className="text-[var(--iz-gold-l)] underline"
                    onClick={() => setSecurityOpen(true)}
                  >
                    Security settings
                  </button>{" "}
                  (OTP required).
                </p>
              </>
            ) : (
              <>
                <h1 className="iz-pr-account-hero__name">{displayName}</h1>
                <p className="iz-pr-account-hero__email">{icName}</p>
                <p className="iz-tiny iz-muted2 mt-0.5">{mobile}</p>
                <p className="iz-tiny iz-muted2">{email}</p>
              </>
            )}
            <div className="iz-pr-account-hero__meta">
              <span className="iz-tier iz-pr-account-hero__tier">
                <Star className="h-3 w-3" /> {u.tier}
              </span>
              <span className="iz-pr-account-hero__meta-text">
                Agency-Tied · {linkedAgencyNames}
              </span>
              <span className="iz-pr-account-hero__meta-ic">IC {account.ic}</span>
            </div>
            {editing && (
              <div className="iz-pr-account-hero__agency-edit mt-2">
                <p className="iz-tiny iz-muted2 mb-1">Agencies you work with</p>
                <div className="relative">
                  <button
                    type="button"
                    className="iz-field-input flex w-full items-center justify-between gap-2 !text-sm"
                    onClick={() => setAgencyMenuOpen((o) => !o)}
                    aria-expanded={agencyMenuOpen}
                  >
                    <span className={agencyDraft.length ? "" : "iz-muted2"}>
                      {agencyDraft.length
                        ? agencyDraft.map((id) => getPrAgencyById(id)?.name ?? id).join(", ")
                        : "Select agencies…"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform${agencyMenuOpen ? " rotate-180" : ""}`}
                    />
                  </button>
                  {agencyMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close agency list"
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setAgencyMenuOpen(false)}
                      />
                      <div className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] p-1 shadow-lg">
                        {PR_AGENCIES.map((a) => {
                          const on = agencyDraft.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/[0.04]"
                              onClick={() =>
                                setAgencyDraft((prev) =>
                                  prev.includes(a.id)
                                    ? prev.filter((id) => id !== a.id)
                                    : [...prev, a.id],
                                )
                              }
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-[var(--iz-gold)] bg-[var(--iz-gold)] text-black" : "border-[var(--iz-line2)]"}`}
                              >
                                {on && <Check className="h-3 w-3" />}
                              </span>
                              <span className={on ? "text-[var(--iz-gold-l)]" : ""}>{a.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <p className="iz-tiny iz-muted mt-1.5">
                  Selecting an agency notifies them to{" "}
                  <b className="text-[var(--iz-gold-l)]">dispatch</b> you; removing one notifies
                  them to <b className="text-[var(--iz-amber)]">suspend</b> you.
                </p>
              </div>
            )}
            {editing && (
              <p className="iz-pr-account-hero__hint">
                IC name and mobile sync to Atlas Agency when you save. Tap the camera on your photo
                to upload a new picture.
              </p>
            )}
          </div>
        </div>

        <div className="iz-pr-account-hero__showcase">
          <div className="iz-pr-account-hero__showcase-glow" aria-hidden />
          {comcard.imageUrl ? (
            <StaticComcardVisual
              src={comcard.imageUrl}
              className="iz-pr-account-hero__comcard-visual"
            />
          ) : hasPhotoComcard ? (
            <PortfolioComcardVisual
              photos={portfolioComcardPhotos}
              pr={comcardPr}
              className="iz-pr-account-hero__comcard-visual"
            />
          ) : (
            <Comcard3dPreviewVisual
              pr={comcardPr}
              className="iz-pr-account-hero__comcard-visual"
              showName={!editing}
              showStats={!editing}
            />
          )}
          {editing && !comcard.imageUrl && !hasPhotoComcard && photosNeededForComcard > 0 && (
            <p className="iz-pr-account-hero__comcard-hint">
              Upload <b>{photosNeededForComcard}</b> more portfolio photo
              {photosNeededForComcard !== 1 ? "s" : ""} below to generate your photo comcard.
            </p>
          )}
          {editing && (
            <div className="iz-pr-account-hero__measure-edit">
              <p className="iz-pr-account-hero__measure-hint">
                Adjust measurements — preview updates live
              </p>
              <div className="iz-pr-account-hero__measure-grid">
                <ComcardInput
                  compact
                  label="Height"
                  suffix="cm"
                  value={comcard.height}
                  onChange={(n) =>
                    setDraft((p) => ({ ...p, comcard: { ...p.comcard, height: n } }))
                  }
                />
                <ComcardInput
                  compact
                  label="Weight"
                  suffix="kg"
                  value={comcard.weight}
                  onChange={(n) =>
                    setDraft((p) => ({ ...p, comcard: { ...p.comcard, weight: n } }))
                  }
                />
                <ComcardInput
                  compact
                  label="Age"
                  suffix="y"
                  value={comcard.age}
                  onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, age: n } }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="iz-pr-account-hero__section">
          <div className="iz-pr-account-hero__section-title">
            <span>Portfolio gallery · v3</span>
            {editing && (
              <span className="iz-pr-account-hero__section-hint">
                {hasPhotoComcard ? "Comcard live · tap to replace" : "4+ photos → photo comcard"}
              </span>
            )}
          </div>
          <input
            ref={portfolioFileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onPortfolioFilePick}
          />
          <div className="iz-pgrid iz-pgrid-8 iz-pr-account-hero__portfolio">
            {Array.from({ length: PORTFOLIO_SLOT_COUNT }, (_, i) => {
              const src = portfolio[i];
              return (
                <div key={i} className="relative">
                  <button
                    type="button"
                    className={`iz-pcell w-full${src ? " has-photo" : ""}${editing ? " editable" : ""}`}
                    onClick={() =>
                      editing
                        ? openPortfolioUpload(i)
                        : src
                          ? toast("Portfolio photo", "info")
                          : undefined
                    }
                    aria-label={src ? `Portfolio photo ${i + 1}` : `Add portfolio photo ${i + 1}`}
                  >
                    {src ? (
                      <img
                        src={publicAssetPath(src)}
                        alt=""
                        className="h-full w-full rounded-[10px] object-cover"
                      />
                    ) : (
                      <Camera className="h-[18px] w-[18px]" />
                    )}
                  </button>
                  {editing && src && (
                    <button
                      type="button"
                      className="iz-pcell-remove"
                      aria-label="Remove photo"
                      onClick={() => removePhoto(i)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!editing && portfolio.every((p) => !p) && (
            <p className="iz-pr-account-hero__empty">
              No photos yet — tap Edit profile to add your gallery.
            </p>
          )}
        </div>

        <div className="iz-pr-account-hero__section">
          <div className="iz-pr-account-hero__section-title">
            <span>Languages</span>
          </div>
          <div
            className={
              editing ? "iz-pr-account-hero__languages-edit" : "iz-pr-account-hero__languages-view"
            }
          >
            {editing ? (
              <ProfileLanguagePicker
                value={languages}
                onChange={(next) => setDraft((p) => ({ ...p, languages: next }))}
                hint="Tap to select all languages you speak (shown to outlets)."
              />
            ) : (
              <div className="iz-pr-account-hero__lang-chips">
                {languages.length > 0 ? (
                  languages.map((l) => (
                    <IzPill key={l} variant="violet">
                      {l}
                    </IzPill>
                  ))
                ) : (
                  <span className="iz-tiny iz-muted">No languages selected</span>
                )}
              </div>
            )}
          </div>
        </div>
      </IzCard>

      <div className="iz-profile-actions mt-4">
        {editing ? (
          <>
            <button type="button" className="iz-btn iz-btn-primary" onClick={saveEdit}>
              Save profile
            </button>
            <button type="button" className="iz-btn iz-btn-soft mt-2.5" onClick={cancelEdit}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="iz-btn iz-btn-primary" onClick={startEdit}>
            <Pencil className="h-4 w-4" /> Edit profile
          </button>
        )}
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-full border border-[var(--iz-line2)] py-3 text-sm font-semibold text-[var(--iz-txt)]"
        onClick={() => setSecurityOpen(true)}
      >
        Security settings
      </button>

      <PrSecuritySettingsSheets
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        email={account.email}
        mobile={account.mobile}
        onUpdateEmail={(email) => savePrContact({ email })}
        onUpdateMobile={(mobile) => savePrContact({ mobile })}
      />

      <button
        type="button"
        className="mb-4 mt-4 w-full rounded-full border border-[var(--iz-red)] py-3 text-sm font-semibold text-[var(--iz-red)]"
        onClick={() => {
          signOut();
          goToWelcome();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

const COMCARD_DEFAULT = { height: 153, weight: 40, age: 24 };

function ComcardInput({
  label,
  value,
  onChange,
  suffix,
  compact,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="iz-pr-measure-field">
        <label>{label}</label>
        <div className="iz-pr-measure-field__wrap">
          <input
            type="number"
            inputMode="numeric"
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {suffix && <span className="iz-pr-measure-field__suffix">{suffix}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="iz-comcard-field">
      <label>{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
