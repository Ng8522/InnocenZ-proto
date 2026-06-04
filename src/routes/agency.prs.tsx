import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { IzCard, IzPill, IzSectionLabel, IzSelect, formatRM } from "@/components/iz/ui";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/agency/prs")({
  component: AgencyManagePRs,
});

function AgencyManagePRs() {
  const agencyPRs = useStore((s) => s.agencyPRs);
  const [ageMin, setAgeMin] = useState("");
  const [lang, setLang] = useState("");
  const [race, setRace] = useState("");
  const [place, setPlace] = useState("");
  const [expMin, setExpMin] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const languages = useMemo(
    () => [...new Set(agencyPRs.flatMap((p) => p.languages))].sort(),
    [agencyPRs],
  );
  const races = useMemo(() => [...new Set(agencyPRs.map((p) => p.race))], [agencyPRs]);
  const places = useMemo(() => [...new Set(agencyPRs.map((p) => p.place))], [agencyPRs]);

  const filtered = agencyPRs.filter((p) => {
    if (ageMin && p.age < Number(ageMin)) return false;
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
        <AppHeader subtitle="PR profile" title={detail.name} />
        <button type="button" className="iz-chip mb-2" onClick={() => setDetailId(null)}>
          ← Back to list
        </button>
        <IzCard>
          <div className="iz-v-sum"><span className="iz-muted">IC</span><b>{detail.ic}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Mobile</span><b>{detail.mobile}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Email</span><b>{detail.email}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Age / Height</span><b>{detail.age} · {detail.height} cm</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Race</span><b>{detail.race}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Languages</span><b>{detail.languages.join(", ")}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Place</span><b>{detail.place}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Experience</span><b>{detail.yearsExp} yrs</b></div>
          <div className="iz-v-sum"><span className="iz-muted">培养 / Tier</span><b>{detail.trainingLevel}</b></div>
          <div className="iz-v-sum"><span className="iz-muted">Rating</span><b>{detail.rating} ★</b></div>
        </IzCard>
        <IzSectionLabel>Attendance &amp; KPI</IzSectionLabel>
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
      </div>
    );
  }

  return (
    <div className="iz-screen">
      <AppHeader subtitle="Manage PR" title="Roster filters" />

      <IzCard flat>
        <div className="flex items-center gap-2 iz-tiny iz-muted">
          <Filter className="h-3.5 w-3.5" /> Age · language · race · height · place · years · rating · 培养
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
            placeholder="Min years exp."
            className="rounded-xl border border-[var(--iz-line)] bg-[var(--iz-bg2)] px-3 py-2 text-xs"
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

      <IzSectionLabel>{filtered.length} PR{filtered.length !== 1 ? "s" : ""}</IzSectionLabel>
      <div className="space-y-2">
        {filtered.map((p) => (
          <button key={p.id} type="button" className="iz-card w-full text-left" onClick={() => setDetailId(p.id)}>
            <div className="iz-between">
              <div>
                <div className="font-sora text-sm font-bold">{p.name}</div>
                <p className="iz-tiny iz-muted mt-0.5">{p.languages.join(" · ")} · {p.place}</p>
              </div>
              <IzPill variant="gold">{p.rating} ★</IzPill>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 iz-tiny iz-muted2">
              <span>Age {p.age}</span>
              <span>{p.height} cm</span>
              <span>{p.race}</span>
              <span>{p.yearsExp} yrs</span>
              <span>{p.trainingLevel}</span>
            </div>
            <p className="iz-tiny mt-1.5">Paid {formatRM(p.totalPaid)} · Att. {p.attendancePct}% · KPI {p.kpiScore}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
