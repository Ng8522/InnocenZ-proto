import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/Nav";
import { Star } from "lucide-react";

export const Route = createFileRoute("/outlet/ratings")({
  component: RatingsPage,
});

function RatingsPage() {
  const { prs, ratings, ratePr } = useStore();
  const [openPr, setOpenPr] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");

  return (
    <div className="iz-screen">
      <AppHeader subtitle="InnocenZ · Outlet" title="Ratings" />
      <div className="pt-2">
        <h3 className="iz-sect-label">Tonight&apos;s roster</h3>
        <div className="space-y-2">
          {prs.slice(0, 4).map((p) => (
            <div key={p.id} className="iz-card flex items-center gap-3 !py-3">
              <div className="iz-avatar text-xl">{p.avatar}</div>
              <div className="flex-1">
                <div className="font-sora text-sm font-bold">{p.name}</div>
                <div className="iz-tiny text-[var(--iz-gold)]">
                  {p.rating} ? · {p.languages.join(" / ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenPr(p.id);
                  setStars(5);
                  setNote("");
                }}
                className="iz-btn iz-btn-primary iz-btn-sm"
              >
                Rate
              </button>
            </div>
          ))}
        </div>

        {ratings.length > 0 && (
          <>
            <h3 className="iz-sect-label mt-4">My ratings</h3>
            <div className="space-y-2">
              {ratings.map((r) => (
                <div key={r.id} className="iz-card !py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-sora text-sm font-bold">{r.pr}</span>
                    <span className="iz-tiny text-[var(--iz-gold)]">{"?".repeat(r.stars)}</span>
                  </div>
                  <p className="iz-tiny iz-muted mt-1">{r.note || "No comment."}</p>
                  <p className="iz-tiny iz-muted2 mt-1">{r.date}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {openPr && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpenPr(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="iz-card mx-auto w-full max-w-[392px] rounded-b-none rounded-t-[28px] !mb-0"
          >
            <h3 className="font-sora text-lg font-bold">Rate {prs.find((p) => p.id === openPr)?.name}</h3>
            <div className="mt-4 flex justify-center gap-2">
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
              placeholder="Optional notes"
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
