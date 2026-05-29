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
    <div>
      <AppHeader subtitle="InnocenZ · Outlet" title="Ratings" />
      <div className="px-5 pt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tonight's roster</h3>
        <div className="space-y-2">
          {prs.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-gradient-surface p-3 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-xl">{p.avatar}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-gold">{p.rating} ★ · {p.languages.join(" / ")}</div>
              </div>
              <button onClick={() => { setOpenPr(p.id); setStars(5); setNote(""); }} className="rounded-full bg-gradient-primary px-3 py-1.5 text-[11px] font-semibold">Rate</button>
            </div>
          ))}
        </div>

        {ratings.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">My ratings</h3>
            <div className="space-y-2">
              {ratings.map((r) => (
                <div key={r.id} className="rounded-2xl bg-gradient-surface p-3 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{r.pr}</span>
                    <span className="text-[11px] text-gold">{"★".repeat(r.stars)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{r.note || "No comment."}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{r.date}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {openPr && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpenPr(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-3xl bg-gradient-surface p-6 mx-auto max-w-[440px]">
            <h3 className="text-lg font-display font-semibold">Rate {prs.find((p) => p.id === openPr)?.name}</h3>
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)}>
                  <Star className={`h-8 w-8 ${n <= stars ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes…"
              className="mt-4 h-20 w-full rounded-2xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => { ratePr(openPr, stars, note); setOpenPr(null); }}
              className="mt-4 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold shadow-glow"
            >
              Submit rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
