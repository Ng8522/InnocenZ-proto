import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { useStore } from "@/lib/store";
import {
  PORTFOLIO_SLOT_COUNT,
  PR_LANGUAGE_OPTIONS,
  getPrProfile,
  type PrComcard,
} from "@/lib/pr-demo";
import { Camera, Pencil, Shield, Star, X } from "lucide-react";
import { FreelancerAgencyPicker } from "@/components/iz/FreelancerAgencyPicker";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";

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
  const outletRatingStars = useStore((s) => s.outletRatingStars);
  const setOutletRatingStars = useStore((s) => s.setOutletRatingStars);
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
      toast("Profile photo updated � tap Save profile", "success");
    });
  };

  const removePhoto = (slot: number) => {
    setDraft((prev) => {
      const next = [...prev.portfolio];
      next[slot] = null;
      return { ...prev, portfolio: next };
    });
  };

  const toggleLanguage = (lang: string) => {
    setDraft((prev) => {
      const has = prev.languages.includes(lang);
      const languages = has ? prev.languages.filter((l) => l !== lang) : [...prev.languages, lang];
      return { ...prev, languages };
    });
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={editing ? cancelEdit : undefined}
        backLabel={editing ? "Cancel edit" : undefined}
      />
      <div className="iz-between mx-0.5 mt-1">
        <h2 className="font-sora text-[22px] font-extrabold text-[var(--iz-txt)]">Profile & Ratings</h2>
        {editing && (
          <span className="iz-pill iz-pill-amber !text-[10px]">Editing</span>
        )}
      </div>

      <IzCard className={`mt-3${editing ? " border-[rgba(217,185,122,.25)]" : ""}`}>
        <input ref={avatarFileRef} type="file" accept="image/*" className="sr-only" onChange={onAvatarFilePick} />
        <div className="flex gap-2.5">
          <div className="relative shrink-0">
            <div
              className={`iz-avatar !h-[54px] !w-[54px] text-xl${avatarPhoto ? " iz-avatar-photo" : ""}`}
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
          <div className="min-w-0 flex-1">
            <div className="iz-between items-start gap-2">
              {editing ? (
                <div className="iz-field !mb-0 min-w-0 flex-1">
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
                <div className="font-sora text-[17px] font-bold">{displayName}</div>
              )}
              <span className="iz-tier shrink-0">
                <Star className="h-3 w-3" /> {u.tier}
              </span>
            </div>
            <p className="iz-tiny iz-muted mt-0.5">
              {tied ? "Agency-Tied � Atlas Agency" : "Freelancer"} � IC {u.ic}
            </p>
            {editing && (
              <p className="iz-tiny iz-muted2 mt-1">Tap the camera on your photo to upload a new profile picture.</p>
            )}
          </div>
        </div>
        <div className="iz-grid3 mt-3">
          <div className="iz-stat-tile">
            <div className="n text-[var(--iz-gold)]">{u.rep}?</div>
            <div className="l">Reputation</div>
          </div>
          <div className="iz-stat-tile">
            <div className="n">{u.shifts}</div>
            <div className="l">Shifts</div>
          </div>
          <div className="iz-stat-tile">
            <div className="n">{u.noshow}</div>
            <div className="l">No-shows</div>
          </div>
        </div>
      </IzCard>

      <div className="mt-2.5">
        <FreelancerAgencyPicker tied={tied} />
      </div>

      <IzCard flat className="mt-2.5">
        <div className="iz-between iz-tiny mb-1.5">
          <span className="iz-muted">Workforce lifecycle � {u.tier}</span>
          <b>{u.prog}%</b>
        </div>
        <div className="iz-bar-track">
          <div className="iz-bar-fill bg-[var(--iz-grad-gold)]" style={{ width: `${u.prog}%` }} />
        </div>
        <p className="iz-tiny iz-muted2 mt-1.5">{u.next}</p>
      </IzCard>

      <IzSectionLabel>
        3D Comcard � IC � v3
        {editing && <span className="ml-auto text-[var(--iz-gold-l)] normal-case tracking-normal">Editable</span>}
      </IzSectionLabel>
      <IzCard className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <div className="iz-comcard-edit">
            <ComcardInput
              label="Height (cm)"
              value={comcard.height}
              onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, height: n } }))}
            />
            <ComcardInput
              label="Weight (kg)"
              value={comcard.weight}
              onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, weight: n } }))}
            />
            <ComcardInput
              label="Age"
              value={comcard.age}
              onChange={(n) => setDraft((p) => ({ ...p, comcard: { ...p.comcard, age: n } }))}
            />
          </div>
        ) : (
          <div className="flex justify-around text-center">
            <ComcardStat label="HEIGHT" value={`${comcard.height} cm`} />
            <ComcardStat label="WEIGHT" value={`${comcard.weight} kg`} />
            <ComcardStat label="AGE" value={String(comcard.age)} />
          </div>
        )}
      </IzCard>

      <IzSectionLabel>
        Portfolio gallery � v3
        {editing && (
          <span className="ml-auto text-[var(--iz-muted2)] normal-case tracking-normal font-normal">
            Tap slot to upload
          </span>
        )}
      </IzSectionLabel>
      <IzCard className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        <input ref={portfolioFileRef} type="file" accept="image/*" className="sr-only" onChange={onPortfolioFilePick} />
        <div className="iz-pgrid iz-pgrid-8">
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
          <p className="iz-tiny iz-muted2 mt-2 text-center">No photos yet � tap Edit profile to add your gallery.</p>
        )}
      </IzCard>

      <IzSectionLabel>Languages</IzSectionLabel>
      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <>
            <p className="iz-tiny iz-muted2 mb-2">Tap to select all languages you speak (shown to outlets).</p>
            <div className="flex flex-wrap gap-1.5">
              {PR_LANGUAGE_OPTIONS.map((lang) => {
                const on = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`iz-lang-pick${on ? " on" : ""}`}
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
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
      </IzCard>

      <IzSectionLabel>Rate an outlet you worked</IzSectionLabel>
      <IzCard>
        <div className="iz-between flex-wrap gap-2">
          <span className="iz-sm">Velvet 23 � 4 May</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOutletRatingStars(n)}
                className={n <= outletRatingStars ? "text-[var(--iz-gold)]" : "text-[var(--iz-muted2)]"}
              >
                <Star className="h-[22px] w-[22px]" fill={n <= outletRatingStars ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
        <p className="iz-tiny iz-muted2 mt-2">
          {outletRatingStars ? `${outletRatingStars} / 5 stars selected` : "Tap the stars to rate"}
        </p>
        {outletRatingStars > 0 && (
          <button
            type="button"
            className="iz-btn iz-btn-primary iz-btn-sm mt-2.5 w-auto"
            onClick={() => {
              toast(`Rated Velvet 23 ${outletRatingStars}? � permanent & public`, "success");
              setOutletRatingStars(0);
            }}
          >
            Submit {outletRatingStars}? rating
          </button>
        )}
      </IzCard>

      <IzCard flat className="iz-tiny iz-muted mt-2.5">
        <Shield className="mr-1 inline h-3 w-3" />
        IC + address collected under PDPA disclaimer. Ratings are mutual & permanent.
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
    </div>
  );
}

const COMCARD_DEFAULT = { height: 168, weight: 52, age: 25 };

function ComcardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-sora text-xl font-extrabold text-[var(--iz-gold-l)]">{value}</div>
      <div className="iz-tiny iz-muted2 mt-0.5 tracking-wide">{label}</div>
    </div>
  );
}

function ComcardInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
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
