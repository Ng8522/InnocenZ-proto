import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PR } from "@/lib/store";
import { OutletShiftSalesPanel } from "@/components/outlet/OutletLogSales";
import { OutletSection } from "@/components/outlet/OutletSection";
import { PR_RATING_TAGS } from "@/lib/outlet-demo";
import { outletCan } from "@/lib/outlet-rbac";
import { DEFAULT_ROSTER_DATE_ISO } from "@/lib/roster-availability";
import { outletMatches } from "@/lib/portal-sync";
import { IzPill } from "@/components/iz/ui";
import {
  workforceStatusLabel,
  workforceStatusVariant,
} from "@/components/portal/LiveWorkforceTable";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/outlet/ratings")({
  component: FloorPage,
});

type ViewMode = "live" | "planning";

function FloorPage() {
  const outletSubRole = useStore((s) => s.outletSubRole);
  const {
    prs,
    shifts,
    ratings,
    ratePr,
    agencyRoster,
    postSealRatePrompt,
    clearPostSealRatePrompt,
  } = useStore();
  const canLogSales = outletCan(outletSubRole, "logSales");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [openPr, setOpenPr] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];
  const outletName = tonight?.outletName ?? "Velvet 23";

  useEffect(() => {
    if (postSealRatePrompt?.prIds[0]) {
      setOpenPr(postSealRatePrompt.prIds[0]);
      setStars(5);
      setNote("");
      setTags([]);
    }
  }, [postSealRatePrompt]);

  const rosterTonight = useMemo(
    () =>
      agencyRoster.filter(
        (s) => s.dateIso === DEFAULT_ROSTER_DATE_ISO && outletMatches(s.outlet, outletName),
      ),
    [agencyRoster, outletName],
  );

  const onFloor = useMemo(() => {
    if (viewMode === "planning") {
      return (tonight?.prs ?? [])
        .map((id) => prs.find((p) => p.id === id))
        .filter((p): p is PR => !!p);
    }
    const liveIds = rosterTonight
      .filter((s) => s.status === "en-route" || (s.status === "on-duty" && !!s.checkedInAt))
      .map((s) => s.prId);
    const ids = liveIds.length > 0 ? liveIds : (tonight?.prs ?? []);
    return ids
      .map((id) => prs.find((p) => p.id === id))
      .filter((p): p is PR => !!p)
      .sort((a, b) => {
        const sa = rosterTonight.find((s) => s.prId === a.id)?.status;
        const sb = rosterTonight.find((s) => s.prId === b.id)?.status;
        if (sa === "on-duty" && sb !== "on-duty") return -1;
        if (sa !== "on-duty" && sb === "on-duty") return 1;
        return 0;
      });
  }, [viewMode, tonight?.prs, prs, rosterTonight]);

  const openPrData = openPr ? prs.find((p) => p.id === openPr) : null;

  const statsFor = (prId: string) => rosterTonight.find((s) => s.prId === prId);

  const toggleTag = (tag: string) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

  return (
    <div className="iz-screen">
      <header>
        <h2 className="font-sora text-lg font-extrabold text-[var(--iz-txt)]">Floor</h2>
        {tonight && (
          <p className="iz-tiny iz-muted mt-0.5 truncate">
            {tonight.event} {"\u00b7"} {tonight.shift}
          </p>
        )}
      </header>

      <div className="mt-3 flex gap-2">
        {(["live", "planning"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={cn(
              "flex-1 rounded-full border py-2 text-xs font-semibold",
              viewMode === mode
                ? mode === "live"
                  ? "border-[var(--iz-green)] bg-[rgba(57,217,138,.12)] text-[var(--iz-green)]"
                  : "border-[var(--iz-gold)] bg-[rgba(232,194,122,.12)] text-[var(--iz-gold-l)]"
                : "border-[var(--iz-line)] text-[var(--iz-muted)]",
            )}
            onClick={() => setViewMode(mode)}
          >
            {mode === "live" ? "Live" : "Planning"}
          </button>
        ))}
      </div>

      {postSealRatePrompt && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[rgba(232,194,122,.3)] bg-[rgba(232,194,122,.06)] px-3 py-2">
          <p className="text-xs font-semibold">
            Rate {postSealRatePrompt.prIds.length} PR
            {postSealRatePrompt.prIds.length !== 1 ? "s" : ""} {"\u00b7"} 24h
          </p>
          <button
            type="button"
            className="iz-chip text-[10px]"
            onClick={() => clearPostSealRatePrompt()}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <IzPill variant={viewMode === "live" ? "green" : "gold"}>{onFloor.length} PRs</IzPill>
      </div>

      {canLogSales && tonight?.status === "confirmed" && (
        <div className="mt-3">
          <OutletShiftSalesPanel shiftId={tonight.id} label="Log sales" collapsible />
        </div>
      )}

      <OutletSection
        title={viewMode === "live" ? "On duty" : "Planned"}
        hint={onFloor.length === 0 ? "No PRs yet" : `${onFloor.length} listed`}
        className="!mt-4"
      >
        {onFloor.length === 0 ? (
          <p className="iz-tiny iz-muted rounded-xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
            No PRs {viewMode === "live" ? "on floor" : "assigned"} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {onFloor.map((p) => {
              const slot = statsFor(p.id);
              const liveStatus =
                viewMode === "live" &&
                slot &&
                (slot.status === "en-route" || (slot.status === "on-duty" && slot.checkedInAt))
                  ? slot.status === "on-duty" && slot.checkedInAt
                    ? "on-duty"
                    : "en-route"
                  : null;
              return (
                <div key={p.id} className="iz-outlet-floor-row">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] text-xl">
                    {p.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-sora text-sm font-bold">{p.name}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--iz-gold)]">
                        {p.rating}
                        <Star className="h-2.5 w-2.5 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
                      </span>
                    </div>
                    <p className="iz-tiny iz-muted truncate">
                      {p.languages.join(" / ")}
                      {slot && viewMode === "live" && slot.checkedInAt
                        ? ` \u00b7 in ${slot.checkedInAt}`
                        : ""}
                      {slot && viewMode === "live" && (slot.floorDrinks ?? 0) > 0
                        ? ` \u00b7 ${slot.floorDrinks} drinks`
                        : ""}
                    </p>
                  </div>
                  {liveStatus && (
                    <IzPill
                      variant={workforceStatusVariant(liveStatus)}
                      className="!py-0.5 !text-[9px] shrink-0"
                    >
                      {workforceStatusLabel(liveStatus)}
                    </IzPill>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenPr(p.id)}
                    className="iz-btn iz-btn-soft iz-btn-sm shrink-0"
                  >
                    Rate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </OutletSection>

      {ratings.length > 0 && (
        <OutletSection
          title="Recent ratings"
          hint={`${ratings.length} submitted`}
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-1.5">
            {ratings.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--iz-line)] px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold">{r.pr}</span>
                  {r.note && <p className="iz-tiny iz-muted truncate">{r.note}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-0.5 text-[var(--iz-gold)]">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-[var(--iz-gold)] text-[var(--iz-gold)]" />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </OutletSection>
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] text-xl">
                {openPrData.avatar}
              </div>
              <h3 className="font-sora text-base font-bold">Rate {openPrData.name}</h3>
            </div>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)}>
                  <Star
                    className={`h-7 w-7 ${n <= stars ? "fill-[var(--iz-gold)] text-[var(--iz-gold)]" : "text-[var(--iz-muted2)]"}`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {PR_RATING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`iz-pill !text-[9px] ${tags.includes(tag) ? "iz-pill-violet" : "iz-pill-ink"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="mt-3 h-16 w-full rounded-xl border border-[var(--iz-line2)] bg-white/[0.03] p-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                ratePr(openPr, stars, note, tags.length > 0 ? tags : undefined);
                setOpenPr(null);
              }}
              className="iz-btn iz-btn-primary mt-3"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
