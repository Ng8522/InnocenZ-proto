import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { MapPin, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/host/tonight")({
  component: TonightPage,
});

function TonightPage() {
  const { bookings, checkIn, checkOut } = useStore();
  const active = bookings.find((b) => b.status !== "offered" && b.status !== "completed") ?? bookings.find((b) => b.status === "accepted");
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const startHold = (cb: () => void) => {
    setHolding(true);
    let p = 0;
    const id = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setHolding(false);
        setProgress(0);
        cb();
      }
    }, 60);
  };

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Host" title="Tonight" />
      <div className="px-5 pt-5">
        {!active ? (
          <div className="rounded-2xl bg-gradient-surface p-6 text-center shadow-card">
            <p className="text-sm text-muted-foreground">No active shift. Accept a shift to enable check-in.</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active shift</div>
                  <div className="mt-1 text-lg font-display font-semibold">{active.outletName}</div>
                  <div className="text-[11px] text-muted-foreground">{active.event} · {active.shift}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pay</div>
                  <div className="text-base font-semibold text-gradient-gold">RM {active.pay}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-background/60 p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1 text-[11px]">
                  <div>Geo-fenced · 50m radius</div>
                  <div className="text-muted-foreground">You're inside the venue zone.</div>
                </div>
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] text-success">In range</span>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-gradient-surface p-5 shadow-card">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hold the button for 4 seconds</p>
              {active.status === "accepted" && (
                <HoldButton
                  label="Hold to Check In"
                  icon={<LogIn className="h-5 w-5" />}
                  holding={holding}
                  progress={progress}
                  onPress={() => startHold(() => checkIn(active.id))}
                />
              )}
              {active.status === "checked-in" && (
                <>
                  <div className="my-3 flex items-center gap-2 rounded-xl bg-success/15 p-3 text-success text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Checked in at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <HoldButton
                    label="Hold to Check Out"
                    icon={<LogOut className="h-5 w-5" />}
                    holding={holding}
                    progress={progress}
                    onPress={() => startHold(() => checkOut(active.id))}
                    tone="gold"
                  />
                </>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Mini label="Drinks" value="12" />
              <Mini label="Tables" value="3" />
              <Mini label="Tips" value="RM 45" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HoldButton({ label, icon, holding, progress, onPress, tone = "primary" }: {
  label: string; icon: React.ReactNode; holding: boolean; progress: number; onPress: () => void; tone?: "primary" | "gold";
}) {
  const bg = tone === "gold" ? "bg-gradient-gold text-gold-foreground" : "bg-gradient-primary";
  return (
    <button
      onPointerDown={onPress}
      disabled={holding}
      className={`relative mt-3 w-full overflow-hidden rounded-full py-4 font-semibold shadow-glow ${bg}`}
    >
      <span className="absolute inset-y-0 left-0 bg-white/20 transition-all" style={{ width: `${progress}%` }} />
      <span className="relative flex items-center justify-center gap-2">{icon} {holding ? `Holding… ${progress}%` : label}</span>
    </button>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gradient-surface p-3 text-center shadow-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
