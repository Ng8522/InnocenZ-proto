import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { PORTFOLIO_SLOT_COUNT, getPrProfile, getPrRosterId, type PrComcard } from "@/lib/pr-demo";
import { Comcard3dPreviewVisual } from "@/components/agency/Comcard3dPreview";
import { ProfileLanguagePicker } from "@/components/iz/ProfileLanguagePicker";
import { Camera, Pencil, Star, X } from "lucide-react";
import { FreelancerAgencyPicker } from "@/components/iz/FreelancerAgencyPicker";
import { IzCard, IzPill } from "@/components/iz/ui";

export const Route = createFileRoute("/host/profile")({
  component: ProfilePage,
});

type ProfileDraft = {
  displayName: string;
  avatarPhoto: string | null;
  comcard: PrComcard;
  portfolio: (string | null)[];
  languages: string[];
};

function buildProfileDraft(
  u: ReturnType<typeof getPrProfile>,
  prDisplayName: string | null,
  prAvatarPhoto: string | null,
  prComcard: PrComcard,
  prPortfolio: (string | null)[],
  prLanguages: string[],
): ProfileDraft {
  return {
    displayName: prDisplayName ?? u.name,
    avatarPhoto: prAvatarPhoto,
    comcard: { ...prComcard },
    portfolio: [...prPortfolio],
    languages: [...prLanguages],
  };
}

function ProfilePage() {
  const prSubRole = useStore((s) => s.prSubRole);
  const prFreelancerLowRatingStrikes = useStore((s) => s.prFreelancerLowRatingStrikes);
  const demoFreelancerLowRatingStrike = useStore((s) => s.demoFreelancerLowRatingStrike);
  const prComcard = useStore((s) => s.prComcard);
  const prPortfolio = useStore((s) => s.prPortfolio);
  const prLanguages = useStore((s) => s.prLanguages);
  const prDisplayName = useStore((s) => s.prDisplayName);
  const prAvatarPhoto = useStore((s) => s.prAvatarPhoto);
  const savePrProfile = useStore((s) => s.savePrProfile);
  const toast = useStore((s) => s.toast);

  const u = getPrProfile(prSubRole);
  const tied = prSubRole !== "pr_free";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    buildProfileDraft(u, prDisplayName, prAvatarPhoto, prComcard, prPortfolio, prLanguages),
  );

  const portfolioFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<number>(0);

  const startEdit = () => {
    setDraft(buildProfileDraft(u, prDisplayName, prAvatarPhoto, prComcard, prPortfolio, prLanguages));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildProfileDraft(u, prDisplayName, prAvatarPhoto, prComcard, prPortfolio, prLanguages));
    setEditing(false);
  };

  const saveEdit = () => {
    const name = draft.displayName.trim();
    if (!name) {
      toast("Enter your display name", "warn");
      return;
    }
    const height = Math.max(100, Math.min(220, Math.round(draft.comcard.height) || COMCARD_DEFAULT.height));
    const weight = Math.max(35, Math.min(120, Math.round(draft.comcard.weight) || COMCARD_DEFAULT.weight));
    const age = Math.max(18, Math.min(60, Math.round(draft.comcard.age) || COMCARD_DEFAULT.age));
    if (draft.languages.length === 0) {
      toast("Select at least one language", "warn");
      return;
    }
    savePrProfile({
      displayName: name,
      avatarPhoto: draft.avatarPhoto,
      comcard: { height, weight, age },
      portfolio: draft.portfolio.slice(0, PORTFOLIO_SLOT_COUNT),
      languages: draft.languages,
    });
    setEditing(false);
  };

  const displayName = editing ? draft.displayName : (prDisplayName ?? u.name);
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
        <input ref={avatarFileRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarFilePick} />

        <div className="iz-pr-account-hero__head">
          <p className="iz-pr-account-hero__eyebrow">Account</p>
          <div className="iz-pr-account-hero__head-badges">
            {editing && <span className="iz-pr-account-hero__badge iz-pr-account-hero__badge--amber">Editing</span>}
            <span className="iz-pr-account-hero__badge">3D Comcard · IC · v3</span>
          </div>
        </div>

        <div className="iz-pr-account-hero__profile">
          <div className="relative shrink-0">
            <div
              className={`iz-avatar iz-pr-account-hero__avatar${avatarPhoto ? " iz-avatar-photo" : ""}`}
              style={avatarPhoto ? undefined : { background: u.avg }}
            >
              {avatarPhoto ? <img src={avatarPhoto} alt="" /> : avatarLetter}
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
            ) : (
              <h1 className="iz-pr-account-hero__name">{displayName}</h1>
            )}
            <div className="iz-pr-account-hero__meta">
              <span className="iz-tier iz-pr-account-hero__tier">
                <Star className="h-3 w-3" /> {u.tier}
              </span>
              <span className="iz-pr-account-hero__meta-text">
                {tied ? "Agency-Tied · Atlas Agency" : "Freelancer"}
              </span>
              <span className="iz-pr-account-hero__meta-ic">IC {u.ic}</span>
            </div>
            {editing && (
              <p className="iz-pr-account-hero__hint">Tap the camera on your photo to upload a new picture.</p>
            )}
          </div>
        </div>

        <div className="iz-pr-account-hero__showcase">
          <div className="iz-pr-account-hero__showcase-glow" aria-hidden />
          <Comcard3dPreviewVisual
            pr={comcardPr}
            className="iz-pr-account-hero__comcard-visual"
            showName={!editing}
            showStats={!editing}
          />
          {editing && (
            <div className="iz-pr-account-hero__measure-edit">
              <p className="iz-pr-account-hero__measure-hint">Adjust measurements — preview updates live</p>
              <div className="iz-pr-account-hero__measure-grid">
                <ComcardInput
                  compact
                  label="Height"
                  suffix="cm"
                  value={comcard.height}
                  onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, height: n } }))}
                />
                <ComcardInput
                  compact
                  label="Weight"
                  suffix="kg"
                  value={comcard.weight}
                  onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, weight: n } }))}
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

        <div className="iz-pr-account-hero__kpi">
          <div className="iz-pr-account-hero__kpi-cell">
            <span className="l">Rep</span>
            <span className="n gold">{u.rep}%</span>
          </div>
          <div className="iz-pr-account-hero__kpi-cell">
            <span className="l">Shifts</span>
            <span className="n">{u.shifts}</span>
          </div>
          <div className="iz-pr-account-hero__kpi-cell">
            <span className="l">No-shows</span>
            <span className="n">{u.noshow}</span>
          </div>
          <div className="iz-pr-account-hero__kpi-cell">
            <span className="l">Tier</span>
            <span className="n gold">{u.tier}</span>
          </div>
        </div>

        <div className="iz-pr-account-hero__lifecycle">
          <div className="iz-pr-account-hero__lifecycle-head">
            <span>Workforce lifecycle</span>
            <b>{u.prog}%</b>
          </div>
          <div className="iz-bar-track iz-pr-account-hero__bar">
            <div className="iz-bar-fill bg-[var(--iz-grad-gold)]" style={{ width: `${u.prog}%` }} />
          </div>
          <p className="iz-pr-account-hero__lifecycle-note">{u.next}</p>
        </div>

        <div className="iz-pr-account-hero__section">
          <div className="iz-pr-account-hero__section-title">
            <span>Portfolio gallery · v3</span>
            {editing && (
              <span className="iz-pr-account-hero__section-hint">Tap slot to upload</span>
            )}
          </div>
          <input ref={portfolioFileRef} type="file" accept="image/*" className="sr-only" onChange={onPortfolioFilePick} />
          <div className="iz-pgrid iz-pgrid-8 iz-pr-account-hero__portfolio">
            {Array.from({ length: PORTFOLIO_SLOT_COUNT }, (_, i) => {
              const src = portfolio[i];
              return (
                <div key={i} className="relative">
                  <button
                    type="button"
                    className={`iz-pcell w-full${src ? " has-photo" : ""}${editing ? " editable" : ""}`}
                    onClick={() => (editing ? openPortfolioUpload(i) : src ? toast("Portfolio photo", "info") : undefined)}
                    aria-label={src ? `Portfolio photo ${i + 1}` : `Add portfolio photo ${i + 1}`}
                  >
                    {src ? (
                      <img src={src} alt="" className="h-full w-full rounded-[10px] object-cover" />
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
            <p className="iz-pr-account-hero__empty">No photos yet — tap Edit profile to add your gallery.</p>
          )}
        </div>

        <div className="iz-pr-account-hero__section">
          <div className="iz-pr-account-hero__section-title">
            <span>Languages</span>
          </div>
          <div className={editing ? "iz-pr-account-hero__languages-edit" : "iz-pr-account-hero__languages-view"}>
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

      <div className="mt-2.5">
        <FreelancerAgencyPicker tied={tied} />
      </div>

      {!tied && (
        <IzCard flat className="mt-2 border-[rgba(244,183,64,.35)]">
          {prFreelancerLowRatingStrikes > 0 ? (
            <p className="iz-tiny text-[var(--iz-amber)]">
              {prFreelancerLowRatingStrikes >= 3
                ? "Suspended: 3 ratings below 3.0★ — marketplace blocked"
                : `Warning: ${prFreelancerLowRatingStrikes}/3 low rating strikes`}
            </p>
          ) : (
            <p className="iz-tiny iz-muted">Below 3.5★ warns · 3× below 3.0★ suspends marketplace access.</p>
          )}
          <button
            type="button"
            className="iz-btn iz-btn-soft iz-btn-sm mt-2 w-auto"
            onClick={demoFreelancerLowRatingStrike}
          >
            Demo: log low-rating strike
          </button>
        </IzCard>
      )}

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
    </div>
  );
}

const COMCARD_DEFAULT = { height: 168, weight: 52, age: 25 };

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
