import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/Nav";
import { CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/outlet/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { shifts, sealShift, confirmShift } = useStore();

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Outlet" title="Bookings" />
      <div className="space-y-3 px-5 pt-5">
        {shifts.map((s) => {
          const tone =
            s.status === "sealed" ? "bg-muted text-muted-foreground" :
            s.status === "confirmed" ? "bg-success/20 text-success" :
            s.status === "open" ? "bg-warning/20 text-warning" :
            "bg-primary/20 text-primary";
          const Icon =
            s.status === "sealed" ? Lock :
            s.status === "confirmed" ? CheckCircle2 :
            s.status === "open" ? PlayCircle : Clock;
          return (
            <div key={s.id} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{s.event}</div>
                  <div className="text-[11px] text-muted-foreground">{s.date} · {s.shift}</div>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
                  <Icon className="h-3 w-3" /> {s.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Filled</div>
                  <div className="font-semibold">{s.filled}/{s.quantity}</div>
                </div>
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Cost</div>
                  <div className="font-semibold text-gradient-gold">RM {s.estimatedCost.toLocaleString()}</div>
                </div>
                <div className="rounded-xl bg-background/60 p-2">
                  <div className="text-muted-foreground">Sales</div>
                  <div className="font-semibold text-success">RM {s.liveSales.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {s.status !== "confirmed" && s.status !== "sealed" && (
                  <button onClick={() => confirmShift(s.id)} className="flex-1 rounded-full bg-gradient-primary py-2 text-xs font-semibold">Confirm</button>
                )}
                {s.status === "confirmed" && (
                  <button onClick={() => sealShift(s.id)} className="flex-1 rounded-full border border-gold/50 py-2 text-xs font-semibold text-gold">Seal & generate PVs</button>
                )}
                {s.status === "sealed" && (
                  <span className="flex-1 rounded-full bg-muted py-2 text-center text-xs text-muted-foreground">Payroll dispatched</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
