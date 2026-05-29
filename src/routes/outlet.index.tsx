import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/Nav";
import { Bell, Minus, Plus, Sparkles, ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/outlet/")({
  component: OutletRequest,
});

function OutletRequest() {
  const { shifts, prs, togglePrOnShift, confirmShift, sealShift, createShift } = useStore();
  const tonight = shifts.find((s) => s.date === "Tonight") ?? shifts[0];

  const [qty, setQty] = useState(tonight?.quantity ?? 6);
  const [shift, setShift] = useState(tonight?.shift ?? "22:00 — 04:00");
  const [event, setEvent] = useState(tonight?.event ?? "Private VIP — Hennessy Launch");
  const [langs, setLangs] = useState<string[]>(["EN", "中文"]);
  const [minRating, setMinRating] = useState(tonight?.preferredRating ?? 4.5);

  const recommended = useMemo(
    () => [...prs].sort((a, b) => b.rating - a.rating).filter((p) => p.rating >= minRating),
    [prs, minRating]
  );

  const confirmed = tonight?.prs.length ?? 0;
  const estimatedCost = qty * 60 * 6; // 6h × RM60/h
  const onTimeRisk = confirmed >= qty ? "Low" : confirmed >= qty / 2 ? "Medium" : "High";
  const riskTone = onTimeRisk === "Low" ? "text-success" : onTimeRisk === "Medium" ? "text-warning" : "text-destructive";

  const toggleLang = (l: string) =>
    setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  const submitNew = () => {
    createShift({
      outletName: "Velvet 23",
      date: "Tomorrow",
      shift, quantity: qty, languages: langs.join(" / "), event,
      preferredRating: minRating, estimatedCost, liveSales: 0, payPerHour: 60,
    });
  };

  return (
    <div>
      <AppHeader
        subtitle="InnocenZ · Outlet"
        title="Velvet 23"
        right={
          <button className="relative glass flex h-9 w-9 items-center justify-center rounded-full">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
          </button>
        }
      />

      <section className="px-5 pt-5">
        <h2 className="text-xl font-display font-semibold">
          Request PR Manpower — <span className="text-gradient-gold">Tonight.</span>
        </h2>

        <div className="mt-4 rounded-2xl bg-gradient-surface p-4 shadow-card">
          <Row label="Quantity">
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="glass flex h-7 w-7 items-center justify-center rounded-full"><Minus className="h-3.5 w-3.5" /></button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="glass flex h-7 w-7 items-center justify-center rounded-full"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </Row>
          <Row label="Shift">
            <input value={shift} onChange={(e) => setShift(e.target.value)} className="w-40 bg-transparent text-right text-sm outline-none focus:text-gold" />
          </Row>
          <Row label="Languages">
            <div className="flex flex-wrap justify-end gap-1.5">
              {["EN", "中文", "BM"].map((l) => (
                <button key={l} onClick={() => toggleLang(l)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${langs.includes(l) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Event">
            <input value={event} onChange={(e) => setEvent(e.target.value)} className="w-48 bg-transparent text-right text-sm outline-none focus:text-gold" />
          </Row>
          <Row label="Preferred profile" last>
            <div className="flex items-center gap-1">
              {[4, 4.3, 4.5, 4.7].map((r) => (
                <button key={r} onClick={() => setMinRating(r)}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${minRating === r ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
                  {r}★+
                </button>
              ))}
            </div>
          </Row>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Confirmed PRs" value={`${confirmed}/${qty}`} />
          <Stat label="On-time risk" value={onTimeRisk} valueClass={riskTone} />
          <Stat label="Estimated cost" value={`RM ${estimatedCost.toLocaleString()}`} valueClass="text-gradient-gold" />
          <Stat label="Live sales" value={`RM ${(tonight?.liveSales ?? 0).toLocaleString()}`} valueClass="text-success" />
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recommended PRs</h3>
          <span className="flex items-center gap-1 text-[11px] text-gold"><Sparkles className="h-3 w-3" /> Smart match</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
          {recommended.map((p) => {
            const selected = tonight?.prs.includes(p.id);
            return (
              <div key={p.id} className="snap-start w-[140px] flex-shrink-0 rounded-2xl bg-gradient-surface p-3 shadow-card">
                <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-background text-4xl">
                  {p.avatar}
                </div>
                <div className="mt-2 text-sm font-semibold">{p.name}</div>
                <div className="text-[11px] text-gold">{p.rating} ★</div>
                <div className="text-[10px] text-muted-foreground">{p.languages.join(" / ")}</div>
                <button
                  onClick={() => tonight && togglePrOnShift(tonight.id, p.id)}
                  className={`mt-2 flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-semibold transition ${
                    selected ? "bg-success/20 text-success" : "bg-gradient-gold text-gold-foreground"
                  }`}
                >
                  {selected ? <><Check className="h-3 w-3" /> Added</> : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="flex gap-3">
          {tonight && tonight.status !== "sealed" && (
            <>
              <button
                onClick={() => tonight && confirmShift(tonight.id)}
                disabled={confirmed < 1}
                className="flex-1 rounded-full bg-gradient-primary py-3.5 text-sm font-semibold shadow-glow disabled:opacity-40"
              >
                {tonight.status === "confirmed" ? "Re-confirm" : "Confirm booking"}
              </button>
              <button
                onClick={() => tonight && sealShift(tonight.id)}
                className="rounded-full border border-gold/50 px-5 py-3.5 text-sm font-semibold text-gold"
              >
                Seal shift
              </button>
            </>
          )}
        </div>
        <button onClick={submitNew} className="mt-3 flex w-full items-center justify-center gap-1 rounded-full border border-border py-3 text-sm">
          Save as new request <ChevronRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b border-border/60"}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-surface p-3 shadow-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}
