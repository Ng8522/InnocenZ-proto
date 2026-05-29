import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/Nav";
import { useStore } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Languages, Sparkles, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/host/")({
  component: HostShifts,
});

function HostShifts() {
  const { bookings, acceptBooking } = useStore();
  const open = bookings.filter((b) => b.status === "offered");
  const inProgress = bookings.filter((b) => b.status === "accepted" || b.status === "checked-in");
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  return (
    <div>
      <AppHeader subtitle="InnocenZ · Host" title="Shift Marketplace" />
      <div className="px-5 pt-5">
        <div className="rounded-2xl bg-gradient-primary/20 border border-primary/40 p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary"><Sparkles className="h-3 w-3" /> VIP Priority</div>
          <p className="mt-1 text-sm">2 new offers match your profile tonight.</p>
        </div>

        {inProgress.length > 0 && (
          <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-[11px]">
            <span className="font-semibold text-primary">{inProgress.length} active shift(s)</span>
            <span className="text-muted-foreground"> — open Tonight to check in or out.</span>
          </div>
        )}

        <div className="mb-2 mt-5 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Available shifts</h3>
          <Link
            to="/host/history"
            className="flex items-center gap-0.5 text-[11px] font-medium text-primary"
          >
            History{completedCount > 0 ? ` (${completedCount})` : ""}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {open.length === 0 ? (
            <p className="rounded-2xl bg-gradient-surface p-4 text-center text-[11px] text-muted-foreground shadow-card">
              No open offers right now.
            </p>
          ) : null}
          {open.map((b) => (
            <div key={b.id} className="rounded-2xl bg-gradient-surface p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{b.outletName}</div>
                  <div className="text-[11px] text-muted-foreground">{b.event}</div>
                </div>
                <span className="text-gradient-gold text-sm font-semibold">RM {b.pay}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.date} · {b.shift}</span>
                <span className="flex items-center gap-1"><Languages className="h-3 w-3" /> {b.languages}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {b.status === "offered" ? (
                  <>
                    <button onClick={() => acceptBooking(b.id)} className="flex-1 rounded-full bg-gradient-primary py-2 text-xs font-semibold">Accept</button>
                    <button className="rounded-full border border-border px-4 py-2 text-xs">Decline</button>
                  </>
                ) : (
                  <span className="flex flex-1 items-center justify-center gap-1 rounded-full bg-success/20 py-2 text-xs text-success">
                    <Check className="h-3 w-3" /> Accepted
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
