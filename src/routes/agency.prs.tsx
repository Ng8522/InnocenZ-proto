import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { OutletSection } from "@/components/outlet/OutletSection";
import { AgencyBroadcastSheet } from "@/components/agency/AgencyBroadcastSheet";
import { Comcard3dPreviewCard, Comcard3dPreviewVisual } from "@/components/agency/Comcard3dPreview";
import { toComcardPreview } from "@/components/agency/PrComcardIdentity";
import { StaticComcardVisual } from "@/components/pr/PortfolioComcardVisual";
import { IzSheet } from "@/components/iz/Sheet";
import { useStore } from "@/lib/store";
import type { AgencyManagedPR } from "@/lib/agency-demo";
import { collectAgencyPrLanguages, languagesFromPr } from "@/lib/agency-demo";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";
import { publicAssetPath } from "@/lib/public-asset";
import { ProfileLanguagePicker } from "@/components/iz/ProfileLanguagePicker";
import { shiftHistoryForPr } from "@/lib/portal-sync";
import {
  CONSECUTIVE_LOW_SUSPEND_COUNT,
  RATING_SUSPEND_SHIFT_THRESHOLD,
  RATING_WARN_THRESHOLD,
  getAgencyPrFlags,
  isAgencyPrActive,
  tiedMonthsLabel,
} from "@/lib/agency-pr-flags";
import { AlertTriangle, Check, Filter, Megaphone, Pencil, Star, UserMinus } from "lucide-react";

const KPI_TIER_OPTIONS = ["A", "B", "C"] as const;
const TRAINING_TIER_OPTIONS = ["Tier I", "Tier II", "Tier III", "Tier IV", "Tier V"] as const;

export const Route = createFileRoute("/agency/prs")({
  component: AgencyManagePRs,
  validateSearch: (search: Record<string, unknown>): { pr?: string } => ({
    pr: typeof search.pr === "string" && search.pr.trim() ? search.pr.trim() : undefined,
  }),
});

function AgencyManagePRs() {
  const { pr: prFromSearch } = Route.useSearch();
  const navigate = useNavigate({ from: "/agency/prs" });
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const ratings = useStore((s) => s.ratings);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const suspendAgencyPr = useStore((s) => s.suspendAgencyPr);
  const detachAgencyPr = useStore((s) => s.detachAgencyPr);
  const requestAgencyPrDetach = useStore((s) => s.requestAgencyPrDetach);
  const updateAgencyPrProfile = useStore((s) => s.updateAgencyPrProfile);
  const [ageMin, setAgeMin] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [lang, setLang] = useState("");
  const [race, setRace] = useState("");
  const [place, setPlace] = useState("");
  const [expMin, setExpMin] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  useEffect(() => {
    if (prFromSearch) setDetailId(prFromSearch);
  }, [prFromSearch]);

  const openPrProfile = (id: string) => {
    setDetailId(id);
    void navigate({ search: { pr: id } });
  };

  const closePrProfile = () => {
    setDetailId(null);
    void navigate({ search: { pr: undefined } });
  };

  const canManage = agencyCan(agencySubRole, "managePr");

  const languages = useMemo(() => collectAgencyPrLanguages(agencyPRs), [agencyPRs]);
  const races = useMemo(
    () => [...new Set(agencyPRs.map((p) => p.race).filter(Boolean))],
    [agencyPRs],
  );
  const places = useMemo(
    () => [...new Set(agencyPRs.map((p) => p.place).filter(Boolean))],
    [agencyPRs],
  );

  const filtered = useMemo(
    () =>
      agencyPRs.filter((p) => {
        if (p.detached) return false;
        if (ageMin && (p.age ?? 0) < Number(ageMin)) return false;
        if (ratingMin && (p.rating ?? 0) < Number(ratingMin)) return false;
        const langs = languagesFromPr(p);
        if (lang && !langs.some((l) => l.toLowerCase() === lang.toLowerCase())) return false;
        if (race && p.race !== race) return false;
        if (place && p.place !== place) return false;
        if (expMin && (p.yearsExp ?? 0) < Number(expMin)) return false;
        return true;
      }),
    [agencyPRs, ageMin, ratingMin, lang, race, place, expMin],
  );

  const detail = agencyPRs.find((p) => p.id === detailId);
  const activeCount = useMemo(() => filtered.filter((p) => isAgencyPrActive(p)).length, [filtered]);
  const inactiveCount = filtered.length - activeCount;

  if (!canManage) {
    return (
      <div className="iz-screen">
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">Finance role cannot manage PR roster.</p>
        </IzCard>
      </div>
    );
  }

  if (detail) {
    return (
      <AgencyPrDetail
        detail={detail}
        shiftHistory={shiftHistory}
        ratings={ratings}
        onBack={closePrProfile}
        onSaveProfile={updateAgencyPrProfile}
        onSuspend={suspendAgencyPr}
        onDetach={detachAgencyPr}
        onRequestDetach={requestAgencyPrDetach}
      />
    );
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((p) => p.id)));
  };

  const openBroadcast = () => setBroadcastOpen(true);

  const finishBroadcast = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Manage PR</h2>
        <p className="iz-tiny iz-muted mt-0.5">Filter roster · bulk broadcast · auto-flags</p>
      </header>

      <IzCard flat className="border-[var(--iz-line2)]">
        <p className="iz-tiny iz-muted2 leading-relaxed">
          <b className="text-[var(--iz-muted)]">Bulk:</b> tap Select → pick PRs → broadcast shift or message.
          {" "}
          <b className="text-[var(--iz-amber)]">Warn</b> if avg &lt; {RATING_WARN_THRESHOLD}★.
          {" "}
          <b className="text-[var(--iz-red)]">Suspend flag</b> at {CONSECUTIVE_LOW_SUSPEND_COUNT} shifts &lt; {RATING_SUSPEND_SHIFT_THRESHOLD}★ in a row.
          {" "}
          <b className="text-[var(--iz-violet-l)]">Tied &lt; 1 yr</b> cannot detach without admin.
        </p>
      </IzCard>

      <IzCard flat className="iz-pr-manage-filters-card">
        <div className="flex items-center gap-2 iz-tiny iz-muted mb-2">
          <Filter className="h-3.5 w-3.5" /> Filter PRs
        </div>
        <div className="iz-pr-manage-filters-grid">
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Min age</span>
            <input
              type="number"
              placeholder="e.g. 21"
              className="iz-roster-filter-input iz-roster-filter-input--plain iz-pr-manage-filter-control"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
          </label>
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Min rating</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              placeholder="e.g. 4.0"
              className="iz-roster-filter-input iz-roster-filter-input--plain iz-pr-manage-filter-control"
              value={ratingMin}
              onChange={(e) => setRatingMin(e.target.value)}
            />
          </label>
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Min years</span>
            <input
              type="number"
              placeholder="e.g. 2"
              className="iz-roster-filter-input iz-roster-filter-input--plain iz-pr-manage-filter-control"
              value={expMin}
              onChange={(e) => setExpMin(e.target.value)}
            />
          </label>
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Language</span>
            <IzSelect block className="iz-pr-manage-filter-control" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </IzSelect>
          </label>
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Race</span>
            <IzSelect block className="iz-pr-manage-filter-control" value={race} onChange={(e) => setRace(e.target.value)}>
              <option value="">All races</option>
              {races.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </IzSelect>
          </label>
          <label className="iz-pr-manage-filter-field">
            <span className="iz-roster-filter-label">Place</span>
            <IzSelect block className="iz-pr-manage-filter-control" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="">All places</option>
              {places.map((pl) => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </IzSelect>
          </label>
        </div>
      </IzCard>

      <OutletSection
        title={`${filtered.length} PR${filtered.length !== 1 ? "s" : ""}`}
        hint={`${activeCount} active${inactiveCount ? ` · ${inactiveCount} inactive` : ""}`}
        trailing={
          <div className="flex gap-1.5">
            {selectMode && (
              <button type="button" className="iz-chip !text-xs" onClick={selectAllFiltered}>
                All
              </button>
            )}
            <button
              type="button"
              className={`iz-chip !text-xs${selectMode ? " ring-1 ring-[var(--iz-gold)]" : ""}`}
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected(new Set());
              }}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        }
      >
      {selectMode && (
        <p className="iz-tiny iz-muted2 mb-2">
          {selected.size === 0 ? "Tap PR rows to multi-select" : `${selected.size} selected`}
        </p>
      )}
      {selectMode && selected.size > 0 && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mb-2 w-full !py-2.5 !text-xs"
          onClick={openBroadcast}
        >
          <Megaphone className="h-3.5 w-3.5" /> Broadcast shift / message ({selected.size})
        </button>
      )}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((p) => {
          const flags = getAgencyPrFlags(p);
          const active = isAgencyPrActive(p);
          const picked = selectMode && selected.has(p.id);
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-grad-card)] p-2 text-left transition-colors hover:border-[var(--iz-line2)]${picked ? " ring-1 ring-[var(--iz-gold)]" : ""}${!active ? " opacity-75" : ""}${flags.suspendStreak && active ? " border-[var(--iz-red)]/40" : ""}`}
              onClick={() => {
                if (selectMode) toggleSelect(p.id);
                else openPrProfile(p.id);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (selectMode) toggleSelect(p.id);
                else openPrProfile(p.id);
              }}
            >
              {selectMode && (
                <div
                  className={`absolute left-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded border shadow-sm ${
                    picked
                      ? "border-[var(--iz-gold)] bg-[var(--iz-gold)] text-[var(--iz-bg)]"
                      : "border-[var(--iz-line2)] bg-[var(--iz-bg2)]/95"
                  }`}
                >
                  {picked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </div>
              )}

              <div className="relative w-full">
                <IzPill
                  variant={active ? "green" : "ink"}
                  className={`absolute right-1 top-1 z-10 !py-0 !text-[8px] shadow-sm${!active ? " !opacity-100" : ""}`}
                >
                  {active ? "Active" : "Inactive"}
                </IzPill>
                <Comcard3dPreviewCard
                  pr={toComcardPreview(p)}
                  trainingLevel={p.trainingLevel}
                  rating={p.rating}
                  languages={p.languages}
                  place={p.place}
                />
              </div>

              <div className="flex flex-wrap gap-0.5">
                {!active && (
                  <IzPill variant="ink" className="!py-0 !text-[8px]">Suspended</IzPill>
                )}
                {flags.warnLowAvg && active && (
                  <IzPill variant="amber" className="!py-0 !text-[8px]">Warn</IzPill>
                )}
                {flags.suspendStreak && active && (
                  <IzPill variant="red" className="!py-0 !text-[8px]">Suspend</IzPill>
                )}
                {flags.tiedUnderOneYear && (
                  <IzPill variant="violet" className="!py-0 !text-[8px]">Tied</IzPill>
                )}
              </div>

              <p className="text-[10px] leading-tight text-[var(--iz-muted2)] line-clamp-2">
                Paid {formatRM(p.totalPaid ?? 0)} · Att. {p.attendancePct ?? 0}% · KPI {p.kpiScore ?? "—"}
                {flags.suspendLabel ? ` · ${flags.suspendLabel}` : ""}
              </p>
            </div>
          );
        })}
      </div>
      </OutletSection>

      <AgencyBroadcastSheet
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        prIds={[...selected]}
        onSent={finishBroadcast}
      />
    </div>
  );
}

type AgencyPrDraft = {
  name: string;
  icName: string;
  mobile: string;
  email: string;
  age: number;
  height: number;
  weight: number;
  race: string;
  place: string;
  yearsExp: number;
  languages: string[];
  kpiTier: string;
  trainingLevel: string;
};

function buildAgencyPrDraft(pr: AgencyManagedPR): AgencyPrDraft {
  return {
    name: pr.name ?? "",
    icName: pr.icName ?? pr.name ?? "",
    mobile: pr.mobile ?? "",
    email: pr.email ?? "",
    age: pr.age ?? 22,
    height: pr.height ?? 165,
    weight: pr.weight ?? 52,
    race: pr.race ?? "",
    place: pr.place ?? "",
    yearsExp: pr.yearsExp ?? 0,
    languages: [...(pr.languages ?? [])],
    kpiTier: pr.kpiTier ?? "B",
    trainingLevel: pr.trainingLevel,
  };
}

function AgencyPrDetail({
  detail,
  shiftHistory,
  ratings,
  onBack,
  onSaveProfile,
  onSuspend,
  onDetach,
  onRequestDetach,
}: {
  detail: AgencyManagedPR;
  shiftHistory: ReturnType<typeof useStore.getState>["shiftHistory"];
  ratings: ReturnType<typeof useStore.getState>["ratings"];
  onBack: () => void;
  onSaveProfile: (
    prId: string,
    patch: Partial<
      Pick<
        AgencyManagedPR,
        | "name"
        | "icName"
        | "mobile"
        | "email"
        | "age"
        | "height"
        | "weight"
        | "race"
        | "languages"
        | "place"
        | "yearsExp"
        | "kpiTier"
        | "trainingLevel"
      >
    >,
  ) => void;
  onSuspend: (prId: string) => void;
  onDetach: (prId: string) => void;
  onRequestDetach: (prId: string) => void;
}) {
  const toast = useStore((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [detachOpen, setDetachOpen] = useState(false);
  const [draft, setDraft] = useState<AgencyPrDraft>(() => buildAgencyPrDraft(detail));

  const flags = getAgencyPrFlags(detail);
  const tiedUnderOneYear = flags.tiedUnderOneYear;

  const startEdit = () => {
    setDraft(buildAgencyPrDraft(detail));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(buildAgencyPrDraft(detail));
    setEditing(false);
  };

  const saveEdit = () => {
    const name = draft.name.trim();
    if (!name) {
      toast("Enter PR display name", "warn");
      return;
    }
    const icName = draft.icName.trim();
    if (!icName) {
      toast("Enter IC name (legal full name)", "warn");
      return;
    }
    if (!draft.mobile.trim()) {
      toast("Enter mobile number", "warn");
      return;
    }
    if (draft.languages.length === 0) {
      toast("Select at least one language", "warn");
      return;
    }
    onSaveProfile(detail.id, {
      name,
      icName,
      mobile: draft.mobile.trim(),
      email: draft.email.trim(),
      age: Math.max(18, Math.min(60, Math.round(draft.age))),
      height: Math.max(140, Math.min(220, Math.round(draft.height))),
      weight: Math.max(35, Math.min(120, Math.round(draft.weight))),
      race: draft.race.trim(),
      place: draft.place.trim(),
      yearsExp: Math.max(0, Math.min(40, Math.round(draft.yearsExp))),
      languages: draft.languages,
      kpiTier: draft.kpiTier,
      trainingLevel: draft.trainingLevel,
    });
    setEditing(false);
  };

  const display = editing ? draft : buildAgencyPrDraft(detail);
  const avatarLetter = display.name.trim()[0]?.toUpperCase() ?? "?";

  const confirmSuspend = () => {
    onSuspend(detail.id);
    setSuspendOpen(false);
  };

  const confirmDetach = () => {
    if (tiedUnderOneYear) return;
    onDetach(detail.id);
    setDetachOpen(false);
    onBack();
  };

  const requestAdminDetach = () => {
    onRequestDetach(detail.id);
    setDetachOpen(false);
  };

  return (
    <div className="iz-screen">
      <AppTopbar
        onBack={editing ? cancelEdit : onBack}
        backLabel={editing ? "Cancel edit" : "PR list"}
      />
      <header>
        <p className="iz-tiny iz-muted2 uppercase tracking-widest">Managed PR</p>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">{display.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <IzPill variant={isAgencyPrActive(detail) ? "green" : "ink"} className="!py-0.5 !text-[9px]">
            {isAgencyPrActive(detail) ? "Active" : "Inactive"}
          </IzPill>
          <p className="iz-tiny iz-muted">IC {detail.ic} · {detail.rating} ★ avg</p>
        </div>
      </header>
      {editing && <span className="iz-pill iz-pill-amber mt-2 !text-[10px]">Editing</span>}

      <IzCard className={`mt-3${editing ? " border-[rgba(217,185,122,.25)]" : ""}`}>
        <div className="flex gap-2.5">
          <div
            className={`iz-avatar !h-[54px] !w-[54px] shrink-0 text-xl${detail.avatarPhoto ? " iz-avatar-photo" : ""}`}
          >
            {detail.avatarPhoto ? <img src={publicAssetPath(detail.avatarPhoto)} alt="" /> : avatarLetter}
          </div>
          <div className="min-w-0 flex-1">
            <div className="iz-between items-start gap-2">
              {editing ? (
                <div className="iz-field !mb-0 min-w-0 flex-1">
                  <label className="!text-[9px]">Display name</label>
                  <input
                    type="text"
                    value={draft.name}
                    maxLength={40}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="font-sora text-[17px] font-bold">{display.name}</div>
              )}
              <span className="iz-tier shrink-0">
                <Star className="h-3 w-3" /> {display.trainingLevel}
              </span>
            </div>
            <p className="iz-tiny iz-muted mt-0.5">
              KPI {display.kpiTier} · {display.languages.join(", ") || "No languages"}
            </p>
          </div>
        </div>
      </IzCard>

      <div className="iz-outlet-stat-strip mt-3">
        <div className="iz-outlet-stat-cell">
          <div className="l">Rating</div>
          <div className="n text-[var(--iz-gold)]">{detail.rating}★</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Attendance</div>
          <div className="n">{detail.attendancePct}%</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">KPI</div>
          <div className="n">{detail.kpiScore}</div>
        </div>
        <div className="iz-outlet-stat-cell">
          <div className="l">Paid</div>
          <div className="n text-[var(--iz-gold-l)]">{(detail.totalPaid / 1000).toFixed(1)}k</div>
        </div>
      </div>

      <IzSectionLabel>
        {detail.comcardImageUrl ? "Photo comcard" : "3D Comcard"}
        {editing && <span className="ml-auto text-[var(--iz-gold-l)] normal-case tracking-normal">Editable</span>}
      </IzSectionLabel>
      <IzCard className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <div className="iz-comcard-edit">
            <AgencyComcardInput label="Height (cm)" value={draft.height} onChange={(n) => setDraft((p) => ({ ...p, height: n }))} />
            <AgencyComcardInput label="Weight (kg)" value={draft.weight} onChange={(n) => setDraft((p) => ({ ...p, weight: n }))} />
            <AgencyComcardInput label="Age" value={draft.age} onChange={(n) => setDraft((p) => ({ ...p, age: n }))} />
          </div>
        ) : detail.comcardImageUrl ? (
          <StaticComcardVisual src={detail.comcardImageUrl} className="mx-auto" />
        ) : (
          <Comcard3dPreviewVisual
            pr={toComcardPreview(detail)}
          />
        )}
      </IzCard>

      {(detail.portfolioPhotos?.some(Boolean) ?? false) && (
        <>
          <IzSectionLabel>Portfolio gallery</IzSectionLabel>
          <IzCard>
            <div className="grid grid-cols-4 gap-2">
              {detail.portfolioPhotos!
                .filter((src): src is string => Boolean(src))
                .map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg border border-[var(--iz-line)]">
                    <img src={publicAssetPath(src)} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
            </div>
            <p className="iz-tiny iz-muted2 mt-2">Synced from PR profile · {detail.name}</p>
          </IzCard>
        </>
      )}

      <div className="iz-pr-profile-fields">
      <div>
      <IzSectionLabel>Contact</IzSectionLabel>
      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <div className="space-y-2">
            <div className="iz-field !mb-0">
              <label>IC name (legal full name)</label>
              <input value={draft.icName} onChange={(e) => setDraft((p) => ({ ...p, icName: e.target.value }))} />
            </div>
            <div className="iz-field !mb-0">
              <label>Mobile</label>
              <input value={draft.mobile} onChange={(e) => setDraft((p) => ({ ...p, mobile: e.target.value }))} />
            </div>
            <div className="iz-field !mb-0">
              <label>Email</label>
              <input type="email" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
        ) : (
          <div className="iz-kv-list">
            <div className="iz-v-sum"><span className="iz-muted">Mobile</span><b>{display.mobile}</b></div>
            <div className="iz-v-sum"><span className="iz-muted">Email</span><b>{display.email}</b></div>
            <div className="iz-v-sum"><span className="iz-muted">IC</span><b>{detail.ic}</b></div>
          </div>
        )}
      </IzCard>
      </div>

      <div>
      <IzSectionLabel>Profile details</IzSectionLabel>
      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <div className="space-y-2">
            <div className="iz-field !mb-0">
              <label>Race</label>
              <input value={draft.race} onChange={(e) => setDraft((p) => ({ ...p, race: e.target.value }))} />
            </div>
            <div className="iz-field !mb-0">
              <label>Place</label>
              <input value={draft.place} onChange={(e) => setDraft((p) => ({ ...p, place: e.target.value }))} />
            </div>
            <AgencyComcardInput label="Years experience" value={draft.yearsExp} onChange={(n) => setDraft((p) => ({ ...p, yearsExp: n }))} />
            <div className="iz-field !mb-0">
              <label>KPI tier</label>
              <IzSelect value={draft.kpiTier} onChange={(e) => setDraft((p) => ({ ...p, kpiTier: e.target.value }))}>
                {KPI_TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>Tier {tier}</option>
                ))}
              </IzSelect>
            </div>
            <div className="iz-field !mb-0">
              <label>Training tier</label>
              <IzSelect value={draft.trainingLevel} onChange={(e) => setDraft((p) => ({ ...p, trainingLevel: e.target.value }))}>
                {TRAINING_TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </IzSelect>
            </div>
          </div>
        ) : (
          <div className="iz-kv-list">
            <div className="iz-v-sum"><span className="iz-muted">Race</span><b>{display.race}</b></div>
            <div className="iz-v-sum"><span className="iz-muted">Place</span><b>{display.place}</b></div>
            <div className="iz-v-sum"><span className="iz-muted">Experience</span><b>{display.yearsExp} yrs</b></div>
            <div className="iz-v-sum"><span className="iz-muted">KPI tier</span><b>{display.kpiTier}</b></div>
            <div className="iz-v-sum"><span className="iz-muted">Training tier</span><b>{display.trainingLevel}</b></div>
          </div>
        )}
      </IzCard>
      </div>
      </div>

      <IzSectionLabel>Languages</IzSectionLabel>
      <IzCard flat className={editing ? "border-[rgba(217,185,122,.25)]" : undefined}>
        {editing ? (
          <ProfileLanguagePicker
            value={draft.languages}
            onChange={(languages) => setDraft((p) => ({ ...p, languages }))}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {display.languages.map((l) => (
              <IzPill key={l} variant="violet">{l}</IzPill>
            ))}
          </div>
        )}
      </IzCard>

      {!editing && (
        <>
          {detail.suspended && (
            <IzCard flat className="mt-2.5 border-[var(--iz-red)]">
              <p className="iz-tiny text-[var(--iz-red)]">Suspended — shifts paused</p>
            </IzCard>
          )}
          {flags.warnLowAvg && !detail.suspended && (
            <IzCard flat className="mt-2.5 border-[var(--iz-amber)]">
              <p className="iz-tiny flex items-center gap-1 text-[var(--iz-amber)]">
                <AlertTriangle className="h-3 w-3" />
                Warn · average {detail.rating}★ is below {RATING_WARN_THRESHOLD}★ — monitor performance
              </p>
            </IzCard>
          )}
          {flags.suspendStreak && !detail.suspended && (
            <IzCard flat className="mt-2.5 border-[var(--iz-red)]">
              <p className="iz-tiny text-[var(--iz-red)]">
                Auto-flag · {flags.suspendLabel} — consider suspend
              </p>
            </IzCard>
          )}
          {tiedUnderOneYear && (
            <IzCard flat className="mt-2.5 border-[var(--iz-violet)]">
              <p className="iz-tiny text-[var(--iz-violet-l)]">
                Tied {tiedMonthsLabel(detail)} · detach requires InnocenZ admin approval
              </p>
            </IzCard>
          )}

          <OutletSection title="Shift history" hint="Last 3 shifts">
            <IzCard flat>
              {shiftHistoryForPr(shiftHistory, detail.id).slice(0, 3).map((h) => (
                <p key={h.id} className="iz-tiny iz-muted border-t border-[var(--iz-line)] py-2 first:border-0 first:pt-0">
                  {h.dateDisplay} · {h.outlet} · {formatRM(h.totalPayout)}
                </p>
              ))}
            </IzCard>
          </OutletSection>

          <OutletSection title="Ratings feed">
            <IzCard flat>
              {ratings.filter((r) => r.pr === detail.name).slice(0, 3).map((r) => (
                <p key={r.id} className="iz-tiny iz-muted py-1">{r.stars}★ · {r.note}</p>
              ))}
              {ratings.filter((r) => r.pr === detail.name).length === 0 && (
                <p className="iz-tiny iz-muted">No ratings yet</p>
              )}
            </IzCard>
          </OutletSection>

          <OutletSection title="Agency actions" hint="Discipline">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="iz-btn iz-btn-soft !text-xs" disabled={detail.suspended} onClick={() => setSuspendOpen(true)}>
                Suspend
              </button>
              <button
                type="button"
                className="iz-btn iz-btn-soft !text-xs"
                onClick={() => setDetachOpen(true)}
              >
                <UserMinus className="h-3 w-3" /> {tiedUnderOneYear ? "Request detach" : "Detach"}
              </button>
            </div>
          </OutletSection>
        </>
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

      <IzSheet open={suspendOpen} onClose={() => setSuspendOpen(false)}>
        <div className="iz-cardttl">Suspend {detail.name}?</div>
        <p className="iz-tiny iz-muted mb-3 leading-relaxed">
          This pauses all shift offers and check-ins for this PR until you lift the suspension. Pending roster slots
          may need to be reassigned.
        </p>
        <div className="iz-grid2">
          <button type="button" className="iz-btn iz-btn-ghost" onClick={() => setSuspendOpen(false)}>Cancel</button>
          <button type="button" className="iz-btn iz-btn-primary" onClick={confirmSuspend}>Confirm suspend</button>
        </div>
      </IzSheet>

      <IzSheet open={detachOpen} onClose={() => setDetachOpen(false)}>
        <div className="iz-cardttl">{tiedUnderOneYear ? "Request detach" : "Detach"} {detail.name}?</div>
        <p className="iz-tiny iz-muted mb-3 leading-relaxed">
          {tiedUnderOneYear ? (
            <>
              This PR has been tied for {tiedMonthsLabel(detail)} (under 1 year). Direct detach is blocked —
              submit a request for InnocenZ admin to review.
            </>
          ) : (
            <>Detach removes this PR from your agency roster. They will no longer receive tied shifts or payroll from your agency.</>
          )}
        </p>
        <div className="iz-grid2">
          <button type="button" className="iz-btn iz-btn-ghost" onClick={() => setDetachOpen(false)}>Cancel</button>
          {tiedUnderOneYear ? (
            <button type="button" className="iz-btn iz-btn-primary" onClick={requestAdminDetach}>
              Submit admin request
            </button>
          ) : (
            <button type="button" className="iz-btn iz-btn-primary" onClick={confirmDetach}>Confirm detach</button>
          )}
        </div>
      </IzSheet>
    </div>
  );
}

function AgencyComcardInput({
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
