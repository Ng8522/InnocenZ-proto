import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { AppTopbar } from "@/components/Nav";
import { IzCard, IzSectionLabel, IzPill } from "@/components/iz/ui";
import { Bell, Minus, Plus, Sparkles, ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/outlet/")({
  component: OutletRequest,
});

function OutletRequest() {
  const { shifts, prs, togglePrOnShift, confirmShift, sealShift, createShift } = useStore();
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];

  const [qty, setQty] = useState(tonight?.quantity ?? 6);
  const [shift, setShift] = useState(tonight?.shift ?? "22:00 - 04:00");
  const [event, setEvent] = useState(tonight?.event ?? "Private VIP - Hennessy Launch");
  const [langs, setLangs] = useState<string[]>(["EN", "??"]);
  const [minRating, setMinRating] = useState(tonight?.preferredRating ?? 4.5);

  const recommended = useMemo(
    () => [...prs].sort((a, b) => b.rating - a.rating).filter((p) => p.rating >= minRating),
    [prs, minRating],
  );

  const confirmed = tonight?.prs.length ?? 0;
  const estimatedCost = qty * 60 * 6;
  const onTimeRisk = confirmed >= qty ? "Low" : confirmed >= qty / 2 ? "Medium" : "High";
  const riskTone =
    onTimeRisk === "Low"
      ? "text-[var(--iz-green)]"
      : onTimeRisk === "Medium"
        ? "text-[var(--iz-amber)]"
        : "text-[var(--iz-red)]";

  const toggleLang = (l: string) =>
    setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  const submitNew = () => {
    createShift({
      outletName: "Velvet 23",
      date: "Tomorrow",
      shift,
      quantity: qty,
      languages: langs.join(" / "),
      event,
      preferredRating: minRating,
      estimatedCost,
      liveSales: 0,
      payPerHour: 60,
    });
  };

  return (
    <div className="iz-screen">
      <AppTopbar />
      <div className="flex items-center justify-between">
        <h2 className="font-sora text-xl font-extrabold text-[var(--iz-txt)]">
          Post shift - <span className="text-[var(--iz-gold-l)]">Tonight</span>
        </h2>
        <button type="button" className="iz-chip relative">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--iz-gold)]" />
        </button>
      </div>

      <section className="pt-2">
        <IzCard className="mt-3">
          <Row label="Quantity">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="iz-chip flex h-7 w-7 items-center justify-center !p-0"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="iz-chip flex h-7 w-7 items-center justify-center !p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </Row>
          <Row label="Shift">
            <input
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-40 bg-transparent text-right text-sm outline-none"
            />
          </Row>
          <Row label="Languages">
            <div className="flex flex-wrap justify-end gap-1.5">
              {["EN", "??", "BM"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLang(l)}
                  className={`iz-pill ${langs.includes(l) ? "iz-pill-violet" : "iz-pill-ink"} !text-[11px]`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Event">
            <input
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="w-48 bg-transparent text-right text-sm outline-none"
            />
          </Row>
          <Row label="Preferred profile" last>
            <div className="flex items-center gap-1">
              {[4, 4.3, 4.5, 4.7].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMinRating(r)}
                  className={`iz-pill ${minRating === r ? "iz-pill-gold" : "iz-pill-ink"} !text-[11px]`}
                >
                  {r}+
                </button>
              ))}
            </div>
          </Row>
        </IzCard>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Confirmed PRs" value={`${confirmed}/${qty}`} />
          <Stat label="On-time risk" value={onTimeRisk} valueClass={riskTone} />
          <Stat label="Estimated cost" value={`RM ${estimatedCost.toLocaleString()}`} valueClass="text-[var(--iz-gold)]" />
          <Stat
            label="Live sales"
            value={`RM ${(tonight?.liveSales ?? 0).toLocaleString()}`}
            valueClass="text-[var(--iz-green)]"
          />
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <IzSectionLabel>Recommended PRs</IzSectionLabel>
          <IzPill variant="gold">
            <Sparkles className="h-3 w-3" /> Smart match
          </IzPill>
        </div>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 snap-x">
          {recommended.map((p) => {
            const selected = tonight?.prs.includes(p.id);
            return (
              <div key={p.id} className="iz-card iz-card-flat w-[140px] shrink-0 snap-start !mb-0 p-3">
                <div className="flex h-24 items-center justify-center rounded-xl bg-[var(--iz-violet-ink)] text-4xl">
                  {p.avatar}
                </div>
                <div className="mt-2 text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-[var(--iz-gold)]">{p.rating} star</div>
                <div className="text-[10px] text-[var(--iz-muted)]">{p.languages.join(" / ")}</div>
                <button
                  type="button"
                  onClick={() => tonight && togglePrOnShift(tonight.id, p.id)}
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
        </div>
      </section>

      <section className="mt-4">
        <div className="flex gap-2">
          {tonight && tonight.status !== "sealed" && (
            <>
              <button
                type="button"
                onClick={() => tonight && confirmShift(tonight.id)}
                disabled={confirmed < 1}
                className="iz-btn iz-btn-violet flex-1 disabled:opacity-40"
              >
                {tonight.status === "confirmed" ? "Re-confirm" : "Confirm booking"}
              </button>
              <button
                type="button"
                onClick={() => tonight && sealShift(tonight.id)}
                className="iz-btn iz-btn-soft !w-auto px-4"
              >
                Seal shift
              </button>
            </>
          )}
        </div>
        <button type="button" onClick={submitNew} className="iz-btn iz-btn-ghost mt-2">
          Save as new request <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b border-[var(--iz-line)]"}`}
    >
      <span className="text-xs text-[var(--iz-muted)]">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="iz-stat-tile">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--iz-muted)]">{label}</div>
      <div className={`font-sora mt-1.5 text-xl font-extrabold ${valueClass || "text-[var(--iz-txt)]"}`}>{value}</div>
    </div>
  );
}
