import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppTopbar } from "@/components/Nav";
import { OutletSection } from "@/components/outlet/OutletSection";
import { useStore } from "@/lib/store";
import { agencyCan } from "@/lib/agency-rbac";
import { IzCard, IzPill, IzSelect, formatRM } from "@/components/iz/ui";
import { shiftHistoryForPr } from "@/lib/portal-sync";
import { AlertTriangle, Filter, UserMinus } from "lucide-react";

export const Route = createFileRoute("/agency/prs")({
  component: AgencyManagePRs,
});

function AgencyManagePRs() {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const shiftHistory = useStore((s) => s.shiftHistory);
  const ratings = useStore((s) => s.ratings);
  const agencySubRole = useStore((s) => s.agencySubRole);
  const toast = useStore((s) => s.toast);
  const suspendAgencyPr = useStore((s) => s.suspendAgencyPr);
  const detachAgencyPr = useStore((s) => s.detachAgencyPr);
  const setAgencyPrKpiTier = useStore((s) => s.setAgencyPrKpiTier);
  const setAgencyPrTrainingTier = useStore((s) => s.setAgencyPrTrainingTier);
  const [ageMin, setAgeMin] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [lang, setLang] = useState("");
  const [race, setRace] = useState("");
  const [place, setPlace] = useState("");
  const [expMin, setExpMin] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!agencyCan(agencySubRole, "managePr")) {
    return (
      <div className="iz-screen">
        <AppTopbar backTo="/agency" backLabel="Home" />
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Access restricted</h2>
        </header>
        <IzCard className="text-center">
          <p className="iz-sm iz-muted">Finance role cannot manage PR roster.</p>
        </IzCard>
      </div>
    );
  }

  const languages = useMemo(
    () => [...new Set(agencyPRs.flatMap((p) => p.languages))].sort(),
    [agencyPRs],
  );
  const races = useMemo(() => [...new Set(agencyPRs.map((p) => p.race))], [agencyPRs]);
  const places = useMemo(() => [...new Set(agencyPRs.map((p) => p.place))], [agencyPRs]);

  const filtered = agencyPRs.filter((p) => {
    if (p.detached) return false;
    if (ageMin && p.age < Number(ageMin)) return false;
    if (ratingMin && p.rating < Number(ratingMin)) return false;
    if (lang && !p.languages.some((l) => l.toLowerCase().includes(lang.toLowerCase()))) return false;
    if (race && p.race !== race) return false;
    if (place && p.place !== place) return false;
    if (expMin && p.yearsExp < Number(expMin)) return false;
    return true;
  });

  const detail = agencyPRs.find((p) => p.id === detailId);

  if (detail) {
    return (
      <div className="iz-screen">
        <AppTopbar onBack={() => setDetailId(null)} backLabel="PR list" />
        <header>
          <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">{detail.name}</h2>
          <p className="iz-tiny iz-muted mt-0.5">PR profile</p>
        </header>
        <IzCard>
          <div className="iz-v-sum"><span className="iz-muted">IC</span><b>{detail.ic}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Mobile</span><b>{detail.mobile}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Email</span><b>{detail.email}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Age / Height</span><b>{detail.age} · {detail.height} cm</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Race</span><b>{detail.race}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Languages</span><b>{detail.languages.join(", ")}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Place</span><b>{detail.place}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Experience</span><b>{detail.yearsExp} yrs</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Tier</span><b>{detail.trainingLevel}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Rating</span><b>{detail.rating} ★</b></div>
        </IzCard>
        <OutletSection title="Attendance & KPI">
        <div className="iz-grid2">
          <div className="iz-stat-tile"><div className="n">{detail.attendancePct}%</div><div className="l">Attendance</div></div>
          <div className="iz-stat-tile"><div className="n">{detail.kpiScore}</div><div className="l">KPI score</div></div>
          <div className="iz-stat-tile"><div className="n">{detail.checkIns}</div><div className="l">Check-ins</div></div>
          <div className="iz-stat-tile"><div className="n text-[var(--iz-red)]">{detail.noShows}</div><div className="l">No-shows</div></div>
        </div>
        <IzCard className="mt-2">
          <div className="iz-v-sum tot">
            <span>Total paid (lifetime)</span>
            <span className="iz-ledger text-[var(--iz-gold)]">{formatRM(detail.totalPaid)}</span>
          </div>
        </IzCard>
        {detail.suspended && (
          <IzCard flat className="mt-2 border-[var(--iz-red)]">
            <p className="iz-tiny text-[var(--iz-red)]">Suspended — shifts paused</p>
          </IzCard>
        )}
        {detail.rating < 3.5 && !detail.suspended && (
          <IzCard flat className="mt-2 border-[var(--iz-amber)]">
            <p className="iz-tiny flex items-center gap-1 text-[var(--iz-amber)]">
              <AlertTriangle className="h-3 w-3" /> Warn · avg &lt; 3.5★
            </p>
          </IzCard>
        )}
        {(detail.rating < 3.0 || detail.noShows >= 3) && !detail.suspended && (
          <IzCard flat className="mt-2 border-[var(--iz-red)]">
            <p className="iz-tiny text-[var(--iz-red)]">
              Auto-flag · {detail.rating < 3.0 ? "below 3.0★" : ""}{detail.noShows >= 3 ? " 3+ no-shows" : ""} — consider suspend
            </p>
          </IzCard>
        )}
        </OutletSection>
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="iz-btn iz-btn-soft flex-1 !text-xs" onClick={() => setAgencyPrKpiTier(detail.id, detail.kpiTier === "A" ? "B" : "A")}>
            KPI tier · {detail.kpiTier ?? "B"}
          </button>
          <button type="button" className="iz-btn iz-btn-soft flex-1 !text-xs" onClick={() => setAgencyPrTrainingTier(detail.id, detail.trainingLevel === "Tier V" ? "Tier IV" : "Tier V")}>
            Training · {detail.trainingLevel}
          </button>
          <button type="button" className="iz-btn iz-btn-soft flex-1 !text-xs" onClick={() => suspendAgencyPr(detail.id)} disabled={detail.suspended}>
            Suspend
          </button>
          <button type="button" className="iz-btn iz-btn-soft flex-1 !text-xs" onClick={() => detachAgencyPr(detail.id)}>
            <UserMinus className="h-3 w-3" /> Detach
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppTopbar backTo="/agency" backLabel="Home" />
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Manage PR</h2>
        <p className="iz-tiny iz-muted mt-0.5">Filter roster · KPI · tier</p>
      </header>

      <IzCard flat>
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Filter className="h-3.5 w-3.5" /> Age · language · race · height · place · years · rating · tier
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min age"
            className="rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-xs"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
          />
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            placeholder="Min rating ★"
            className="rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-xs"
            value={ratingMin}
            onChange={(e) => setRatingMin(e.target.value)}
          />
          <input
            type="number"
            placeholder="Min years exp."
            className="col-span-2 rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-xs"
            value={expMin}
            onChange={(e) => setExpMin(e.target.value)}
          />
          <IzSelect value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </IzSelect>
          <IzSelect value={race} onChange={(e) => setRace(e.target.value)}>
            <option value="">All races</option>
            {races.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </IzSelect>
          <IzSelect className="col-span-2" value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">All places</option>
            {places.map((pl) => (
              <option key={pl} value={pl}>{pl}</option>
            ))}
          </IzSelect>
        </div>
      </IzCard>

      <OutletSection
        title={`${filtered.length} PR${filtered.length !== 1 ? "s" : ""}`}
        trailing={
        <button
          type="button"
          className="iz-chip !text-xs"
          onClick={() => {
            setSelectMode(!selectMode);
            setSelected(new Set());
          }}
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
        }
      >
      {selectMode && selected.size > 0 && (
        <button
          type="button"
          className="iz-btn iz-btn-primary mb-2 w-full !py-2 !text-xs"
          onClick={() => toast(`Broadcast sent to ${selected.size} PRs`, "success")}
        >
          Broadcast shift / message ({selected.size})
        </button>
      )}
      <div className="space-y-2">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`iz-outlet-floor-row w-full text-left ${selectMode && selected.has(p.id) ? "ring-1 ring-[var(--iz-gold)]" : ""}`}
            onClick={() => {
              if (selectMode) {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                });
              } else {
                setDetailId(p.id);
              }
            }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] font-sora text-lg font-bold">
              {p.name.trim()[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-sora text-sm font-bold">{p.name}</span>
                {p.suspended && <IzPill variant="red" className="!py-0.5 !text-[9px]">Suspended</IzPill>}
                <IzPill variant="gold" className="!py-0.5 !text-[9px]">{p.rating} ★</IzPill>
              </div>
              <p className="iz-tiny iz-muted truncate">
                {p.languages.join(" · ")} · {p.place}
              </p>
              <p className="iz-tiny iz-muted2">
                Paid {formatRM(p.totalPaid)} · Att. {p.attendancePct}% · KPI {p.kpiScore}
              </p>
            </div>
          </button>
        ))}
      </div>
      </OutletSection>
    </div>
  );
}
