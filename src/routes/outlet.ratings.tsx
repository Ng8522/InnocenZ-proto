import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PR } from "@/lib/store";
import { AppTopbar } from "@/components/Nav";
import { IzCard, IzPill, IzSectionLabel } from "@/components/iz/ui";
import { Clock, MapPin, Star, Wine } from "lucide-react";

export const Route = createFileRoute("/outlet/ratings")({
  component: FloorPage,
});

/** Live floor stats for PRs checked in tonight (prototype). */
const FLOOR_STATS: Record<string, { checkedInAt: string; drinks: number; tables: number; tips: number }> = {
  p1: { checkedInAt: "22:14", drinks: 14, tables: 4, tips: 286 },
  p2: { checkedInAt: "22:08", drinks: 11, tables: 3, tips: 214 },
  p3: { checkedInAt: "22:22", drinks: 9, tables: 2, tips: 168 },
  p4: { checkedInAt: "22:31", drinks: 8, tables: 2, tips: 142 },
};

function FloorPage() {
  const { prs, shifts, ratings, ratePr } = useStore();
  const [openPr, setOpenPr] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");

  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];

  const onFloor = useMemo(() => {
    const ids = tonight?.prs ?? [];
    return ids
      .map((id) => prs.find((p) => p.id === id))
      .filter((p): p is PR => !!p);
  }, [tonight?.prs, prs]);

  const openPrData = openPr ? prs.find((p) => p.id === openPr) : null;

  return (
    <div className="iz-screen">
      <AppTopbar />
      <h2 className="font-sora text-xl font-extrabold text-[var(--iz-txt)]">Floor</h2>
      <p className="iz-tiny iz-muted mt-1">
        PRs currently on duty at your outlet ù rate their shift when ready.
      </p>

      {tonight && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IzPill variant="green">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--iz-green)]" />
            {onFloor.length} on floor
          </IzPill>
          <span className="iz-tiny iz-muted">
            {tonight.event} ù {tonight.shift}
          </span>
        </div>
      )}

      <div className="mt-4">
        <IzSectionLabel>On duty now</IzSectionLabel>
      </div>

      {onFloor.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-8 text-center text-xs text-[var(--iz-muted)]">
          No PRs checked in for tonight&apos;s shift yet.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {onFloor.map((p) => (
            <FloorPrCard
              key={p.id}
              pr={p}
              shiftLabel={tonight?.shift ?? "ù"}
              stats={FLOOR_STATS[p.id]}
              onRate={() => {
                setOpenPr(p.id);
                setStars(5);
                setNote("");
              }}
            />
          ))}
        </div>
      )}

      {ratings.length > 0 && (
        <>
          <div className="mt-5">
            <IzSectionLabel>Recent ratings</IzSectionLabel>
          </div>
          <div className="mt-2 space-y-2">
            {ratings.map((r) => (
              <IzCard key={r.id} className="!mb-0 !py-3">
                <div className="flex items-center justify-between">
                  <span className="font-sora text-sm font-bold">{r.pr}</span>
                  <span className="flex items-center gap-0.5 text-[var(--iz-gold)]">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-[var(--iz-gold)]" />
                    ))}
                  </span>
                </div>
                <p className="iz-tiny iz-muted mt-1">{r.note || "No comment."}</p>
                <p className="iz-tiny iz-muted2 mt-0.5">{r.date}</p>
              </IzCard>
            ))}
          </div>
        </>
      )}

      {openPr && openPrData && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpenPr(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="iz-card mx-auto w-full max-w-[392px] rounded-b-none rounded-t-[28px] !mb-0"
          >
            <div className="mb-3 flex items-center gap-3">
              <img
                src={openPrData.photoUrl}
                alt=""
                className="h-12 w-12 rounded-xl object-cover"
              />
              <h3 className="font-sora text-lg font-bold">Rate {openPrData.name}</h3>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)}>
                  <Star
                    className={`h-8 w-8 ${n <= stars ? "fill-[var(--iz-gold)] text-[var(--iz-gold)]" : "text-[var(--iz-muted2)]"}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How was their service tonight?"
              className="mt-4 h-20 w-full rounded-[13px] border border-[var(--iz-line2)] bg-white/[0.03] p-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                ratePr(openPr, stars, note);
                setOpenPr(null);
              }}
              className="iz-btn iz-btn-primary mt-4"
            >
              Submit rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FloorPrCard({
  pr,
  shiftLabel,
  stats,
  onRate,
}: {
  pr: PR;
  shiftLabel: string;
  stats?: { checkedInAt: string; drinks: number; tables: number; tips: number };
  onRate: () => void;
}) {
  return (
    <IzCard className="!mb-0 overflow-hidden !p-0">
      <div className="relative aspect-[4/5] max-h-[220px] w-full bg-[var(--iz-violet-ink)]">
        {pr.photoUrl ? (
          <img src={pr.photoUrl} alt={pr.name} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">{pr.avatar}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-10">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-sora text-lg font-extrabold text-white">{pr.name}</div>
              <div className="flex items-center gap-1 text-xs text-[var(--iz-gold-l)]">
                <Star className="h-3 w-3 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
                {pr.rating}
              </div>
            </div>
            <IzPill variant="green">On duty</IzPill>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 p-4">
        <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Languages" value={pr.languages.join(" / ")} />
        <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Shift" value={shiftLabel} />
        {stats && (
          <>
            <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Checked in" value={stats.checkedInAt} />
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Drinks" value={String(stats.drinks)} />
              <MiniStat label="Tables" value={String(stats.tables)} />
              <MiniStat label="Tips" value={`RM ${stats.tips}`} />
            </div>
          </>
        )}
        <button type="button" onClick={onRate} className="iz-btn iz-btn-primary mt-1 w-full">
          Rate {pr.name}
        </button>
      </div>
    </IzCard>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--iz-muted)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-[var(--iz-muted)]">{label}</div>
        <div className="text-sm text-[var(--iz-txt)]">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="iz-stat-tile p-2 text-center">
      <div className="font-sora text-sm font-bold text-[var(--iz-gold-l)]">{value}</div>
      <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] uppercase tracking-wide text-[var(--iz-muted)]">
        {label === "Drinks" && <Wine className="h-2.5 w-2.5" />}
        {label}
      </div>
    </div>
  );
}
