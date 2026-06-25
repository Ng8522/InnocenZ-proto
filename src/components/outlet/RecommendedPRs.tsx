import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { PrComcardPickerThumb } from "@/components/pr/PortfolioComcardVisual";
import { IzSectionLabel, IzPill } from "@/components/iz/ui";
import { IzHScroll } from "@/components/iz/HScroll";
import { Sparkles, Check } from "lucide-react";

export function RecommendedPRs() {
  const { shifts, prs, togglePrOnShift } = useStore();
  const staffingShift = shifts.find((s) => s.date === "Tonight" && s.status !== "sealed") ?? shifts[0];

  const minRating = staffingShift?.preferredRating ?? 4.5;

  const recommended = useMemo(
    () => [...prs].sort((a, b) => b.rating - a.rating).filter((p) => p.rating >= minRating),
    [prs, minRating],
  );

  if (!staffingShift) {
    return (
      <section className="mt-6">
        <IzSectionLabel>Recommended PRs</IzSectionLabel>
        <p className="iz-tiny iz-muted mt-3 rounded-2xl border border-dashed border-[var(--iz-line)] px-4 py-6 text-center">
          Post a shift first to see smart-matched PRs.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <IzSectionLabel>Recommended PRs</IzSectionLabel>
        <IzPill variant="gold">
          <Sparkles className="h-3 w-3" /> Smart match
        </IzPill>
      </div>
      <p className="iz-tiny iz-muted -mt-2 mb-2">
        Staffing for {staffingShift.event} · {staffingShift.date}
      </p>
      <IzHScroll className="-mx-5 flex gap-3 px-5 pb-2">
        {recommended.map((p) => {
          const selected = staffingShift.prs.includes(p.id);
          return (
            <div key={p.id} className="iz-card iz-card-flat w-[148px] shrink-0 snap-start !mb-0 p-3">
              <PrComcardPickerThumb
                comcardImageUrl={p.comcardImageUrl}
                avatar={p.avatar}
                name={p.name}
              />
              <div className="mt-2 text-sm font-semibold">{p.name}</div>
              <div className="text-[11px] text-[var(--iz-gold)]">{p.rating} star</div>
              <div className="text-[10px] text-[var(--iz-muted)]">{p.languages.join(" / ")}</div>
              <button
                type="button"
                onClick={() => togglePrOnShift(staffingShift.id, p.id)}
                className={`mt-2 flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-semibold ${
                  selected ? "bg-[var(--iz-green-bg)] text-[var(--iz-green)]" : "iz-btn-primary iz-btn-sm"
                }`}
              >
                {selected ? (
                  <>
                    <Check className="h-3 w-3" /> Added
                  </>
                ) : (
                  "Add"
                )}
              </button>
            </div>
          );
        })}
      </IzHScroll>
    </section>
  );
}
